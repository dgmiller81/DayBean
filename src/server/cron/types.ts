// S0-T06 — Cron infra types.

export type CronJobName = "morning-brew" | "evening-prebrew";

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
