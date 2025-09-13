DROP INDEX "ratings_updated_at_idx";--> statement-breakpoint
CREATE INDEX "vote_updated_at_idx" ON "tmdb_media" USING btree ("vote_updated_at");