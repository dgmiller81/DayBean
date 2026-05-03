import { PrismaClient } from "@prisma/client";
import { DEFAULT_GOALS, compositeGoalId } from "../src/lib/default-goals";

const db = new PrismaClient();

async function main() {
  // Bootstrap the admin user from env. AUTH_MODE=simple expects ADMIN_EMAIL +
  // SIMPLE_PASSWORD_HASH to be set; we promote the existing local-default row
  // (or create it) so all pre-existing data carries over to the admin.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const adminPasswordHash = process.env.SIMPLE_PASSWORD_HASH?.trim() || null;
  const isSimpleMode = process.env.AUTH_MODE === "simple";

  const existing = await db.user.findUnique({ where: { id: "local-default" } });

  // Once an admin sets their own password, never clobber it with the env hash.
  // Only seed passwordHash on initial create or when it's still null.
  const shouldSeedPassword = isSimpleMode && !existing?.passwordHash && !!adminPasswordHash;

  const user = await db.user.upsert({
    where: { id: "local-default" },
    update: isSimpleMode
      ? {
          email: adminEmail,
          isAdmin: true,
          ...(shouldSeedPassword ? { passwordHash: adminPasswordHash } : {}),
        }
      : {},
    create: {
      id: "local-default",
      name: "You",
      email: isSimpleMode ? adminEmail : null,
      isAdmin: isSimpleMode,
      passwordHash: shouldSeedPassword ? adminPasswordHash : null,
    },
  });

  await db.pref.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  for (const g of DEFAULT_GOALS) {
    await db.goal.upsert({
      where: { id: compositeGoalId(user.id, g.specId) },
      update: {},
      create: {
        id: compositeGoalId(user.id, g.specId),
        userId: user.id,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
    });
  }

  console.log("Seeded default user + goals.");
}

main().finally(() => db.$disconnect());
