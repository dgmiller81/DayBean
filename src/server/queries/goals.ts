import "server-only";
import { db } from "@/server/db";
import type { Goal, GoalCategory, Section } from "@/types";
import { specIdFromCompositeId } from "@/lib/default-goals";

type GoalRow = {
  id: string;
  userId: string;
  section: string;
  title: string;
  type: string;
  target: number;
  isDefault: boolean;
  createdAt: Date;
  category: string | null;
};

function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    specId: specIdFromCompositeId(r.id),
    userId: r.userId,
    section: r.section as Section,
    title: r.title,
    type: r.type as Goal["type"],
    target: r.target,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
    category: (r.category as GoalCategory | null) ?? null,
  };
}

export async function listGoals(userId: string, section?: Section): Promise<Goal[]> {
  const rows = await db.goal.findMany({
    where: { userId, ...(section ? { section } : {}) },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(rowToGoal);
}

export async function findGoal(userId: string, goalId: string): Promise<Goal | null> {
  const r = await db.goal.findFirst({ where: { userId, id: goalId } });
  return r ? rowToGoal(r) : null;
}
