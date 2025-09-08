ALTER TABLE "tmdb_media" ADD COLUMN "popularity" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "vote_average" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "ratings_updated_at" timestamp with time zone;