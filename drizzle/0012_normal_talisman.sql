CREATE TYPE "public"."anilist_type" AS ENUM('TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA');--> statement-breakpoint
CREATE TYPE "public"."tmdb_type" AS ENUM('movie', 'tv');--> statement-breakpoint
ALTER TABLE "showplayer_account" RENAME TO "account";--> statement-breakpoint
ALTER TABLE "showplayer_episode" RENAME TO "episode";--> statement-breakpoint
ALTER TABLE "showplayer_season" RENAME TO "season";--> statement-breakpoint
ALTER TABLE "showplayer_session" RENAME TO "session";--> statement-breakpoint
ALTER TABLE "showplayer_source" RENAME TO "source";--> statement-breakpoint
ALTER TABLE "showplayer_media" RENAME TO "media";--> statement-breakpoint
ALTER TABLE "showplayer_trending" RENAME TO "trending";--> statement-breakpoint
ALTER TABLE "showplayer_user" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "showplayer_verification_token" RENAME TO "verification_token";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "showplayer_media_tmdb_id_unique";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "showplayer_media_anilist_id_unique";--> statement-breakpoint
ALTER TABLE "trending" DROP CONSTRAINT "showplayer_trending_mediaId_unique";--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "showplayer_account_userId_showplayer_user_id_fk";
--> statement-breakpoint
ALTER TABLE "episode" DROP CONSTRAINT "showplayer_episode_seasonId_showplayer_season_id_fk";
--> statement-breakpoint
ALTER TABLE "season" DROP CONSTRAINT "showplayer_season_mediaId_showplayer_media_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "showplayer_session_userId_showplayer_user_id_fk";
--> statement-breakpoint
ALTER TABLE "source" DROP CONSTRAINT "showplayer_source_mediaId_showplayer_media_id_fk";
--> statement-breakpoint
ALTER TABLE "source" DROP CONSTRAINT "showplayer_source_episodeId_showplayer_episode_id_fk";
--> statement-breakpoint
ALTER TABLE "trending" DROP CONSTRAINT "showplayer_trending_mediaId_showplayer_media_id_fk";
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "showplayer_account_provider_providerAccountId_pk";--> statement-breakpoint
ALTER TABLE "verification_token" DROP CONSTRAINT "showplayer_verification_token_identifier_token_pk";--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId");--> statement-breakpoint
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_identifier_token_pk" PRIMARY KEY("identifier","token");--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "type" "tmdb_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_seasonId_season_id_fk" FOREIGN KEY ("seasonId") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_mediaId_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_mediaId_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_episodeId_episode_id_fk" FOREIGN KEY ("episodeId") REFERENCES "public"."episode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trending" ADD CONSTRAINT "trending_mediaId_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "anilist_id";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "is_movie";--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_tmdb_id_unique" UNIQUE("tmdb_id");--> statement-breakpoint
ALTER TABLE "trending" ADD CONSTRAINT "trending_mediaId_unique" UNIQUE("mediaId");