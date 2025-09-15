ALTER TABLE "tmdb_top_rated" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tmdb_top_rated" CASCADE;--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP CONSTRAINT "tmdb_media_tmdb_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "tmdb_id_type_unq_idx" ON "tmdb_media" USING btree ("tmdb_id","type");