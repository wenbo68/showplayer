ALTER TABLE "public"."user_submission" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_submission_status" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."user_submission_status" AS ENUM('pending', 'success', 'failure');--> statement-breakpoint
ALTER TABLE "public"."user_submission" ALTER COLUMN "status" SET DATA TYPE "public"."user_submission_status" USING "status"::"public"."user_submission_status";