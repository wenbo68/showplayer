CREATE TYPE "public"."m3u8_type" AS ENUM('master', 'media');--> statement-breakpoint
ALTER TABLE "tmdb_source" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "update_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tmdb_source" ADD COLUMN "type" "m3u8_type" NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_season_episode" ON "tmdb_episode" USING btree ("seasonId","episode_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_media_season" ON "tmdb_season" USING btree ("mediaId","season_number");--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "next_release_date";