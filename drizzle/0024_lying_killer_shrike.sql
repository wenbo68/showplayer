ALTER TABLE "anilist_episode" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anilist_media" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anilist_source" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anilist_trending" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "anilist_episode" CASCADE;--> statement-breakpoint
DROP TABLE "anilist_media" CASCADE;--> statement-breakpoint
DROP TABLE "anilist_source" CASCADE;--> statement-breakpoint
DROP TABLE "anilist_trending" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_episode_provider" ON "tmdb_source" USING btree ("mediaId","episodeId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_source_language" ON "tmdb_subtitle" USING btree ("sourceId","language");--> statement-breakpoint
DROP TYPE "public"."anilist_type";