CREATE TABLE "tmdb_recommendation" (
	"source_media_id" varchar(255) NOT NULL,
	"recommended_media_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "tmdb_recommendation_source_media_id_recommended_media_id_pk" PRIMARY KEY("source_media_id","recommended_media_id")
);
--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "backdrop_url" text;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "tmdb_recommendation" ADD CONSTRAINT "tmdb_recommendation_source_media_id_tmdb_media_id_fk" FOREIGN KEY ("source_media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_recommendation" ADD CONSTRAINT "tmdb_recommendation_recommended_media_id_tmdb_media_id_fk" FOREIGN KEY ("recommended_media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;