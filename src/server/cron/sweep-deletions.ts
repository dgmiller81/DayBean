import "server-only";
// S7-T03 — sweep cron that deletes User rows whose pendingDeletionAt has
// passed. Cascades through the schema (LlmCredential, Pref, Goal, Task, Day,
// JournalEntry, Bookmark, Click, RefreshLog, JournalTheme, SuggestedGoal,
// DailyContent, RewardClaim — Voucher.userId is set null via SetNull).

import { db } from "@/server/db";
import type { CronJobResult } from "./types";

export async function runDeletionSweep(): Promise<CronJobResult> {
  const start = Date.now();
  const ranAt = new Date(start).toISOString();

  // Find ripe rows.
  const ripe = await db.user.findMany({
    where: { pendingDeletionAt: { lte: new Date() } },
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;
  for (const u of ripe) {
    try {
      await db.user.delete({ where: { id: u.id } });
      processed += 1;
      console.log(`[cron:sweep-deletions] user=${u.id} action=delete reason=ok`);
    } catch (e) {
      errors += 1;
      console.log(
        `[cron:sweep-deletions] user=${u.id} action=error reason=${(e as Error).message}`,
      );
    }
  }

  return {
    ok: errors === 0,
    ranAt,
    durationMs: Date.now() - start,
    processed,
    skipped: 0,
    errors,
    notes: `candidates=${ripe.length}`,
  };
}
