CREATE TYPE "public"."provider_enum" AS ENUM ('E', 'J', 'L', 'F');
--> statement-breakpoint
-- Step 1: Temporarily change the column to TEXT. The USING clause is crucial.
ALTER TABLE "tmdb_source" ALTER COLUMN "provider" TYPE text USING "provider"::text;
--> statement-breakpoint
-- Step 2: Update the data, converting integers to the new string codes.
UPDATE "tmdb_source" SET "provider" =
  CASE "provider"::integer
    WHEN 1 THEN 'E'
    WHEN 2 THEN 'J'
    WHEN 3 THEN 'L'
    WHEN 4 THEN 'F'
    ELSE "provider"
  END;
--> statement-breakpoint
-- Step 3: Change the column to the final ENUM type, casting from the text values.
ALTER TABLE "tmdb_source" ALTER COLUMN "provider" TYPE provider_enum USING "provider"::"provider_enum";