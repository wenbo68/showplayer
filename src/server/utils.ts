import { getCluster } from '~/app/_utils/clusterManager';
import { db } from './db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbMediaToTmdbOrigin,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
} from './db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { PuppeteerResult } from '~/type';
import {
  indexProviderMap,
  mvProvidersMap,
  tvProvidersMap,
} from '~/app/_utils/puppeteer';

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
  return data;
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

export async function upsertNewMedia(fetchOutput: any[]) {
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
      },
    })
    .returning({
      mediaId: tmdbMedia.id,
      tmdbId: tmdbMedia.tmdbId,
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

// Helper function to process arrays in batches
export async function batchProcess<T>(
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
export async function batchUpdatePopularity(
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
    console.error('[batchUpdatePopularity] DATABASE FAILED:', error);
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
}

export async function fetchAndUpsertTvSrc(
  // spd: 'fast' | 'slow',
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
}

export async function upsertSeasonsAndEpisodes(details: any, mediaId: string) {
  const seasonsFromApi = details.seasons?.filter(
    (s: { season_number: number }) => s.season_number !== 0
  );

  if (!seasonsFromApi || seasonsFromApi.length === 0) return;

  // 1. Fetch all season details from the API in parallel
  console.log(
    `[upsertSeasonsAndEpisodes] Fetching season details via api: ${seasonsFromApi.length}`
  );
  const seasonDetailsPromises = seasonsFromApi.map((season: any) =>
    fetchTmdbSeasonDetailViaApi(details.id, season.season_number)
  );
  const seasonDetails = await Promise.all(seasonDetailsPromises);

  // 2. Prepare all seasons for a single batch upsert
  const seasonInput = seasonsFromApi.map((season: any) => ({
    mediaId: mediaId,
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

    console.log(`[upsertSeasonsAndEpisodes] ${details.id}: Done.`);
  });
}
