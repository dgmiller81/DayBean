import "server-only";
// S0-T06 — Stub for the evening pre-brew cron job.
// Real implementation lands in S2-T05: for each user active in the last 7
// days where local hour == prebrewHour AND prebrewEnabled is true AND no
// successful evening-prebrew exists for tomorrow, call prebrewTomorrow(userId).
// The policy gate (config.PREBREW_POLICY) is applied here.

import type { CronJobResult } from "./types";

export async function runEveningPrebrew(): Promise<CronJobResult> {
  return {
    ok: true,
    ranAt: new Date().toISOString(),
    durationMs: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    notes: "stub — implementation in S2-T05",
  };
}
