CREATE TABLE "tmdb_top_rated" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"rank" integer NOT NULL,
	"vote_average" real NOT NULL,
	"vote_count" integer NOT NULL,
	CONSTRAINT "tmdb_top_rated_mediaId_unique" UNIQUE("mediaId")
);
--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" ADD CONSTRAINT "tmdb_top_rated_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;