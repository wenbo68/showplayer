ALTER TABLE "showplayer_media" DROP CONSTRAINT "showplayer_media_tvdb_id_unique";--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD COLUMN "imdb_id" integer;--> statement-breakpoint
ALTER TABLE "showplayer_media" DROP COLUMN "tvdb_id";--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD CONSTRAINT "showplayer_media_imdb_id_unique" UNIQUE("imdb_id");