"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Section } from "@/types";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson, serializeGoalsJson } from "@/server/json";

const SECTION_TO_AUTOCREDIT_SPEC: Record<Section, string> = {
  mindfulness: "g_mf_read",
  business: "g_learn",
  personal: "g_per_read",
};

const SectionSchema = z.enum(["mindfulness", "business", "personal"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const RecordClickInput = z.object({
  userId: z.string(),
  iso: Iso,
  section: SectionSchema,
});

export async function recordClick(input: z.infer<typeof RecordClickInput>): Promise<void> {
  const v = RecordClickInput.parse(input);
  const autocreditGoalId = compositeGoalId(v.userId, SECTION_TO_AUTOCREDIT_SPEC[v.section]);

  await db.$transaction(async (tx) => {
    const existing = await tx.click.findUnique({
      where: { userId_iso_section: { userId: v.userId, iso: v.iso, section: v.section } },
    });
    const newCount = (existing?.count ?? 0) + 1;
    if (existing) {
      await tx.click.update({
        where: { userId_iso_section: { userId: v.userId, iso: v.iso, section: v.section } },
        data: { count: newCount },
      });
    } else {
      await tx.click.create({
        data: { userId: v.userId, iso: v.iso, section: v.section, count: newCount },
      });
    }

    const goal = await tx.goal.findFirst({ where: { id: autocreditGoalId, userId: v.userId } });
    if (!goal) return;

    const day = await tx.day.findUnique({ where: { userId_iso: { userId: v.userId, iso: v.iso } } });
    const currentGoals = parseGoalsJson(day?.goalsJson ?? "{}");
    currentGoals[autocreditGoalId] = newCount;
    if (day) {
      await tx.day.update({
        where: { userId_iso: { userId: v.userId, iso: v.iso } },
        data: { goalsJson: serializeGoalsJson(currentGoals) },
      });
    } else {
      await tx.day.create({
        data: { userId: v.userId, iso: v.iso, goalsJson: serializeGoalsJson(currentGoals) },
      });
    }
  });

  revalidatePath("/");
}
