DROP INDEX "denorm_updated_at_idx";--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "denorm_field_outdated" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "denorm_updated_at_idx" ON "tmdb_media" USING btree ("denorm_field_outdated");--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "denorm_fields_outdated";