-- AlterTable
ALTER TABLE "DailyContent" ADD COLUMN "backupAt" DATETIME;
ALTER TABLE "DailyContent" ADD COLUMN "backupContentJson" TEXT;
ALTER TABLE "DailyContent" ADD COLUMN "backupSource" TEXT;
ALTER TABLE "DailyContent" ADD COLUMN "primaryAt" DATETIME;
ALTER TABLE "DailyContent" ADD COLUMN "primarySource" TEXT;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "category" TEXT;

-- AlterTable
ALTER TABLE "RefreshLog" ADD COLUMN "phase" TEXT;

-- CreateTable
CREATE TABLE "JournalTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuggestedGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "category" TEXT,
    "sourceJournalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuggestedGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "logoUrl" TEXT,
    "blurb" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weeklyBudget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issued" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" DATETIME,
    "userId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "weekOf" DATETIME NOT NULL,
    CONSTRAINT "Voucher_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "streakLength" INTEGER NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardClaim_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pref" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "filter" TEXT NOT NULL DEFAULT 'all',
    "jobTitle" TEXT,
    "interests" TEXT,
    "faith" TEXT,
    "scripturePref" TEXT,
    "contentInterests" TEXT,
    "bio" TEXT,
    "refreshHour" INTEGER NOT NULL DEFAULT 4,
    "bgImageUrl" TEXT,
    "bgOverlay" INTEGER NOT NULL DEFAULT 90,
    "hobbies" TEXT,
    "livesWith" TEXT,
    "financeMode" BOOLEAN NOT NULL DEFAULT false,
    "netWorth" TEXT,
    "cashOnHand" TEXT,
    "savingsTarget" TEXT,
    "prebrewHour" INTEGER NOT NULL DEFAULT 17,
    "prebrewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "industry" TEXT,
    "companyStage" TEXT,
    "timezone" TEXT,
    CONSTRAINT "Pref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pref" ("bgImageUrl", "bgOverlay", "bio", "contentInterests", "faith", "filter", "id", "interests", "jobTitle", "refreshHour", "scripturePref", "theme", "userId") SELECT "bgImageUrl", "bgOverlay", "bio", "contentInterests", "faith", "filter", "id", "interests", "jobTitle", "refreshHour", "scripturePref", "theme", "userId" FROM "Pref";
DROP TABLE "Pref";
ALTER TABLE "new_Pref" RENAME TO "Pref";
CREATE UNIQUE INDEX "Pref_userId_key" ON "Pref"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "JournalTheme_userId_weight_idx" ON "JournalTheme"("userId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "JournalTheme_userId_theme_key" ON "JournalTheme"("userId", "theme");

-- CreateIndex
CREATE INDEX "SuggestedGoal_userId_status_idx" ON "SuggestedGoal"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_partnerId_issued_expiresAt_idx" ON "Voucher"("partnerId", "issued", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_voucherId_key" ON "RewardClaim"("voucherId");

-- CreateIndex
CREATE INDEX "RewardClaim_userId_claimedAt_idx" ON "RewardClaim"("userId", "claimedAt");

-- CreateIndex
CREATE INDEX "Goal_userId_category_idx" ON "Goal"("userId", "category");

-- CreateIndex
CREATE INDEX "RefreshLog_phase_status_startedAt_idx" ON "RefreshLog"("phase", "status", "startedAt");
