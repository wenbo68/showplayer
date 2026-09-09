DROP TABLE "tmdb_source" CASCADE;--> statement-breakpoint
DROP TABLE "tmdb_subtitle" CASCADE;--> statement-breakpoint
DROP TABLE "tmdb_trending" CASCADE;--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "src_fetched_at";--> statement-breakpoint
DROP TYPE "public"."m3u8_type";--> statement-breakpoint
DROP TYPE "public"."provider_enum";