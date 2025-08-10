DROP INDEX "unq_episode_provider";--> statement-breakpoint
CREATE UNIQUE INDEX "unq_movie_provider" ON "tmdb_source" USING btree ("mediaId","provider") WHERE "tmdb_source"."episodeId" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_episode_provider" ON "tmdb_source" USING btree ("episodeId","provider") WHERE "tmdb_source"."mediaId" IS NULL;