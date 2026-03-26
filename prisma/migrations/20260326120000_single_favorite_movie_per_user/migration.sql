-- Ensure exactly one favorite movie per user by enforcing uniqueness on Movie.userId.
-- This migration also deduplicates any existing rows so the unique constraint can be applied.

-- Deduplicate: keep the most recently created row per userId.
WITH ranked AS (
  SELECT
    id,
    "userId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "Movie"
)
DELETE FROM "Movie"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add the unique constraint if it's not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Movie_userId_key'
  ) THEN
    ALTER TABLE "Movie"
      ADD CONSTRAINT "Movie_userId_key" UNIQUE ("userId");
  END IF;
END $$;

