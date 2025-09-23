import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbTrending,
  userSubmission,
  userSubmissionStatusEnum,
} from '~/server/db/schema';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { createGunzip } from 'node:zlib';
import { Readable } from 'stream';
import readline from 'readline';
import {
  bulkUpdatePopularity,
  updateRatingsForMediaList,
  populateMediaUsingTmdbIds,
  bulkUpsertNewMedia,
  populateOriginForMediaList,
  populateSeasonAndEpisodeForTvList,
} from '~/server/utils/mediaUtils';
import { db } from '../db';
import {
  fetchAllChangedTmdbIds,
  fetchTmdbListViaApi,
  findExistingMediaFromFetched,
  findNewMediaFromFetched,
} from './tmdbApiUtils';
import { runItemsInEachBatchInBulk } from './utils';
import { fetchSrcForMediaIds } from './srcUtils';
import { isCronStopping } from './cronControllerUtils';

export async function updateAllChangedMedia() {
  // 1. Get ALL changed IDs from the TMDB API
  const allChangedIds = await fetchAllChangedTmdbIds();
  console.log(
    `[updateMediaUsingTmdbChangedApi] number of changed media in tmdb: ${allChangedIds.length}`
  );

  if (isCronStopping()) {
    console.log(`[updateMediaUsingTmdbChangedApi] ======= Stopped =======.`);
    return;
  }

  // 2. Filter that list to find only the ones that are in YOUR database
  const changedIdsInMyDb = await findExistingMediaFromFetched(allChangedIds);
  console.log(
    `[updateMediaUsingTmdbChangedApi] number of changed media in db: ${changedIdsInMyDb.length}`
  );

  if (isCronStopping()) {
    console.log(`[updateMediaUsingTmdbChangedApi] ======= Stopped =======.`);
    return;
  }

  // 3. run update on the changed media list
  await populateMediaUsingTmdbIds(changedIdsInMyDb);
}

// // --- 1. Add a module-scoped "shutdown flag" ---
// let isShuttingDown = false;

// // --- 2. Listen for the SIGINT signal (Ctrl+C) ---
// // This code runs once when your server starts.
// process.on('SIGINT', () => {
//   console.log(
//     '\n[Graceful Shutdown] Ctrl+C detected. Stopping updatePopularity if there is one running.'
//   );
//   isShuttingDown = true;
// });

export async function updateAllPopularity() {
  await updatePopularity('movie');

  if (isCronStopping()) {
    console.log('[updatePopularity] ======= Stopped =======');
    return; // Exit the loop cleanly
  }

  await updatePopularity('tv');
}

async function updatePopularity(mediaType: 'movie' | 'tv') {
  // 1. download file from url
  const yesterdayDateStr = format(subDays(new Date(), 1), 'MM_dd_yyyy');
  const fileName =
    mediaType === 'movie'
      ? `movie_ids_${yesterdayDateStr}.json.gz`
      : `tv_series_ids_${yesterdayDateStr}.json.gz`;
  const url = `http://files.tmdb.org/p/exports/${fileName}`;

  console.log(`[updatePopularity] Downloading json.gz from: ${url}`);
  const tmdbResponse = await fetch(url);
  if (!tmdbResponse.ok || !tmdbResponse.body) {
    console.error(
      `[updatePopularity] Failed to download file: ${tmdbResponse.statusText}`
    );
    return;
  }

  // 2. Process the large gzipped file as a stream without loading it all into memory
  // cannot use runItemsInEachBatchInBulk() bc this is stream (we don't have the entire arr yet)
  const gunzip = createGunzip();
  const rl = readline.createInterface({ input: gunzip });
  Readable.fromWeb(tmdbResponse.body as any).pipe(gunzip);

  console.log(`[updatePopularity] batch update starts...`);

  const batchSize = 25000;
  let newPopularity: { tmdbId: number; popularity: number }[] = [];
  let totalCount = 0;
  for await (const line of rl) {
    // 3. use break instead of return because we want to insert the already collected popularity info to db
    if (isCronStopping()) {
      console.log('[updatePopularity] ======= Stopped =======');
      break; // Exit the loop cleanly
    }

    // The try...catch now ONLY wraps the JSON.parse, which is the only
    // part that should be allowed to fail without stopping the whole process.
    try {
      const item = JSON.parse(line);
      newPopularity.push({
        tmdbId: item.id,
        popularity: item.popularity,
      });
    } catch (e) {
      /* Ignore parse errors */
    }
    // When the batch is full, bulk insert to db and clear popularity arr
    if (newPopularity.length >= batchSize) {
      await bulkUpdatePopularity(newPopularity, mediaType);
      totalCount += newPopularity.length;
      newPopularity = [];
      console.log(`[updatePopularity] batch progress: ${totalCount} items.`);
    }
  }

  // 3. Process any remaining items in the last batch
  if (newPopularity.length > 0) {
    await bulkUpdatePopularity(newPopularity, mediaType);
    totalCount += newPopularity.length;
  }

  console.log(`[updatePopularity] done: ${totalCount} successful.`);
}

