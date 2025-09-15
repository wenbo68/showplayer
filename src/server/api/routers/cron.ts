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
import {
  isCronStopping,
  requestCronStop,
  resetCronStopFlag,
} from '~/server/utils/cronControllerUtils';

// cron job order: updateChangedMedia -> updatePopularity -> updateRatings -> processSubmission -> fetchTmdbLists -> fetchSrc -> updateDenormFields
export const cronRouter = createTRPCRouter({
  stopCron: protectedProcedure.input(z.object({})).mutation(() => {
    requestCronStop();
    return {
      message:
        'Stop request has been sent. The job will halt at its next checkpoint.',
    };
  }),

  resetCronFlag: protectedProcedure.input(z.object({})).mutation(() => {
    resetCronStopFlag();
    return { message: 'Cron stop flag has been reset.' };
  }),

  runCron: protectedProcedure
    .input(z.object({ tmdbListLimit: z.number().min(1).default(50) }))
    .mutation(async ({ input }) => {
      // At the start of a new run, always reset the flag.
      resetCronStopFlag();

      // 1. Define all your jobs in a single, easy-to-manage array.
      const jobs = [
        { name: '1. update changed media', fn: () => updateAllChangedMedia() },
        { name: '2. update popularity', fn: () => updateAllPopularity() },
        { name: '3. update ratings', fn: () => updateRatings() },
        {
          name: '4. process user submissions',
          fn: () => processUserSubmissions(),
        },
        {
          name: '5. fetch tmdb lists',
          fn: () => populateMediaUsingTmdbLists(input.tmdbListLimit),
        },
        { name: '6. fetch src', fn: () => fetchSrc() },
        {
          name: '7. update denorm fields',
          fn: () => updateDenormFieldsForMediaList('all'),
        },
      ];

      // 2. Use a single loop to run the jobs.
      for (const job of jobs) {
        // 3. The check for the stop flag is now in one central place.
        if (isCronStopping()) {
          console.log(
            `======= Stopped. Halting before step: ${job.name} =======`
          );
          return; // Exit the entire procedure
        }

        console.log(`======= Starting: ${job.name} =======`);
        try {
          await job.fn();
        } catch (error) {
          console.error(`[runCron] Step '${job.name}' failed. Error: `, error);
          // You could choose to stop the whole sequence on failure by uncommenting the next line
          // throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Step '${job.name}' failed.` });
        }
        console.log(`======= Done: ${job.name} =======`);
      }

      console.log(`======= All cron jobs done =======`);
    }),

  /**
   * get changed tmdb ids from changed api
   * then refetch detail for each changed media in our db
   */
  updateAllChangedMedia: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      resetCronStopFlag();
      console.log(`======= Starting: 1. updateAllChangedMedia =======`);
      await updateAllChangedMedia();
      console.log(`======= Done: 1. updateAllChangedMedia =======`);
    }),

  /**
   * Downloads the daily TMDB export file, parses it, and bulk-updates the popularity
   * for all media in the database (that shows up in the export).
   */
  updatePopularity: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      resetCronStopFlag();
      console.log(`======= Starting: 2. updatePopularity =======`);
      await updateAllPopularity();
      console.log(`======= Done: 2. updatePopularity =======`);
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and updates their ratings from the TMDB API.
   */
  updateRatings: protectedProcedure.input(z.object({})).mutation(async ({}) => {
    resetCronStopFlag();
    console.log(`======= Starting: 3. updateRatings =======`);
    await updateRatings();
    console.log(`======= Done: 3. updateRatings =======`);
  }),

  /**
   * finds all pending submissions
   * populate media for all those submissions
   * mark each submission as success or failure based on above step
   */
  processUserSubmissions: protectedProcedure
    .input(z.object({}))
    .mutation(async ({}) => {
      resetCronStopFlag();
      console.log(`======= Starting: 4. processUserSubmissions =======`);
      await processUserSubmissions();
      console.log(`======= Done: 4. processUserSubmissions =======`);
    }),

  /**
   * fetch trending/popular/top_rated mv/tv
   * populate media only for ones not in db
   */
  fetchTmdbLists: protectedProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input }) => {
      resetCronStopFlag();
      console.log(`======= Starting: 5. fetchTmdbLists =======`);
      await populateMediaUsingTmdbLists(input.limit);
      console.log(`======= Done: 5. fetchTmdbLists =======`);
    }),

  /**
   * Intelligently selects a batch of the most important media (new, popular, or stale)
   * and triggers the source fetching process for them.
   */
  fetchSrc: protectedProcedure.input(z.object({})).mutation(async ({}) => {
    resetCronStopFlag();
    console.log(`======= Starting: 6. fetchSrc =======`);
    await fetchSrc();
    console.log(`======= Done: 6. fetchSrc =======`);
  }),

  // update denorm fields of media marked as outdated
  updateDenormFields: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      resetCronStopFlag();
      console.log(`======= Starting: 7. updateDenormFields =======`);
      await updateDenormFieldsForMediaList('all');
      console.log(`======= Done: 7. updateDenormFields =======`);
    }),
});
