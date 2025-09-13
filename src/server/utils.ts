import { closeCluster, getCluster } from '~/app/_utils/clusterManager';
import { db } from './db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbMediaToTmdbOrigin,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
  tmdbTrending,
} from './db/schema';
import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import type { LatestEpisodeInfo, PuppeteerResult } from '~/type';
import {
  indexProviderMap,
  mvProvidersMap,
  tvProvidersMap,
} from '~/app/_utils/puppeteer';

import { env } from '~/env';

const TMDB_API_HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${env.TMDB_API_KEY}`,
};

type TmdbChangedItem = {
  id: number;
  adult: boolean;
};

type TmdbChangesApiResponse = {
  results: TmdbChangedItem[];
  page: number;
  total_pages: number;
  total_results: number;
};

type MediaTypeAndTmdbId = {
  type: 'movie' | 'tv';
  tmdbId: number;
};

type MediaTypeAndTmdbIdAndSeasonCount = {
  type: 'movie' | 'tv';
  tmdbId: number;
  seasonCount: number;
};

/**
 * Fetches all changed IDs for a specific media type (movie or tv)
 * by handling the pagination concurrently.
 * @param mediaType - The type of media to fetch ('movie' or 'tv').
 * @returns An array of objects containing the type and tmdbId.
 */

async function fetchChangedTmdbIds(
  mediaType: 'movie' | 'tv'
): Promise<MediaTypeAndTmdbId[]> {
  const baseUrl = `https://api.themoviedb.org/3/${mediaType}/changes`;

  // 1. Make the first request to get the total number of pages
  const initialResponse = await fetch(`${baseUrl}?page=1`, {
    headers: TMDB_API_HEADERS,
  });
  if (!initialResponse.ok) {
    throw new Error(`Failed to fetch initial page for ${mediaType} changes`);
  }
  const initialData: TmdbChangesApiResponse = await initialResponse.json();
  const totalPages = initialData.total_pages;
  let allResults = initialData.results;
  if (totalPages <= 1) {
    return allResults.map((item) => ({ type: mediaType, tmdbId: item.id }));
  }

  // --- REFACTORED BATCHING LOGIC ---

  // 2. Create a list of all the remaining page numbers we need to fetch
  const pagesToFetch: number[] = [];
  for (let page = 2; page <= totalPages; page++) {
    pagesToFetch.push(page);
  }

  const batchSize = 10;
  // 3. Loop through the page numbers in batches
  for (let i = 0; i < pagesToFetch.length; i += batchSize) {
    const pageBatch = pagesToFetch.slice(i, i + batchSize);

    // 4. Create fetch promises for the current batch
    const batchFetchPromises = pageBatch.map((page) =>
      fetch(`${baseUrl}?page=${page}`, { headers: TMDB_API_HEADERS })
    );

    // 5. Execute the current batch of 10 requests concurrently
    const responses = await Promise.all(batchFetchPromises);

    // 6. Process the results from the batch
    for (const res of responses) {
      if (res.ok) {
        const pageData: TmdbChangesApiResponse = await res.json();
        allResults = allResults.concat(pageData.results);
      } else {
        console.warn(
          `[fetchChangedIdsForType] Failed to fetch a page for ${mediaType}. Status: ${res.status}`
        );
      }
    }
    console.log(
      `[fetchChangedIdsForType] ${mediaType} progress: ${
        i + 1
      }/${totalPages} pages`
    );
  }

  // 7. Map the final combined results to the desired format
  return allResults.map((item) => ({ type: mediaType, tmdbId: item.id }));
}
/**
 * Fetches all changed movie and TV show IDs from all pages of the TMDB Changes API.
 * @returns A single array containing all changed movie and TV IDs.
 */
