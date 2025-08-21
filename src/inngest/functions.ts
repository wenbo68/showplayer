import {
  fetchAndUpsertMvSrc,
  fetchAndUpsertTvSrc,
  fetchTmdbDetailViaApi,
  upsertSeasonsAndEpisodes,
} from '~/server/utils';
import { inngest } from './client';
import { db } from '~/server/db';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
} from '~/server/db/schema';
import { eq, and, isNotNull, lte, notExists, sql, asc } from 'drizzle-orm';

// Helper function to process arrays in batches
async function batchProcess<T>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processFn));
  }
}

// for all tv, check if db has the right number of seasons (if not, upsertSeasonsAndEpisodes)
export const populateMediaDetails = inngest.createFunction(
  { id: 'populate-media-details', concurrency: 1 },
  { event: 'app/populate.media.details' },
  async ({ event, step, logger }) => {
    await step.run('fetch-tv-and-check-seasons', async () => {
      // 1. find all tv
      const allTv = await db.query.tmdbMedia.findMany({
        where: eq(tmdbMedia.type, 'tv'),
        with: { seasons: true },
      });

      let count = 0;
      await batchProcess(allTv, event.data.batch, async (tv) => {
        count++;
        logger.info(
          `[populateMediaDetails] tv progress: ${count}/${allTv.length} (${tv.tmdbId}:${tv.title})`
        );

        // 2. for tv, check if db has the right number of seasons (need to exclude s0 from details)
        const details = await fetchTmdbDetailViaApi('tv', tv.tmdbId);
        if (!details.seasons) {
          logger.info(
            `[populateMediaDetails] tv ${tv.tmdbId}: no seasons from api`
          );
          return;
        }
        const seasonNum = details.seasons.some(
          (season: { season_number: number }) => season.season_number === 0
        )
          ? details.seasons.length - 1
          : details.seasons.length;
        logger.info(
          `[populateMediaDetails] tv ${tv.tmdbId}: ${tv.seasons.length} vs ${seasonNum}`
        );
        // 3. if yes, skip (if not, upsert seasons/episodes)
        if (tv.seasons.length === seasonNum) return;
        await upsertSeasonsAndEpisodes(details, tv.id);
      });
      return { count };
    });

    return { status: 'complete' };
  }
);

// no api fetch now in this function
export const mediaSrcFetch = inngest.createFunction(
  { id: 'media-src-fetch', concurrency: 1 },
  { event: 'app/media-src-fetch' },
  async ({ event, step, logger }) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await step.run('fetch-and-process-srcless-mv', async () => {
      // 1. find mv whose releaseDate is older than yesterday but have no src
      const srclessMv = await db
        .select({
          id: tmdbMedia.id,
          tmdbId: tmdbMedia.tmdbId,
          type: tmdbMedia.type,
          title: tmdbMedia.title,
        })
        .from(tmdbMedia)
        .where(
          and(
            eq(tmdbMedia.type, 'movie'),
            isNotNull(tmdbMedia.releaseDate),
            lte(tmdbMedia.releaseDate, yesterday),
            notExists(
              db
                .select()
                .from(tmdbSource)
                .where(eq(tmdbSource.mediaId, tmdbMedia.id))
            )
          )
        )
        .execute();

      let count = 0;
      await batchProcess(srclessMv, event.data.batch, async (media) => {
        count++;
        logger.info(
          `[mediaSrcFetch] mv progress: ${count}/${srclessMv.length} (${media.tmdbId}: ${media.title})`
        );

        // 2. for mv, fetch src
        await fetchAndUpsertMvSrc(event.data.fast, media.tmdbId);
      });
      return { count };
    });

    await step.run('fetch-and-process-srcless-episodes', async () => {
      // 3. find episodes whose airDate is older than yesterday but have no src
      const srclessEpisodes = await db
        .select({
          episode: tmdbEpisode,
          season: tmdbSeason,
          media: tmdbMedia,
          episodeIndex:
            sql<number>`row_number() over (partition by ${tmdbSeason.id} order by ${tmdbEpisode.episodeNumber} asc)`.as(
              'episodeIndex'
            ),
        })
        .from(tmdbEpisode)
        .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
        .innerJoin(tmdbMedia, eq(tmdbSeason.mediaId, tmdbMedia.id))
        .where(
          and(
            isNotNull(tmdbEpisode.airDate),
            lte(tmdbEpisode.airDate, yesterday),
            notExists(
              db
                .select({ one: sql`1` })
                .from(tmdbSource)
                .where(eq(tmdbSource.episodeId, tmdbEpisode.id))
            )
          )
        )
        .orderBy(
          asc(tmdbMedia.tmdbId),
          asc(tmdbSeason.seasonNumber),
          asc(tmdbEpisode.episodeNumber)
        )
        .execute();

      let count = 0;
      await batchProcess(srclessEpisodes, event.data.batch, async (item) => {
        count++;
        logger.info(
          `[mediaSrcFetch] tv progress: ${count}/${srclessEpisodes.length} (${item.media.tmdbId}/${item.season.seasonNumber}/${item.episode.episodeNumber}: ${item.media.title})`
        );

        // 4. for episode, fetch src
        const { episode, season, media, episodeIndex } = item;
        await fetchAndUpsertTvSrc(
          event.data.fast,
          media.tmdbId,
          season.seasonNumber,
          episode.episodeNumber,
          episodeIndex + 1
        );
      });
      return { count };
    });

    return { status: 'complete' };
  }
);

// let it run for 1 day
// meanwhile, work on improving frontend
