import { eq, and, count, gte, inArray, desc } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { tmdbMedia, userMediaList, userSubmission } from '~/server/db/schema';
import { TRPCError } from '@trpc/server';
import { populateMediaUsingTmdbIds } from '~/server/utils/mediaUtils';
import { fetchSrcForMediaIds } from '~/server/utils/srcUtils';
import { updateDenormFieldsForMediaList } from '~/server/utils/cronUtils';
import z from 'zod';
import { subDays } from 'date-fns';
export const userRouter = createTRPCRouter({
    // 1. Rate Limiting: Check if the user has submitted today yet (if yes, then cannot submit again)
    // admin can bypass this limit
    // 2. Check if the submitted already exists in tmdbMedia table
    // if yes, return the releaseDate and availabilityCount and totalEpisodeCount
    // 3. for admin, immediately, upsert media to tmdbMedia table -> fetch src for that media -> update denorm fields for that media
    // 4. for regular users, add to the table for batch processing later (batch upsert user submitted media -> fetch src with all other media -> update denorm with all other media)
    submitTmdbId: protectedProcedure
        .input(z.object({
        tmdbId: z.number().min(1),
        type: z.enum(['movie', 'tv']),
    }))
        .mutation(async ({ ctx, input }) => {
        const { session, db } = ctx;
        const { tmdbId, type } = input;
        const userId = session.user.id;
        const isAdmin = session.user.role === 'admin';
        // 1. Rate Limiting: Check if a non-admin user has submitted in the last 24 hours.
        if (!isAdmin) {
            const startOfUtcToday = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
            // 2. Change the query to COUNT submissions instead of finding the first one.
            const submissionCountResult = await db
                .select({ count: count() })
                .from(userSubmission)
                .where(and(eq(userSubmission.userId, userId), gte(userSubmission.createdAt, startOfUtcToday)));
            const submissionCount = submissionCountResult[0]?.count ?? 0;
            // 3. Check if the count has reached the new limit of 5.
            if (submissionCount >= 3) {
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'You have reached your limit of 3 submissions per day.',
                });
            }
            // --- END OF UPDATED LOGIC ---
        }
        // 2. Check if the media already exists in our main table.
        const existingMedia = await db.query.tmdbMedia.findFirst({
            where: eq(tmdbMedia.tmdbId, tmdbId),
        });
        if (existingMedia) {
            // If it exists, return its current status.
            return {
                status: 'exists',
                mediaInfo: {
                    releaseDate: existingMedia.releaseDate,
                    availabilityCount: existingMedia.availabilityCount,
                    airedEpisodeCount: existingMedia.airedEpisodeCount,
                },
            };
        }
        // If media is new, handle based on user role.
        const mediaToProcess = [{ tmdbId, type }];
        if (isAdmin) {
            // 3. Admin Flow: Process everything immediately.
            // NOTE: This will be a long-running request for the admin.
            console.log(`[ADMIN SUBMISSION] Starting immediate processing for TMDB ID: ${tmdbId}`);
            // Step 3a: Populate the core media, season, and episode data.
            const populateResult = await populateMediaUsingTmdbIds(mediaToProcess);
            const newMediaId = populateResult[0]?.mediaId;
            if (!newMediaId) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to populate new media.',
                });
            }
            // Step 3b: Fetch sources for the newly added media.
            await fetchSrcForMediaIds([newMediaId]);
            // Step 3c: Update all the denormalized fields so it's ready for searching.
            await updateDenormFieldsForMediaList([newMediaId]);
            console.log(`[ADMIN SUBMISSION] Finished processing for TMDB ID: ${tmdbId}`);
            return { status: 'processed' };
        }
        else {
            // 4. Regular User Flow: Add to the userSubmission table for a later cron job to process.
            await db.insert(userSubmission).values({
                userId,
                tmdbId,
                mediaType: type,
                status: 'pending',
            });
            return { status: 'submitted' };
        }
    }),
    getUserSubmissions: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const sevenDaysAgo = subDays(new Date(), 7);
        const submissions = await ctx.db.query.userSubmission.findMany({
            where: and(eq(userSubmission.userId, userId), gte(userSubmission.createdAt, sevenDaysAgo)),
            orderBy: [desc(userSubmission.createdAt)],
        });
        return submissions;
    }),
    /**
     * save to or remove from user list
     */
    updateMediaInUserList: protectedProcedure
        .input(z.object({
        mediaId: z.string(),
        listType: z.enum(['saved', 'favorite', 'later']),
        desiredState: z.boolean(), // The desired state (true for add, false for remove)
    }))
        .mutation(async ({ ctx, input }) => {
        const { db, session } = ctx;
        const { mediaId, listType, desiredState } = input;
        if (desiredState) {
            // Add to list
            await db
                .insert(userMediaList)
                .values({
                userId: session.user.id,
                mediaId: mediaId,
                listType: listType,
            })
                .onConflictDoNothing();
        }
        else {
            // Remove from list
            await db
                .delete(userMediaList)
                .where(and(eq(userMediaList.userId, session.user.id), eq(userMediaList.mediaId, mediaId), eq(userMediaList.listType, listType)));
        }
        return { success: true };
    }),
    /**
     * check which media is in user list
     */
    getUserDetailsForMediaList: protectedProcedure
        .input(z.object({ mediaIds: z.array(z.string()) }))
        .query(async ({ ctx, input }) => {
        const { db, session } = ctx;
        const userId = session.user.id;
        const userDetails = await db
            .select({
            mediaId: userMediaList.mediaId,
            listType: userMediaList.listType,
        })
            .from(userMediaList)
            .where(and(eq(userMediaList.userId, userId), inArray(userMediaList.mediaId, input.mediaIds)));
        const detailsMap = new Map();
        for (const detail of userDetails) {
            const existingDetail = detailsMap.get(detail.mediaId);
            if (existingDetail) {
                existingDetail.push(detail.listType);
            }
            else {
                detailsMap.set(detail.mediaId, [detail.listType]);
            }
        }
        return detailsMap;
    }),
});