// async function updatePopularity(mediaType: 'movie' | 'tv') {
//   // 1. download file from url
//   const yesterdayDateStr = format(subDays(new Date(), 1), 'MM_dd_yyyy');
//   const fileName =
//     mediaType === 'movie'
//       ? `movie_ids_${yesterdayDateStr}.json.gz`
//       : `tv_series_ids_${yesterdayDateStr}.json.gz`;
//   const url = `http://files.tmdb.org/p/exports/${fileName}`;

//   console.log(`[updatePopularity] Downloading json.gz from: ${url}`);
//   const tmdbResponse = await fetch(url);
//   if (!tmdbResponse.ok || !tmdbResponse.body) {
//     console.error(
//       `[updatePopularity] Failed to download file: ${tmdbResponse.statusText}`
//     );
//     return;
//   }

//   // 2. load zip file to buffer in memory
//   const gzippedBuffer = await tmdbResponse.arrayBuffer();

//   if (isCronStopping()) {
//     console.log(`[updatePopularity] ======= Stopped =======.`);
//     return;
//   }

//   console.log(`[updatePopularity] Downloaded. Decompressing...`);
//   // 3. Decompress the entire buffer in memory. This can use a lot of RAM.
//   const uncompressedBuffer = gunzipSync(gzippedBuffer);
//   const jsonText = uncompressedBuffer.toString('utf-8');
//   const lines = jsonText.split('\n');

//   console.log(
//     `[updatePopularity] Decompressed. Collecting from ${lines.length} items...`
//   );
//   // 4. collect popularity info from each line
//   const allPopularityScores: { tmdbId: number; popularity: number }[] = [];
//   for (const line of lines) {
//     if (isCronStopping()) {
//       console.log(`[updatePopularity] ======= Stopped =======.`);
//       return;
//     }
//     if (!line) continue; // Skip empty lines
//     try {
//       const item = JSON.parse(line);
//       allPopularityScores.push({
//         tmdbId: item.id,
//         popularity: item.popularity,
//       });
//     } catch (e) {
//       /* Ignore parse errors */
//     }
//   }

//   // 3. Process the full list in batches (database part)
//   await runItemsInEachBatchInBulk(allPopularityScores, 25000, async (batch) => {
//     await bulkUpdatePopularity(batch, mediaType);
//   });

//   console.log(`[updatePopularity] done.`);
// }

export async function updateRatings() {
  // 1. smartly select media that need a rating update
  const mediaToUpdate = await db
    .select({
      id: tmdbMedia.id,
      tmdbId: tmdbMedia.tmdbId,
      title: tmdbMedia.title,
      type: tmdbMedia.type,
    })
    .from(tmdbMedia)
    .where(
      or(
        isNull(tmdbMedia.voteUpdatedAt), // 1. Never updated
        and(
          // 2. Popular but stale
          gt(tmdbMedia.popularity, 20),
          lt(tmdbMedia.voteUpdatedAt, sql`CURRENT_DATE - INTERVAL '7 day'`)
        ),
        lt(tmdbMedia.voteUpdatedAt, sql`CURRENT_DATE - INTERVAL '30 day'`) // 3. Very stale
      )
    )
    .orderBy(desc(tmdbMedia.popularity), asc(tmdbMedia.voteUpdatedAt));
  // .limit(limit);

  if (mediaToUpdate.length === 0) {
    console.log('[updateRatings] No media needs rating updates.');
    // return { success: true, count: 0 };
  }

  // 2. update ratings
  const successCount = await updateRatingsForMediaList(mediaToUpdate);

  // 3. mark all media as updated (regardless of success or fail)
  await db
    .update(tmdbMedia)
    .set({ voteUpdatedAt: new Date() })
    .where(
      inArray(
        tmdbMedia.id,
        mediaToUpdate.map((m) => m.id)
      )
    );

  console.log(
    `[updateRatings] done: ${mediaToUpdate.length} required => ${successCount} successful.`
  );
}

