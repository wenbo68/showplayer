import { db } from "~/server/db";
import { fetchAniListAnime } from "./aniList";
import { media } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export async function refreshAnime() {
  let page = 1;
  let next = true;

  while (next) {
    const { media: list, pageInfo } = await fetchAniListAnime(page);

    await db
      .insert(media)
      .values(
        list.map((item) => ({
          /* assuming you added anid field in schema or use id */
          id: randomUUID(), // generate a new UUID if needed
          type: "anime",
          title: item.title.userPreferred,
          description: item.description,
          imageUrl: item.coverImage.extraLarge,
          anilistId: item.id, // assuming you want to store the AniList ID
        }))
      )
      .onConflictDoUpdate({
        target: media.id,
        set: {
          title: sql`excluded.${media.title.name}`,
          description: sql`excluded.${media.description.name}`,
          imageUrl: sql`excluded.${media.imageUrl.name}`,
          type: sql`excluded.${media.type.name}`,
        },
      });

    next = pageInfo.hasNextPage;
    page++;
  }
}
