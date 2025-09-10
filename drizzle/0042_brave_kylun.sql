ALTER TABLE "tmdb_media" ADD COLUMN "availability_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "total_episode_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "updated_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "latest_season_number" integer;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "latest_episode_number" integer;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "denorm_fields_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "type_idx" ON "tmdb_media" USING btree ("type");--> statement-breakpoint
CREATE INDEX "title_idx" ON "tmdb_media" USING btree ("title");--> statement-breakpoint
CREATE INDEX "release_date_idx" ON "tmdb_media" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "vote_average_idx" ON "tmdb_media" USING btree ("vote_average");--> statement-breakpoint
CREATE INDEX "vote_count_idx" ON "tmdb_media" USING btree ("vote_count");--> statement-breakpoint
CREATE INDEX "denorm_updated_at_idx" ON "tmdb_media" USING btree ("denorm_fields_updated_at");--> statement-breakpoint
CREATE INDEX "updated_date_idx" ON "tmdb_media" USING btree ("updated_date");