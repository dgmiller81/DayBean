import "server-only";
// S0-T06 — Stub for the morning brew cron job.
// Real implementation lands in S2-T04: for each user where local hour ==
// refreshHour AND no successful morning RefreshLog exists for today, call
// refreshDailyContent(userId, today, "morning").

import type { CronJobResult } from "./types";

export async function runMorningBrew(): Promise<CronJobResult> {
  return {
    ok: true,
    ranAt: new Date().toISOString(),
    durationMs: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    notes: "stub — implementation in S2-T04",
  };
}