export async function processUserSubmissions() {
  // 1. find pending submissions
  const pendingSubmissions = await db.query.userSubmission.findMany({
    where: eq(userSubmission.status, 'pending'),
  });
  if (pendingSubmissions.length === 0) {
    console.log('[upsertUserSubmittedIds] No user submissions to process.');
    return { processedCount: 0 };
  }
  const populateInput = pendingSubmissions.map((sub) => ({
    tmdbId: sub.tmdbId,
    type: sub.mediaType,
  }));

  // 2. populate media/seasons/episodes
  const populateOutput = await populateMediaUsingTmdbIds(populateInput);
  console.log(
    `[upsertUserSubmittedIds] Populated ${populateOutput.length} media from user submissions.`
  );

  // 3. update userSubmission to 'success' or 'failure' based on populateOutput
  const successTmdbIds = new Set(populateOutput.map((item) => item.tmdbId));

  const submissionResults = pendingSubmissions.map((submission) => ({
    id: submission.id,
    status: successTmdbIds.has(submission.tmdbId) ? 'success' : 'failure',
  }));

  // Define the function that will process one batch
  const bulkUpdateSubmissions = async (batch: typeof submissionResults) => {
    if (batch.length === 0) return;

    await db.execute(sql`
        UPDATE ${userSubmission}
        SET 
          status = data.new_status::${userSubmissionStatusEnum},
          processed_at = NOW()
        FROM (VALUES ${sql.join(
          batch.map((s) => sql`(${s.id}, ${s.status})`),
          sql`, `
        )}) AS data(id, new_status)
        WHERE ${userSubmission.id} = data.id::varchar;
      `);
  };

  // Call the helper to run the batch processing
  await runItemsInEachBatchInBulk(
    submissionResults,
    10000,
    bulkUpdateSubmissions
  );

  const successCount = submissionResults.filter(
    (s) => s.status === 'success'
  ).length;
  const failureCount = submissionResults.length - successCount;

  console.log(
    `[upsertUserSubmittedIds] db submission status updated: success (${successCount}) | failure (${failureCount}).`
  );
}

export async function populateMediaUsingTmdbLists(limit: number) {
  await populateMediaUsingTmdbList('trending', limit);
  if (isCronStopping()) {
    console.log(`[populateMediaUsingTmdbLists] ======= Stopped =======.`);
    return;
  }
  await populateMediaUsingTmdbList('popular', limit);
  if (isCronStopping()) {
    console.log(`[populateMediaUsingTmdbLists] ======= Stopped =======.`);
    return;
  }
  await populateMediaUsingTmdbList('top_rated', limit);
}

