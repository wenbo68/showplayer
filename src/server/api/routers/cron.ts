// ~/server/api/routers/cron.ts

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import {
  fetchSrc,
  populateMediaUsingTmdbLists,
  processUserSubmissions,
  updateAllChangedMedia,
  updateAllPopularity,
  updateDenormFieldsForMediaList,
  updateRatings,
} from '~/server/utils/cronUtils';

// cron job order: updateChangedMedia -> updatePopularity -> updateRatings -> processSubmission -> fetchTmdbLists -> fetchSrc -> updateDenormFields
export const cronRouter = createTRPCRouter({
  runCron: protectedProcedure
    .input(z.object({ tmdbListLimit: z.number().min(1).default(50) }))
    .mutation(async ({ input }) => {
      console.log(`======= 1. update changed media =======`);
      try {
        await updateAllChangedMedia();
      } catch (error) {
        console.error(`[runCron] updateAllChangeMedia failed. Error: `, error);
      }

      console.log(`======= 2. update popularity =======`);
      try {
        await updateAllPopularity();
      } catch (error) {
        console.error(`[runCron] updateAllPopularity failed. Error: `, error);
      }

      console.log(`======= 3. update ratings =======`);
      try {
        await updateRatings();
      } catch (error) {
        console.error(`[runCron] updateRatings failed. Error: `, error);
      }

      console.log(`======= 4. process user submissions =======`);
      try {
        await processUserSubmissions();
      } catch (error) {
        console.error(
          `[runCron] processUserSubmissions failed. Error: `,
          error
        );
      }

      console.log(`======= 5. fetch tmdb trending/popular =======`);
      try {
        await populateMediaUsingTmdbLists(input.tmdbListLimit);
      } catch (error) {
        console.error(
          `[runCron] populateMediaUsingTmdbLists failed. Error: `,
          error
        );
      }

      console.log(`======= 6. fetch src =======`);
      try {
        await fetchSrc();
      } catch (error) {
        console.error(`[runCron] fetchSrc failed. Error: `, error);
      }

      console.log(`======= 7. update denormalized fields =======`);
      try {
        await updateDenormFieldsForMediaList('all');
      } catch (error) {
        console.error(
          `[runCron] updateDenormFieldsForMediaList failed. Error: `,
          error
        );
      }

      console.log(`======= All cron jobs done =======`);
    }),

  /**
   * get changed tmdb ids from changed api
   * then refetch detail for each changed media in our db
   */
  updateAllChangedMedia: protectedProcedure.mutation(async () => {
    await updateAllChangedMedia();
  }),

  /**
   * Downloads the daily TMDB export file, parses it, and bulk-updates the popularity
   * for all media in the database (that shows up in the export).
   */
  updatePopularity: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      await updateAllPopularity();
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and updates their ratings from the TMDB API.
   */
  updateRatings: protectedProcedure.input(z.object({})).mutation(async ({}) => {
    await updateRatings();
  }),

  /**
   * finds all pending submissions
   * populate media for all those submissions
   * mark each submission as succeeded or failed based on above step
   */
  processUserSubmissions: protectedProcedure.mutation(async ({}) => {
    await processUserSubmissions();
  }),

  /**
   * fetch trending/popular mv/tv
   * populate media only for ones not in db
   */
  fetchTmdbLists: protectedProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input }) => {
      await populateMediaUsingTmdbLists(input.limit);
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and triggers the source fetching process for them.
   */
  fetchSrc: protectedProcedure.input(z.object({})).mutation(async ({}) => {
    await fetchSrc();
  }),

  // update denorm fields of media marked as outdated
  updateDenormFields: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      await updateDenormFieldsForMediaList('all');
    }),
});
