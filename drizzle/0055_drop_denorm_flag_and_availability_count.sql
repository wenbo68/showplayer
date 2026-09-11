DROP INDEX "denorm_updated_at_idx";--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "availability_count";--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "denorm_fields_outdated";