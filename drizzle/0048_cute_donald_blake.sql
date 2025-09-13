ALTER TABLE "tmdb_media" RENAME COLUMN "denorm_field_outdated" TO "denorm_fields_outdated";--> statement-breakpoint
DROP INDEX "denorm_updated_at_idx";--> statement-breakpoint
CREATE INDEX "denorm_updated_at_idx" ON "tmdb_media" USING btree ("denorm_fields_outdated");