"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  parseHealthJson,
  parseFinJson,
  serializeHealthJson,
  serializeFinJson,
} from "@/server/json";
import type { HealthFlags, Finance } from "@/types";

const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function upsertDay(userId: string, iso: string, patch: Record<string, unknown>) {
  await db.day.upsert({
    where: { userId_iso: { userId, iso } },
    update: patch,
    create: { userId, iso, ...patch },
  });
  revalidatePath("/");
}

const SetNotesInput = z.object({
  userId: z.string(),
  iso: Iso,
  notes: z.string().max(50_000),
});
export async function setNotes(input: z.infer<typeof SetNotesInput>): Promise<void> {
  const v = SetNotesInput.parse(input);
  await upsertDay(v.userId, v.iso, { notes: v.notes });

  // Mirror the mindfulness journal as a single JournalEntry row so it appears
  // in the side-menu journal log and counts toward the heatmap entry count.
  // Empty/whitespace-only notes mean "no entry today" — drop the mirror row.
  const text = v.notes.trim();
  const existing = await db.journalEntry.findFirst({
    where: { userId: v.userId, iso: v.iso, page: "mindfulness" },
  });
  if (!text) {
    if (existing) {
      await db.journalEntry.delete({ where: { id: existing.id } });
    }
  } else if (existing) {
    if (existing.content !== text) {
      await db.journalEntry.update({
        where: { id: existing.id },
        data: { content: text },
      });
    }
  } else {
    await db.journalEntry.create({
      data: { userId: v.userId, iso: v.iso, page: "mindfulness", content: text },
    });
  }
}

const HealthKey = z.enum(["slept", "moved", "ate"]);
const SetHealthInput = z.object({
  userId: z.string(),
  iso: Iso,
  key: HealthKey,
  value: z.boolean(),
});
export async function setHealthFlag(input: z.infer<typeof SetHealthInput>): Promise<void> {
  const v = SetHealthInput.parse(input);
  const existing = await db.day.findUnique({
    where: { userId_iso: { userId: v.userId, iso: v.iso } },
    select: { healthJson: true },
  });
  const current: HealthFlags = parseHealthJson(existing?.healthJson ?? "{}");
  const next = { ...current, [v.key]: v.value };
  await upsertDay(v.userId, v.iso, { healthJson: serializeHealthJson(next) });
}

const SetWinInput = z.object({ userId: z.string(), iso: Iso, win: z.string().max(2_000) });
export async function setWin(input: z.infer<typeof SetWinInput>): Promise<void> {
  const v = SetWinInput.parse(input);
  await upsertDay(v.userId, v.iso, { win: v.win });
}

const FinanceSchema = z.object({
  net: z.string().max(64).optional(),
  cash: z.string().max(64).optional(),
  invest: z.string().max(64).optional(),
});
const SetFinanceInput = z.object({ userId: z.string(), iso: Iso, fin: FinanceSchema });
export async function setFinance(input: z.infer<typeof SetFinanceInput>): Promise<void> {
  const v = SetFinanceInput.parse(input);
  const existing = await db.day.findUnique({
    where: { userId_iso: { userId: v.userId, iso: v.iso } },
    select: { finJson: true },
  });
  const current: Finance = parseFinJson(existing?.finJson ?? "{}");
  const next = { ...current, ...v.fin };
  await upsertDay(v.userId, v.iso, { finJson: serializeFinJson(next) });
}

const SetDisconnectInput = z.object({
  userId: z.string(),
  iso: Iso,
  minutes: z.number().int().min(0).max(24 * 60),
});
export async function setDisconnect(input: z.infer<typeof SetDisconnectInput>): Promise<void> {
  const v = SetDisconnectInput.parse(input);
  await upsertDay(v.userId, v.iso, { disconnect: v.minutes });
}
