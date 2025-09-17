import { db } from '../db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbMediaToTmdbOrigin,
  tmdbSeason,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  fetchTmdbDetailViaApi,
  fetchTmdbSeasonDetailViaApi,
} from './tmdbApiUtils';
import { runItemsInEachBatchConcurrently } from './utils';

export async function bulkUpsertNewMedia(fetchOutput: any[]) {
  // 2. Prepare db input from api fetch ouput (removes duplicates)
  const mediaInput = Array.from(
    new Map(
      fetchOutput
        .filter(
          (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
        )
        .map((item: any) => [
          // Use a composite key for the map to handle movie/tv id collisions
          `${item.media_type}-${item.id}`,
          {
            tmdbId: item.id,
            type: item.media_type,
            title: item.name || item.title,
            description: item.overview,
            imageUrl: item.poster_path ? item.poster_path : null,
            backdropUrl: item.backdrop_path ? item.backdrop_path : null,
            releaseDate: item.release_date
              ? new Date(item.release_date)
              : item.first_air_date
              ? new Date(item.first_air_date)
              : null,
            genreIds:
              item.genre_ids ||
              item.genres.map((g: { id: number; name: string }) => g.id) ||
              [],
            originIds: item.origin_country || [],
            popularity: item.popularity,
            voteAverage: item.vote_average,
            voteCount: item.vote_count,
            voteUpdatedAt: new Date(),
          },
        ])
    ).values()
  );

  console.log(`[bulkUpsertNewMedia] unique input: ${mediaInput.length}`);

  // 3. Insert or update media table
  const mediaOutput = await db
    .insert(tmdbMedia)
    // MODIFIED: Exclude both genreIds and originIds from this insert
    .values(mediaInput.map(({ genreIds, originIds, ...rest }) => rest))
    .onConflictDoUpdate({
      target: [tmdbMedia.tmdbId, tmdbMedia.type],
      set: {
        type: sql`excluded.type`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        imageUrl: sql`excluded.image_url`,
        backdropUrl: sql`excluded.backdrop_url`,
        releaseDate: sql`excluded.release_date`,
        popularity: sql`excluded.popularity`,
        voteAverage: sql`excluded.vote_average`,
        voteCount: sql`excluded.vote_count`,
        voteUpdatedAt: new Date(), // Set to the current time of the update
      },
    })
    .returning({
      mediaId: tmdbMedia.id,
      tmdbId: tmdbMedia.tmdbId,
      type: tmdbMedia.type,
      title: tmdbMedia.title,
    })
    .execute();

  // 4. Create a lookup map for easy access: { tmdbId => mediaId }
  const tmdbIdToMediaIdMap = new Map(
    mediaOutput.map((item) => [item.tmdbId, item.mediaId])
  );

  // 5. Prepare the data for the mediaToGenres join table
  const genreInput = mediaInput.flatMap((media) => {
    const mediaId = tmdbIdToMediaIdMap.get(media.tmdbId);
    if (!mediaId || !media.genreIds || media.genreIds.length === 0) {
      return [];
    }
    return media.genreIds.map((genreId: number) => ({
      mediaId: mediaId,
      genreId: genreId,
    }));
  });

  // 6. Insert all genre relationships in a single batch
  if (genreInput.length > 0) {
    await db
      .insert(tmdbMediaToTmdbGenre)
      .values(genreInput)
      .onConflictDoNothing();
  }

  // 7. Prepare the data for the mediaToOrigins join table
  const originInput = mediaInput.flatMap((media) => {
    const mediaId = tmdbIdToMediaIdMap.get(media.tmdbId);
    if (!mediaId || !media.originIds || media.originIds.length === 0) {
      return []; // Skip if media wasn't inserted or has no origins
    }
    return media.originIds.map((originId: string) => ({
      mediaId: mediaId,
      originId: originId, // The country code, e.g., "US"
    }));
  });

  // 8. Insert all origin relationships in a single batch
  if (originInput.length > 0) {
    await db
      .insert(tmdbMediaToTmdbOrigin)
      .values(originInput)
      .onConflictDoNothing();
  }

  console.log(
    `[bulkUpsertNewMedia] done upserting to media/origin/genre: ${mediaOutput.length}`
  );

  return mediaOutput;
}

// Helper function to be placed outside the router
export async function bulkUpdatePopularity(
  batch: { tmdbId: number; popularity: number }[],
  mediaType: 'movie' | 'tv'
) {
  if (batch.length === 0) return;
  try {
    await db.execute(sql`
      UPDATE ${tmdbMedia} SET
        popularity = ${sql.raw(`data.popularity::real`)}
      FROM (VALUES ${sql.join(
        batch.map((p) => sql`(${p.tmdbId}, ${p.popularity})`),
        sql`, `
      )}) AS data(tmdb_id, popularity)
      WHERE ${tmdbMedia.tmdbId} = ${sql.raw(`data.tmdb_id::integer`)}
            AND ${tmdbMedia.type} = ${mediaType};
    `);
  } catch (error) {
    console.error('[bulkUpdatePopularity] DATABASE FAILED:', error);
    throw error;
  }
}

export async function upsertSeasonsAndEpisodes(
  detail: any,
  media: {
    mediaId: string;
    tmdbId: number;
    title: string;
    seasonCount?: number;
  }
) {
  // console.log(
  //   `[upsertSeasonsAndEpisodes] tv ${media.tmdbId} (${media.title}) detail:`,
  //   detail
  // );
  const seasonsFromApi = detail.seasons?.filter(
    (s: { season_number: number }) => s.season_number !== 0
  );
  if (!seasonsFromApi || seasonsFromApi.length === 0) return;

  // if no seasonCount -> new tv -> insert seasons/episodes
  // if has seasonCount -> existing tv -> check if seasonCount is correct -> if not, refetch and upsert
  if (media.seasonCount && media.seasonCount === seasonsFromApi.length) {
    console.log(
      `[upsertSeasonsAndEpisodes] tv ${media.tmdbId} (${media.title}): db ${media.seasonCount} = api ${seasonsFromApi.length}`
    );
    return;
  }

  const seasonDetailsPromises = seasonsFromApi.map((season: any) =>
    fetchTmdbSeasonDetailViaApi(detail.id, season.season_number)
  );
  const seasonDetails = await Promise.all(seasonDetailsPromises);

  // 2. Prepare all seasons for a single batch upsert
  const seasonInput = seasonsFromApi.map((season: any) => ({
    mediaId: media.mediaId,
    seasonNumber: season.season_number,
    title: season.name,
    description: season.overview,
    imageUrl: season.poster_path,
  }));

  await db.transaction(async (tx) => {
    // 3. Upsert all seasons in one go and get their DB IDs back
    console.log(
      `[upsertSeasonsAndEpisodes] Upserting ${seasonInput.length} seasons...`
    );
    const seasonOutput = await tx
      .insert(tmdbSeason)
      .values(seasonInput)
      .onConflictDoUpdate({
        target: [tmdbSeason.mediaId, tmdbSeason.seasonNumber],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          imageUrl: sql`excluded.image_url`,
        },
      })
      .returning({ id: tmdbSeason.id, seasonNumber: tmdbSeason.seasonNumber });

    // 4. Create a map of {seasonNumber => databaseId} for easy lookup
    const seasonNumberToIdMap = new Map(
      seasonOutput.map((s) => [s.seasonNumber, s.id])
    );

    // 5. Prepare all episodes from all seasons for a single batch upsert
    const episodeInput = seasonDetails.flatMap((seasonDetail) => {
      const seasonId = seasonNumberToIdMap.get(seasonDetail.season_number);
      if (!seasonId || !seasonDetail.episodes) {
        return []; // Skip if season wasn't upserted or has no episodes
      }

      return seasonDetail.episodes.map((episode: any, index: number) => ({
        seasonId: seasonId,
        episodeNumber: episode.episode_number,
        episodeIndex: index + 1,
        title: episode.name,
        description: episode.overview,
        airDate: !!episode.air_date ? new Date(episode.air_date) : null,
      }));
    });

    // 6. Upsert all episodes in one go
    console.log(
      `[upsertSeasonsAndEpisodes] Upserting ${episodeInput.length} episodes...`
    );
    await tx
      .insert(tmdbEpisode)
      .values(episodeInput)
      .onConflictDoUpdate({
        target: [tmdbEpisode.seasonId, tmdbEpisode.episodeNumber],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          airDate: sql`excluded.air_date`,
        },
      });

    console.log(`[upsertSeasonsAndEpisodes] ${detail.id}: Done.`);

    // 7. after updating seasons/episodes -> flag media as needing denorm field update
    await tx
      .update(tmdbMedia)
      .set({ denormFieldsOutdated: true })
      .where(eq(tmdbMedia.id, media.mediaId));
  });
}

