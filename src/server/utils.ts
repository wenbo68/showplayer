import { fetchMvSrc, fetchTvSrc } from '~/utils/puppeteer';
import { db } from './db';
import { tmdbEpisode, tmdbMedia, tmdbSeason, tmdbSource } from './db/schema';
import {
  lte,
  or,
  and,
  eq,
  inArray,
  isNull,
  notExists,
  sql,
  isNotNull,
} from 'drizzle-orm'; // <<< Import 'eq' from drizzle-orm

export async function fetchTmdbTrending(limit: number) {
  const collected = [];
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

    collected.push(...results.slice(0, limit - collected.length));
    page += 1;
  }

  return collected;
}

export async function fetchTmdbDetailById(type: string, id: number) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const { data } = await resp.json();
  return data;
}

export async function fetchAnilistTrending(limit: number) {
  const currDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  console.log(currDate);

  const query = `
      query ($page: Int = 1, $perPage: Int = ${limit}, $format: [MediaFormat] = [TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA], $sort: [MediaSort] = [TRENDING_DESC], $startDateLesser: FuzzyDateInt = ${currDate}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            hasNextPage
          }
          media(format_in: $format, sort: $sort, startDate_lesser: $startDateLesser) {
            id
            title {
              romaji
            }
            format
            description
            nextAiringEpisode {
              episode
            }
            episodes
            status
            coverImage {
              extraLarge
            }
          }
        }
      }
    `;
  const resp = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { page: 1 } }),
  });
  if (!resp.ok) throw new Error(`AniList API error: ${resp.status}`);
  const { data } = await resp.json();
  return data.Page.media;
}

export async function fetchAndInsertMvSrc(tmdbId: number) {
  const sources = ['vidjoy', 'videasy', 'vidfast', 'vidlink', 'vidsrc'];
  const results: {
    source: string;
    type: 'master' | 'media';
    url: string;
    headers: Record<string, string>;
  }[] = [];
  for (const source of sources) {
    const result = await fetchMvSrc(source, tmdbId);

    if (result) {
      console.log(`${source} ${result.type}:`, result.url);
      results.push({
        source: source,
        type: result.type,
        url: result.url,
        headers: result.headers,
      });
    } else {
      console.error(`${source} failed`);
      continue;
    }
  }
  // If no sources were found from fetching, exit early.
  if (results.length === 0) {
    console.log(`src not found for tmdbId: ${tmdbId}`);
    return [];
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
  // 3. Prepare the data for insertion.
  const sourcesToInsert = results.map((source) => ({
    mediaId: mediaData.id, // Link each source to the found media
    provider: source.source,
    type: source.type,
    url: source.url,
    headers: source.headers,
  }));
  // 4. Insert all new sources into the tmdbSource table in a single query.
  await db.insert(tmdbSource).values(sourcesToInsert);
  console.log(
    `Inserted ${sourcesToInsert.length} sources for tmdbId: ${tmdbId}`
  );
  return results;
}

export async function fetchAndInsertTvSrc(
  tmdbId: number,
  season: number,
  episode: number
) {
  const sources = ['vidjoy', 'videasy', 'vidfast', 'vidlink', 'vidsrc'];
  const results: {
    source: string;
    type: 'master' | 'media';
    url: string;
    headers: Record<string, string>;
  }[] = [];

  for (const source of sources) {
    const result = await fetchTvSrc(source, tmdbId, season, episode);

    if (result) {
      console.log(`${source} ${result.type}:`, result.url);
      console.log(`${source} headers: `, result.headers);
      results.push({
        source: source,
        type: result.type,
        url: result.url,
        headers: result.headers,
      });
    } else {
      console.error(`${source} failed`);
      continue;
    }
  }

  // If no sources were found from fetching, exit early.
  if (results.length === 0) {
    console.log(
      `src not found for tmdbId: ${tmdbId}, season: ${season}, episode: ${episode}`
    );
    return [];
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
      `fetchTvSrc failed: episode not found for tmdbId: ${tmdbId}, season: ${season}, episode: ${episode}`
    );
  }

  // 3. Prepare the data for insertion.
  const sourcesToInsert = results.map((source) => ({
    episodeId: episodeData.id, // Link each source to the found episode
    provider: source.source,
    type: source.type,
    url: source.url,
    headers: source.headers,
  }));

  // 4. Insert all new sources into the tmdbSource table in a single query.
  await db.insert(tmdbSource).values(sourcesToInsert);

  console.log(
    `Inserted ${sourcesToInsert.length} sources for tmdbId: ${tmdbId}, season: ${season}, episode: ${episode}`
  );

  return results;
}

