import "server-only";
// S0-T06 — Tiny in-process cron registry.
// External cron (Railway Scheduled Job, pg_cron, GitHub Actions) hits the
// /api/cron/[job] endpoint with X-Cron-Secret. The endpoint dispatches into
// the registry below.
//
// Real morning-brew + evening-prebrew implementations land in S2-T04 / S2-T05.
// Until then, the stubs return ok:true with processed:0 so the endpoint and
// monitoring loop are wired end-to-end.

import type { CronJobFn, CronJobName, CronJobResult } from "./types";
import { runMorningBrew } from "./morning-brew";
import { runEveningPrebrew } from "./evening-prebrew";
import { runDeletionSweep } from "./sweep-deletions";

const registry: Record<CronJobName, CronJobFn> = {
  "morning-brew": runMorningBrew,
  "evening-prebrew": runEveningPrebrew,
  // S7-T03 — sweep deletes ripe Users whose pendingDeletionAt < now.
  "sweep-deletions": runDeletionSweep,
};

export function isJobName(name: string): name is CronJobName {
  return name in registry;
}

export async function runJob(name: CronJobName): Promise<CronJobResult> {
  const start = Date.now();
  try {
    const result = await registry[name]();
    return result;
  } catch (e) {
    return {
      ok: false,
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      processed: 0,
      skipped: 0,
      errors: 1,
      notes: `unhandled error: ${(e as Error).message}`,
    };
  }
}
