CREATE TYPE "public"."list_type" AS ENUM('favorite', 'later');--> statement-breakpoint
CREATE TABLE "user_media_list" (
	"user_id" varchar(255) NOT NULL,
	"media_id" varchar(255) NOT NULL,
	"list_type" "list_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "user_media_list_user_id_media_id_list_type_pk" PRIMARY KEY("user_id","media_id","list_type")
);
--> statement-breakpoint
ALTER TABLE "user_media_list" ADD CONSTRAINT "user_media_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_media_list" ADD CONSTRAINT "user_media_list_media_id_tmdb_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."tmdb_media"("id") ON DELETE cascade ON UPDATE no action;