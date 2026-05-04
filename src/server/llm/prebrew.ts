import "server-only";
// S2-T02 — Convenience wrapper that runs the evening pre-brew for tomorrow.
//
// The evening cron calls this once per eligible user. It computes
// `tomorrow = isoOffset(todayISO(), 1)` and delegates to refreshDailyContent
// with phase='evening-prebrew'. Idempotency: if a successful evening-prebrew
// log row already exists for tomorrow's iso, return early without an LLM call
// so a duplicate cron tick doesn't burn tokens.

import { db } from "@/server/db";
import { todayISO, isoOffset } from "@/lib/dates";
import { refreshDailyContent, type RefreshResult } from "./refresh";

export type PrebrewResult =
  | RefreshResult
  | { ok: true; iso: string; skipped: "already-prebrewed" };

export async function prebrewTomorrow(userId: string): Promise<PrebrewResult> {
  const tomorrow = isoOffset(todayISO(), 1);

  const existing = await db.refreshLog.findFirst({
    where: { userId, iso: tomorrow, phase: "evening-prebrew", status: "ok" },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, iso: tomorrow, skipped: "already-prebrewed" };
  }

  return refreshDailyContent(userId, tomorrow, "evening-prebrew");
}
