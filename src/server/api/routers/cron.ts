// ~/server/api/routers/cron.ts

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '~/server/api/trpc';
import { z } from 'zod';
import { env } from '~/env';
import { TRPCError } from '@trpc/server';
import { tmdbMedia } from '~/server/db/schema';
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
});
