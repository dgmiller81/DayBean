"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Goal, Section, GoalType } from "@/types";
import { compositeGoalId, specIdFromCompositeId } from "@/lib/default-goals";
import { parseGoalsJson, serializeGoalsJson } from "@/server/json";
import { findGoal } from "@/server/queries/goals";

const SectionSchema = z.enum(["mindfulness", "business", "personal"]);
const GoalTypeSchema = z.enum(["check", "count", "time"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AddGoalInput = z.object({
  userId: z.string().min(1),
  section: SectionSchema,
  title: z.string().trim().min(1).max(200),
  type: GoalTypeSchema,
  target: z.number().int().min(1).max(10_000),
});

export async function addGoal(input: z.infer<typeof AddGoalInput>): Promise<Goal> {
  const v = AddGoalInput.parse(input);
  const specId = `g_min_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const id = compositeGoalId(v.userId, specId);
  const r = await db.goal.create({
    data: {
      id,
      userId: v.userId,
      section: v.section,
      title: v.title,
      type: v.type,
      target: v.target,
      isDefault: false,
    },
  });
  revalidatePath("/");
  return {
    id: r.id,
    specId,
    userId: r.userId,
    section: r.section as Section,
    title: r.title,
    type: r.type as GoalType,
    target: r.target,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  };
}

const RemoveGoalInput = z.object({ userId: z.string(), goalId: z.string() });
export async function removeGoal(input: z.infer<typeof RemoveGoalInput>): Promise<void> {
  const v = RemoveGoalInput.parse(input);
  const g = await findGoal(v.userId, v.goalId);
  if (!g) throw new Error("Goal not found");
  if (g.isDefault) throw new Error("Cannot remove a default goal");
  await db.goal.delete({ where: { id: v.goalId } });
  revalidatePath("/");
}

const DayMutateInput = z.object({
  userId: z.string(),
  goalId: z.string(),
  iso: Iso,
});

async function ensureGoalOwned(userId: string, goalId: string): Promise<Goal> {
  const g = await findGoal(userId, goalId);
  if (!g) throw new Error("Goal not found");
  return g;
}

async function mutateDayGoals(
  userId: string,
  iso: string,
  mutator: (current: Record<string, boolean | number>) => Record<string, boolean | number>
) {
  const existing = await db.day.findUnique({ where: { userId_iso: { userId, iso } } });
  const current = parseGoalsJson(existing?.goalsJson ?? "{}");
  const next = mutator(current);
  if (existing) {
    await db.day.update({
      where: { userId_iso: { userId, iso } },
      data: { goalsJson: serializeGoalsJson(next) },
    });
  } else {
    await db.day.create({
      data: { userId, iso, goalsJson: serializeGoalsJson(next) },
    });
  }
}

export async function toggleCheckGoal(input: z.infer<typeof DayMutateInput>): Promise<void> {
  const v = DayMutateInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "check") throw new Error("toggleCheckGoal only valid for check goals");
  await mutateDayGoals(v.userId, v.iso, (cur) => ({ ...cur, [v.goalId]: !cur[v.goalId] }));
  revalidatePath("/");
}

export async function incrementCountGoal(input: z.infer<typeof DayMutateInput>): Promise<void> {
  const v = DayMutateInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "count") throw new Error("incrementCountGoal only valid for count goals");
  await mutateDayGoals(v.userId, v.iso, (cur) => {
    const prev = typeof cur[v.goalId] === "number" ? (cur[v.goalId] as number) : 0;
    return { ...cur, [v.goalId]: prev + 1 };
  });
  revalidatePath("/");
}

const AddTimeInput = DayMutateInput.extend({ minutes: z.number().int().min(1).max(24 * 60) });
export async function addTimeMinutes(input: z.infer<typeof AddTimeInput>): Promise<void> {
  const v = AddTimeInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "time") throw new Error("addTimeMinutes only valid for time goals");

  const specId = specIdFromCompositeId(v.goalId);
  if (specId === "g_disconnect") {
    const existing = await db.day.findUnique({ where: { userId_iso: { userId: v.userId, iso: v.iso } } });
    if (existing) {
      await db.day.update({
        where: { userId_iso: { userId: v.userId, iso: v.iso } },
        data: { disconnect: existing.disconnect + v.minutes },
      });
    } else {
      await db.day.create({ data: { userId: v.userId, iso: v.iso, disconnect: v.minutes } });
    }
  } else {
    await mutateDayGoals(v.userId, v.iso, (cur) => {
      const prev = typeof cur[v.goalId] === "number" ? (cur[v.goalId] as number) : 0;
      return { ...cur, [v.goalId]: prev + v.minutes };
    });
  }
  revalidatePath("/");
}
