"use server";

// S0-T05 — Server-action stubs for journal-driven suggested goals (S4).
// Real implementation lands in S4-T02 (intent detection) + S4-T03 (persistence).
// UI: S4-T06 (Bean Count card) builds against these signatures.

import type { SuggestedGoal } from "@/types";

export async function listSuggestedGoals(_userId: string): Promise<SuggestedGoal[]> {
  throw new Error("not implemented — S4-T03");
}

export async function acceptSuggestedGoal(
  _input: { userId: string; id: string },
): Promise<{ goalId: string }> {
  throw new Error("not implemented — S4-T06");
}

export async function dismissSuggestedGoal(
  _input: { userId: string; id: string },
): Promise<void> {
  throw new Error("not implemented — S4-T06");
}