export async function upsertNewTvInfo(details: any, mediaId: string) {
  await db.transaction(async (tx) => {
    //1. update nextEpisodeDate in tmdbMedia
    await tx
      .update(tmdbMedia)
      .set({
        updateDate: details.next_episode_to_air?.air_date,
      })
      .where(eq(tmdbMedia.id, mediaId))
      .execute();

    // then populate seasons and episodes
    for (const season of details.seasons) {
      if (season.season_number > 0) {
        // 2. find or create the season
        let existingSeason = await tx.query.tmdbSeason.findFirst({
          where: and(
            eq(tmdbSeason.mediaId, mediaId),
            eq(tmdbSeason.seasonNumber, season.season_number)
          ),
        });
        if (!existingSeason) {
          const newSeasonResult = await tx
            .insert(tmdbSeason)
            .values({
              id: crypto.randomUUID(),
              mediaId: mediaId,
              seasonNumber: season.season_number,
            })
            .returning();

          existingSeason = newSeasonResult[0];
        }

        if (!existingSeason) continue;

        // 3. prepare episode inputs
        const episodeCount =
          season.season_number === details.last_episode_to_air?.season_number
            ? details.last_episode_to_air.episode_number
            : season.episode_count;

        const episodeInputs = Array.from({ length: episodeCount }, (_, i) => ({
          id: crypto.randomUUID(),
          seasonId: existingSeason.id,
          episodeNumber: i + 1,
        }));

        // 4. bulk upsert episodes
        if (episodeInputs.length > 0) {
          await tx
            .insert(tmdbEpisode)
            .values(episodeInputs)
            .onConflictDoNothing()
            .execute();
        }
      }
    }
  });
}

export async function upsertExistingTvInfo(details: any, mediaId: string) {
  // Only proceed if there is information about the last aired episode
  const lastAired = details.last_episode_to_air;
  if (!lastAired) {
    return; // Nothing to update
  }

  await db.transaction(async (tx) => {
    // 1. Update the next episode date on the main media entry
    await tx
      .update(tmdbMedia)
      .set({
        updateDate: details.next_episode_to_air?.air_date,
      })
      .where(eq(tmdbMedia.id, mediaId))
      .execute();

    // 2. Find or create the current airing season
    let existingSeason = await tx.query.tmdbSeason.findFirst({
      where: and(
        eq(tmdbSeason.mediaId, mediaId),
        eq(tmdbSeason.seasonNumber, lastAired.season_number)
      ),
    });

    if (!existingSeason) {
      const newSeasonResult = await tx
        .insert(tmdbSeason)
        .values({
          id: crypto.randomUUID(),
          mediaId: mediaId,
          seasonNumber: lastAired.season_number,
        })
        .returning();
      existingSeason = newSeasonResult[0];
    }

    if (!existingSeason) return;

    // 3. Prepare episode inputs ONLY for the current season up to the last aired episode
    const episodeInputs = Array.from(
      { length: lastAired.episode_number },
      (_, i) => ({
        id: crypto.randomUUID(),
        seasonId: existingSeason.id,
        episodeNumber: i + 1,
      })
    );

    // 4. Bulk upsert episodes for the current season
    if (episodeInputs.length > 0) {
      await tx
        .insert(tmdbEpisode)
        .values(episodeInputs)
        .onConflictDoNothing()
        .execute();
    }
  });
}