export async function populateSeasonAndEpisodeForTvList(
  tvInput: {
    mediaId: string;
    tmdbId: number;
    type: 'movie' | 'tv';
    title: string;
    seasonCount?: number;
  }[],
  tvDetails: any[]
) {
  console.log(
    `[populateSeasonAndEpisodeForTvList] input length: ${tvInput.length}`
  );
  console.log(
    `[populateSeasonAndEpisodeForTvList] details length: ${tvDetails.length}`
  );
  if (tvInput.length === 0) return;

  if (tvDetails.length === 0) {
    let detailCount = 0;
    // 1. fetch details from tmdb api and store details in one array
    await runItemsInEachBatchConcurrently(tvInput, 10, async (tv) => {
      detailCount++;
      console.log(
        `[populateSeasonAndEpisodeForTvList] fetch tv detail: ${detailCount}/${tvInput.length} (${tv.tmdbId}:${tv.title})`
      );
      try {
        const detail = await fetchTmdbDetailViaApi(tv.type, tv.tmdbId);
        tvDetails.push(detail);
      } catch (err) {
        console.error(
          `[populateSeasonAndEpisodeForTvList] fetch tv detail failed: ${tv.tmdbId}`,
          err
        );
      }
    });
    console.log(
      `[populateSeasonAndEpisodeForTvList] fetched tv details: ${tvDetails.length}`
    );
  }

  let count = 0;
  await runItemsInEachBatchConcurrently(tvInput, 10, async (tv) => {
    count++;
    console.log(
      `[populateSeasonAndEpisodeForTvList] upsert tv seasons/episodes: ${count}/${tvInput.length} (${tv.tmdbId}:${tv.title})`
    );
    // get details
    const tvDetail = tvDetails.find((detail) => detail.id === tv.tmdbId);
    if (!tvDetail) {
      console.log(
        `[populateSeasonAndEpisodeForTvList] tv ${tv.title}: no details`
      );
      return;
    }
    // upsert seasons/episodes
    await upsertSeasonsAndEpisodes(tvDetail, tv);
  });
  console.log(
    `[populateSeasonAndEpisodeForTvList] upsert tv seasons/episodes: done`
  );
}

