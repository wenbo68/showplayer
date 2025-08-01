ALTER TABLE "showplayer_media" DROP CONSTRAINT "showplayer_media_imdb_id_unique";--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP CONSTRAINT "showplayer_media_tvmaze_id_unique";--> statement-breakpoint
ALTER TABLE "showplayer_episode" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "showplayer_episode" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_episode" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "showplayer_episode" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_media" ALTER COLUMN "tmdb_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_season" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "showplayer_season" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_season" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "showplayer_season" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "anilist_id" integer;--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "imdb_id";--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "tvmaze_id";--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "is_anime";--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD CONSTRAINT "showplayer_media_anilist_id_unique" UNIQUE("anilist_id");