export async function fetchAllChangedTmdbIds(): Promise<MediaTypeAndTmdbId[]> {
  try {
    // Run the fetching for movies and TV shows in parallel
    const [changedMvIds, changedTvIds] = await Promise.all([
      fetchChangedTmdbIds('movie'),
      fetchChangedTmdbIds('tv'),
    ]);
    console.log(`[fetchAllChangedTmdbIds] changed mv: ${changedMvIds.length}`);
    console.log(`[fetchAllChangedTmdbIds] changed tv: ${changedTvIds.length}`);
    const combinedIds = [...changedMvIds, ...changedTvIds];
    return combinedIds;
  } catch (error) {
    console.error('[fetchAllChangedTmdbIds] An error occurred:', error);
    return []; // Return an empty array on failure
  }
}

/**
 * Takes an array of media identifiers and returns a filtered list of only those
 * that exist in the local database, along with their season count.
 * @param input - An array of objects with tmdbId and type.
 * @returns A promise that resolves to an array of existing media with their season count.
 */
export async function findExistingTmdbIds(
  input: MediaTypeAndTmdbId[]
): Promise<MediaTypeAndTmdbIdAndSeasonCount[]> {
  if (input.length === 0) {
    return [];
  }

  // 1. Create a composite WHERE clause to match pairs of (tmdbId, type).
  //    This generates a query like:
  //    WHERE (tmdbId = 123 AND type = 'tv') OR (tmdbId = 456 AND type = 'movie') ...
  const compositeWhereClause = or(
    ...input.map((id) =>
      and(eq(tmdbMedia.tmdbId, id.tmdbId), eq(tmdbMedia.type, id.type))
    )
  );

  if (!compositeWhereClause) {
    return []; // Should not happen if changedIds is not empty, but good for type safety
  }

  // 2. Execute a single query to find matching media and count their seasons.
  const existingMedia = await db
    .select({
      tmdbId: tmdbMedia.tmdbId,
      type: tmdbMedia.type,
      // We count the season IDs. A LEFT JOIN ensures this count is 0 for movies.
      seasonCount: sql<number>`count(${tmdbSeason.id})`.mapWith(Number),
    })
    .from(tmdbMedia)
    .leftJoin(tmdbSeason, eq(tmdbMedia.id, tmdbSeason.mediaId))
    .where(compositeWhereClause)
    .groupBy(tmdbMedia.id, tmdbMedia.tmdbId, tmdbMedia.type);

  return existingMedia;
}

export async function fetchTmdbTopRatedViaApi(
  limit: number,
  type: 'movie' | 'tv'
) {
  const collected = [];
  const seenIds = new Set(); // Use a Set to track seen IDs
  let page = 1;

  while (collected.length < limit) {
    const resp = await fetch(
      `https://api.themoviedb.org/3/${type}/top_rated?language=en-US&page=${page}`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );
    const { results } = await resp.json();

    // Break the loop if the API has no more results to prevent an infinite loop
    if (!results || results.length === 0) {
      break;
    }

    // Iterate through the fetched results
    for (const item of results) {
      // Check if the item's ID has not been seen yet
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id); // Add the new ID to the set
        collected.push(item); // Add the unique item to our collection
      }
      // Stop once we have collected enough items
      if (collected.length >= limit) {
        break;
      }
    }
    page += 1;
  }

  // Ensure the final array is exactly the length of the limit
  return collected.slice(0, limit);
}

export async function fetchTmdbTrendingViaApi(limit: number) {
  const collected = [];
  const seenIds = new Set(); // Use a Set to track seen IDs
  let page = 1;

  while (collected.length < limit) {
    const resp = await fetch(
      `https://api.themoviedb.org/3/trending/all/day?language=en-US&page=${page}`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );
    const { results } = await resp.json();

    // Break the loop if the API has no more results
    if (!results || results.length === 0) {
      break;
    }

    // Iterate through the fetched results
    for (const item of results) {
      // Check if the item's ID has not been seen yet
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id); // Add the new ID to the set
        collected.push(item); // Add the unique item to our collection
      }
      // Stop once we have collected enough items
      if (collected.length >= limit) {
        break;
      }
    }
    page += 1;
  }

  // Ensure the final array is exactly the length of the limit
  return collected.slice(0, limit);
}

export async function fetchTmdbDetailViaApi(type: string, id: number) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return { ...data, media_type: type };
}

