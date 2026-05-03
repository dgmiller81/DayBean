-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JournalEntry_userId_iso_idx" ON "JournalEntry"("userId", "iso");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_iso_page_idx" ON "JournalEntry"("userId", "iso", "page");
