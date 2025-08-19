CREATE TABLE "tmdb_genre" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmdb_media_to_tmdb_genre" (
	"media_id" varchar(255) NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "tmdb_media_to_tmdb_genre_media_id_genre_id_pk" PRIMARY KEY("media_id","genre_id")
);
--> statement-breakpoint
ALTER TABLE "tmdb_media" RENAME COLUMN "update_date" TO "release_date";--> statement-breakpoint
ALTER TABLE "tmdb_media_to_tmdb_genre" ADD CONSTRAINT "tmdb_media_to_tmdb_genre_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_media_to_tmdb_genre" ADD CONSTRAINT "tmdb_media_to_tmdb_genre_genre_id_tmdb_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."tmdb_genre"("id") ON DELETE cascade ON UPDATE no action;