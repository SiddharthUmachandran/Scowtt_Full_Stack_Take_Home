-- CreateTable
CREATE TABLE "MovieFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "factText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieFactGenerationLock" (
    "userId" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MovieFactRequestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieFactRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieFact_userId_movieTitle_idx" ON "MovieFact"("userId", "movieTitle");

-- CreateIndex
CREATE UNIQUE INDEX "MovieFactGenerationLock_userId_movieTitle_key" ON "MovieFactGenerationLock"("userId", "movieTitle");

-- CreateIndex
CREATE INDEX "MovieFactRequestLog_userId_createdAt_idx" ON "MovieFactRequestLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MovieFact" ADD CONSTRAINT "MovieFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFactGenerationLock" ADD CONSTRAINT "MovieFactGenerationLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFactRequestLog" ADD CONSTRAINT "MovieFactRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
