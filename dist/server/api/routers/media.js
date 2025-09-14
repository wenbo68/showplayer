import { z } from 'zod';
import { and, asc, desc, eq, ilike, inArray, isNotNull, sql, count, gte, } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure, publicProcedure, } from '~/server/api/trpc';
import { tmdbGenre, tmdbMedia, tmdbMediaToTmdbGenre, tmdbMediaToTmdbOrigin, tmdbOrigin, tmdbTopRated, userMediaList, } from '~/server/db/schema';
import { bulkUpsertNewMedia } from '~/server/utils/mediaUtils';
import { TRPCError } from '@trpc/server';
import { fetchTmdbMvGenresViaApi, fetchTmdbOriginsViaApi, fetchTmdbTopRatedViaApi, fetchTmdbTvGenresViaApi, } from '~/server/utils/tmdbApiUtils';
export const mediaRouter = createTRPCRouter({
    getFilterOptions: publicProcedure.query(async ({ ctx }) => {
        const genres = await ctx.db
            .selectDistinct({
            id: tmdbGenre.id,
            name: tmdbGenre.name,
        })
            .from(tmdbGenre)
            .innerJoin(tmdbMediaToTmdbGenre, eq(tmdbGenre.id, tmdbMediaToTmdbGenre.genreId))
            .orderBy(asc(tmdbGenre.name));
        const origins = await ctx.db
            .selectDistinct({
            id: tmdbOrigin.id,
            name: tmdbOrigin.name,
        })
            .from(tmdbOrigin)
            .innerJoin(tmdbMediaToTmdbOrigin, eq(tmdbOrigin.id, tmdbMediaToTmdbOrigin.originId))
            .orderBy(asc(tmdbOrigin.name));
        // --- NEW: Query for distinct release years ---
        const releaseYearColumn = sql `EXTRACT(YEAR FROM ${tmdbMedia.releaseDate})`.as('releaseYear');
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
        const updatedYearColumn = sql `EXTRACT(YEAR FROM ${tmdbMedia.updatedDate})`.as('updatedYear');
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
        .input(z.object({
        title: z.string().optional(),
        format: z.array(z.enum(['movie', 'tv'])).optional(),
        genre: z.array(z.number()).optional(),
        origin: z.array(z.string()).optional(),
        releaseYear: z.array(z.number()).optional(),
        updatedYear: z.array(z.number()).optional(), // Add the new filter
        minVoteAvg: z.number().min(0).optional(),
        minVoteCount: z.number().min(0).optional(),
        order: z.enum([
            'released-desc',
            'released-asc',
            'title-desc',
            'title-asc',
            'popularity-desc',
            'popularity-asc',
            'vote-avg-desc',
            'vote-avg-asc',
            'vote-count-desc',
            'vote-count-asc',
            'updated-desc',
            'updated-asc',
        ]),
        page: z.number().min(1),
        pageSize: z.number().min(1),
        list: z.array(z.enum(['saved', 'favorite', 'later'])).optional(),
    }))
        .query(async ({ ctx, input }) => {
        // In a publicProcedure, ctx.session is available but can be null.
        const { session } = ctx;
        const { title, format, genre, origin, releaseYear, updatedYear, minVoteAvg, minVoteCount, page, pageSize, list, } = input;
        // 1. define columns in order to select them in the query
        // aggregate means to combine all values from 1 column to 1 cell array (so that media won't be duplicated)
        const aggregatedOrigins = sql `array_agg(DISTINCT ${tmdbOrigin.name})`.as('origins');
        const aggregatedGenres = sql `array_agg(DISTINCT ${tmdbGenre.name})`.as('genres');
        // 2. create subquery for getting how many total media there are
        // also create query for getting the actual data
        const fromClause = (qb) => qb
            .from(tmdbMedia)
            .leftJoin(tmdbMediaToTmdbOrigin, eq(tmdbMedia.id, tmdbMediaToTmdbOrigin.mediaId))
            .leftJoin(tmdbOrigin, eq(tmdbMediaToTmdbOrigin.originId, tmdbOrigin.id))
            .leftJoin(tmdbMediaToTmdbGenre, eq(tmdbMedia.id, tmdbMediaToTmdbGenre.mediaId))
            .leftJoin(tmdbGenre, eq(tmdbMediaToTmdbGenre.genreId, tmdbGenre.id))
            .groupBy(tmdbMedia.id)
            .$dynamic();
        const countSubquery = fromClause(ctx.db.select({ id: tmdbMedia.id }));
        const dataQueryBuilder = fromClause(ctx.db.select({
            media: tmdbMedia,
            origins: aggregatedOrigins,
            genres: aggregatedGenres,
        }));
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
            countSubquery.innerJoin(userMediaList, eq(tmdbMedia.id, userMediaList.mediaId));
            dataQueryBuilder.innerJoin(userMediaList, eq(tmdbMedia.id, userMediaList.mediaId));
        }
        if (title) {
            conditions.push(ilike(tmdbMedia.title, `%${title}%`));
        }
        if (format && format.length > 0) {
            conditions.push(inArray(tmdbMedia.type, format));
        }
        if (releaseYear && releaseYear.length > 0) {
            // Use a SQL function to extract the year from the release_date column
            conditions.push(inArray(sql `extract(year from ${tmdbMedia.releaseDate})`, releaseYear));
        }
        // NEW: Add filter for the new updatedDate column
        if (updatedYear && updatedYear.length > 0) {
            conditions.push(inArray(sql `extract(year from ${tmdbMedia.updatedDate})`, updatedYear));
        }
        // Handle genres filter (acts on the joined tmdbMediaToTmdbGenre table)
        if (genre && genre.length > 0) {
            conditions.push(inArray(tmdbMediaToTmdbGenre.genreId, genre));
        }
        // Handle origins filter (acts on the joined tmdbMediaToTmdbOrigin table)
        if (origin && origin.length > 0) {
            conditions.push(inArray(tmdbMediaToTmdbOrigin.originId, origin));
        }
        if (minVoteAvg && minVoteAvg > 0) {
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
        if (orderByClause)
            dataQueryBuilder.orderBy(orderByClause);
        // 6. get all media for chosen page
        // const pageSize = 30;
        const pageMedia = await dataQueryBuilder
            .limit(pageSize)
            .offset((page - 1) * pageSize);
        return {
            // pageSize,
            pageMedia,
            totalPages,
        };
    }),
    fetchOrigins: protectedProcedure.mutation(async ({ ctx }) => {
        // 1. Fetch the origins from the TMDB API
        const origins = await fetchTmdbOriginsViaApi();
        // 2. Transform the data to match your 'tmdbOrigin' schema
        const originInput = origins.map((origin) => ({
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
                name: sql `excluded.name`, // Update the name if the ID already exists
            },
        })
            .returning();
        console.log(`Upserted ${originOutput.length} unique origins.`);
        return { count: originOutput.length };
    }),
    fetchGenres: protectedProcedure.mutation(async ({ ctx }) => {
        const { genres: mvGenres } = await fetchTmdbMvGenresViaApi();
        const { genres: tvGenres } = await fetchTmdbTvGenresViaApi();
        // 1. Combine both lists
        const genres = [...mvGenres, ...tvGenres];
        // 2. Use a Map to automatically handle duplicates based on the 'id'
        const genreInput = Array.from(new Map(genres.map((genre) => [genre.id, genre])).values());
        // 3. Insert or update the genres in the database
        const genreOutput = await ctx.db
            .insert(tmdbGenre)
            .values(genreInput)
            .onConflictDoUpdate({
            target: tmdbGenre.id, // The column to check for conflicts
            set: {
                name: sql `excluded.name`, // Update the name if the ID already exists
            },
        })
            .returning(); // Optional: get the inserted/updated rows back
        console.log(`Upserted ${genreOutput.length} unique genres.`);
        return { count: genreOutput.length };
    }),
    fetchTmdbTopRated: protectedProcedure
        .input(z.object({ limit: z.number() }))
        .mutation(async ({ input, ctx }) => {
        // 1. Delete the old top-rated list first
        await ctx.db.delete(tmdbTopRated).execute();
        // 2. Fetch top-rated mv and tv via API (need to add type manually)
        const fetchedMv = (await fetchTmdbTopRatedViaApi(input.limit, 'movie')).map((mv) => {
            return { ...mv, media_type: 'movie' };
        });
        const fetchedTv = (await fetchTmdbTopRatedViaApi(input.limit, 'tv')).map((tv) => {
            return { ...tv, media_type: 'tv' };
        });
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
        const mediaOutput = await bulkUpsertNewMedia(fetchOutput);
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
