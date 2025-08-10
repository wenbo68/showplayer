DROP INDEX "unq_episode_provider";--> statement-breakpoint
DROP INDEX "unq_movie_provider";--> statement-breakpoint
CREATE UNIQUE INDEX "unq_episode_provider" ON "tmdb_source" USING btree ("episodeId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_movie_provider" ON "tmdb_source" USING btree ("mediaId","provider");