// should only process media not in db
// media already in db are kept up to date
export async function populateMediaUsingTmdbList(
  listType: 'trending' | 'popular' | 'top_rated',
  limit: number
) {
  // 2. fetch list from api (mv will be missing origin, tv will be missing season/episode)
  let fetchOutput: any[] = [];
  if (listType === 'trending') {
    const trendingLimit = limit;
    fetchOutput = await fetchTmdbListViaApi(listType, trendingLimit);
    console.log(
      `[populateMediaUsingTmdbList] fetched ${listType}: ${fetchOutput.length}`
    );
  } else {
    const mvFetchOutput = await fetchTmdbListViaApi(listType, limit, 'movie');
    const tvFetchOutput = await fetchTmdbListViaApi(listType, limit, 'tv');
    fetchOutput = [...mvFetchOutput, ...tvFetchOutput];
    console.log(
      `[populateMediaUsingTmdbList] fetched ${listType}: ${mvFetchOutput.length} mv | ${tvFetchOutput.length} tv`
    );
  }

  // 3. only insert nonexistent media to media/genre/origin tables
  const newMedia = await findNewMediaFromFetched(fetchOutput);

  let mediaOutput: {
    mediaId: string;
    tmdbId: number;
    type: 'movie' | 'tv';
    title: string;
  }[] = [];
  if (newMedia.length > 0) {
    mediaOutput = await bulkUpsertNewMedia(newMedia);
  }

  // 4. For trending list, populate the table with ALL fetched media
  if (listType === 'trending') {
    // ✨ NEW STEP 4.1: Query the DB to get internal IDs for ALL fetched media
    const compositeWhereClause = or(
      ...fetchOutput.map((media) =>
        and(
          eq(tmdbMedia.tmdbId, media.id),
          eq(tmdbMedia.type, media.media_type)
        )
      )
    );

    if (!compositeWhereClause) return; // Exit if fetchOutput was empty

    const allMediaFromDb = await db
      .select({
        mediaId: tmdbMedia.id,
        tmdbId: tmdbMedia.tmdbId,
        type: tmdbMedia.type,
      })
      .from(tmdbMedia)
      .where(compositeWhereClause);

    // ✨ NEW STEP 4.2: Create a lookup map for quick access
    const mediaIdLookup = new Map<string, string>();
    for (const media of allMediaFromDb) {
      mediaIdLookup.set(`${media.tmdbId}-${media.type}`, media.mediaId);
    }

    // ✨ NEW STEP 4.3: Build the trendingInput using the original fetchOutput to preserve rank
    const trendingInput = fetchOutput.map((item, index) => {
      const mediaId = mediaIdLookup.get(`${item.id}-${item.media_type}`);
      if (!mediaId) {
        // This should not happen if the upsert logic is correct
        throw new Error(
          `Could not find mediaId for tmdbId ${item.id} and type ${item.media_type}`
        );
      }
      return {
        mediaId: mediaId,
        rank: index,
      };
    });
    // ✨ NEW STEP 4.4: Clear the table and insert the full list
    await db.delete(tmdbTrending);
    await db.insert(tmdbTrending).values(trendingInput);
  }

  if (mediaOutput.length === 0) return;

  // 1. fill origin for inserted mv
  const mvList = mediaOutput.filter((media) => media.type === 'movie');
  await populateOriginForMediaList(mvList);

  // 1. fill season/episode for inserted tv (need to fetch detail for each tv bc list fetch do not have season/episode info)
  const tvList = mediaOutput.filter((media) => media.type === 'tv');
  await populateSeasonAndEpisodeForTvList(tvList, []);

  return mediaOutput;
}

export async function fetchSrc(limit: number) {
  // 1. Find a prioritized list of media to check, using the same logic as updateRatings
  const mediaToFetchSrc = await db
    .select({ id: tmdbMedia.id })
    .from(tmdbMedia)
    .where(
      or(
        isNull(tmdbMedia.srcFetchedAt), // 1. Never checked
        and(
          // 2. Popular but not checked recently (e.g., 3 days for sources)
          gt(tmdbMedia.popularity, 20),
          lt(tmdbMedia.srcFetchedAt, sql`CURRENT_DATE - INTERVAL '1 day'`)
        ),
        // 3. Any other media not checked in a longer time (e.g., 14 days)
        lt(tmdbMedia.srcFetchedAt, sql`CURRENT_DATE - INTERVAL '7 day'`)
      )
    )
    .orderBy(desc(tmdbMedia.popularity), asc(tmdbMedia.srcFetchedAt))
    .limit(limit);

  if (mediaToFetchSrc.length === 0) {
    console.log('[smartFetchMediaSrc] No media needed src fetch.');
    return { success: true, checked: 0 };
  }

  const mediaIds = mediaToFetchSrc.map((m) => m.id);

  // 2. Pass this prioritized list to your powerful, reusable function
  await fetchSrcForMediaIds(mediaIds);

  // 3. Mark these media items as "checked" by updating their timestamp
  await db
    .update(tmdbMedia)
    .set({ srcFetchedAt: new Date() })
    .where(inArray(tmdbMedia.id, mediaIds));

  console.log(`[smartFetchMediaSrc] done: ${mediaIds.length} successful.`);
}

