ALTER TABLE "tmdb_media" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tmdb_media" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "next_release_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;