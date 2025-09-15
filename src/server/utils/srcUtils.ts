import { closeCluster, getCluster } from '~/server/utils/puppeteerClusterUtils';
import {
  indexProviderMap,
  mvProvidersMap,
  tvProvidersMap,
} from '~/server/utils/puppeteerUtils';
import type { PuppeteerResult } from '~/type';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
} from '../db/schema';
import {
  eq,
  and,
  asc,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import { db } from '../db';
import { runItemsInEachBatchConcurrently } from './utils';

function convertToVtt(subtitle: string): string {
  if (subtitle.trim().startsWith('WEBVTT')) return subtitle;
  // First, normalize all line endings to \n for consistency.
  // This handles files from both Windows (\r\n) and Unix (\n).
  let newSubtitle = subtitle.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Replace SRT's comma decimal format with VTT's period format.
  newSubtitle = newSubtitle.replace(/,(\d{3})/g, '.$1');
  // Remove SRT-style numeric cues AND the newline that follows them.
  newSubtitle = newSubtitle.replace(/^\d+\n/gm, '');
  // Add the standard WEBVTT header and clean up any leading/trailing space.
  return 'WEBVTT\n\n' + newSubtitle.trim();
}

/**
 * This function now runs entirely on the server, using the shared cluster
 * instance instead of making an internal HTTP request.
 */
async function fetchSrcFromProvidersFast(
  type: 'mv' | 'tv',
  path: string
): Promise<PuppeteerResult[]> {
  try {
    // 1. Get the already-initialized shared cluster instance.
    const cluster = await getCluster();
    const providers = ['videasy', 'vidjoy', 'vidlink'];

    // 2. Queue all tasks to run in parallel on the cluster.
    const promises = providers.map((provider) => {
      const embedUrl = `${
        type === 'mv' ? mvProvidersMap[provider] : tvProvidersMap[provider]
      }/${path}`;
      return cluster.execute({ provider, embedUrl });
    });

    // 3. Wait for all tasks to complete.
    const results = await Promise.all(promises);

    // 4. Filter out failures and process successful results.
    const successfulResults = results.filter(
      (r): r is PuppeteerResult => r !== null
    );

    successfulResults.forEach((result) => {
      console.log(
        `[${indexProviderMap[result.provider]}] success: ${result.m3u8.type} ${
          result.subtitle ? '+ subtitle' : ''
        }`
      );
    });

    return successfulResults.map((result) => ({
      ...result,
      subtitle: result.subtitle ? convertToVtt(result.subtitle) : undefined,
    }));
  } catch (error) {
    console.error(
      `[fetchSrcFromProvidersFast] A critical error occurred:`,
      error
    );
    return []; // Return empty array on failure
  }
}

async function upsertSrcAndSubtitle(
  type: 'mv' | 'tv',
  id: string,
  results: PuppeteerResult[]
) {
  const isMovie = type === 'mv';
  const sourcesToUpsert = results.map((result) => ({
    mediaId: isMovie ? id : null,
    episodeId: isMovie ? null : id,
    provider: result.provider,
    type: result.m3u8.type,
    url: result.m3u8.url,
    headers: result.m3u8.headers,
  }));

  const conflictTarget = isMovie
    ? [tmdbSource.mediaId, tmdbSource.provider]
    : [tmdbSource.episodeId, tmdbSource.provider];
  const sourceIds = await db
    .insert(tmdbSource)
    .values(sourcesToUpsert)
    .onConflictDoUpdate({
      target: conflictTarget,
      set: {
        url: sql`excluded.url`,
        headers: sql`excluded.headers`,
        type: sql`CASE WHEN excluded.type = 'master' 
                       THEN excluded.type 
                       ELSE tmdb_source.type END`,
      },
      where: sql`excluded.type = 'master' OR excluded.type = tmdb_source.type`,
    })
    .returning({ id: tmdbSource.id });

  if (sourceIds.length === 0) return; // Nothing to do for subtitles

  const subtitlesToUpsert = results
    .filter((result) => result.subtitle !== undefined)
    .map((result, index) => ({
      sourceId: sourceIds[index]!.id,
      language: 'English',
      content: result.subtitle!,
    }));

  if (subtitlesToUpsert.length > 0) {
    await db
      .insert(tmdbSubtitle)
      .values(subtitlesToUpsert)
      .onConflictDoUpdate({
        target: [tmdbSubtitle.sourceId, tmdbSubtitle.language],
        set: { content: sql`excluded.content` },
      });
  }
}

export async function fetchAndUpsertMvSrc(
  // spd: 'fast' | 'slow',
  tmdbId: number
) {
  // const results =
  //   spd === 'fast'
  //     ? await fetchSrcFromProvidersFast('mv', `${tmdbId}`)
  //     : await fetchSrcFromProvidersSlow('mv', `${tmdbId}`);
  const results = await fetchSrcFromProvidersFast('mv', `${tmdbId}`);
  console.log('=======');
  console.log(
    `[fetchAndUpsertMvSrc] Fetched ${results.length} sources: ${results.map(
      (result) => indexProviderMap[result.provider]
    )}`
  );
  if (results.length === 0) {
    return;
  }
  // insert sources into tmdbSource table
  // 1. Find the media's internal ID using a join.
  const [mediaData] = await db
    .select({
      id: tmdbMedia.id,
    })
    .from(tmdbMedia)
    .where(eq(tmdbMedia.tmdbId, tmdbId))
    .limit(1);
  // 2. If the media doesn't exist in your DB, throw an error.
  if (!mediaData) {
    throw new Error(`fetchMvSrc failed: media not found for tmdbId: ${tmdbId}`);
  }
  // 3. upsert sources and subtitles
  await upsertSrcAndSubtitle('mv', mediaData.id, results);

  // 4. after successful src fetch -> flag media as needing denorm field update
  await db
    .update(tmdbMedia)
    .set({ denormFieldsOutdated: true })
    .where(eq(tmdbMedia.id, mediaData.id));
}

export async function fetchAndUpsertTvSrc(
  // spd: 'fast' | 'slow',
  mediaId: string,
  tmdbId: number,
  season: number,
  episode: number,
  episodeIndex: number
) {
  // let results =
  //   spd === 'fast'
  //     ? await fetchSrcFromProvidersFast('tv', `${tmdbId}/${season}/${episode}`)
  //     : await fetchSrcFromProvidersSlow('tv', `${tmdbId}/${season}/${episode}`);
  let results = await fetchSrcFromProvidersFast(
    'tv',
    `${tmdbId}/${season}/${episode}`
  );
  console.log('=======');
  console.log(
    `[fetchAndUpsertTvSrc] Fetched ${results.length} sources: ${results.map(
      (result) => indexProviderMap[result.provider]
    )}`
  );
  if (results.length === 0) {
    if (episode === episodeIndex) return;
    console.log(
      `[fetchAndUpsertMvSrc] Trying episode index: ${tmdbId}/${season}/${episodeIndex}`
    );
    // results = spd
    //   ? await fetchSrcFromProvidersFast('tv', `${tmdbId}/${season}/${episode}`)
    //   : await fetchSrcFromProvidersSlow('tv', `${tmdbId}/${season}/${episode}`);
    results = await fetchSrcFromProvidersFast(
      'tv',
      `${tmdbId}/${season}/${episodeIndex}`
    );
    if (results.length === 0) return;
  }
  // insert sources into tmdbSource table
  // 1. Find the episode's internal ID using a join.
  const [episodeData] = await db
    .select({
      id: tmdbEpisode.id,
    })
    .from(tmdbEpisode)
    .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
    .innerJoin(tmdbMedia, eq(tmdbSeason.mediaId, tmdbMedia.id))
    .where(
      and(
        eq(tmdbMedia.tmdbId, tmdbId),
        eq(tmdbSeason.seasonNumber, season),
        eq(tmdbEpisode.episodeNumber, episode)
      )
    )
    .limit(1);
  // 2. If the episode doesn't exist in your DB, throw an error.
  if (!episodeData) {
    throw new Error(
      `[fetchAndUpsertTcSrc] failed: episode not found for ${tmdbId}/${season}/${episode}`
    );
  }
  // 3. upsert sources and subtitles
  await upsertSrcAndSubtitle('tv', episodeData.id, results);

  // 4. after successful src fetch -> flag media as needing denorm field update
  await db
    .update(tmdbMedia)
    .set({ denormFieldsOutdated: true })
    .where(eq(tmdbMedia.id, mediaId));
}
// fetch src for an arbitrary list of media
// mv: skip if it has source
// tv: find srcless episodes and fetch src for them
export async function fetchSrcForMediaIds(input: string[]) {
  if (input.length === 0) {
    console.log('[fetchSrcForMediaList] empty input.');
    return;
  }
  console.log(`[fetchSrcForMediaList] input length: ${input.length}`);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // --- 1. Find mv whose release date is older than today but have no src ---
  const mvConditions = [
    eq(tmdbMedia.type, 'movie'),
    isNotNull(tmdbMedia.releaseDate),
    lte(tmdbMedia.releaseDate, yesterday),
    isNull(tmdbSource.id),
    inArray(tmdbMedia.id, input),
  ];
  // if (input !== 'all') {
  //   mvConditions.push(inArray(tmdbMedia.id, input));
  // }

  const srclessMv = await db
    .select({
      id: tmdbMedia.id,
      tmdbId: tmdbMedia.tmdbId,
      title: tmdbMedia.title,
    })
    .from(tmdbMedia)
    .leftJoin(tmdbSource, eq(tmdbSource.mediaId, tmdbMedia.id))
    .where(and(...mvConditions));

  // --- 2. Find tv episodes whose air date is older than today but have no src ---
  const tvConditions = [
    isNotNull(tmdbEpisode.airDate),
    lte(tmdbEpisode.airDate, yesterday),
    isNull(tmdbSource.id),
    inArray(tmdbMedia.id, input),
  ];
  // if (input !== 'all') {
  //   tvConditions.push(inArray(tmdbMedia.id, input));
  // }

  // Create a subquery to count aired episodes for each media
  // subqueries behave like tables for the duration of the query
  const airedEpisodeSubquery = db
    .select({
      mediaId: tmdbSeason.mediaId,
      // The .as('episode_count') is crucial for referencing this column later.
      episodeCount: sql<number>`count(${tmdbEpisode.id})`.as('episode_count'),
    })
    .from(tmdbEpisode)
    .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
    .where(
      and(isNotNull(tmdbEpisode.airDate), lte(tmdbEpisode.airDate, yesterday))
    )
    .groupBy(tmdbSeason.mediaId)
    .as('aired_episode_subquery'); // We must alias the subquery to use it in a join.

  const srclessEpisodes = await db
    .select({
      episode: tmdbEpisode,
      season: tmdbSeason,
      media: tmdbMedia,
      airedEpisodeCount: airedEpisodeSubquery.episodeCount,
    })
    .from(tmdbEpisode)
    .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
    .innerJoin(tmdbMedia, eq(tmdbSeason.mediaId, tmdbMedia.id))
    .innerJoin(
      airedEpisodeSubquery,
      eq(tmdbMedia.id, airedEpisodeSubquery.mediaId)
    )
    .leftJoin(tmdbSource, eq(tmdbSource.episodeId, tmdbEpisode.id))
    .where(and(...tvConditions))
    .orderBy(
      asc(airedEpisodeSubquery.episodeCount),
      asc(tmdbMedia.tmdbId),
      asc(tmdbSeason.seasonNumber),
      asc(tmdbEpisode.episodeNumber)
    );

  if (srclessMv.length === 0 && srclessEpisodes.length === 0) {
    console.log('[fetchSrcForMediaList] all media have src already.');
    return;
  }

  // --- 3. Process the findings using the Puppeteer cluster ---
  const cluster = await getCluster();
  try {
    let processedMvCount = 0;
    await runItemsInEachBatchConcurrently(srclessMv, 1, async (media) => {
      processedMvCount++;
      console.log(`=======`);
      console.log(
        `[fetchSrcForMediaList] mv progress: ${processedMvCount}/${srclessMv.length} (${media.tmdbId}: ${media.title})`
      );
      await fetchAndUpsertMvSrc(media.tmdbId);
    });

    let processedEpisodeCount = 0;
    await runItemsInEachBatchConcurrently(srclessEpisodes, 1, async (item) => {
      processedEpisodeCount++;
      console.log(`=======`);
      console.log(
        `[fetchSrcForMediaList] tv progress: ${processedEpisodeCount}/${srclessEpisodes.length} (${item.media.tmdbId}/${item.season.seasonNumber}/${item.episode.episodeNumber}: ${item.media.title}) (${item.airedEpisodeCount})`
      );
      const { episode, season, media } = item;
      await fetchAndUpsertTvSrc(
        media.id,
        media.tmdbId,
        season.seasonNumber,
        episode.episodeNumber,
        episode.episodeIndex
      );
    });
  } finally {
    // CRITICAL: Close the cluster after ALL media items are processed.
    await closeCluster();
  }
}
