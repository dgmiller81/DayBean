-- CreateTable
CREATE TABLE "DataExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DataExport_token_key" ON "DataExport"("token");

-- CreateIndex
CREATE INDEX "DataExport_userId_createdAt_idx" ON "DataExport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DataExport_token_idx" ON "DataExport"("token");
