import { z } from "zod";
import { eq, sql } from "drizzle-orm"; // <<< Import 'eq' from drizzle-orm

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { media } from "~/server/db/schema";
import { fetchPopularAnime } from "~/lib/aniList";

export const mediaRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ type: z.enum(["show", "movie", "anime"]).optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.media.findMany({
        where: input.type ? eq(media.type, input.type) : undefined,
        orderBy: (media, { desc }) => [desc(media.createdAt)],
      });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.media.findFirst({
        where: eq(media.id, input.id),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        type: z.enum(["show", "movie", "anime"]),
        title: z.string(),
        description: z.string(),
        imageUrl: z.string().url(),
        anilistId: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(media).values(input).returning();
      return result;
    }),

  populateAnime: publicProcedure.mutation(async ({ ctx }) => {
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const { media: list, pageInfo } = await fetchPopularAnime(page);
      const values = list.map((item) => ({
        anilistId: item.id,
        type: "anime",
        title: item.title.userPreferred,
        description: item.description,
        imageUrl: item.coverImage.extraLarge,
      }));

      await ctx.db
        .insert(media)
        .values(values)
        .onConflictDoUpdate({
          target: media.anilistId,
          set: {
            title: sql`excluded.${media.title.name}`,
            description: sql`excluded.${media.description.name}`,
            imageUrl: sql`excluded.${media.imageUrl.name}`,
            type: sql`excluded.${media.type.name}`,
          },
        });

      hasNext = pageInfo.hasNextPage;
      page++;
    }
  }),
});
