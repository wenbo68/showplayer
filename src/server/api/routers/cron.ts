// ~/server/api/routers/cron.ts

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import { env } from '~/env';
import { TRPCError } from '@trpc/server';
import { tmdbMedia } from '~/server/db/schema';
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { zlib } from 'node:zlib';
import { Readable } from 'stream';
import readline from 'readline';

export const cronRouter = createTRPCRouter({
  /**
   * Downloads the daily TMDB export file, parses it, and bulk-updates the popularity
   * for all corresponding media in the database.
   */
  syncPopularity: publicProcedure
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

      const dateStr = format(subDays(new Date(), 1), 'MM_dd_yyyy');
      const fileName =
        input.mediaType === 'movie'
          ? `movie_ids_${dateStr}.json.gz`
          : `tv_series_ids_${dateStr}.json.gz`;
      const url = `http://files.tmdb.org/p/exports/${fileName}`;

      console.log(`[syncPopularity] Starting download from ${url}`);
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Process the large gzipped file as a stream without loading it all into memory
      const gunzip = zlib.createGunzip();
      const rl = readline.createInterface({ input: gunzip });
      Readable.fromWeb(response.body as any).pipe(gunzip);

      const updates: { tmdbId: number; popularity: number }[] = [];
      for await (const line of rl) {
        try {
          const item = JSON.parse(line);
          updates.push({ tmdbId: item.id, popularity: item.popularity });
        } catch (e) {
          /* Ignore malformed lines */
        }
      }

      console.log(
        `[syncPopularity] Parsed ${updates.length} items. Starting DB update...`
      );

      // Perform a bulk update in a transaction
      await ctx.db.transaction(async (tx) => {
        for (const update of updates) {
          await tx
            .update(tmdbMedia)
            .set({ popularity: update.popularity })
            .where(eq(tmdbMedia.tmdbId, update.tmdbId));
        }
      });

      console.log(
        `[syncPopularity] Finished updating popularity for ${updates.length} items.`
      );
      return { success: true, count: updates.length };
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and refreshes their ratings from the TMDB API.
   */
  refreshRatings: publicProcedure
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

      console.log(
        `[refreshRatings] Finding up to ${input.limit} media items to refresh.`
      );
      const mediaToRefresh = await ctx.db
        .select({
          id: tmdbMedia.id,
          tmdbId: tmdbMedia.tmdbId,
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

      if (mediaToRefresh.length === 0) {
        console.log('[refreshRatings] No media needed a rating refresh.');
        return { success: true, count: 0 };
      }

      console.log(
        `[refreshRatings] Found ${mediaToRefresh.length} items. Starting API calls...`
      );
      let updatedCount = 0;
      await batchProcess(mediaToRefresh, 10, async (media) => {
        const details = await fetchTmdbDetailViaApi(media.type, media.tmdbId);
        if (details?.vote_average) {
          await ctx.db
            .update(tmdbMedia)
            .set({
              voteAverage: details.vote_average,
              voteCount: details.vote_count,
              ratingsUpdatedAt: new Date(),
            })
            .where(eq(tmdbMedia.id, media.id));
          updatedCount++;
        }
      });

      console.log(
        `[refreshRatings] Finished refreshing ratings for ${updatedCount} items.`
      );
      return { success: true, count: updatedCount };
    }),
});
