// S0-T03 — Type contract for the dual-run refresh system (S2).

import { z } from "zod";

/**
 * Which scheduled run produced (or attempted to produce) a piece of content.
 * - `morning`         — the user's normal refreshHour run on day-of
 * - `evening-prebrew` — the previous-day 5pm safety-net run that wrote backup content for tomorrow
 * - `cold-start`      — sync run on first page load past refreshHour when no successful morning has run yet
 * - `manual`          — user pressed Refresh
 */
export const RefreshPhaseSchema = z.enum([
  "morning",
  "evening-prebrew",
  "cold-start",
  "manual",
]);
export type RefreshPhase = z.infer<typeof RefreshPhaseSchema>;

/** Which slot a piece of content occupies on the DailyContent row. */
export const ContentSourceSchema = z.enum(["primary", "backup", "fixture"]);
export type ContentSource = z.infer<typeof ContentSourceSchema>;

/** Stage of the cost-graduation roadmap. See [docs/daybeans/06-implementation-plan.md]. */
export const PrebrewPolicySchema = z.enum([
  "always",      // Stage 0
  "tiered",      // Stage 1
  "reactive",    // Stage 2
  "smart-resume",// Stage 3
]);
export type PrebrewPolicy = z.infer<typeof PrebrewPolicySchema>;
