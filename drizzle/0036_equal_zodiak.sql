ALTER TABLE "tmdb_genre" ADD CONSTRAINT "tmdb_genre_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "tmdb_origin" ADD CONSTRAINT "tmdb_origin_name_unique" UNIQUE("name");

-- Step 1: Add a new integer column to hold the numeric provider IDs.
ALTER TABLE "tmdb_source" ADD COLUMN "provider_new" INTEGER;

-- Step 2: Update the new column with the mapped integer values.
-- A CASE statement is used to convert the string values to their corresponding numbers.
UPDATE "tmdb_source"
SET "provider_new" = CASE
    WHEN "provider" = 'easy' THEN 1
    WHEN "provider" = 'joy'  THEN 2
    WHEN "provider" = 'link' THEN 3
    WHEN "provider" = 'fast' THEN 4
    ELSE NULL -- If there are other provider strings, they will become NULL.
END;

-- Step 3: Make the new column NOT NULL.
-- This will fail if any provider strings were not in the CASE statement,
-- which is a good way to catch unexpected values.
ALTER TABLE "tmdb_source" ALTER COLUMN "provider_new" SET NOT NULL;

-- Step 4: Drop the old unique indexes that depend on the 'provider' column.
DROP INDEX IF EXISTS "unq_episode_provider";
DROP INDEX IF EXISTS "unq_movie_provider";

-- Step 5: Drop the old varchar 'provider' column.
ALTER TABLE "tmdb_source" DROP COLUMN "provider";

-- Step 6: Rename the new column to the original name 'provider'.
ALTER TABLE "tmdb_source" RENAME COLUMN "provider_new" TO "provider";

-- Step 7: Recreate the unique indexes using the new integer 'provider' column.
CREATE UNIQUE INDEX "unq_episode_provider" ON "tmdb_source" ("episodeId", "provider");
CREATE UNIQUE INDEX "unq_movie_provider" ON "tmdb_source" ("mediaId", "provider");
