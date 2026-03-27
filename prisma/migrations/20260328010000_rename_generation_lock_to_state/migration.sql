-- Rename lock table to generation-state table to match requirement language.
ALTER TABLE "MovieFactGenerationLock" RENAME TO "MovieFactGenerationState";

-- Rename associated constraint/index names for clarity.
ALTER TABLE "MovieFactGenerationState"
  RENAME CONSTRAINT "MovieFactGenerationLock_userId_fkey" TO "MovieFactGenerationState_userId_fkey";

ALTER INDEX "MovieFactGenerationLock_userId_movieTitle_key"
  RENAME TO "MovieFactGenerationState_userId_movieTitle_key";
