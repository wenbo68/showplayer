CREATE TABLE "showplayer_episode" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"seasonId" varchar(255) NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text DEFAULT 'N/A' NOT NULL,
	"description" text DEFAULT 'N/A' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showplayer_season" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"season_number" integer NOT NULL,
	"title" text DEFAULT 'N/A' NOT NULL,
	"description" text DEFAULT 'N/A' NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "showplayer_trending" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "showplayer_trending_mediaId_unique" UNIQUE("mediaId")
);
--> statement-breakpoint
ALTER TABLE "showplayer_media" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "tvdb_id" integer;--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "is_movie" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "is_anime" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_source" ADD COLUMN "episodeId" varchar(255);--> statement-breakpoint
ALTER TABLE "showplayer_episode" ADD CONSTRAINT "showplayer_episode_seasonId_showplayer_season_id_fk" FOREIGN KEY ("seasonId") REFERENCES "public"."showplayer_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showplayer_season" ADD CONSTRAINT "showplayer_season_mediaId_showplayer_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."showplayer_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showplayer_trending" ADD CONSTRAINT "showplayer_trending_mediaId_showplayer_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."showplayer_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showplayer_source" ADD CONSTRAINT "showplayer_source_episodeId_showplayer_episode_id_fk" FOREIGN KEY ("episodeId") REFERENCES "public"."showplayer_episode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "trending";--> statement-breakpoint
ALTER TABLE "showplayer_source" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "showplayer_source" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD CONSTRAINT "showplayer_media_tvdb_id_unique" UNIQUE("tvdb_id");