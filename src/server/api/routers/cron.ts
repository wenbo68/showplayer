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
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { createGunzip } from 'node:zlib';
import { Readable } from 'stream';
import readline from 'readline';
import {
  runItemsInEachBatchConcurrently,
  bulkUpdatePopularity,
  fetchSrcForMediaList,
  fetchTmdbDetailViaApi,
  updateDenormFieldsForMediaList,
  updateRatingsForMediaList,
} from '~/server/utils';

// cron job order: updateChangedMedia -> processSubmissions -> updatePopularity -> updateRatings -> fetchTrending -> fetchPopular -> fetchSrc -> updateDenormFields
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
      // cannot use runItemsInEachBatchInBulk() bc this is stream (we don't have the entire arr yet)
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
          await bulkUpdatePopularity(newPopularity);
          totalCount += newPopularity.length;
          newPopularity = [];
          console.log(
            `[updatePopularity] batch progress: ${totalCount} items.`
          );
        }
      }

      // Process any remaining items in the last batch
      if (newPopularity.length > 0) {
        await bulkUpdatePopularity(newPopularity);
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
        limit: z.number().min(1).default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // 1. smartly select media that need a rating update
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
            isNull(tmdbMedia.voteUpdatedAt), // 1. Never updated
            and(
              // 2. Popular but stale
              gt(tmdbMedia.popularity, 20),
              lt(tmdbMedia.voteUpdatedAt, sql`CURRENT_DATE - INTERVAL '7 day'`)
            ),
            lt(tmdbMedia.voteUpdatedAt, sql`CURRENT_DATE - INTERVAL '30 day'`) // 3. Very stale
          )
        )
        .orderBy(desc(tmdbMedia.popularity), asc(tmdbMedia.voteUpdatedAt))
        .limit(input.limit);

      if (mediaToUpdate.length === 0) {
        console.log('[updateRatings] No media needs rating updates.');
        return { success: true, count: 0 };
      }

      // 2. update ratings
      const successCount = await updateRatingsForMediaList(mediaToUpdate);

      // 3. mark all media as updated (regardless of success or fail)
      await ctx.db
        .update(tmdbMedia)
        .set({ voteUpdatedAt: new Date() })
        .where(
          inArray(
            tmdbMedia.id,
            mediaToUpdate.map((m) => m.id)
          )
        );

      console.log(
        `[updateRatings] updating ratings done: ${mediaToUpdate.length} required => ${successCount} successful.`
      );
      return { success: true, count: successCount };
    }),

  // update denorm fields of media marked as outdated
  updateDenormFields: protectedProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      await updateDenormFieldsForMediaList('all');
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and triggers the source fetching process for them.
   */
  fetchSrc: protectedProcedure
    .input(
      z.object({
        cronSecret: z.string(),
        limit: z.number().default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cronSecret !== env.CRON_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      console.log(
        `[smartFetchMediaSrc] Starting source fetch with limit ${input.limit}...`
      );

      // 1. Find a prioritized list of media to check, using the same logic as updateRatings
      const mediaToFetchSrc = await ctx.db
        .select({ id: tmdbMedia.id })
        .from(tmdbMedia)
        .where(
          or(
            isNull(tmdbMedia.srcFetchedAt), // 1. Never checked
            and(
              // 2. Popular but not checked recently (e.g., 3 days for sources)
              gt(tmdbMedia.popularity, 20),
              lt(tmdbMedia.srcFetchedAt, sql`CURRENT_DATE - INTERVAL '1 day'`)
            ),
            // 3. Any other media not checked in a longer time (e.g., 14 days)
            lt(tmdbMedia.srcFetchedAt, sql`CURRENT_DATE - INTERVAL '7 day'`)
          )
        )
        .orderBy(desc(tmdbMedia.popularity), asc(tmdbMedia.srcFetchedAt))
        .limit(input.limit);

      if (mediaToFetchSrc.length === 0) {
        console.log('[smartFetchMediaSrc] No media needed src fetch.');
        return { success: true, checked: 0 };
      }

      const mediaIds = mediaToFetchSrc.map((m) => m.id);

      // 2. Pass this prioritized list to your powerful, reusable function
      await fetchSrcForMediaList(mediaIds);

      // 3. Mark these media items as "checked" by updating their timestamp
      await ctx.db
        .update(tmdbMedia)
        .set({ srcFetchedAt: new Date() })
        .where(inArray(tmdbMedia.id, mediaIds));

      console.log(
        `[smartFetchMediaSrc] Finished source check for ${mediaIds.length} items.`
      );
      return { success: true, checked: mediaIds.length };
    }),
});
