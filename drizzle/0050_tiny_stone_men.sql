ALTER TABLE "user_submission" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_submission" ADD COLUMN "processed_at" timestamp with time zone;