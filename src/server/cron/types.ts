// S0-T06 — Cron infra types.

export type CronJobName =
  | "morning-brew"
  | "evening-prebrew"
  // S7-T03 — sweeps users whose 24h account-deletion grace window has passed.
  | "sweep-deletions";

export type CronJobFn = () => Promise<CronJobResult>;

export type CronJobResult = {
  ok: boolean;
  ranAt: string;       // ISO datetime
  durationMs: number;
  processed: number;   // # of users acted on
  skipped: number;     // # of users skipped (idempotency / policy)
  errors: number;      // # of users where the run threw
  notes?: string;
};
