ALTER TABLE "tmdb_media" RENAME COLUMN "ratings_updated_at" TO "vote_updated_at";--> statement-breakpoint
ALTER TABLE "tmdb_media" RENAME COLUMN "denorm_fields_updated_at" TO "denorm_fields_outdated";--> statement-breakpoint
DROP INDEX "denorm_updated_at_idx";--> statement-breakpoint
DROP INDEX "ratings_updated_at_idx";--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "src_fetched_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "denorm_updated_at_idx" ON "tmdb_media" USING btree ("denorm_fields_outdated");--> statement-breakpoint
CREATE INDEX "ratings_updated_at_idx" ON "tmdb_media" USING btree ("vote_updated_at");