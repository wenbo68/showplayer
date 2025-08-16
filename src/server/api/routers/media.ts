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
} from 'drizzle-orm';

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbTrending,
} from '~/server/db/schema';
import {
  fetchAndUpsertMvSrc,
  fetchAndUpsertTvSrc,
  fetchTmdbDetailViaApi,
  fetchTmdbTrendingViaApi,
  findSrclessEpisodesAndFetchSrc,
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

  // get all trending media (with their media details)
  tmdbTrendingWithDetails: publicProcedure.query(async ({ ctx }) => {
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

  clearTmdbTrending: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(tmdbTrending).execute();
  }),

  fetchTmdbTrending: publicProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. fetch output from api
      const fetchOutput = await fetchTmdbTrendingViaApi(input.limit);

      // 2. Prepare db input from api fetch ouput (removes duplicates)
      const mediaInput = Array.from(
        new Map(
          fetchOutput.map((item: any) => [
            item.id,
            {
              tmdbId: item.id,
              type: item.media_type,
              title: item.name || item.title,
              description: item.overview,
              imageUrl: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null,
            },
          ])
        ).values()
      );

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

  // for mv, get updateDate from api => no need to get src (bc dailySrcFetch will)
  // for tv, get seasons/episodes from api => need to get src for all episodes (dailySrcFetch only fetches the next episode to air)
  populateMediaDetails: publicProcedure.mutation(async ({ ctx }) => {
    //1. fetch new records: tmdbMedia where (type is movie and updateDate is null) or (type is tv and it has no season in tmdbSeason table)
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

    let count = 0;
    const total = newMediaRecords.length;

    // 2. for each record, fetch details from tmdb api
    for (const media of newMediaRecords) {
      count = count + 1;
      console.log(
        `[populateMediaDetails] Progress: ${count}/${total} (${media.type} ${media.tmdbId}: ${media.title})`
      );
      const details = await fetchTmdbDetailViaApi(media.type, media.tmdbId);
      if (media.type === 'movie') {
        // 3. for movies, update mvReleaseDate in tmdbMedia
        await ctx.db
          .update(tmdbMedia)
          .set({
            updateDate: !!details.release_date
              ? new Date(details.release_date)
              : null,
          })
          .where(eq(tmdbMedia.id, media.id))
          .execute();
      } else if (media.type === 'tv' && details?.seasons) {
        // 4. for tv, update nextEpisodeDate in tmdbMedia then populate seasons and episodes
        await upsertNewTvInfo(details, media.id);
        // // 5. fetch src for all episodes of this tv
        // await findSrclessEpisodesAndFetchSrc(media.id, details.id);
      }
    }
  }),

  // fully test populateMediaDetails and dailySrcFetch then run them in vps (vercel can only run for 300s)

  // find all media who needs src then get src from providers
  dailySrcFetch: publicProcedure.mutation(async ({ ctx }) => {
    // 1. in tmdbMedia find updated records: updateDate is not null and older than yesterday
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const mediaToUpdate = await ctx.db
      .select({
        id: tmdbMedia.id,
        tmdbId: tmdbMedia.tmdbId,
        type: tmdbMedia.type,
        title: tmdbMedia.title,
      })
      .from(tmdbMedia)
      .where(
        or(
          // Movie Logic: Released and has no sources yet.
          and(
            eq(tmdbMedia.type, 'movie'),
            isNotNull(tmdbMedia.updateDate),
            lte(tmdbMedia.updateDate, yesterday),
            notExists(
              ctx.db
                .select()
                .from(tmdbSource)
                .where(eq(tmdbSource.mediaId, tmdbMedia.id))
            )
          ),
          // TV Logic: new episode was aired.
          and(
            eq(tmdbMedia.type, 'tv'),
            isNotNull(tmdbMedia.updateDate),
            lte(tmdbMedia.updateDate, yesterday)
          )
        )
      )
      .execute();
    let count1 = 0;
    const total1 = mediaToUpdate.length;

    for (const media of mediaToUpdate) {
      count1 += 1;
      console.log(
        `[dailySrcFetch] Progress1: ${count1}/${total1} (${media.type} ${media.tmdbId}: ${media.title}).`
      );
      if (media.type === 'movie') {
        // 2. for updated movies, fetch sources and populate tmdbSource table
        await fetchAndUpsertMvSrc(media.tmdbId);
      } else if (media.type === 'tv') {
        // 3. for updated tv, fetch details from api first and update nextEpisodeDate in tmdbMedia
        const details = await fetchTmdbDetailViaApi('tv', media.tmdbId);
        // then upsert new seasons/episodes
        await upsertExistingTvInfo(details, media.id);
      }
    }

    // 4. get all tv media from tmdbMedia
    const allTvMedia = await ctx.db
      .select({
        id: tmdbMedia.id,
        tmdbId: tmdbMedia.tmdbId,
        title: tmdbMedia.title,
      })
      .from(tmdbMedia)
      .where(eq(tmdbMedia.type, 'tv'))
      .execute();
    let count2 = 0;
    const total2 = allTvMedia.length;

    //5. for each tv media, check if it has srcless episodes (if it does, then fetch src for those episodes)
    for (const media of allTvMedia) {
      count2 += 1;
      console.log(
        `[dailySrcFetch] Progress2: ${count2}/${total2} (tv ${media.tmdbId}: ${media.title}).`
      );
      await findSrclessEpisodesAndFetchSrc(media.id, media.tmdbId);
    }
  }),

  fetchAndInsertMvSrc: publicProcedure
    .input(
      z.object({
        tmdbId: z.number().int().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return await fetchAndUpsertMvSrc(input.tmdbId);
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
      return await fetchAndUpsertTvSrc(
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
