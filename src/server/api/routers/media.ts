import { z } from 'zod';
import { and, asc, eq, isNotNull, lte, notExists, sql } from 'drizzle-orm';

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import {
  tmdbEpisode,
  tmdbGenre,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbSeason,
  tmdbSource,
  tmdbTrending,
} from '~/server/db/schema';
import {
  batchProcess,
  fetchAndUpsertMvSrc,
  fetchAndUpsertTvSrc,
  fetchTmdbDetailViaApi,
  fetchTmdbMvGenreViaApi,
  fetchTmdbTrendingViaApi,
  fetchTmdbTvGenreViaApi,
  upsertSeasonsAndEpisodes,
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
        releaseDate: tmdbMedia.releaseDate,
        // Add this field to aggregate genre names
        genres: sql<string[]>`(
          SELECT array_agg(${tmdbGenre.name})
          FROM ${tmdbMediaToTmdbGenre}
          INNER JOIN ${tmdbGenre} ON ${tmdbMediaToTmdbGenre.genreId} = ${tmdbGenre.id}
          WHERE ${tmdbMediaToTmdbGenre.mediaId} = ${tmdbMedia.id}
        )`,
        availabilityCount: sql<number>`
          CASE
            WHEN ${tmdbMedia.type} = 'movie'
            THEN (
              SELECT COUNT(*)
              FROM ${tmdbSource}
              WHERE ${tmdbSource.mediaId} = ${tmdbMedia.id}
            )
            WHEN ${tmdbMedia.type} = 'tv'
            THEN (
              SELECT COUNT(DISTINCT ${tmdbEpisode}.id)
              FROM ${tmdbSource}
              JOIN ${tmdbEpisode} ON ${tmdbSource.episodeId} = ${tmdbEpisode.id}
              JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
              WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
            )
            ELSE 0
          END
        `.mapWith(Number),
      })
      .from(tmdbTrending)
      .innerJoin(tmdbMedia, eq(tmdbTrending.mediaId, tmdbMedia.id))
      .orderBy(tmdbTrending.rank)
      .execute();

    return trending;
  }),

  fetchGenres: publicProcedure.mutation(async ({ ctx }) => {
    const { genres: mvGenres } = await fetchTmdbMvGenreViaApi();
    const { genres: tvGenres } = await fetchTmdbTvGenreViaApi();

    // 1. Combine both lists
    const genres = [...mvGenres, ...tvGenres];

    // 2. Use a Map to automatically handle duplicates based on the 'id'
    const genreInput = Array.from(
      new Map(genres.map((genre) => [genre.id, genre])).values()
    );

    // 3. Insert or update the genres in the database
    const genreOutput = await ctx.db
      .insert(tmdbGenre)
      .values(genreInput)
      .onConflictDoUpdate({
        target: tmdbGenre.id, // The column to check for conflicts
        set: {
          name: sql`excluded.name`, // Update the name if the ID already exists
        },
      })
      .returning(); // Optional: get the inserted/updated rows back

    console.log(`Upserted ${genreOutput.length} unique genres.`);
    return { count: genreOutput.length };
  }),

  fetchTmdbTrending: publicProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // delete trending list first
      await ctx.db.delete(tmdbTrending).execute();

      // 1. fetch output from api
      const fetchOutput = await fetchTmdbTrendingViaApi(input.limit);

      // 2. Prepare db input from api fetch ouput (removes duplicates)
      const mediaInput = Array.from(
        new Map(
          fetchOutput
            .filter(
              (item: any) =>
                item.media_type === 'movie' || item.media_type === 'tv'
            )
            .map((item: any) => [
              item.id,
              {
                tmdbId: item.id,
                type: item.media_type,
                title: item.name || item.title,
                description: item.overview,
                imageUrl: item.poster_path ? item.poster_path : null,
                releaseDate: item.release_date
                  ? new Date(item.release_date)
                  : item.first_air_date
                  ? new Date(item.first_air_date)
                  : null,
                genreIds: item.genre_ids || [],
              },
            ])
        ).values()
      );

      // 3. Insert or update media table
      const mediaOutput = await ctx.db
        .insert(tmdbMedia)
        .values(mediaInput.map(({ genreIds, ...rest }) => rest))
        .onConflictDoUpdate({
          target: tmdbMedia.tmdbId,
          set: {
            type: sql`excluded.type`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            imageUrl: sql`excluded.image_url`,
            releaseDate: sql`excluded.release_date`,
          },
        })
        .returning({
          mediaId: tmdbMedia.id,
          tmdbId: tmdbMedia.tmdbId,
        })
        .execute();

      // 4. Create a lookup map for easy access: { tmdbId => mediaId }
      const tmdbIdToMediaIdMap = new Map(
        mediaOutput.map((item) => [item.tmdbId, item.mediaId])
      );

      // 5. Prepare the data for the mediaToGenres join table
      const genreInput = mediaInput.flatMap((media) => {
        const mediaId = tmdbIdToMediaIdMap.get(media.tmdbId);
        if (!mediaId || !media.genreIds) {
          return []; // Skip if media wasn't inserted or has no genres
        }
        return media.genreIds.map((genreId: number) => ({
          mediaId: mediaId,
          genreId: genreId,
        }));
      });

      // 6. Insert all genre relationships in a single batch
      await ctx.db
        .insert(tmdbMediaToTmdbGenre)
        .values(genreInput)
        .onConflictDoNothing();

      // 7. insert new items in trending table
      const trendingInput = mediaOutput.map((item: any, index: number) => {
        return {
          mediaId: item.mediaId,
          rank: index,
        };
      });
      console.log(trendingInput);
      await ctx.db.insert(tmdbTrending).values(trendingInput).execute();

      return { count: mediaInput.length };
    }),

  populateMediaDetails: publicProcedure.mutation(async ({ ctx }) => {
    // 1. find all tv
    const allTv = await ctx.db.query.tmdbMedia.findMany({
      where: eq(tmdbMedia.type, 'tv'),
      with: { seasons: true },
    });

    let count = 0;
    await batchProcess(allTv, 10, async (tv) => {
      count++;
      console.log(
        `[populateMediaDetails] tv progress: ${count}/${allTv.length} (${tv.tmdbId}:${tv.title})`
      );

      // 2. for tv, check if db has the right number of seasons (need to exclude s0 from details)
      const details = await fetchTmdbDetailViaApi('tv', tv.tmdbId);
      if (!details.seasons) {
        console.log(
          `[populateMediaDetails] tv ${tv.tmdbId}: no seasons from api`
        );
        return;
      }
      const seasonNum = details.seasons.some(
        (season: { season_number: number }) => season.season_number === 0
      )
        ? details.seasons.length - 1
        : details.seasons.length;
      console.log(
        `[populateMediaDetails] tv ${tv.tmdbId}: ${tv.seasons.length} vs ${seasonNum}`
      );
      // 3. if yes, skip (if not, upsert seasons/episodes)
      if (tv.seasons.length === seasonNum) return;
      await upsertSeasonsAndEpisodes(details, tv.id);
    });
  }),

  mediaSrcFetch: publicProcedure.mutation(async ({ ctx }) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // 1. find mv whose releaseDate is older than yesterday but have no src
    const srclessMv = await ctx.db
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
            ctx.db
              .select()
              .from(tmdbSource)
              .where(eq(tmdbSource.mediaId, tmdbMedia.id))
          )
        )
      )
      .execute();

    let mvCount = 0;
    await batchProcess(srclessMv, 1, async (media) => {
      mvCount++;
      console.log(`=======`);
      console.log(
        `[mediaSrcFetch] mv progress: ${mvCount}/${srclessMv.length} (${media.tmdbId}: ${media.title})`
      );

      // 2. for mv, fetch src
      await fetchAndUpsertMvSrc(false, media.tmdbId);
    });

    // 3. find episodes whose airDate is older than yesterday but have no src
    const srclessEpisodes = await ctx.db
      .select({
        episode: tmdbEpisode,
        season: tmdbSeason,
        media: tmdbMedia,
      })
      .from(tmdbEpisode)
      .innerJoin(tmdbSeason, eq(tmdbEpisode.seasonId, tmdbSeason.id))
      .innerJoin(tmdbMedia, eq(tmdbSeason.mediaId, tmdbMedia.id))
      .where(
        and(
          isNotNull(tmdbEpisode.airDate),
          lte(tmdbEpisode.airDate, yesterday),
          notExists(
            ctx.db
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

    let episodeCount = 0;
    await batchProcess(srclessEpisodes, 1, async (item) => {
      episodeCount++;
      console.log(`=======`);
      console.log(
        `[mediaSrcFetch] tv progress: ${episodeCount}/${srclessEpisodes.length} (${item.media.tmdbId}/${item.season.seasonNumber}/${item.episode.episodeNumber}: ${item.media.title})`
      );

      // 4. for episode, fetch src
      const { episode, season, media } = item;
      await fetchAndUpsertTvSrc(
        false,
        media.tmdbId,
        season.seasonNumber,
        episode.episodeNumber,
        episode.episodeIndex
      );
    });
  }),

  fetchAndInsertMvSrc: publicProcedure
    .input(
      z.object({
        tmdbId: z.number().int().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return await fetchAndUpsertMvSrc(false, input.tmdbId);
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
        false,
        input.tmdbId,
        input.season,
        input.episode,
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
            episodeIndex: episode,
          })
          .onConflictDoNothing(); // If the episode (seasonId, episodeNumber) exists, ignore the insert

        return {
          success: true,
          message: `Ensured S${season}E${episode} exists for TMDB ID ${tmdbId}.`,
        };
      });
    }),
});
