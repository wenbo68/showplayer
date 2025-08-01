ALTER TABLE "showplayer_media" ADD COLUMN "tvmaze_id" integer;--> statement-breakpoint
ALTER TABLE "showplayer_media" ADD CONSTRAINT "showplayer_media_tvmaze_id_unique" UNIQUE("tvmaze_id");