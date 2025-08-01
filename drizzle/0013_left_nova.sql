CREATE TABLE "anilist_episode" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text,
	"description" text,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "anilist_media" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"anilist_id" integer NOT NULL,
	"type" "anilist_type" NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT 'N/A' NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "anilist_media_anilist_id_unique" UNIQUE("anilist_id")
);
--> statement-breakpoint
CREATE TABLE "anilist_source" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255),
	"episodeId" varchar(255),
	"provider" varchar(255),
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anilist_trending" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "anilist_trending_mediaId_unique" UNIQUE("mediaId")
);
--> statement-breakpoint
ALTER TABLE "media" RENAME TO "tmdb_media";--> statement-breakpoint
ALTER TABLE "tmdb_media" DROP CONSTRAINT "media_tmdb_id_unique";--> statement-breakpoint
ALTER TABLE "season" DROP CONSTRAINT "season_mediaId_media_id_fk";
--> statement-breakpoint
ALTER TABLE "source" DROP CONSTRAINT "source_mediaId_media_id_fk";
--> statement-breakpoint
ALTER TABLE "trending" DROP CONSTRAINT "trending_mediaId_media_id_fk";
--> statement-breakpoint
ALTER TABLE "source" ALTER COLUMN "mediaId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tmdb_media" ALTER COLUMN "tmdb_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "anilist_episode" ADD CONSTRAINT "anilist_episode_mediaId_anilist_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."anilist_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anilist_source" ADD CONSTRAINT "anilist_source_mediaId_anilist_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."anilist_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anilist_source" ADD CONSTRAINT "anilist_source_episodeId_anilist_episode_id_fk" FOREIGN KEY ("episodeId") REFERENCES "public"."anilist_episode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anilist_trending" ADD CONSTRAINT "anilist_trending_mediaId_anilist_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."anilist_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trending" ADD CONSTRAINT "trending_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_media" ADD CONSTRAINT "tmdb_media_tmdb_id_unique" UNIQUE("tmdb_id");