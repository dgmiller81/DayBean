-- AlterTable
ALTER TABLE "Pref" ADD COLUMN "bio" TEXT;
ALTER TABLE "Pref" ADD COLUMN "contentInterests" TEXT;

-- CreateTable
CREATE TABLE "LlmCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LlmCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "RefreshLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LlmCredential_userId_idx" ON "LlmCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LlmCredential_userId_provider_key" ON "LlmCredential"("userId", "provider");

-- CreateIndex
CREATE INDEX "RefreshLog_userId_iso_idx" ON "RefreshLog"("userId", "iso");

-- CreateIndex
CREATE INDEX "RefreshLog_userId_startedAt_idx" ON "RefreshLog"("userId", "startedAt");
