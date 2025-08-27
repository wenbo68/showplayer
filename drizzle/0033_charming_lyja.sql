CREATE TABLE "tmdb_media_to_tmdb_origin" (
	"media_id" varchar(255) NOT NULL,
	"origin_id" varchar(2) NOT NULL,
	CONSTRAINT "tmdb_media_to_tmdb_origin_media_id_origin_id_pk" PRIMARY KEY("media_id","origin_id")
);
--> statement-breakpoint
CREATE TABLE "tmdb_origin" (
	"id" varchar(2) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "tmdb_origin_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "tmdb_media_to_tmdb_origin" ADD CONSTRAINT "tmdb_media_to_tmdb_origin_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_media_to_tmdb_origin" ADD CONSTRAINT "tmdb_media_to_tmdb_origin_origin_id_tmdb_origin_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."tmdb_origin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP COLUMN "origin";