import { z } from 'zod';
import {
  and,
  or,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  sql,
  count,
  gte,
  isNull,
} from 'drizzle-orm';

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '~/server/api/trpc';
import {
  tmdbGenre,
  tmdbMedia,
  tmdbMediaToTmdbGenre,
  tmdbMediaToTmdbOrigin,
  tmdbOrigin,
  tmdbSeason,
  tmdbTrending,
  tmdbTypeEnum,
  userListEnum,
  // tmdbTopRated,
  userMediaList,
} from '~/server/db/schema';
import {
  bulkUpsertNewMedia,
  populateMediaUsingTmdbIds,
} from '~/server/utils/mediaUtils';
import { SearchAndFilterInputSchema, type ListMedia } from '~/type';
import { TRPCError } from '@trpc/server';
import {
  fetchTmdbMvGenresViaApi,
  fetchTmdbOriginsViaApi,
  // fetchTmdbTopRatedViaApi,
  fetchTmdbTvGenresViaApi,
} from '~/server/utils/tmdbApiUtils';
import { orderValues } from '~/constant';

export const mediaRouter = createTRPCRouter({
  getTopTrending: publicProcedure
    .input(z.object({ limit: z.number().min(1) }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      // 1. Define robust SQL aggregations.
      // COALESCE ensures we get an empty array '{}' instead of NULL if a media has no origins.
      // FILTER removes any potential NULL values from the aggregation itself.
      const aggregatedOrigins = sql<
        string[]
      >`COALESCE(array_agg(DISTINCT ${tmdbOrigin.name}) FILTER (WHERE ${tmdbOrigin.name} IS NOT NULL), '{}')`.as(
        'origins'
      );
      const aggregatedGenres = sql<
        string[]
      >`COALESCE(array_agg(DISTINCT ${tmdbGenre.name}) FILTER (WHERE ${tmdbGenre.name} IS NOT NULL), '{}')`.as(
        'genres'
      );

      // 2. Build and execute the query.
      const trendingMedia: ListMedia[] = await ctx.db
        .select({
          media: tmdbMedia,
          origins: aggregatedOrigins,
          genres: aggregatedGenres,
        })
        .from(tmdbTrending)
        // Join trending table with the main media table
        .innerJoin(tmdbMedia, eq(tmdbTrending.mediaId, tmdbMedia.id))
        // Join through to the origin names
        .leftJoin(
          tmdbMediaToTmdbOrigin,
          eq(tmdbMedia.id, tmdbMediaToTmdbOrigin.mediaId)
        )
        .leftJoin(tmdbOrigin, eq(tmdbMediaToTmdbOrigin.originId, tmdbOrigin.id))
        // Join through to the genre names
        .leftJoin(
          tmdbMediaToTmdbGenre,
          eq(tmdbMedia.id, tmdbMediaToTmdbGenre.mediaId)
        )
        .leftJoin(tmdbGenre, eq(tmdbMediaToTmdbGenre.genreId, tmdbGenre.id))
        .where(gte(tmdbMedia.availabilityCount, 1))
        // Group by media to collapse all origins/genres into one row per media
        .groupBy(tmdbMedia.id, tmdbTrending.rank)
        // Order by the trending rank to get the top items first
        .orderBy(asc(tmdbTrending.rank))
        // Limit to the top 10
        .limit(limit);

      return trendingMedia;
    }),

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
    const releaseYearColumn =
      sql<number>`EXTRACT(YEAR FROM ${tmdbMedia.releaseDate})`.as(
        'releaseYear'
      );
    const releaseYearResults = await ctx.db
      .selectDistinct({
        releaseYear: releaseYearColumn,
      })
      .from(tmdbMedia)
      .where(isNotNull(tmdbMedia.releaseDate)) // Ensure we don't process null dates
      .orderBy(desc(releaseYearColumn)); // Order from newest to oldest

    // Transform [{year: 2025}, {year: 2024}] into [2025, 2024]
    const releaseYears = releaseYearResults.map((result) => result.releaseYear);

    // --- NEW: Query for distinct updated years ---
    const updatedYearColumn =
      sql<number>`EXTRACT(YEAR FROM ${tmdbMedia.updatedDate})`.as(
        'updatedYear'
      );
    const updatedYearResults = await ctx.db
      .selectDistinct({ year: updatedYearColumn })
      .from(tmdbMedia)
      .where(isNotNull(tmdbMedia.updatedDate))
      .orderBy(desc(updatedYearColumn));
    const updatedYears = updatedYearResults.map((result) => result.year);

    // --- Add the new array to the return object ---
    return { genres, origins, releaseYears, updatedYears };
  }),

  searchAndFilter: publicProcedure
    .input(SearchAndFilterInputSchema)
    .query(async ({ ctx, input }) => {
      // In a publicProcedure, ctx.session is available but can be null.
      const { session } = ctx;
      const {
        title,
        format,
        genre,
        origin,
        releaseYear,
        updatedYear,
        minVoteAvg,
        minVoteCount,
        page,
        pageSize,
        list,
      } = input;

      // 1. define columns in order to select them in the query
      // aggregate means to combine all values from 1 column to 1 cell array (so that media won't be duplicated)
      const aggregatedOrigins = sql<
        string[]
      >`array_agg(DISTINCT ${tmdbOrigin.name})`.as('origins');
      const aggregatedGenres = sql<
        string[]
      >`array_agg(DISTINCT ${tmdbGenre.name})`.as('genres');

      // 2. create subquery for getting how many total media there are
      // also create query for getting the actual data
      const fromClause = (qb: any) =>
        qb
          .from(tmdbMedia)
          .leftJoin(
            tmdbMediaToTmdbOrigin,
            eq(tmdbMedia.id, tmdbMediaToTmdbOrigin.mediaId)
          )
          .leftJoin(
            tmdbOrigin,
            eq(tmdbMediaToTmdbOrigin.originId, tmdbOrigin.id)
          )
          .leftJoin(
            tmdbMediaToTmdbGenre,
            eq(tmdbMedia.id, tmdbMediaToTmdbGenre.mediaId)
          )
          .leftJoin(tmdbGenre, eq(tmdbMediaToTmdbGenre.genreId, tmdbGenre.id))
          .groupBy(tmdbMedia.id)
          .$dynamic();

      const countSubquery = fromClause(ctx.db.select({ id: tmdbMedia.id }));
      const dataQueryBuilder = fromClause(
        ctx.db.select({
          media: tmdbMedia,
          origins: aggregatedOrigins,
          genres: aggregatedGenres,
        })
      );

      // 4. apply all conditions to count and data query
      const conditions = [];
      // Always filter for available media
      conditions.push(gte(tmdbMedia.availabilityCount, 1));
      // if list exists, check if user is logged in
      if (list && list.length > 0) {
        if (!session?.user?.id) {
          // If not, throw an error. This protects the endpoint.
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const userId = session.user.id;
        conditions.push(eq(userMediaList.userId, userId));
        conditions.push(inArray(userMediaList.listType, list));
        // add inner join
        countSubquery.innerJoin(
          userMediaList,
          eq(tmdbMedia.id, userMediaList.mediaId)
        );
        dataQueryBuilder.innerJoin(
          userMediaList,
          eq(tmdbMedia.id, userMediaList.mediaId)
        );
      }
      if (title) {
        // empty string is falsy -> will not trigger
        conditions.push(ilike(tmdbMedia.title, `%${title}%`));
      }
      if (format && format.length > 0) {
        conditions.push(inArray(tmdbMedia.type, format));
      }
      if (releaseYear && releaseYear.length > 0) {
        // Use a SQL function to extract the year from the release_date column
        conditions.push(
          inArray(sql`extract(year from ${tmdbMedia.releaseDate})`, releaseYear)
        );
      }
      // NEW: Add filter for the new updatedDate column
      if (updatedYear && updatedYear.length > 0) {
        conditions.push(
          inArray(sql`extract(year from ${tmdbMedia.updatedDate})`, updatedYear)
        );
      }
      // // Handle genres filter (acts on the joined tmdbMediaToTmdbGenre table)
      // if (genre && genre.length > 0) {
      //   conditions.push(inArray(tmdbMediaToTmdbGenre.genreId, genre));
      // }
      // // Handle origins filter (acts on the joined tmdbMediaToTmdbOrigin table)
      // if (origin && origin.length > 0) {
      //   conditions.push(inArray(tmdbMediaToTmdbOrigin.originId, origin));
      // }

      // Handle genres with a subquery
      if (genre && genre.values.length > 0) {
        let genreSubquery;
        if (genre.operator === 'and') {
          // and: Find media IDs that have ALL the specified genres
          genreSubquery = ctx.db
            .select({ mediaId: tmdbMediaToTmdbGenre.mediaId })
            .from(tmdbMediaToTmdbGenre)
            .where(inArray(tmdbMediaToTmdbGenre.genreId, genre.values))
            .groupBy(tmdbMediaToTmdbGenre.mediaId)
            .having(
              eq(count(tmdbMediaToTmdbGenre.genreId), genre.values.length)
            );
        } else {
          // or: Find media IDs that have AT LEAST ONE of the genres
          genreSubquery = ctx.db
            .select({ mediaId: tmdbMediaToTmdbGenre.mediaId })
            .from(tmdbMediaToTmdbGenre)
            .where(inArray(tmdbMediaToTmdbGenre.genreId, genre.values));
        }
        conditions.push(inArray(tmdbMedia.id, genreSubquery));
      }
      // Handle origins with a subquery
      if (origin && origin.values.length > 0) {
        let originSubquery;
        if (origin.operator === 'and') {
          // and: Find media IDs that have ALL the specified origins
          originSubquery = ctx.db
            .select({ mediaId: tmdbMediaToTmdbOrigin.mediaId })
            .from(tmdbMediaToTmdbOrigin)
            .where(inArray(tmdbMediaToTmdbOrigin.originId, origin.values))
            .groupBy(tmdbMediaToTmdbOrigin.mediaId)
            .having(
              eq(count(tmdbMediaToTmdbOrigin.originId), origin.values.length)
            );
        } else {
          // or: Find media IDs that have AT LEAST ONE of the origins
          originSubquery = ctx.db
            .select({ mediaId: tmdbMediaToTmdbOrigin.mediaId })
            .from(tmdbMediaToTmdbOrigin)
            .where(inArray(tmdbMediaToTmdbOrigin.originId, origin.values));
        }
        conditions.push(inArray(tmdbMedia.id, originSubquery));
      }
      if (minVoteAvg && minVoteAvg > 0) {
        //0 is falsy -> so no need for >0
        conditions.push(gte(tmdbMedia.voteAverage, minVoteAvg));
      }
      if (minVoteCount && minVoteCount > 0) {
        conditions.push(gte(tmdbMedia.voteCount, minVoteCount));
      }

      if (conditions.length > 0) {
        countSubquery.where(and(...conditions));
        dataQueryBuilder.where(and(...conditions));
      }

      // 5. Get the Total Count from the Subquery
      // This is now very efficient. The database does all the hard work and returns one row.
      const countResult = await ctx.db
        .select({ count: count() })
        .from(countSubquery.as('sq'));
      const totalMediaCount = countResult[0]?.count ?? 0;
      const totalPages = Math.ceil(totalMediaCount / pageSize);

      // 6. add order by to data query
      let orderByClause;
      switch (input.order) {
        case 'title-desc':
          orderByClause = desc(tmdbMedia.title);
          break;
        case 'title-asc':
          orderByClause = asc(tmdbMedia.title);
          break;
        case 'released-desc':
          orderByClause = desc(tmdbMedia.releaseDate);
          break;
        case 'released-asc':
          orderByClause = asc(tmdbMedia.releaseDate);
          break;
        case 'updated-desc':
          orderByClause = desc(tmdbMedia.updatedDate);
          break;
        case 'updated-asc':
          orderByClause = asc(tmdbMedia.updatedDate);
          break;
        case 'popularity-desc':
          orderByClause = desc(tmdbMedia.popularity);
          break;
        case 'popularity-asc':
          orderByClause = asc(tmdbMedia.popularity);
          break;
        case 'vote-avg-desc':
          orderByClause = desc(tmdbMedia.voteAverage);
          break;
        case 'vote-avg-asc':
          orderByClause = asc(tmdbMedia.voteAverage);
          break;
        case 'vote-count-desc':
          orderByClause = desc(tmdbMedia.voteCount);
          break;
        case 'vote-count-asc':
          orderByClause = asc(tmdbMedia.voteCount);
          break;
      }
      if (orderByClause) dataQueryBuilder.orderBy(orderByClause);

      // 6. get all media for chosen page
      // const pageSize = 30;
      const pageMedia: ListMedia[] = await dataQueryBuilder
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return {
        // pageSize,
        pageMedia,
        totalPages,
      };
    }),

  fetchTmdbOrigins: protectedProcedure.mutation(async ({ ctx }) => {
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

  fetchTmdbGenres: protectedProcedure.mutation(async ({ ctx }) => {
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

  fetchMissingOriginsAndGenres: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Create a subquery to efficiently count seasons for each media item.
    // This avoids complex joins in the main query.
    const seasonCountSubquery = ctx.db
      .select({
        mediaId: tmdbSeason.mediaId,
        count: count(tmdbSeason.id).as('season_count'),
      })
      .from(tmdbSeason)
      .groupBy(tmdbSeason.mediaId)
      .as('season_counts');

    // 2. Find all distinct media that are missing an entry in either the
    // origin or genre join tables.
    const mediaToUpdate = await ctx.db
      .selectDistinct({
        tmdbId: tmdbMedia.tmdbId,
        type: tmdbMedia.type,
        // Coalesce ensures we get 0 instead of null if a TV show has no seasons listed yet
        seasonCount: sql<number>`COALESCE(${seasonCountSubquery.count}, 0)`,
      })
      .from(tmdbMedia)
      // LEFT JOIN to find media that *might not have* an origin
      .leftJoin(
        tmdbMediaToTmdbOrigin,
        eq(tmdbMedia.id, tmdbMediaToTmdbOrigin.mediaId)
      )
      // LEFT JOIN to find media that *might not have* a genre
      .leftJoin(
        tmdbMediaToTmdbGenre,
        eq(tmdbMedia.id, tmdbMediaToTmdbGenre.mediaId)
      )
      // LEFT JOIN to our season count subquery to get season data
      .leftJoin(
        seasonCountSubquery,
        eq(tmdbMedia.id, seasonCountSubquery.mediaId)
      )
      // The core logic: filter for rows where either join failed to find a match
      .where(
        or(
          isNull(tmdbMediaToTmdbOrigin.mediaId),
          isNull(tmdbMediaToTmdbGenre.mediaId)
        )
      );

    if (mediaToUpdate.length === 0) {
      return { message: 'No media found with missing origins or genres.' };
    }

    // 3. Format the results into the structure required by your population function.
    const populationInput = mediaToUpdate.map((media) => ({
      tmdbId: media.tmdbId,
      type: media.type,
      // The population function likely only needs seasonCount for TV shows
      ...(media.type === 'tv' && { seasonCount: media.seasonCount }),
    }));

    // 4. Call the actual population logic.
    // This part is commented out as the function is not provided, but this is where
    // you would trigger the update.
    await populateMediaUsingTmdbIds(populationInput);

    console.log(`Found ${mediaToUpdate.length} media items to update.`);
    console.log('Items to populate:', populationInput);

    return {
      message: `Found ${mediaToUpdate.length} media items to process for missing origins or genres.`,
      count: mediaToUpdate.length,
      // You might want to return the list for debugging purposes
      // items: populationInput,
    };
  }),

  // fetchTmdbTopRated: protectedProcedure
  //   .input(z.object({ limit: z.number() }))
  //   .mutation(async ({ input, ctx }) => {
  //     // 1. Delete the old top-rated list first
  //     await ctx.db.delete(tmdbTopRated).execute();

  //     // 2. Fetch top-rated mv and tv via API (need to add type manually)
  //     const fetchedMv = (
  //       await fetchTmdbTopRatedViaApi(input.limit, 'movie')
  //     ).map((mv) => {
  //       return { ...mv, media_type: 'movie' };
  //     });
  //     const fetchedTv = (await fetchTmdbTopRatedViaApi(input.limit, 'tv')).map(
  //       (tv) => {
  //         return { ...tv, media_type: 'tv' };
  //       }
  //     );
  //     const fetchOutput = [...fetchedMv, ...fetchedTv];
  //     console.log(`fetchedOutput: `, fetchOutput.length);

  //     // 3. save rating info
  //     const ratingsMap = new Map();
  //     fetchedMv.forEach((item, index) => {
  //       ratingsMap.set(item.id, {
  //         rank: index,
  //         voteAverage: item.vote_average,
  //         voteCount: item.vote_count,
  //       });
  //     });
  //     fetchedTv.forEach((item, index) => {
  //       ratingsMap.set(item.id, {
  //         rank: index,
  //         voteAverage: item.vote_average,
  //         voteCount: item.vote_count,
  //       });
  //     });

  //     // 4. Upsert fetched result to media/genre tables
  //     const mediaOutput = await bulkUpsertNewMedia(fetchOutput);
  //     console.log(`mediaOutput: `, mediaOutput.length);

  //     // 5. upsert ratings info to top rated table
  //     const topRatedInput = mediaOutput.map((item) => {
  //       const ratingInfo = ratingsMap.get(item.tmdbId);
  //       return {
  //         mediaId: item.mediaId,
  //         rank: ratingInfo.rank,
  //         voteAverage: ratingInfo.voteAverage,
  //         voteCount: ratingInfo.voteCount,
  //       };
  //     });
  //     console.log(`topRatedInput: `, topRatedInput.length);
  //     await ctx.db.insert(tmdbTopRated).values(topRatedInput).execute();

  //     return { count: mediaOutput.length };
  //   }),

  // fetchTmdbTrending: protectedProcedure
  //   .input(z.object({ limit: z.number() }))
  //   .mutation(async ({ input }) => {
  //     await populateMediaUsingTmdbList('trending', input.limit);
  //   }),

  // fetchTmdbPopular: protectedProcedure
  //   .input(z.object({ limit: z.number() }))
  //   .mutation(async ({ input }) => {
  //     await populateMediaUsingTmdbList('popular', input.limit);
  //   }),

  // populateMissingMediaDetails: protectedProcedure.mutation(async ({ ctx }) => {
  //   // 1. find all movie without origin
  //   const moviesWithoutOrigin = await ctx.db
  //     .select({
  //       mediaId: tmdbMedia.id,
  //       tmdbId: tmdbMedia.tmdbId,
  //       title: tmdbMedia.title,
  //     })
  //     .from(tmdbMedia)
  //     .leftJoin(
  //       tmdbMediaToTmdbOrigin,
  //       eq(tmdbMediaToTmdbOrigin.mediaId, tmdbMedia.id)
  //     )
  //     .where(
  //       and(
  //         eq(tmdbMedia.type, 'movie'),
  //         isNull(tmdbMediaToTmdbOrigin.mediaId) // Find movies where the join failed (i.e., no origin)
  //       )
  //     );

  //   let movieCount = 0;
  //   await runItemsInEachBatchConcurrently(
  //     moviesWithoutOrigin,
  //     10,
  //     async (movie) => {
  //       movieCount++;
  //       console.log(
  //         `[populateMediaDetails] mv progress: ${movieCount}/${moviesWithoutOrigin.length} (${movie.tmdbId}:${movie.title})`
  //       );
  //       // 2. for mv, fetch detail via api
  //       const details = await fetchTmdbDetailViaApi('movie', movie.tmdbId);
  //       // 3. for mv, upsert origin
  //       const originInput = details.origin_country.map((originId: string) => ({
  //         mediaId: movie.mediaId,
  //         originId: originId,
  //       }));
  //       await ctx.db
  //         .insert(tmdbMediaToTmdbOrigin)
  //         .values(originInput)
  //         .onConflictDoNothing();
  //     }
  //   );

  //   // 1. find all tv
  //   const allTv = await ctx.db.query.tmdbMedia.findMany({
  //     where: eq(tmdbMedia.type, 'tv'),
  //     with: { seasons: true, origins: true },
  //   });

  //   let count = 0;
  //   await runItemsInEachBatchConcurrently(allTv, 10, async (tv) => {
  //     count++;
  //     console.log(
  //       `[populateMediaDetails] tv progress: ${count}/${allTv.length} (${tv.tmdbId}:${tv.title})`
  //     );

  //     // 2. for tv...
  //     const details = await fetchTmdbDetailViaApi('tv', tv.tmdbId);

  //     // 3. if tv has no origin, upsert origin
  //     if (tv.origins.length === 0) {
  //       const originInput = details.origin_country.map((originId: string) => ({
  //         mediaId: tv.id,
  //         originId: originId,
  //       }));
  //       await ctx.db
  //         .insert(tmdbMediaToTmdbOrigin)
  //         .values(originInput)
  //         .onConflictDoNothing();
  //     }

  //     // 4. if tv is missing seasons, upsert seasons/episodes
  //     if (!details.seasons) {
  //       console.log(
  //         `[populateMediaDetails] tv ${tv.title}: ${tv.seasons.length} vs No Seasons from API`
  //       );
  //       return;
  //     }
  //     const seasonNum = details.seasons.some(
  //       (season: { season_number: number }) => season.season_number === 0
  //     )
  //       ? details.seasons.length - 1
  //       : details.seasons.length;
  //     console.log(
  //       `[populateMediaDetails] tv ${tv.title}: ${tv.seasons.length} vs ${seasonNum}`
  //     );
  //     if (tv.seasons.length === seasonNum) return;
  //     await upsertSeasonsAndEpisodes(details, {
  //       mediaId: tv.id,
  //       tmdbId: tv.tmdbId,
  //       title: tv.title,
  //       seasonCount: tv.seasons.length,
  //     });
  //   });
  // }),

  // fetchMediaSrc: protectedProcedure.mutation(async ({ ctx }) => {
  //   await fetchSrcForMediaList('all');
  // }),

  // fetchAndInsertMvSrc: publicProcedure
  //   .input(
  //     z.object({
  //       tmdbId: z.number().int().min(1),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return await fetchAndUpsertMvSrc(input.tmdbId);
  //   }),

  // fetchAndInsertTvSrc: publicProcedure
  //   .input(
  //     z.object({
  //       tmdbId: z.number().int().min(1),
  //       season: z.number().int().min(1),
  //       episode: z.number().int().min(1),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     return await fetchAndUpsertTvSrc(
  //       // 'slow',
  //       input.tmdbId,
  //       input.season,
  //       input.episode,
  //       input.episode
  //     );
  //   }),

  // insertSeasonAndEpisode: publicProcedure
  //   .input(
  //     z.object({
  //       tmdbId: z.number().int().min(1),
  //       season: z.number().int().min(1),
  //       episode: z.number().int().min(1),
  //     })
  //   )
  //   .mutation(async ({ input, ctx }) => {
  //     const { tmdbId, season, episode } = input;

  //     // Use a transaction to ensure all operations succeed or fail together
  //     return await ctx.db.transaction(async (tx) => {
  //       // 1. Find the internal media ID from the public tmdbId
  //       const media = await tx.query.tmdbMedia.findFirst({
  //         where: eq(tmdbMedia.tmdbId, tmdbId),
  //         columns: {
  //           id: true, // We only need the ID
  //         },
  //       });

  //       if (!media) {
  //         throw new Error(
  //           `TV show with TMDB ID ${tmdbId} not found in database.`
  //         );
  //       }

  //       // 2. Find or create the season to get its ID
  //       let existingSeason = await tx.query.tmdbSeason.findFirst({
  //         where: and(
  //           eq(tmdbSeason.mediaId, media.id),
  //           eq(tmdbSeason.seasonNumber, season)
  //         ),
  //       });

  //       // If the season doesn't exist, create it
  //       if (!existingSeason) {
  //         const newSeasonResult = await tx
  //           .insert(tmdbSeason)
  //           .values({
  //             mediaId: media.id,
  //             seasonNumber: season,
  //           })
  //           .returning(); // Get the newly created season back

  //         existingSeason = newSeasonResult[0];
  //       }

  //       if (!existingSeason) {
  //         throw new Error(`Failed to find or create season ${season}.`);
  //       }

  //       // 3. Insert the episode, doing nothing if it already exists
  //       await tx
  //         .insert(tmdbEpisode)
  //         .values({
  //           seasonId: existingSeason.id,
  //           episodeNumber: episode,
  //           episodeIndex: episode,
  //         })
  //         .onConflictDoNothing(); // If the episode (seasonId, episodeNumber) exists, ignore the insert

  //       return {
  //         success: true,
  //         message: `Ensured S${season}E${episode} exists for TMDB ID ${tmdbId}.`,
  //       };
  //     });
  //   }),
});