export async function fetchTmdbOriginsViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/configuration/countries?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbMvGenresViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?language=en`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbTvGenresViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/genre/tv/list?language=en`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbSeasonDetailViaApi(
  id: number,
  seasonNumber: number
) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function bulkUpsertNewMedia(fetchOutput: any[]) {
  // 2. Prepare db input from api fetch ouput (removes duplicates)
  const mediaInput = Array.from(
    new Map(
      fetchOutput
        .filter(
          (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
        )
        .map((item: any) => [
          item.id,
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
            genreIds: item.genre_ids || [],
            originIds: item.origin_country || [],
            popularity: item.popularity,
            voteAverage: item.vote_average,
            voteCount: item.vote_count,
            voteUpdatedAt: new Date(),
          },
        ])
    ).values()
  );

  // 3. Insert or update media table
  const mediaOutput = await db
    .insert(tmdbMedia)
    // MODIFIED: Exclude both genreIds and originIds from this insert
    .values(mediaInput.map(({ genreIds, originIds, ...rest }) => rest))
    .onConflictDoUpdate({
      target: tmdbMedia.tmdbId,
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
        voteUpdatedAt: sql`excluded.vote_updated_at`,
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

  return mediaOutput;
}

// runs items in each batch together in a single bulk
export async function runItemsInEachBatchInBulk<T>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[runItemsInEachBatchInBulk] progress: ${i + batch.length}/${
        items.length
      }`
    );
    await processFn(batch);
  }
  // console.log('Finished processing all batches.');
}

// runs items in each batch concurrently
export async function runItemsInEachBatchConcurrently<T>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processFn));
  }
}

// Helper function to be placed outside the router
export async function bulkUpdatePopularity(
  batch: { tmdbId: number; popularity: number }[]
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
      WHERE ${tmdbMedia.tmdbId} = ${sql.raw(`data.tmdb_id::integer`)};
    `);
  } catch (error) {
    console.error('[bulkUpdatePopularity] DATABASE FAILED:', error);
    throw error;
  }
}

// async function fetchSrcFromProvidersFast(
//   type: 'mv' | 'tv',
//   path: string
// ): Promise<PuppeteerResult[]> {
//   const response = await fetch(`${process.env.BUNNY_URL}/api/puppeteer`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ type, path }), // Send the batch job
//   });
//   if (!response.ok) {
//     console.error(
//       `[fetchSrcFromProvidersFast] Batch request failed with status ${response.status}. Response obj: `,
//       response
//     );
//   }

//   const results = (await response.json()) as PuppeteerResult[];
//   return results.map((result) => {
//     console.log(
//       `[${indexProviderMap[result.provider]}] success: ${result.m3u8.type} ${
//         result.subtitle ? '+ subtitle' : ''
//       }`
//     );
//     return {
//       ...result,
//       subtitle: result.subtitle ? convertToVtt(result.subtitle) : undefined,
//     };
//   });
// }

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

// async function fetchSrcFromProvidersSlow(
//   type: 'mv' | 'tv',
//   path: string
// ): Promise<PuppeteerResult[]> {
//   const providers = ['joy', 'easy', 'link'];
//   const results: PuppeteerResult[] = [];

//   for (const provider of providers) {
//     console.log('=======');
//     try {
//       const res = await fetch(`${process.env.BUNNY_URL}/api/puppeteer`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ type, path, index: providerIndexMap[provider] }),
//       });
//       if (!res.ok) {
//         console.error(`[${provider}] failed with status ${res.status}`);
//         continue;
//       }

//       const result = await res.json();
//       if (result) {
//         results.push({
//           provider: result.provider,
//           m3u8: result.m3u8,
//           subtitle:
//             result.subtitle === undefined
//               ? undefined
//               : convertToVtt(result.subtitle),
//         });
//         console.log(
//           `[${provider}] success: ${result.m3u8.type} ${
//             result.subtitle ? '+ subtitle' : ''
//           }`
//         );
//       } else {
//         console.error(`[${provider}] failed`);
//       }
//     } catch (error) {
//       console.error(`[${provider}] error:`, error);
//       continue;
//     }
//   }
//   return results;
// }

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

