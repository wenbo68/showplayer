// ~/server/api/routers/cron.ts

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import { env } from '~/env';
import { TRPCError } from '@trpc/server';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
} from '~/server/db/schema';
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { createGunzip } from 'node:zlib';
import { Readable } from 'stream';
import readline from 'readline';
import {
  batchProcess,
  batchUpdatePopularity,
  fetchTmdbDetailViaApi,
} from '~/server/utils';
import type { LatestEpisodeInfo } from '~/type';

export const cronRouter = createTRPCRouter({
  /**
   * Downloads the daily TMDB export file, parses it, and bulk-updates the popularity
   * for all corresponding media in the database.
   */
  updatePopularity: protectedProcedure
    .input(
      z.object({
        cronSecret: z.string(),
        mediaType: z.enum(['movie', 'tv']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // get body from url
      const yesterdayDateStr = format(subDays(new Date(), 1), 'MM_dd_yyyy');
      const fileName =
        input.mediaType === 'movie'
          ? `movie_ids_${yesterdayDateStr}.json.gz`
          : `tv_series_ids_${yesterdayDateStr}.json.gz`;
      const url = `http://files.tmdb.org/p/exports/${fileName}`;

      console.log(`[updatePopularity] Downloading json.gz from: ${url}`);
      const tmdbResponse = await fetch(url);
      if (!tmdbResponse.ok || !tmdbResponse.body) {
        throw new Error(`Failed to download file: ${tmdbResponse.statusText}`);
      }

      // Process the large gzipped file as a stream without loading it all into memory
      const gunzip = createGunzip();
      const rl = readline.createInterface({ input: gunzip });
      Readable.fromWeb(tmdbResponse.body as any).pipe(gunzip);

      console.log(`[updatePopularity] batch update starts...`);

      const batchSize = 25000;
      let newPopularity: { tmdbId: number; popularity: number }[] = [];
      let totalCount = 0;
      for await (const line of rl) {
        // 2. The try...catch now ONLY wraps the JSON.parse, which is the only
        //    part that should be allowed to fail without stopping the whole process.
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
          await batchUpdatePopularity(newPopularity);
          totalCount += newPopularity.length;
          newPopularity = [];
          console.log(
            `[updatePopularity] batch progress: ${totalCount} items.`
          );
        }
      }

      // Process any remaining items in the last batch
      if (newPopularity.length > 0) {
        await batchUpdatePopularity(newPopularity);
        totalCount += newPopularity.length;
      }

      console.log(`[updatePopularity] finished: ${totalCount} items.`);
      return { success: true, count: totalCount };
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and refreshes their ratings from the TMDB API.
   */
  updateRatings: protectedProcedure
    .input(
      z.object({
        cronSecret: z.string(),
        limit: z.number().min(1).max(5000).default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const mediaToUpdate = await ctx.db
        .select({
          id: tmdbMedia.id,
          tmdbId: tmdbMedia.tmdbId,
          title: tmdbMedia.title,
          type: tmdbMedia.type,
        })
        .from(tmdbMedia)
        .where(
          or(
            isNull(tmdbMedia.ratingsUpdatedAt), // 1. Never updated
            and(
              // 2. Popular but stale
              gt(tmdbMedia.popularity, 15),
              lt(
                tmdbMedia.ratingsUpdatedAt,
                sql`CURRENT_DATE - INTERVAL '7 day'`
              )
            ),
            lt(
              tmdbMedia.ratingsUpdatedAt,
              sql`CURRENT_DATE - INTERVAL '30 day'`
            ) // 3. Very stale
          )
        )
        .orderBy(desc(tmdbMedia.popularity), asc(tmdbMedia.ratingsUpdatedAt))
        .limit(input.limit);

      if (mediaToUpdate.length === 0) {
        console.log('[updateRatings] No media needed a rating refresh.');
        return { success: true, count: 0 };
      }
      console.log(
        `[updateRatings] DB has ${mediaToUpdate.length} media to update. Starting API calls...`
      );

      // 1. Collect all the new rating details in an array first.
      const newRatings: {
        id: string;
        voteAverage: number;
        voteCount: number;
      }[] = [];

      await batchProcess(mediaToUpdate, 10, async (media) => {
        const details = await fetchTmdbDetailViaApi(media.type, media.tmdbId);
        if (details?.vote_average && details?.vote_count) {
          newRatings.push({
            id: media.id,
            voteAverage: details.vote_average,
            voteCount: details.vote_count,
          });
          // console.log(
          //   `[updateRatings] ${media.type} ${media.id} (${media.title}): ${details.vote_average} ${details.vote_count}`
          // );
        } else {
          console.log(
            `[updateRatings] ${media.type} ${media.id} (${
              media.title
            }): Missing ${
              details?.vote_average
                ? `Count`
                : details?.vote_count
                ? `Rating`
                : `Both`
            }`
          );
        }
      });
      if (newRatings.length === 0) {
        console.log('[updateRatings] No media from API had ratings.');
        return { success: true, count: 0 };
      }
      console.log(
        `[updateRatings] API returned ${newRatings.length} ratings for media. Starting bulk db insert...`
      );

      // --- THE FIX: Add explicit type casts for all columns from the VALUES clause ---
      try {
        await ctx.db.execute(sql`
          UPDATE ${tmdbMedia} SET
            vote_average = ${sql.raw(`data.vote_average::real`)},
            vote_count = ${sql.raw(`data.vote_count::integer`)},
            ratings_updated_at = NOW()
          FROM (VALUES ${sql.join(
            newRatings.map(
              (r) => sql`(${r.id}, ${r.voteAverage}, ${r.voteCount})`
            ),
            sql`, `
          )}) AS data(id, vote_average, vote_count)
          WHERE ${tmdbMedia.id} = ${sql.raw(`data.id::varchar`)};
        `);
      } catch (error) {
        console.error('[updateRatings] DATABASE UPDATE FAILED:', error);
        throw error;
      }

      console.log(
        `[updateRatings] Done: db updated ${newRatings.length} media ratings.`
      );
      return { success: true, count: newRatings.length };
    }),

  /**
   * NEW: This procedure runs daily. It calculates and saves all denormalized metrics
   * for media whose src, season, episode tables changed
   * to ensure the data used for filtering and sorting is always fresh.
   * denorm fields include:
   * availability: how many src for mv, how many episodes with src for tv
   * total aired episodes: mv = 0, tv = how many episodes whose air date is before today
   * most recent episode with src: season number, episode number, air date
   */
  updateDenormFields: protectedProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      console.log('[updateDenormFields] updating all mv...');

      // 1. update all mv bc its fast
      const mvOutput = await ctx.db.execute(sql`
        WITH movie_calcs AS (
          SELECT
            m.id,
            (SELECT COUNT(*) FROM ${tmdbSource} src WHERE src.media_id = m.id) as "availabilityCount"
          FROM ${tmdbMedia} m
          WHERE m.type = 'movie'
        )
        UPDATE ${tmdbMedia} m SET
          availability_count = mc."availabilityCount",
          total_episode_count = 0,
          updated_date = m.release_date,
          updated_season_number = NULL,
          updated_episode_number = NULL
        FROM movie_calcs mc
        WHERE m.id = mc.id;
      `);
      console.log(`[updateDenormFields] finished all mv.`);

      // 2. get tv whose denormFieldsUpdatedAt is null
      const dirtyTvShows = await ctx.db
        .select({ id: tmdbMedia.id, title: tmdbMedia.title })
        .from(tmdbMedia)
        .where(
          and(
            eq(tmdbMedia.type, 'tv'),
            isNull(tmdbMedia.denormFieldsUpdatedAt) // Only get the "dirty" ones
          )
        );

      if (dirtyTvShows.length === 0) {
        console.log('[updateDenormFields] No TV shows needed an update.');
        return { success: true, updatedTvShows: 0 };
      }

      console.log(`[updateDenormFields] updating ${dirtyTvShows.length} tv...`);
      let updatedTvCount = 0;

      // Use your existing batchProcess helper to avoid overwhelming the system
      await batchProcess(dirtyTvShows, 50, async (tv) => {
        // This single, powerful query calculates all required metrics for one TV show.
        const result = await ctx.db.execute(sql`
          SELECT
            (SELECT COUNT(DISTINCT src.episode_id) FROM ${tmdbSource} src JOIN ${tmdbEpisode} e ON src.episode_id = e.id JOIN ${tmdbSeason} s ON e.season_id = s.id WHERE s.media_id = ${tv.id}) as "availabilityCount",
            (SELECT COUNT(*) FROM ${tmdbEpisode} e JOIN ${tmdbSeason} s ON e.season_id = s.id WHERE s.media_id = ${tv.id} AND e.air_date < CURRENT_DATE) as "totalEpisodeCount",
            (
              SELECT json_build_object('seasonNumber', s.season_number, 'episodeNumber', e.episode_number, 'airDate', e.air_date)
              FROM ${tmdbEpisode} e JOIN ${tmdbSeason} s ON e.season_id = s.id
              WHERE s.media_id = ${tv.id} AND EXISTS (SELECT 1 FROM ${tmdbSource} src WHERE src.episode_id = e.id)
              ORDER BY e.air_date DESC
              LIMIT 1
            ) as "latestEpisode"
        `);

        const metrics = result[0] as any;
        const latestEpisode = metrics.latestEpisode as LatestEpisodeInfo;

        // Update the TV show with all the calculated values
        await ctx.db
          .update(tmdbMedia)
          .set({
            availabilityCount: metrics.availabilityCount ?? 0,
            totalEpisodeCount: metrics.totalEpisodeCount ?? 0,
            updatedDate: latestEpisode?.airDate
              ? new Date(latestEpisode.airDate)
              : null,
            updatedSeasonNumber: latestEpisode?.seasonNumber,
            updatedEpisodeNumber: latestEpisode?.episodeNumber,
            denormFieldsUpdatedAt: new Date(), // Mark this record as updated
          })
          .where(eq(tmdbMedia.id, tv.id));

        updatedTvCount++;
      });

      console.log(`[updateDenormFields] finshed ${updatedTvCount} tv`);
      return { success: true, updatedTvShows: updatedTvCount };
    }),
});
