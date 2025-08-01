CREATE TABLE "showplayer_source" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mediaId" varchar(255) NOT NULL,
	"provider" varchar(255),
	"url" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "showplayer_source" ADD CONSTRAINT "showplayer_source_mediaId_showplayer_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."showplayer_media"("id") ON DELETE cascade ON UPDATE no action;