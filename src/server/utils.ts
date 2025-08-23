import { db } from './db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
} from './db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { PuppeteerResult } from '~/type';

export async function fetchTmdbTrendingViaApi(limit: number) {
  const collected = [];
  let page = 1;

  while (collected.length < limit) {
    const resp = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?language=en-US&page=${page}`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );
    const { results } = await resp.json();

    collected.push(...results.slice(0, limit - collected.length));
    page += 1;
  }

  return collected;
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

export async function fetchTmdbMvGenreViaApi() {
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

export async function fetchTmdbTvGenreViaApi() {
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

async function fetchSrcFromProvidersFast(
  type: 'mv' | 'tv',
  path: string
): Promise<PuppeteerResult[]> {
  const providers = ['joy', 'easy', 'fast', 'link'];
  // Create a promise for each provider's fetch request.
  const resultPromises = providers.map((provider) =>
    fetch(`${process.env.VPS_URL}/api/puppeteer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, path, provider }),
    }).then((res) => {
      // This will cause the promise to reject, which is what we want.
      if (!res.ok) {
        throw new Error(`[${provider}] failed with status ${res.status}`);
      }
      return res.json() as Promise<PuppeteerResult>;
    })
  );
  const settledResults = await Promise.allSettled(resultPromises);
  // You can add more detailed logging to see which providers failed.
  settledResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[${providers[index]}] failure reason:`,
        result.reason.message
      );
    }
  });
  const successfulResults = settledResults
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => {
      // Process the successful value directly here
      const { provider, m3u8, subtitle } = (
        result as PromiseFulfilledResult<PuppeteerResult>
      ).value;
      console.log(
        `[${provider}] success: ${m3u8.type} ${subtitle ? '+ subtitle' : ''}`
      );
      return {
        provider,
        m3u8,
        subtitle: subtitle === undefined ? undefined : convertToVtt(subtitle),
      };
    });
  return successfulResults;
}

//works better than fast
async function fetchSrcFromProvidersSlow(
  type: 'mv' | 'tv',
  path: string
): Promise<PuppeteerResult[]> {
  const providers = ['joy', 'easy', 'fast', 'link'];
  const results: PuppeteerResult[] = [];

  for (const provider of providers) {
    try {
      const res = await fetch(`${process.env.VPS_URL}/api/puppeteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, path, provider }),
      });
      if (!res.ok) {
        console.error(`[${provider}] failed with status ${res.status}`);
        continue;
      }

      const result = await res.json();
      if (result) {
        results.push({
          provider: result.provider,
          m3u8: result.m3u8,
          subtitle:
            result.subtitle === undefined
              ? undefined
              : convertToVtt(result.subtitle),
        });
        console.log(
          `[${provider}] success: ${result.m3u8.type} ${
            result.subtitle ? '+ subtitle' : ''
          }`
        );
      } else {
        console.error(`[${provider}] failed`);
      }
    } catch (error) {
      console.error(`[${provider}] error:`, error);
      continue;
    }
  }
  return results;
}

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

