import { PrismaClient } from "@prisma/client";
import { DEFAULT_GOALS, compositeGoalId } from "../src/lib/default-goals";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { id: "local-default" },
    update: {},
    create: { id: "local-default", name: "You" },
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
