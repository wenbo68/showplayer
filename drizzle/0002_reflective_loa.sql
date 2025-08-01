ALTER TABLE "showplayer_media" DROP CONSTRAINT "showplayer_media_anilist_id_unique";--> statement-breakpoint
ALTER TABLE "showplayer_media" ALTER COLUMN "description" SET DEFAULT 'N/A';--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "tmdb_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "anilist_id";--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD CONSTRAINT "showplayer_media_tmdb_id_unique" UNIQUE("tmdb_id");