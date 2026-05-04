"use server";

// S4-T06 — Server actions for journal-driven suggested goals.
// Stubs were planted in S0-T05; real implementation lands here.
// UI: SuggestedGoalsCard (Bean Count) calls list/accept/dismiss.

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/server/auth-context";
import { compositeGoalId } from "@/lib/default-goals";
import type { SuggestedGoal, GoalCategory, Section } from "@/types";

export async function listSuggestedGoals(): Promise<SuggestedGoal[]> {
  const userId = await getCurrentUserId();
  const rows = await db.suggestedGoal.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cadence: r.cadence as "daily" | "weekly",
    category: r.category,
    sourceJournalId: r.sourceJournalId,
    status: r.status as "pending" | "accepted" | "dismissed",
    createdAt: r.createdAt.toISOString(),
  }));
}

const IdInput = z.object({ id: z.string().min(1) });

function sectionForCategory(category: string | null): Section {
  if (category === "work") return "business";
  if (category === "faith") return "mindfulness";
  return "personal";
}

export async function acceptSuggestedGoal(
  input: { id: string },
): Promise<{ goalId: string }> {
  const v = IdInput.parse(input);
  const userId = await getCurrentUserId();

  const row = await db.suggestedGoal.findUnique({ where: { id: v.id } });
  if (!row || row.userId !== userId) {
    throw new Error("Suggested goal not found");
  }
  if (row.status !== "pending") {
    throw new Error("Suggested goal is not pending");
  }

  const section = sectionForCategory(row.category);
  const specId = `g_min_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const goalId = compositeGoalId(userId, specId);

  // Persist Goal + flip suggestion in a single transaction so we don't end up
  // with a half-accepted suggestion.
  await db.$transaction([
    db.goal.create({
      data: {
        id: goalId,
        userId,
        section,
        title: row.title,
        type: "check",
        target: 1,
        isDefault: false,
        category: (row.category as GoalCategory | null) ?? null,
      },
    }),
    db.suggestedGoal.update({
      where: { id: row.id },
      data: { status: "accepted" },
    }),
  ]);

  revalidatePath("/");
  return { goalId };
}

export async function dismissSuggestedGoal(
  input: { id: string },
): Promise<void> {
  const v = IdInput.parse(input);
  const userId = await getCurrentUserId();

  // updateMany lets us scope by (id, userId) atomically — silently no-ops if
  // the row belongs to another user, which is what we want.
  await db.suggestedGoal.updateMany({
    where: { id: v.id, userId },
    data: { status: "dismissed" },
  });

  revalidatePath("/");
}
