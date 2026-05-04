import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_PATH = path.resolve(__dirname, "../prisma/test.db");
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

// Set BEFORE creating the Prisma client so its connection string is correct.
process.env.DATABASE_URL = TEST_DATABASE_URL;

export const testDb = new PrismaClient();

let migrated = false;

// Resolve the prisma CLI once at module load — avoids shell:true on Windows
const PRISMA_CLI = path.resolve(__dirname, "../node_modules/prisma/build/index.js");

async function ensureMigrated() {
  if (migrated) return;
  migrated = true;
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const journal = `${TEST_DB_PATH}-journal`;
  if (fs.existsSync(journal)) fs.unlinkSync(journal);
  execFileSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
    shell: false,
  });
  await testDb.$connect();
}

export async function resetTestDb() {
  await ensureMigrated();
  // Truncate in reverse FK order — avoids file-lock issues on Windows
  await testDb.$executeRawUnsafe('DELETE FROM "Click"');
  await testDb.$executeRawUnsafe('DELETE FROM "Day"');
  await testDb.$executeRawUnsafe('DELETE FROM "Task"');
  await testDb.$executeRawUnsafe('DELETE FROM "Goal"');
  await testDb.$executeRawUnsafe('DELETE FROM "Pref"');
  await testDb.$executeRawUnsafe('DELETE FROM "DailyContent"');
  await testDb.$executeRawUnsafe('DELETE FROM "RewardClaim"');
  await testDb.$executeRawUnsafe('DELETE FROM "Voucher"');
  await testDb.$executeRawUnsafe('DELETE FROM "Partner"');
  await testDb.$executeRawUnsafe('DELETE FROM "User"');
}

export async function closeTestDb() {
  await testDb.$disconnect();
}
