ALTER TABLE "episode" RENAME TO "tmdb_episode";--> statement-breakpoint
ALTER TABLE "season" RENAME TO "tmdb_season";--> statement-breakpoint
ALTER TABLE "source" RENAME TO "tmdb_source";--> statement-breakpoint
ALTER TABLE "trending" RENAME TO "tmdb_trending";--> statement-breakpoint
ALTER TABLE "tmdb_trending" DROP CONSTRAINT "trending_mediaId_unique";--> statement-breakpoint
ALTER TABLE "tmdb_episode" DROP CONSTRAINT "episode_seasonId_season_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_season" DROP CONSTRAINT "season_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_source" DROP CONSTRAINT "source_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_source" DROP CONSTRAINT "source_episodeId_episode_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_trending" DROP CONSTRAINT "trending_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_episode" ADD CONSTRAINT "tmdb_episode_seasonId_tmdb_season_id_fk" FOREIGN KEY ("seasonId") REFERENCES "public"."tmdb_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_season" ADD CONSTRAINT "tmdb_season_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_source" ADD CONSTRAINT "tmdb_source_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_source" ADD CONSTRAINT "tmdb_source_episodeId_tmdb_episode_id_fk" FOREIGN KEY ("episodeId") REFERENCES "public"."tmdb_episode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_trending" ADD CONSTRAINT "tmdb_trending_mediaId_tmdb_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_trending" ADD CONSTRAINT "tmdb_trending_mediaId_unique" UNIQUE("mediaId");