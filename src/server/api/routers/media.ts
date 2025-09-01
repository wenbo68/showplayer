import { z } from 'zod';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  notExists,
  or,
  sql,
} from 'drizzle-orm';

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import {
  tmdbEpisode,
  tmdbGenre,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbMediaToTmdbOrigin,
  tmdbOrigin,
  tmdbSeason,
  tmdbSource,
  tmdbTopRated,
  tmdbTrending,
} from '~/server/db/schema';
import {
  batchProcess,
  fetchAndUpsertMvSrc,
  fetchAndUpsertTvSrc,
  fetchTmdbDetailViaApi,
  fetchTmdbMvGenresViaApi,
  fetchTmdbOriginsViaApi,
  fetchTmdbTopRatedViaApi,
  fetchTmdbTrendingViaApi,
  fetchTmdbTvGenresViaApi,
  upsertNewMedia,
  upsertSeasonsAndEpisodes,
} from '~/server/utils';
import type { ListMedia } from '~/type';

export const mediaRouter = createTRPCRouter({
  getFilterOptions: publicProcedure.query(async ({ ctx }) => {
    const genres = await ctx.db
      .selectDistinct({
        id: tmdbGenre.id,
        name: tmdbGenre.name,
      })
      .from(tmdbGenre)
      .innerJoin(
        tmdbMediaToTmdbGenre,
        eq(tmdbGenre.id, tmdbMediaToTmdbGenre.genreId)
      )
      .orderBy(asc(tmdbGenre.name));

    const origins = await ctx.db
      .selectDistinct({
        id: tmdbOrigin.id,
        name: tmdbOrigin.name,
      })
      .from(tmdbOrigin)
      .innerJoin(
        tmdbMediaToTmdbOrigin,
        eq(tmdbOrigin.id, tmdbMediaToTmdbOrigin.originId)
      )
      .orderBy(asc(tmdbOrigin.name));

    // --- NEW: Query for distinct release years ---
    const yearColumn =
      sql<number>`EXTRACT(YEAR FROM ${tmdbMedia.releaseDate})`.as('year');
    const yearResults = await ctx.db
      .selectDistinct({
        year: yearColumn,
      })
      .from(tmdbMedia)
      .where(isNotNull(tmdbMedia.releaseDate)) // Ensure we don't process null dates
      .orderBy(desc(yearColumn)); // Order from newest to oldest

    // Transform [{year: 2025}, {year: 2024}] into [2025, 2024]
    const years = yearResults.map((result) => result.year);

    return { genres, origins, years }; // Add years to the return object
  }),

  searchAndFilter: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        types: z.array(z.enum(['movie', 'tv'])).optional(),
        genres: z.array(z.number()).optional(),
        origins: z.array(z.string()).optional(),
        years: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. define columns in order to select them in the query
      // aggregate means to combine all values from 1 column to 1 cell array (so that media won't be duplicated)
      const aggregatedOrigins = sql<
        string[]
      >`array_agg(DISTINCT ${tmdbOrigin.name})`.as('origins');
      const aggregatedGenres = sql<
        string[]
      >`array_agg(DISTINCT ${tmdbGenre.name})`.as('genres');
      // mv: how many sources
      // tv: how many episodes have source
      const availabilityCount = sql<number>`
        CASE
          WHEN ${tmdbMedia.type} = 'movie'
          THEN (
            SELECT COUNT(*) FROM ${tmdbSource}
            WHERE ${tmdbSource.mediaId} = ${tmdbMedia.id}
          )
          WHEN ${tmdbMedia.type} = 'tv'
          THEN (
            SELECT COUNT(DISTINCT ${tmdbSource.episodeId})
            FROM ${tmdbSource}
            JOIN ${tmdbEpisode} ON ${tmdbSource.episodeId} = ${tmdbEpisode.id}
            JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
            WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
          )
          ELSE 0
        END`
        .mapWith(Number)
        .as('availabilityCount');
      // mv: 0
      // tv: how many episodes with airDate before today
      const totalEpisodeCount = sql<number>`
        CASE
          WHEN ${tmdbMedia.type} = 'tv'
          THEN (
            SELECT COUNT(*)
            FROM ${tmdbEpisode}
            INNER JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
            WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
              AND ${tmdbEpisode.airDate} < CURRENT_DATE
          )
          ELSE 0
        END`
        .mapWith(Number)
        .as('totalEpisodeCount');

      // 2. join media with origins and genres
      let qb = ctx.db
        .select({
          media: tmdbMedia,
          origins: aggregatedOrigins,
          genres: aggregatedGenres,
          availabilityCount: availabilityCount,
          totalEpisodeCount: totalEpisodeCount,
        })
        .from(tmdbMedia)
        .leftJoin(
          tmdbMediaToTmdbOrigin,
          eq(tmdbMedia.id, tmdbMediaToTmdbOrigin.mediaId)
        )
        .leftJoin(tmdbOrigin, eq(tmdbMediaToTmdbOrigin.originId, tmdbOrigin.id))
        .leftJoin(
          tmdbMediaToTmdbGenre,
          eq(tmdbMedia.id, tmdbMediaToTmdbGenre.mediaId)
        )
        .leftJoin(tmdbGenre, eq(tmdbMediaToTmdbGenre.genreId, tmdbGenre.id))
        // We must group by media to deduplicate media and aggregate origins/genres
        .groupBy(tmdbMedia.id);

      // 3. gather all conditions from input
      const conditions = [];
      const { query, types, genres, origins, years } = input;
      if (query) {
        conditions.push(ilike(tmdbMedia.title, `%${query}%`));
      }
      if (types && types.length > 0) {
        conditions.push(inArray(tmdbMedia.type, types));
      }
      if (years && years.length > 0) {
        // Use a SQL function to extract the year from the release_date column
        conditions.push(
          inArray(sql`extract(year from ${tmdbMedia.releaseDate})`, years)
        );
      }
      // Handle genres filter (acts on the joined tmdbMediaToTmdbGenre table)
      if (genres && genres.length > 0) {
        conditions.push(inArray(tmdbMediaToTmdbGenre.genreId, genres));
      }
      // Handle origins filter (acts on the joined tmdbMediaToTmdbOrigin table)
      if (origins && origins.length > 0) {
        conditions.push(inArray(tmdbMediaToTmdbOrigin.originId, origins));
      }

      // 4. add all conditions to the query
      if (conditions.length > 0) {
        qb.where(and(...conditions));
      }

      return await qb.orderBy(desc(tmdbMedia.releaseDate));
      // return results.map((result) => {
      //   return {
      //     ...result,
      //     // origins: [],
      //     // genres: [],
      //     // availabilityCount: 0,
      //     // totalEpisodeCount: 0,
      //   };
      // });
    }),

  getTmdbTrending: publicProcedure.query(async ({ ctx }) => {
    const trending: ListMedia[] = await ctx.db
      .select({
        // rank: tmdbTrending.rank,
        media: tmdbMedia,
        origins: sql<string[]>`(
          SELECT array_agg(${tmdbOrigin.name})
          FROM ${tmdbMediaToTmdbOrigin}
          INNER JOIN ${tmdbOrigin} ON ${tmdbMediaToTmdbOrigin.originId} = ${tmdbOrigin.id}
          WHERE ${tmdbMediaToTmdbOrigin.mediaId} = ${tmdbMedia.id}
        )`,
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
        totalEpisodeCount: sql<number>`
          CASE
            WHEN ${tmdbMedia.type} = 'tv'
            THEN (
              SELECT COUNT(*)
              FROM ${tmdbEpisode}
              INNER JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
              WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
                AND ${tmdbEpisode.airDate} <= (CURRENT_DATE - INTERVAL '1 day')
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

  getTmdbTopRatedMv: publicProcedure.query(async ({ ctx }) => {
    const topRatedMovies: ListMedia[] = await ctx.db
      .select({
        // rank: tmdbTopRated.rank,
        avergeRating: tmdbTopRated.voteAverage,
        voteCount: tmdbTopRated.voteCount,
        media: tmdbMedia,
        genres: sql<string[]>`(
          SELECT array_agg(${tmdbGenre.name})
          FROM ${tmdbMediaToTmdbGenre}
          INNER JOIN ${tmdbGenre} ON ${tmdbMediaToTmdbGenre.genreId} = ${tmdbGenre.id}
          WHERE ${tmdbMediaToTmdbGenre.mediaId} = ${tmdbMedia.id}
        )`,
        origins: sql<string[]>`(
          SELECT array_agg(${tmdbOrigin.name})
          FROM ${tmdbMediaToTmdbOrigin}
          INNER JOIN ${tmdbOrigin} ON ${tmdbMediaToTmdbOrigin.originId} = ${tmdbOrigin.id}
          WHERE ${tmdbMediaToTmdbOrigin.mediaId} = ${tmdbMedia.id}
        )`,
        availabilityCount: sql<number>`
          CASE
            WHEN ${tmdbMedia.type} = 'movie'
            THEN (
              SELECT COUNT(*)
              FROM ${tmdbSource}
              WHERE ${tmdbSource.mediaId} = ${tmdbMedia.id}
            )
            ELSE 0
          END
        `.mapWith(Number),
        totalEpisodeCount: sql<number>`
          CASE
            WHEN ${tmdbMedia.type} = 'tv'
            THEN (
              SELECT COUNT(*)
              FROM ${tmdbEpisode}
              INNER JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
              WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
                AND ${tmdbEpisode.airDate} <= (CURRENT_DATE - INTERVAL '1 day')
            )
            ELSE 0
          END
        `.mapWith(Number),
      })
      .from(tmdbTopRated) // 👈 Start from the top-rated table
      .innerJoin(tmdbMedia, eq(tmdbTopRated.mediaId, tmdbMedia.id))
      .where(eq(tmdbMedia.type, 'movie')) // 👈 Filter for movies
      .orderBy(tmdbTopRated.rank) // 👈 Order by top-rated rank
      .execute();

    return topRatedMovies;
  }),

  getTmdbTopRatedTv: publicProcedure.query(async ({ ctx }) => {
    const topRatedTv: ListMedia[] = await ctx.db
      .select({
        // rank: tmdbTopRated.rank,
        avergeRating: tmdbTopRated.voteAverage,
        voteCount: tmdbTopRated.voteCount,
        media: tmdbMedia,
        genres: sql<string[]>`(
          SELECT array_agg(${tmdbGenre.name})
          FROM ${tmdbMediaToTmdbGenre}
          INNER JOIN ${tmdbGenre} ON ${tmdbMediaToTmdbGenre.genreId} = ${tmdbGenre.id}
          WHERE ${tmdbMediaToTmdbGenre.mediaId} = ${tmdbMedia.id}
        )`,
        origins: sql<string[]>`(
          SELECT array_agg(${tmdbOrigin.name})
          FROM ${tmdbMediaToTmdbOrigin}
          INNER JOIN ${tmdbOrigin} ON ${tmdbMediaToTmdbOrigin.originId} = ${tmdbOrigin.id}
          WHERE ${tmdbMediaToTmdbOrigin.mediaId} = ${tmdbMedia.id}
        )`,
        availabilityCount: sql<number>`
          CASE
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
        totalEpisodeCount: sql<number>`
          CASE
            WHEN ${tmdbMedia.type} = 'tv'
            THEN (
              SELECT COUNT(*)
              FROM ${tmdbEpisode}
              INNER JOIN ${tmdbSeason} ON ${tmdbEpisode.seasonId} = ${tmdbSeason.id}
              WHERE ${tmdbSeason.mediaId} = ${tmdbMedia.id}
                AND ${tmdbEpisode.airDate} <= (CURRENT_DATE - INTERVAL '1 day')
            )
            ELSE 0
          END
        `.mapWith(Number),
      })
      .from(tmdbTopRated) // 👈 Start from the top-rated table
      .innerJoin(tmdbMedia, eq(tmdbTopRated.mediaId, tmdbMedia.id))
      .where(eq(tmdbMedia.type, 'tv')) // 👈 Filter for TV shows
      .orderBy(tmdbTopRated.rank) // 👈 Order by top-rated rank
      .execute();

    return topRatedTv;
  }),

  fetchOrigins: publicProcedure.mutation(async ({ ctx }) => {
    // 1. Fetch the origins from the TMDB API
    const origins = await fetchTmdbOriginsViaApi();

    // 2. Transform the data to match your 'tmdbOrigin' schema
    const originInput = origins.map((origin: any) => ({
      id: origin.iso_3166_1,
      name: origin.english_name,
    }));

    // 3. Insert the transformed data into the database
    const originOutput = await ctx.db
      .insert(tmdbOrigin)
      .values(originInput)
      .onConflictDoUpdate({
        target: tmdbOrigin.id, // The column to check for conflicts
        set: {
          name: sql`excluded.name`, // Update the name if the ID already exists
        },
      })
      .returning();

    console.log(`Upserted ${originOutput.length} unique origins.`);
    return { count: originOutput.length };
  }),

  fetchGenres: publicProcedure.mutation(async ({ ctx }) => {
    const { genres: mvGenres } = await fetchTmdbMvGenresViaApi();
    const { genres: tvGenres } = await fetchTmdbTvGenresViaApi();

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

  fetchTmdbTopRated: publicProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Delete the old top-rated list first
      await ctx.db.delete(tmdbTopRated).execute();

      // 2. Fetch top-rated mv and tv via API (need to add type manually)
      const fetchedMv = (
        await fetchTmdbTopRatedViaApi(input.limit, 'movie')
      ).map((mv) => {
        return { ...mv, media_type: 'movie' };
      });
      const fetchedTv = (await fetchTmdbTopRatedViaApi(input.limit, 'tv')).map(
        (tv) => {
          return { ...tv, media_type: 'tv' };
        }
      );
      const fetchOutput = [...fetchedMv, ...fetchedTv];
      console.log(`fetchedOutput: `, fetchOutput.length);

      // 3. save rating info
      const ratingsMap = new Map();
      fetchedMv.forEach((item, index) => {
        ratingsMap.set(item.id, {
          rank: index,
          voteAverage: item.vote_average,
          voteCount: item.vote_count,
        });
      });
      fetchedTv.forEach((item, index) => {
        ratingsMap.set(item.id, {
          rank: index,
          voteAverage: item.vote_average,
          voteCount: item.vote_count,
        });
      });

      // 4. Upsert fetched result to media/genre tables
      const mediaOutput = await upsertNewMedia(fetchOutput);
      console.log(`mediaOutput: `, mediaOutput.length);

      // 5. upsert ratings info to top rated table
      const topRatedInput = mediaOutput.map((item) => {
        const ratingInfo = ratingsMap.get(item.tmdbId);
        return {
          mediaId: item.mediaId,
          rank: ratingInfo.rank,
          voteAverage: ratingInfo.voteAverage,
          voteCount: ratingInfo.voteCount,
        };
      });
      console.log(`topRatedInput: `, topRatedInput.length);
      await ctx.db.insert(tmdbTopRated).values(topRatedInput).execute();

      return { count: mediaOutput.length };
    }),

  fetchTmdbTrending: publicProcedure
    .input(z.object({ limit: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. delete trending list first
      await ctx.db.delete(tmdbTrending).execute();

      // 2. fetch trending from api
      const fetchOutput = await fetchTmdbTrendingViaApi(input.limit);

      // 3. insert fetched result to media/genre/origin tables
      const mediaOutput = await upsertNewMedia(fetchOutput);

      // 4. insert new media to trending table
      const trendingInput = mediaOutput.map((item: any, index: number) => {
        return {
          mediaId: item.mediaId,
          rank: index,
        };
      });
      await ctx.db.insert(tmdbTrending).values(trendingInput).execute();

      return { count: mediaOutput.length };
    }),

  populateMediaDetails: publicProcedure.mutation(async ({ ctx }) => {
    // 1. find all movie without origin
    const moviesWithoutOrigin = await ctx.db
      .select()
      .from(tmdbMedia)
      .where(
        and(
          eq(tmdbMedia.type, 'movie'),
          notExists(
            ctx.db
              .select()
              .from(tmdbMediaToTmdbOrigin)
              .where(eq(tmdbMediaToTmdbOrigin.mediaId, tmdbMedia.id))
          )
        )
      );

    let movieCount = 0;
    await batchProcess(moviesWithoutOrigin, 10, async (movie) => {
      movieCount++;
      console.log(
        `[populateMediaDetails] mv progress: ${movieCount}/${moviesWithoutOrigin.length} (${movie.tmdbId}:${movie.title})`
      );
      // 2. for mv, fetch detail via api
      const details = await fetchTmdbDetailViaApi('movie', movie.tmdbId);
      // 3. for mv, upsert origin
      const originInput = details.origin_country.map((originId: string) => ({
        mediaId: movie.id,
        originId: originId,
      }));
      await ctx.db
        .insert(tmdbMediaToTmdbOrigin)
        .values(originInput)
        .onConflictDoNothing();
    });

    // 1. find all tv
    const allTv = await ctx.db.query.tmdbMedia.findMany({
      where: eq(tmdbMedia.type, 'tv'),
      with: { seasons: true, origins: true },
    });

    let count = 0;
    await batchProcess(allTv, 10, async (tv) => {
      count++;
      console.log(
        `[populateMediaDetails] tv progress: ${count}/${allTv.length} (${tv.tmdbId}:${tv.title})`
      );

      // 2. for tv...
      const details = await fetchTmdbDetailViaApi('tv', tv.tmdbId);

      // 3. if tv has no origin, upsert origin
      if (tv.origins.length === 0) {
        const originInput = details.origin_country.map((originId: string) => ({
          mediaId: tv.id,
          originId: originId,
        }));
        await ctx.db
          .insert(tmdbMediaToTmdbOrigin)
          .values(originInput)
          .onConflictDoNothing();
      }

      // 4. if tv is missing seasons, upsert seasons/episodes
      const seasonNum = details.seasons.some(
        (season: { season_number: number }) => season.season_number === 0
      )
        ? details.seasons.length - 1
        : details.seasons.length;
      console.log(
        `[populateMediaDetails] tv ${tv.title}: ${tv.seasons.length} vs ${seasonNum}`
      );
      if (tv.seasons.length === seasonNum) return;
      await upsertSeasonsAndEpisodes(details, tv.id);
    });
  }),

  fetchMediaSrc: publicProcedure.mutation(async ({ ctx }) => {
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
      await fetchAndUpsertMvSrc('slow', media.tmdbId);
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
        'slow',
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
      return await fetchAndUpsertMvSrc('slow', input.tmdbId);
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
        'slow',
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