// denorm fields include:
// availability: mv = how many src, tv = how many episodes with src
// total aired episodes: mv = 0, tv = how many episodes whose air date is before today
// latestEpisodeInfo: season number, episode number, air date
export async function updateDenormFieldsForMediaList(input: 'all' | string[]) {
  if (input !== 'all' && input.length === 0) {
    console.log('[updateDenormFieldsForMediaList] empty input.');
    return { updatedMovies: 0, updatedTvShows: 0 };
  }
  console.log(
    `[updateDenormFieldsForMediaList] input length: ${
      input === 'all' ? 'all' : input.length
    }`
  );

  // 1. Update mv
  const mvConditions =
    input === 'all'
      ? sql`WHERE m.type = 'movie' AND m.denorm_fields_outdated IS TRUE`
      : sql`WHERE m.type = 'movie' AND m.denorm_fields_outdated IS TRUE AND m.id IN ${input}`;

  const mvOutput = await db.execute(sql`
    WITH movie_calcs AS (
      SELECT
        m.id,
        (SELECT COUNT(*) FROM ${tmdbSource} src WHERE src.media_id = m.id) as "availabilityCount"
      FROM ${tmdbMedia} m
      ${mvConditions}
    )
    UPDATE ${tmdbMedia} m SET
      availability_count = mc."availabilityCount",
      aired_episode_count = 0,
      updated_date = m.release_date,
      updated_season_number = NULL,
      updated_episode_number = NULL,
      denorm_fields_outdated = FALSE
    FROM movie_calcs mc
    WHERE m.id = mc.id
    RETURNING m.id;
  `);
  console.log(
    `[updateDenormFieldsForMediaList] Updated ${mvOutput.length} movies`
  );

  // add stop check btw mv and tv
  if (isCronStopping()) {
    console.log(`[updateDenormFieldsForMediaList] ======= Stopped =======.`);
    return;
  }

  // 2. get tv
  const tvConditions = [
    eq(tmdbMedia.type, 'tv'),
    eq(tmdbMedia.denormFieldsOutdated, true),
  ];
  if (input !== 'all') {
    tvConditions.push(inArray(tmdbMedia.id, input));
  }

  const tvIds = await db
    .select({ id: tmdbMedia.id })
    .from(tmdbMedia)
    .where(and(...tvConditions));

  if (tvIds.length === 0) {
    console.log('[updateDenormFieldsForMediaList] No tv to update.');
    return { updatedMv: mvOutput.length, updatedTv: 0 };
  }

  // collect tv denorm fields in batch
  // 3. Perform a SINGLE, efficient bulk update for all dirty TV shows.
  //    The loop and batchProcess are now REMOVED.
  const tvOutput = await db.execute(sql`
    WITH tv_calcs AS (
      SELECT
        m.id,
        (SELECT COUNT(DISTINCT src.episode_id) FROM ${tmdbSource} src JOIN ${tmdbEpisode} e ON src.episode_id = e.id JOIN ${tmdbSeason} s ON e.season_id = s.id WHERE s.media_id = m.id) as "availabilityCount",
        (SELECT COUNT(*) FROM ${tmdbEpisode} e JOIN ${tmdbSeason} s ON e.season_id = s.id WHERE s.media_id = m.id AND e.air_date < CURRENT_DATE) as "airedEpisodeCount",
        (
          SELECT json_build_object('seasonNumber', s.season_number, 'episodeNumber', e.episode_number, 'airDate', e.air_date)
          FROM ${tmdbEpisode} e JOIN ${tmdbSeason} s ON e.season_id = s.id
          WHERE s.media_id = m.id AND EXISTS (SELECT 1 FROM ${tmdbSource} src WHERE src.episode_id = e.id)
          ORDER BY e.air_date DESC
          LIMIT 1
        ) as "latestEpisode"
      FROM ${tmdbMedia} m
      WHERE m.id IN ${tvIds.map((tv) => tv.id)}
    )
    UPDATE ${tmdbMedia} m SET
      availability_count = tc."availabilityCount",
      aired_episode_count = tc."airedEpisodeCount",
      updated_date = (tc."latestEpisode"->>'airDate')::timestamp,
      updated_season_number = (tc."latestEpisode"->>'seasonNumber')::integer,
      updated_episode_number = (tc."latestEpisode"->>'episodeNumber')::integer,
      denorm_fields_outdated = FALSE
    FROM tv_calcs tc
    WHERE m.id = tc.id
    RETURNING m.id;
  `);

  console.log(
    `[updateDenormFieldsForMediaList] Updated ${tvOutput.length} tv.`
  );

  return {
    updatedMovies: mvOutput.length,
    updatedTvShows: tvOutput.length,
  };
}