export async function fetchAndUpsertMvSrc(fast: boolean, tmdbId: number) {
  const results = fast
    ? await fetchSrcFromProvidersFast('mv', `${tmdbId}`)
    : await fetchSrcFromProvidersSlow('mv', `${tmdbId}`);
  console.log(
    `[fetchAndUpsertMvSrc] Fetched ${results.length} sources: ${results.map(
      (result) => result.provider
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
  fast: boolean,
  tmdbId: number,
  season: number,
  episode: number,
  episodeIndex: number
) {
  let results = fast
    ? await fetchSrcFromProvidersFast('tv', `${tmdbId}/${season}/${episode}`)
    : await fetchSrcFromProvidersSlow('tv', `${tmdbId}/${season}/${episode}`);
  console.log(
    `[fetchAndUpsertTvSrc] Fetched ${results.length} sources: ${results.map(
      (result) => result.provider
    )}`
  );
  if (results.length === 0) {
    if (episode === episodeIndex) return;
    console.log(
      `[fetchAndUpsertMvSrc] Trying episode index: ${tmdbId}/${season}/${episodeIndex}`
    );
    results = fast
      ? await fetchSrcFromProvidersFast('tv', `${tmdbId}/${season}/${episode}`)
      : await fetchSrcFromProvidersSlow('tv', `${tmdbId}/${season}/${episode}`);
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

// export async function upsertSeasonsAndEpisodes(details: any, mediaId: string) {
//   // 1. get seasons of the tv
//   const seasons = details.seasons;
//   if (!seasons) return;

//   // 2. for each season...
//   for (const season of seasons) {
//     await db.transaction(async (tx) => {
//       if (season.season_number === 0) return;
//       // 3. upsert the season
//       const [seasonOutput] = await tx
//         .insert(tmdbSeason)
//         .values({
//           id: crypto.randomUUID(),
//           mediaId: mediaId,
//           seasonNumber: season.season_number,
//           title: season.name,
//           description: season.overview,
//           imageUrl: season.poster_path,
//         })
//         .onConflictDoUpdate({
//           target: [tmdbSeason.mediaId, tmdbSeason.seasonNumber],
//           set: {
//             title: season.name,
//             description: season.overview,
//             imageUrl: season.poster_path,
//           },
//         })
//         .returning();
//       if (!seasonOutput) {
//         console.error(
//           `[upsertNewTvInfo] failed to upsert ${details.id} s${season.season_number}`
//         );
//         return;
//       }

//       // 4. get episodes of that season
//       const seasonDetails = await fetchTmdbSeasonDetailViaApi(
//         details.id,
//         season.season_number
//       );
//       const episodes = seasonDetails.episodes;
//       if (!episodes) return;

//       // 5. for each episode...
//       for (const episode of episodes) {
//         // 6. insert that episode
//         const [episodeOutput] = await tx
//           .insert(tmdbEpisode)
//           .values({
//             id: crypto.randomUUID(),
//             seasonId: seasonOutput.id,
//             episodeNumber: episode.episode_number,
//             title: episode.name,
//             description: episode.overview,
//             airDate: !!episode.air_date ? new Date(episode.air_date) : null,
//           })
//           .onConflictDoUpdate({
//             target: [tmdbEpisode.seasonId, tmdbEpisode.episodeNumber],
//             set: {
//               title: episode.name,
//               description: episode.overview,
//               airDate: !!episode.air_date ? new Date(episode.air_date) : null,
//             },
//           })
//           .returning();
//         if (!episodeOutput) {
//           console.error(
//             `[upsertNewTvInfo] failed to upsert ${details.id} s${season.season_number}e${episode.episode_number}`
//           );
//           continue;
//         }
//       }
//       console.log(
//         `[upsertNewTvInfo] ${details.id} s${season.season_number}: ${episodes.length} episodes`
//       );
//     });
//   }
// }

// export async function upsertLatestSeasonAndEpisodes(
//   details: any,
//   mediaId: string
// ) {
//   await db.transaction(async (tx) => {});
// }

// export async function upsertExistingTvInfo(details: any, mediaId: string) {
//   // Only proceed if there is information about the last aired episode
//   const lastAired = details.last_episode_to_air;
//   if (!lastAired) {
//     return; // Nothing to update
//   }

//   await db.transaction(async (tx) => {
//     const releaseDate = details.next_episode_to_air?.air_date;
//     // 1. Update the next episode date on the main media entry
//     await tx
//       .update(tmdbMedia)
//       .set({
//         releaseDate: !!releaseDate ? new Date(releaseDate) : null,
//       })
//       .where(eq(tmdbMedia.id, mediaId))
//       .execute();

//     // 2. Find or create the current airing season
//     let existingSeason = await tx.query.tmdbSeason.findFirst({
//       where: and(
//         eq(tmdbSeason.mediaId, mediaId),
//         eq(tmdbSeason.seasonNumber, lastAired.season_number)
//       ),
//     });

//     if (!existingSeason) {
//       const newSeasonResult = await tx
//         .insert(tmdbSeason)
//         .values({
//           id: crypto.randomUUID(),
//           mediaId: mediaId,
//           seasonNumber: lastAired.season_number,
//         })
//         .returning();
//       existingSeason = newSeasonResult[0];
//     }

//     if (!existingSeason) return;

//     // 3. Prepare episode inputs ONLY for the current season up to the last aired episode
//     const episodeInputs = Array.from(
//       { length: lastAired.episode_number },
//       (_, i) => ({
//         id: crypto.randomUUID(),
//         seasonId: existingSeason.id,
//         episodeNumber: i + 1,
//       })
//     );

//     // 4. Bulk upsert episodes for the current season
//     if (episodeInputs.length > 0) {
//       await tx
//         .insert(tmdbEpisode)
//         .values(episodeInputs)
//         .onConflictDoNothing()
//         .execute();
//     }
//   });
// }

// // find episodes whose airDate is older than given date and have no src
// // then fetch src for those episodes
// export async function findSrclessEpisodesAndFetchSrc(
//   mediaId: string,
//   tmdbId: number,
//   targetDate: Date
// ) {
//   const results = await db
//     .select({
//       episode: tmdbEpisode,
//       season: tmdbSeason,
//       episodeIndex:
//         sql<number>`row_number() over (partition by ${tmdbSeason.id} order by ${tmdbEpisode.episodeNumber} asc)`.as(
//           'episodeIndex'
//         ),
//     })
//     .from(tmdbEpisode)
//     .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
//     .where(
//       and(
//         isNotNull(tmdbEpisode.airDate),
//         lte(tmdbEpisode.airDate, targetDate),
//         eq(tmdbSeason.mediaId, mediaId),
//         notExists(
//           db
//             .select({ one: sql`1` })
//             .from(tmdbSource)
//             .where(eq(tmdbSource.episodeId, tmdbEpisode.id))
//         )
//       )
//     )
//     .orderBy(asc(tmdbSeason.seasonNumber), asc(tmdbEpisode.episodeNumber));

//   let count = 0;
//   const total = results.length;

//   for (const { season, episode, episodeIndex } of results) {
//     count = count + 1;
//     console.log(
//       `[findSrclessEpisodesAndFetchSrc] Progress: ${count}/${total} ${tmdbId}/${season.seasonNumber}/${episode.episodeNumber}(${episodeIndex})`
//     );
//     await fetchAndUpsertTvSrc(
//       tmdbId,
//       season.seasonNumber,
//       episode.episodeNumber,
//       episodeIndex
//     );
//   }
// }