export async function populateOriginForMediaList(
  mediaList: {
    mediaId: string;
    type: 'movie' | 'tv';
    tmdbId: number;
    title: string;
  }[]
) {
  console.log(
    `[populateOriginForMediaList] Fetching origins for ${mediaList.length} items...`
  );

  // 1. Run all API fetches concurrently and collect their results.
  const allOriginData = await Promise.all(
    mediaList.map(async (media) => {
      try {
        const details = await fetchTmdbDetailViaApi(media.type, media.tmdbId);
        if (!details.origin_country) return [];

        // Return the array of origin objects for this one media item
        return details.origin_country.map((originId: string) => ({
          mediaId: media.mediaId,
          originId: originId,
        }));
      } catch (error) {
        console.error(
          `[populateOriginForMediaList] Failed to fetch details for ${media.tmdbId}:`,
          error
        );
        return []; // Return an empty array on failure for this item
      }
    })
  );

  // 2. Flatten the array of arrays into a single list for the database.
  //    e.g., [ [{...}], [{...}, {...}] ] becomes [ {...}, {...}, {...} ]
  const originInput = allOriginData.flat();

  // 3. Perform a single, efficient bulk insert.
  if (originInput.length > 0) {
    console.log(
      `[populateOriginForMediaList] Bulk inserting ${originInput.length} origin entries...`
    );
    await db
      .insert(tmdbMediaToTmdbOrigin)
      .values(originInput)
      .onConflictDoNothing();
  }

  console.log(`[populateOriginForMediaList] Finished.`);
}

