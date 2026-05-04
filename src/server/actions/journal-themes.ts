"use server";

// S0-T05 — Server-action stubs for the Journal Listens feature (S4).
// Real implementation lands in S4-T03 (persistence + scheduler hook) and
// S4-T04 (mute settings). UI tasks (S4-T04, S4-T06) build against these
// signatures today and integrate at sprint end.

import type { JournalTheme } from "@/types";

export async function listJournalThemes(_userId: string): Promise<JournalTheme[]> {
  throw new Error("not implemented — S4-T03");
}

export async function muteJournalTheme(
  _input: { userId: string; theme: string; muted: boolean },
): Promise<void> {
  throw new Error("not implemented — S4-T03");
}

/** Re-runs theme extraction for a user across last-N journal entries.
 * Idempotent. Used by the scheduler hook in S4-T03 and exposed for ops. */
export async function recomputeJournalThemes(_userId: string): Promise<void> {
  throw new Error("not implemented — S4-T03");
}
