CREATE TABLE "tmdb_subtitle" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"sourceId" varchar(255) NOT NULL,
	"language" varchar(255) NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tmdb_subtitle" ADD CONSTRAINT "tmdb_subtitle_sourceId_tmdb_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."tmdb_source"("id") ON DELETE cascade ON UPDATE no action;