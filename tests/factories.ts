import { testDb } from "./test-db";
import { DEFAULT_GOALS, compositeGoalId } from "@/lib/default-goals";
import type { Section, GoalType } from "@/types";

export async function makeUser(id = "u_test", name = "Test User") {
  await testDb.user.upsert({
    where: { id },
    create: { id, name },
    update: {},
  });
  await testDb.pref.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
  });
  return id;
}

export async function seedDefaultGoals(userId: string) {
  for (const g of DEFAULT_GOALS) {
    await testDb.goal.upsert({
      where: { id: compositeGoalId(userId, g.specId) },
      create: {
        id: compositeGoalId(userId, g.specId),
        userId,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
      update: {},
    });
  }
}

export async function makeGoal(userId: string, opts: {
  specId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
  isDefault?: boolean;
}) {
  return testDb.goal.create({
    data: {
      id: compositeGoalId(userId, opts.specId),
      userId,
      section: opts.section,
      title: opts.title,
      type: opts.type,
      target: opts.target,
      isDefault: opts.isDefault ?? false,
    },
  });
}
