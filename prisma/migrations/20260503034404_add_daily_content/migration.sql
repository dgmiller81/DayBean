-- CreateTable
CREATE TABLE "DailyContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyContent_userId_iso_idx" ON "DailyContent"("userId", "iso");

-- CreateIndex
CREATE UNIQUE INDEX "DailyContent_userId_iso_key" ON "DailyContent"("userId", "iso");