export async function upsertSeasonsAndEpisodes(
  detail: any,
  media: {
    mediaId: string;
    seasonCount?: number;
  }
) {
  const seasonsFromApi = detail.seasons?.filter(
    (s: { season_number: number }) => s.season_number !== 0
  );
  if (!seasonsFromApi || seasonsFromApi.length === 0) return;

  // if no seasonCount -> new tv -> insert seasons/episodes
  // if has seasonCount -> existing tv -> check if seasonCount is correct -> if not, refetch and upsert
  if (media.seasonCount && media.seasonCount === seasonsFromApi.length) return;

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

async function populateSeasonAndEpisodeForTvList(
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
  if (tvInput.length === 0) return;

  if (tvDetails.length === 0) {
    // 1. fetch details from tmdb api and store details in one array
    await runItemsInEachBatchConcurrently(tvInput, 10, async (tv) => {
      console.log(
        `[populateSeasonAndEpisodeForTvList] fetch tv detail: ${count}/${tvInput.length} (${tv.tmdbId}:${tv.title})`
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

export async function populateMediaUsingTmdbTrending(limit: number) {
  // 1. delete trending list first
  await db.delete(tmdbTrending).execute();

  // 2. fetch trending from api (mv will be missing origin, tv will be missing season/episode)
  const fetchOutput = await fetchTmdbTrendingViaApi(limit);

  // 3. insert fetched result to media/genre/origin tables
  const mediaOutput = await bulkUpsertNewMedia(fetchOutput);

  // 4. insert new media to trending table
  const trendingInput = mediaOutput.map((item, index) => {
    return {
      mediaId: item.mediaId,
      rank: index,
    };
  });
  await db.insert(tmdbTrending).values(trendingInput).execute();

  // 1. fill origin for trending mv
  const trendingMv = mediaOutput.filter((media) => media.type === 'movie');

  let movieCount = 0;
  const mvOriginInput: { mediaId: string; originId: string }[] = [];
  await runItemsInEachBatchConcurrently(trendingMv, 10, async (movie) => {
    movieCount++;
    console.log(
      `[populateMediaUsingTmdbTrending] mv progress: ${movieCount}/${trendingMv.length} (${movie.tmdbId}:${movie.title})`
    );
    // 2. for mv, fetch detail via api
    const details = await fetchTmdbDetailViaApi('movie', movie.tmdbId);
    // 3. for mv, collect origin inputs
    const originInput = details.origin_country.map((originId: string) => ({
      mediaId: movie.mediaId,
      originId: originId,
    }));
    mvOriginInput.push(...originInput);
  });
  // 4. bulk insert mv origin
  if (mvOriginInput.length > 0) {
    await db
      .insert(tmdbMediaToTmdbOrigin)
      .values(mvOriginInput)
      .onConflictDoNothing();
  }

  // 1. fill season/episode for trending tv
  const trendingTv = mediaOutput.filter((media) => media.type === 'tv');
  await populateSeasonAndEpisodeForTvList(trendingTv, fetchOutput);

  return mediaOutput;
}

// must insert all tmdbMedia fields (other than denormed)
// And it must have origin and genre table filled.
// Then it must have season and episode table filled as well.
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

// fetch src for an arbitrary list of media
// mv: skip if it has source
// tv: find srcless episodes and fetch src for them
export async function fetchSrcForMediaList(input: string[]) {
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
    return { success: true, count: 0 };
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

export async function updateAllChangedMedia() {
  // 1. Get ALL changed IDs from the TMDB API
  const allChangedIds = await fetchAllChangedTmdbIds();
  console.log(
    `[updateMediaUsingTmdbChangedApi] number of changed media in tmdb: ${allChangedIds.length}`
  );

  // 2. Filter that list to find only the ones that are in YOUR database
  const changedIdsInMyDb = await findExistingTmdbIds(allChangedIds);
  console.log(
    `[updateMediaUsingTmdbChangedApi] number of changed media in db: ${changedIdsInMyDb.length}`
  );
  // console.log(changedIdsInMyDb);

  // 3. run update on the changed media list
  await populateMediaUsingTmdbIds(changedIdsInMyDb);
}
