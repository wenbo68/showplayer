ALTER TABLE "tmdb_episode" RENAME COLUMN "seasonId" TO "season_id";--> statement-breakpoint
ALTER TABLE "tmdb_season" RENAME COLUMN "mediaId" TO "media_id";--> statement-breakpoint
ALTER TABLE "tmdb_source" RENAME COLUMN "mediaId" TO "media_id";--> statement-breakpoint
ALTER TABLE "tmdb_source" RENAME COLUMN "episodeId" TO "episode_id";--> statement-breakpoint
ALTER TABLE "tmdb_subtitle" RENAME COLUMN "sourceId" TO "source_id";--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" RENAME COLUMN "mediaId" TO "media_id";--> statement-breakpoint
ALTER TABLE "tmdb_trending" RENAME COLUMN "mediaId" TO "media_id";--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" DROP CONSTRAINT "tmdb_top_rated_mediaId_unique";--> statement-breakpoint
ALTER TABLE "tmdb_trending" DROP CONSTRAINT "tmdb_trending_mediaId_unique";--> statement-breakpoint
ALTER TABLE "tmdb_episode" DROP CONSTRAINT "tmdb_episode_seasonId_tmdb_season_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_season" DROP CONSTRAINT "tmdb_season_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_source" DROP CONSTRAINT "tmdb_source_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_source" DROP CONSTRAINT "tmdb_source_episodeId_tmdb_episode_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_subtitle" DROP CONSTRAINT "tmdb_subtitle_sourceId_tmdb_source_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" DROP CONSTRAINT "tmdb_top_rated_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
ALTER TABLE "tmdb_trending" DROP CONSTRAINT "tmdb_trending_mediaId_tmdb_media_id_fk";
--> statement-breakpoint
DROP INDEX "unq_season_episode";--> statement-breakpoint
DROP INDEX "unq_media_season";--> statement-breakpoint
DROP INDEX "unq_episode_provider";--> statement-breakpoint
DROP INDEX "unq_movie_provider";--> statement-breakpoint
DROP INDEX "unq_source_language";--> statement-breakpoint
ALTER TABLE "tmdb_episode" ADD CONSTRAINT "tmdb_episode_season_id_tmdb_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."tmdb_season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_season" ADD CONSTRAINT "tmdb_season_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_source" ADD CONSTRAINT "tmdb_source_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_source" ADD CONSTRAINT "tmdb_source_episode_id_tmdb_episode_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."tmdb_episode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_subtitle" ADD CONSTRAINT "tmdb_subtitle_source_id_tmdb_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."tmdb_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" ADD CONSTRAINT "tmdb_top_rated_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_trending" ADD CONSTRAINT "tmdb_trending_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "popularity_idx" ON "tmdb_media" USING btree ("popularity");--> statement-breakpoint
CREATE INDEX "ratings_updated_at_idx" ON "tmdb_media" USING btree ("ratings_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_season_episode" ON "tmdb_episode" USING btree ("season_id","episode_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_media_season" ON "tmdb_season" USING btree ("media_id","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_episode_provider" ON "tmdb_source" USING btree ("episode_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_movie_provider" ON "tmdb_source" USING btree ("media_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_source_language" ON "tmdb_subtitle" USING btree ("source_id","language");--> statement-breakpoint
ALTER TABLE "tmdb_top_rated" ADD CONSTRAINT "tmdb_top_rated_media_id_unique" UNIQUE("media_id");--> statement-breakpoint
ALTER TABLE "tmdb_trending" ADD CONSTRAINT "tmdb_trending_media_id_unique" UNIQUE("media_id");