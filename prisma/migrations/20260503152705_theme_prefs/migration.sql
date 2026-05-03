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
    CONSTRAINT "Pref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pref" ("bio", "contentInterests", "faith", "filter", "id", "interests", "jobTitle", "refreshHour", "scripturePref", "theme", "userId") SELECT "bio", "contentInterests", "faith", "filter", "id", "interests", "jobTitle", "refreshHour", "scripturePref", "theme", "userId" FROM "Pref";
DROP TABLE "Pref";
ALTER TABLE "new_Pref" RENAME TO "Pref";
CREATE UNIQUE INDEX "Pref_userId_key" ON "Pref"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
