import { z } from 'zod';
import {
  lte,
  or,
  and,
  eq,
  isNull,
  notExists,
  sql,
  isNotNull,
  exists,
} from 'drizzle-orm';

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import {
  anilistEpisode,
  anilistMedia,
  anilistTrending,
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbTrending,
} from '~/server/db/schema';
import {
  fetchAndInsertMvSrc,
  fetchAndInsertTvSrc,
  fetchAnilistTrending,
  fetchTmdbDetailById,
  fetchTmdbTrending,
  upsertExistingTvInfo,
  upsertNewTvInfo,
} from '~/server/utils';

export const mediaRouter = createTRPCRouter({
  //fetch from tmdbMedia by uuid
  tmdbMediaById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const media = await ctx.db
        .select()
        .from(tmdbMedia)
        .where(eq(tmdbMedia.id, input.id))
        .execute();

      if (media.length === 0) {
        throw new Error(`Media with ID ${input.id} not found`);
      }

      return media[0];
    }),

  tmdbTrending: publicProcedure.query(async ({ ctx }) => {
    const trending = await ctx.db
      .select({
        rank: tmdbTrending.rank,
        mediaId: tmdbTrending.mediaId,
        tmdbId: tmdbMedia.tmdbId,
        type: tmdbMedia.type,
        title: tmdbMedia.title,
        description: tmdbMedia.description,
        imageUrl: tmdbMedia.imageUrl,
      })
      .from(tmdbTrending)
      .innerJoin(tmdbMedia, eq(tmdbTrending.mediaId, tmdbMedia.id))
      .orderBy(tmdbTrending.rank)
      .execute();
    return trending;
  }),

  // anilistTrending: publicProcedure.query(async ({ ctx }) => {
  //   const trending = await ctx.db
  //     .select({
  //       rank: anilistTrending.rank,
  //       mediaId: anilistTrending.mediaId,
  //       anilistId: anilistMedia.anilistId,
  //       type: anilistMedia.type,
  //       title: anilistMedia.title,
  //       description: anilistMedia.description,
  //       imageUrl: anilistMedia.imageUrl,
  //     })
  //     .from(anilistTrending)
  //     .innerJoin(anilistMedia, eq(anilistTrending.mediaId, anilistMedia.id))
  //     .orderBy(anilistTrending.rank)
  //     .execute();
  //   return trending;
  // }),

  clearTmdbTrending: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(tmdbTrending).execute();
  }),

  // clearAnilistTrending: publicProcedure.mutation(async ({ ctx }) => {
  //   await ctx.db.delete(anilistTrending).execute();
  // }),

  fetchTmdbTrending: publicProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. fetch output from api
      const fetchOutput = await fetchTmdbTrending(input.limit);

      // 2. Prepare db input from api fetch ouput
      let mediaInput = fetchOutput.map((item: any) => ({
        tmdbId: item.id,
        type: item.media_type,
        title: item.name || item.title,
        description: item.overview,
        imageUrl: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : null,
      }));

      // 3. Insert or update media table
      const mediaOutput = await ctx.db
        .insert(tmdbMedia)
        .values(mediaInput)
        .onConflictDoUpdate({
          target: tmdbMedia.tmdbId,
          set: {
            type: sql`excluded.type`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            imageUrl: sql`excluded.image_url`,
          },
        })
        .returning({ mediaId: tmdbMedia.id })
        .execute();

      // 4. insert new items in trending table
      const trendingInput = mediaOutput.map((item: any, index: number) => {
        return {
          ...item,
          rank: index,
        };
      });
      console.log(trendingInput);
      await ctx.db.insert(tmdbTrending).values(trendingInput).execute();

      return { count: mediaInput.length };
    }),

  // fetchAnilistTrending: publicProcedure
  //   .input(z.object({ limit: z.number().min(1).max(100) }))
  //   .mutation(async ({ input, ctx }) => {
  //     // 1. fetch output from api
  //     const fetchOutput = await fetchAnilistTrending(input.limit);

  //     // 2. prepare db input from api fetch output
  //     const mediaInput = fetchOutput.map((item: any) => ({
  //       anilistId: item.id,
  //       type: item.format,
  //       episodes:
  //         item.status === 'FINISHED'
  //           ? item.episodes
  //           : item.nextAiringEpisode.episode - 1,
  //       title: item.title.romaji,
  //       imageUrl: item.coverImage.extraLarge,
  //       description: item.description,
  //     }));
  //     console.log(mediaInput);

  //     // 3. insert/update the media table
  //     const mediaOutput = await ctx.db
  //       .insert(anilistMedia)
  //       .values(mediaInput)
  //       .onConflictDoUpdate({
  //         target: anilistMedia.anilistId,
  //         set: {
  //           type: sql`excluded.type`,
  //           title: sql`excluded.title`,
  //           description: sql`excluded.description`,
  //           imageUrl: sql`excluded.image_url`,
  //           episodes: sql`excluded.episodes`,
  //         },
  //       })
  //       .returning({
  //         mediaId: anilistMedia.id,
  //         anilistId: anilistMedia.anilistId,
  //       })
  //       .execute();
  //     console.log(mediaOutput);

  //     // 4. insert new items in trending table
  //     const trendingInput = mediaOutput.map((item: any, index: number) => {
  //       return {
  //         ...item,
  //         rank: index,
  //       };
  //     });
  //     console.log(trendingInput);
  //     await ctx.db.insert(anilistTrending).values(trendingInput).execute();

  //     return { count: mediaInput.length };
  //   }),

  populateMediaDetails: publicProcedure.mutation(async ({ ctx }) => {
    //1. fetch new records: tmdbMedia where (type is movie and mvReleaseDate is null) or (type is tv and it has no season in tmdbSeason table)
    const newMediaRecords = await ctx.db
      .select()
      .from(tmdbMedia)
      .where(
        or(
          and(eq(tmdbMedia.type, 'movie'), isNull(tmdbMedia.updateDate)),
          and(
            eq(tmdbMedia.type, 'tv'),
            notExists(
              ctx.db
                .select()
                .from(tmdbSeason)
                .where(eq(tmdbSeason.mediaId, tmdbMedia.id))
            )
          )
        )
      )
      .execute();

    // 2. for each record, fetch details from tmdb api
    for (const media of newMediaRecords) {
      const details = await fetchTmdbDetailById(media.type, media.tmdbId);

      if (media.type === 'movie') {
        // 3. for movies, update mvReleaseDate in tmdbMedia
        await ctx.db
          .update(tmdbMedia)
          .set({ updateDate: details.release_date })
          .where(eq(tmdbMedia.id, media.id))
          .execute();
      } else if (media.type === 'tv' && details?.seasons) {
        // 4. for tv, update nextEpisodeDate in tmdbMedia then populate seasons and episodes
        upsertNewTvInfo(details, media.id);
      }
    }
  }),

  dailySrcFetch: publicProcedure.mutation(async ({ ctx }) => {
    // 1. in tmdbMedia find updated records: (type is movie and mvReleaseDate is older than yesterday) or (type is tv and nextEpisodeDate is older than yesterday)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const mediaToUpdate = await ctx.db
      .select({
        id: tmdbMedia.id,
        tmdbId: tmdbMedia.tmdbId,
        type: tmdbMedia.type,
      })
      .from(tmdbMedia)
      .where(
        or(
          // Movie Logic: Released and has no sources yet.
          and(
            eq(tmdbMedia.type, 'movie'),
            lte(tmdbMedia.updateDate, yesterday),
            notExists(
              ctx.db
                .select()
                .from(tmdbSource)
                .where(eq(tmdbSource.mediaId, tmdbMedia.id))
            )
          ),
          // TV Logic: Next episode was supposed to air.
          and(
            eq(tmdbMedia.type, 'tv'),
            isNotNull(tmdbMedia.updateDate),
            lte(tmdbMedia.updateDate, yesterday)
          )
        )
      )
      .execute();

    mediaToUpdate.forEach(async (media) => {
      if (media.type === 'movie') {
        // 2. for updated movies, fetch sources and populate tmdbSource table
        await fetchAndInsertMvSrc(media.tmdbId);
      } else if (media.type === 'tv') {
        // 3. for updated tv, fetch details from api first and update nextEpisodeDate in tmdbMedia
        const details = await fetchTmdbDetailById('tv', media.tmdbId);
        // then upsert seasons/episodes
        await upsertExistingTvInfo(details, media.id);
        // then fetch sources for all episodes whose source is null
        const episodesWithoutSources = await ctx.db.query.tmdbEpisode.findMany({
          where: and(
            // Condition 1: Find episodes belonging to the current TV show
            // by checking if their season's mediaId matches.
            exists(
              ctx.db
                .select()
                .from(tmdbSeason)
                .where(
                  and(
                    eq(tmdbSeason.mediaId, media.id),
                    eq(tmdbSeason.id, tmdbEpisode.seasonId)
                  )
                )
            ),
            // Condition 2: Find episodes that have no corresponding
            // entry in the tmdbSource table.
            notExists(
              ctx.db
                .select()
                .from(tmdbSource)
                .where(eq(tmdbSource.episodeId, tmdbEpisode.id))
            )
          ),
          orderBy: (episode, { asc }) => [asc(episode.episodeNumber)],
          with: {
            season: true,
          },
        });

        for (const episode of episodesWithoutSources) {
          await fetchAndInsertTvSrc(
            media.tmdbId,
            episode.season.seasonNumber,
            episode.episodeNumber
          );
        }
      }
    });
    console.log(
      `Daily source fetch completed for ${mediaToUpdate.length} media items.`
    );
  }),

  // // for each record in anilistMedia,
  // // increase or decrease the number of episode records (in anilistEpisode table)
  // // according to the media's episodes count
  // populateAnilistEpisodes: publicProcedure.mutation(async ({ ctx }) => {
  //   const mediaRecords = await ctx.db.select().from(anilistMedia).execute();

  //   for (const media of mediaRecords) {
  //     const existingEpisodes = await ctx.db
  //       .select()
  //       .from(anilistEpisode)
  //       .where(eq(anilistEpisode.mediaId, media.id))
  //       .execute();

  //     const episodesCount = media.episodes || 0;

  //     if (existingEpisodes.length < episodesCount) {
  //       // Insert missing episodes
  //       const newEpisodes = Array.from(
  //         { length: episodesCount - existingEpisodes.length },
  //         (_, i) => ({
  //           mediaId: media.id,
  //           episodeNumber: existingEpisodes.length + i + 1,
  //         })
  //       );
  //       await ctx.db.insert(anilistEpisode).values(newEpisodes).execute();
  //     } else if (existingEpisodes.length > episodesCount) {
  //       // Delete excess episodes
  //       const excessEpisodes = existingEpisodes.slice(episodesCount);
  //       const excessIds = excessEpisodes.map((ep) => ep.id);

  //       await ctx.db
  //         .delete(anilistEpisode)
  //         .where(
  //           and(
  //             eq(anilistEpisode.mediaId, media.id),
  //             inArray(anilistEpisode.id, excessIds)
  //           )
  //         )
  //         .execute();
  //     }
  //   }
  // }),

  // // fetch from anilistMedia by id
  // fetchAnilistMediaById: publicProcedure
  //   .input(z.object({ id: z.string().min(1) }))
  //   .query(async ({ input, ctx }) => {
  //     const media = await ctx.db
  //       .select()
  //       .from(anilistMedia)
  //       .where(eq(anilistMedia.id, input.id))
  //       .execute();

  //     if (media.length === 0) {
  //       throw new Error(`Media with ID ${input.id} not found`);
  //     }

  //     return media[0];
  //   }),

  // fetch source for each episode? or just use embeds?
  // to ensure backend uniqueness and no ads, don't use embeds
  // but don't search for sources of all shows
  // instead, fetch sources when a user click some episode, then store the sources in db so that other users don't need fetches
  // sources (use tmdb id): vidjoy, videasy, vidfast, vidlink, vidsrc

  fetchAndInsertMvSrc: publicProcedure
    .input(
      z.object({
        tmdbId: z.number().int().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return await fetchAndInsertMvSrc(input.tmdbId);
    }),

  fetchAndInsertTvSrc: publicProcedure
    .input(
      z.object({
        tmdbId: z.number().int().min(1),
        season: z.number().int().min(1),
        episode: z.number().int().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return await fetchAndInsertTvSrc(
        input.tmdbId,
        input.season,
        input.episode
      );
    }),

  insertSeasonAndEpisode: publicProcedure
    .input(
      z.object({
        tmdbId: z.number().int().min(1),
        season: z.number().int().min(1),
        episode: z.number().int().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { tmdbId, season, episode } = input;

      // Use a transaction to ensure all operations succeed or fail together
      return await ctx.db.transaction(async (tx) => {
        // 1. Find the internal media ID from the public tmdbId
        const media = await tx.query.tmdbMedia.findFirst({
          where: eq(tmdbMedia.tmdbId, tmdbId),
          columns: {
            id: true, // We only need the ID
          },
        });

        if (!media) {
          throw new Error(
            `TV show with TMDB ID ${tmdbId} not found in database.`
          );
        }

        // 2. Find or create the season to get its ID
        let existingSeason = await tx.query.tmdbSeason.findFirst({
          where: and(
            eq(tmdbSeason.mediaId, media.id),
            eq(tmdbSeason.seasonNumber, season)
          ),
        });

        // If the season doesn't exist, create it
        if (!existingSeason) {
          const newSeasonResult = await tx
            .insert(tmdbSeason)
            .values({
              mediaId: media.id,
              seasonNumber: season,
            })
            .returning(); // Get the newly created season back

          existingSeason = newSeasonResult[0];
        }

        if (!existingSeason) {
          throw new Error(`Failed to find or create season ${season}.`);
        }

        // 3. Insert the episode, doing nothing if it already exists
        await tx
          .insert(tmdbEpisode)
          .values({
            seasonId: existingSeason.id,
            episodeNumber: episode,
          })
          .onConflictDoNothing(); // If the episode (seasonId, episodeNumber) exists, ignore the insert

        return {
          success: true,
          message: `Ensured S${season}E${episode} exists for TMDB ID ${tmdbId}.`,
        };
      });
    }),
});
