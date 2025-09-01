ALTER TABLE "tmdb_genre" ADD CONSTRAINT "tmdb_genre_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "tmdb_origin" ADD CONSTRAINT "tmdb_origin_name_unique" UNIQUE("name");