// this is only used for new (user submitted) or existing but changed media so far
// (so seasonCount is there for existing media so that we can skip season fetch if season is up to date)
// fetch detail of each media
// inserts media/origin/genre
// inserts season and episode for tv (no need for additional detail fetch)
export async function populateMediaUsingTmdbIds(
  input: { tmdbId: number; type: 'movie' | 'tv'; seasonCount?: number }[]
) {
  // 1. batch fetch details from tmdb api and store details in one array
  console.log(
    `[populateMediaUsingTmdbIds] fetching media details: ${input.length}`
  );
  const mediaDetails: any[] = [];
  await runItemsInEachBatchConcurrently(input, 10, async (item) => {
    try {
      const detail = await fetchTmdbDetailViaApi(item.type, item.tmdbId);
      mediaDetails.push(detail);
    } catch (err) {
      console.error(
        `[populateMediaUsingTmdbIds] failed fetching detail: ${item.tmdbId}`,
        err
      );
    }
  });
  console.log(
    `[populateMediaUsingTmdbIds] done fetching media details: ${mediaDetails.length}`
  );

  // 2. upsert media, genre, origin
  const mediaOutput = await bulkUpsertNewMedia(mediaDetails);
  console.log(
    `[populateMediaUsingTmdbIds] Upserted media/genre/origin: ${mediaOutput.length}`
  );

  // 3. for each tv media, fetch seasons/episodes and upsert them
  // (no need to fetch detail for each tv bc we already did that above)
  const tvInput = mediaOutput
    .filter((m) => m.type === 'tv')
    .map((tv) => {
      return {
        ...tv,
        seasonCount: input.find((i) => i.tmdbId === tv.tmdbId)?.seasonCount,
      };
    });
  await populateSeasonAndEpisodeForTvList(tvInput, mediaDetails);

  return mediaOutput;
}

export async function updateRatingsForMediaList(
  input: {
    id: string;
    tmdbId: number;
    title: string;
    type: 'movie' | 'tv';
  }[]
) {
  // 1. Collect all the new rating details in an array first.
  const newRatings: {
    id: string;
    voteAverage: number;
    voteCount: number;
  }[] = [];

  await runItemsInEachBatchConcurrently(input, 10, async (media) => {
    const details = await fetchTmdbDetailViaApi(media.type, media.tmdbId);
    if (details?.vote_average && details?.vote_count) {
      newRatings.push({
        id: media.id,
        voteAverage: details.vote_average,
        voteCount: details.vote_count,
      });
    } else {
      console.log(
        `[updateRatingsForMediaList] ${media.type} (${media.title}): Missing ${
          details?.vote_average
            ? `vote vount`
            : details?.vote_count
            ? `vote avg`
            : `both count and avg`
        }`
      );
    }
  });
  if (newRatings.length === 0) {
    console.log('[updateRatingsForMediaList] No media from API had ratings.');
    return 0;
  }
  console.log(
    `[updateRatingsForMediaList] API returned ${newRatings.length} ratings for media. Starting bulk db insert...`
  );

  // 2. bulk update new ratings
  try {
    await db.execute(sql`
      UPDATE ${tmdbMedia} SET
        vote_average = ${sql.raw(`data.vote_average::real`)},
        vote_count = ${sql.raw(`data.vote_count::integer`)},
        vote_updated_at = NOW()
      FROM (VALUES ${sql.join(
        newRatings.map((r) => sql`(${r.id}, ${r.voteAverage}, ${r.voteCount})`),
        sql`, `
      )}) AS data(id, vote_average, vote_count)
      WHERE ${tmdbMedia.id} = ${sql.raw(`data.id::varchar`)};
    `);
  } catch (error) {
    console.error('[updateRatingsForMediaList] DATABASE UPDATE FAILED:', error);
    throw error;
  }

  console.log(
    `[updateRatingsForMediaList] Done: db updated ${newRatings.length} media ratings.`
  );
  return newRatings.length;
}
