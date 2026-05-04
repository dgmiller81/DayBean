#!/usr/bin/env tsx
// Reset the admin user's password hash directly against the local SQLite DB.
//
// Use this for LOCAL dev resets when you've forgotten the password. It hits
// the DATABASE_URL the script sees, so for prod (Railway), set the new
// SIMPLE_PASSWORD_HASH env var + FORCE_RESEED_PASSWORD=true and redeploy
// instead — the seed will pick it up. Don't try to point this at /data/prod.db
// from your laptop; that path doesn't exist outside the Railway container.
//
// Usage:
//   pnpm exec tsx scripts/reset-admin-password.ts
//
// The script reads the new hash from SIMPLE_PASSWORD_HASH (env or .env), and
// the user identity from ADMIN_EMAIL (defaults to the canonical "local-default"
// row when AUTH_MODE !== "simple"). Generate a hash with:
//   pnpm exec tsx scripts/hash-password.ts

import { PrismaClient } from "@prisma/client";

async function main() {
  const hash = process.env.SIMPLE_PASSWORD_HASH?.trim();
  if (!hash) {
    console.error(
      "[reset-admin-password] SIMPLE_PASSWORD_HASH is not set. Generate a hash with `pnpm exec tsx scripts/hash-password.ts` and export it before running this script.",
    );
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const isSimpleMode = process.env.AUTH_MODE === "simple";

  const db = new PrismaClient();
  try {
    // Resolve the target user: prefer email lookup in simple mode, else the
    // canonical local-default row.
    let userId: string | null = null;
    if (isSimpleMode && adminEmail) {
      const byEmail = await db.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
      });
      userId = byEmail?.id ?? null;
    }
    if (!userId) {
      const fallback = await db.user.findUnique({
        where: { id: "local-default" },
        select: { id: true },
      });
      userId = fallback?.id ?? null;
    }
    if (!userId) {
      console.error(
        "[reset-admin-password] No matching user found. Run `pnpm db:seed` first to create the admin row, or set ADMIN_EMAIL to an existing user's email.",
      );
      process.exit(1);
    }

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
    console.log(`[reset-admin-password] Updated passwordHash for user ${userId}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[reset-admin-password] failed:", (e as Error).message);
  process.exit(1);
});
