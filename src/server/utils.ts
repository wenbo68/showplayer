import { db } from './db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
} from './db/schema';
import { asc, and, eq, isNull, sql } from 'drizzle-orm'; // <<< Import 'eq' from drizzle-orm
import type { PuppeteerResult } from '~/type';

export async function fetchTmdbTrendingViaApi(limit: number) {
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

async function fetchSrcFromProviders(
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

export async function fetchAndUpsertMvSrc(tmdbId: number) {
  const results = await fetchSrcFromProviders('mv', `${tmdbId}`);
  console.log(`[fetchAndUpsertMvSrc] Fetched ${results.length} sources.`);
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
  tmdbId: number,
  season: number,
  episode: number
) {
  const results = await fetchSrcFromProviders(
    'tv',
    `${tmdbId}/${season}/${episode}`
  );
  console.log(`[fetchAndUpsertMvSrc] Fetched ${results.length} sources.`);
  if (results.length === 0) {
    return;
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

export async function upsertNewTvInfo(details: any, mediaId: string) {
  await db.transaction(async (tx) => {
    //1. update nextEpisodeDate in tmdbMedia
    await tx
      .update(tmdbMedia)
      .set({
        updateDate: !!details.next_episode_to_air?.air_date
          ? new Date(details.next_episode_to_air?.air_date)
          : null,
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
    const updateDate = details.next_episode_to_air?.air_date;
    // 1. Update the next episode date on the main media entry
    await tx
      .update(tmdbMedia)
      .set({
        updateDate: !!updateDate ? new Date(updateDate) : null,
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

export async function findSrclessEpisodesAndFetchSrc(
  mediaId: string,
  tmdbId: number
) {
  // Use a LEFT JOIN to find episodes with no corresponding source
  const results = await db
    .select({
      episode: tmdbEpisode,
      season: tmdbSeason,
    })
    .from(tmdbEpisode)
    .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
    .leftJoin(tmdbSource, eq(tmdbEpisode.id, tmdbSource.episodeId))
    .where(
      and(
        // Condition 1: Find episodes belonging to the current TV show.
        eq(tmdbSeason.mediaId, mediaId),
        // Condition 2: Only include episodes where there was no match in tmdbSource.
        isNull(tmdbSource.id)
      )
    )
    .orderBy(asc(tmdbSeason.seasonNumber), asc(tmdbEpisode.episodeNumber));

  let count = 0;
  const total = results.length;

  for (const { season, episode } of results) {
    count = count + 1;
    console.log(
      `[findSrclessEpisodesAndFetchSrc] Progress: ${count}/${total} (${tmdbId}/${season.seasonNumber}/${episode.episodeNumber})`
    );
    await fetchAndUpsertTvSrc(
      tmdbId,
      season.seasonNumber,
      episode.episodeNumber
    );
  }
}
