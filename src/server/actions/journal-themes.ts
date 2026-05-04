"use server";

// S4-T03 — Journal-themes persistence + recompute.
//
// Built on top of S4-T01 (extractThemes) and the JournalTheme table.
// `recomputeJournalThemes` is called from the post-write hook
// (`src/server/lib/journal-write-hook.ts`) after every journal save.

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/server/auth-context";
import {
  extractThemes,
  type JournalEntryInput,
} from "@/server/lib/theme-extraction";
import { isoOffset, todayISO } from "@/lib/dates";
import type { JournalTheme } from "@/types";

const RECOMPUTE_WINDOW_DAYS = 14;
const DECAY_FACTOR = 0.5;

export async function listJournalThemes(): Promise<JournalTheme[]> {
  // Trust auth-context; ignore any passed userId.
  const userId = await getCurrentUserId();
  const rows = await db.journalTheme.findMany({
    where: { userId },
    orderBy: { weight: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    theme: r.theme,
    weight: r.weight,
    muted: r.muted,
    lastSeen: r.lastSeen.toISOString(),
  }));
}

const MuteInput = z.object({ theme: z.string().min(1).max(64), muted: z.boolean() });
export async function muteJournalTheme(input: { theme: string; muted: boolean }): Promise<void> {
  const v = MuteInput.parse(input);
  const userId = await getCurrentUserId();
  await db.journalTheme.update({
    where: { userId_theme: { userId, theme: v.theme } },
    data: { muted: v.muted },
  });
  revalidatePath("/");
}

/**
 * Re-runs theme extraction for a user. Reads the last 14 days of journal
 * entries, calls extractThemes(), upserts JournalTheme rows.
 *
 * Idempotent: re-running with the same data produces the same theme weights.
 *
 * Garbage collection: pre-existing themes that don't appear in this run's
 * top-12 have their weight halved (lastSeen left untouched). We don't delete
 * — the user might've muted them, and we don't want to lose mute state.
 */
export async function recomputeJournalThemes(userId: string): Promise<void> {
  // Note: this one accepts userId because it's called from server-only
  // code paths (the journal write hook + admin recompute), not from a UI
  // action. Keep the signature.
  const today = todayISO();
  const fromIso = isoOffset(today, -(RECOMPUTE_WINDOW_DAYS - 1));

  const rows = await db.journalEntry.findMany({
    where: {
      userId,
      iso: { gte: fromIso, lte: today },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, iso: true, content: true },
  });

  const entries: JournalEntryInput[] = rows.map((r) => ({
    id: r.id,
    iso: r.iso,
    content: r.content,
  }));

  const extracted = extractThemes(entries, today);
  const now = new Date();
  const freshThemes = new Set(extracted.map((e) => e.theme));

  // Pre-existing themes that should decay (anything not in this run's top-12).
  const existing = await db.journalTheme.findMany({
    where: { userId },
    select: { theme: true, weight: true },
  });
  const stale = existing.filter((r) => !freshThemes.has(r.theme));

  await db.$transaction([
    // Upsert each fresh theme — capitalize as the extractor returns it.
    ...extracted.map((t) =>
      db.journalTheme.upsert({
        where: { userId_theme: { userId, theme: t.theme } },
        create: { userId, theme: t.theme, weight: t.weight, lastSeen: now },
        update: { weight: t.weight, lastSeen: now },
      }),
    ),
    // Decay stale themes by halving weight; preserve lastSeen + muted state.
    ...stale.map((s) =>
      db.journalTheme.update({
        where: { userId_theme: { userId, theme: s.theme } },
        data: { weight: s.weight * DECAY_FACTOR },
      }),
    ),
  ]);
  // No revalidatePath — this is a background hook. Caller decides.
}
