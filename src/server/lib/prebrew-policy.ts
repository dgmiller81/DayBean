import "server-only";
// S2-T05 — Pre-brew policy gate.
//
// Decides whether a given user should be evening-pre-brewed on a given run.
// The function is intentionally pure-ish (no DB, no I/O of its own — the
// caller passes everything in) so it can be unit-tested cheaply.
//
// Cost-graduation stages (see docs/daybeans/06-implementation-plan.md §6.4):
//
//   Stage 0 — 'always'        Pre-brew every engaged user. Maximum coverage,
//                             maximum cost. Default until morning-success
//                             rate proves out.
//
//   Stage 1 — 'tiered'        Pre-brew paid + roaster tiers and high-streak
//                             users unconditionally; pre-brew free-tier users
//                             only when their region's recent error rate
//                             exceeds 0.5%.
//
//   Stage 2 — 'reactive'      Pre-brew everyone iff the global 24h provider
//                             error rate exceeds 1%. Cheapest steady-state
//                             until reliability is proven. Per-user gate
//                             (engagement) still applies first.
//
//   Stage 3 — 'smart-resume'  Same as 'reactive' for now; in Sprint 4 this
//                             will additionally pre-brew when the user's
//                             journal themes have shifted, since the next
//                             morning's content will need fresh context.
//
// Per-user engagement gate is applied FIRST regardless of stage:
// `prebrewEnabled === false` or no activity in the last 7 days → false.

import type { PrebrewPolicy } from "@/types/refresh";
import type { ProviderHealth } from "@/server/observability/provider-health";

export type PrebrewUser = {
  id: string;
  prebrewEnabled: boolean;
  /** When the user last opened the app (proxy: most recent RefreshLog.startedAt). */
  lastSeenAt: Date | null;
  // Future-stage fields — accept null/undefined and treat as conservative defaults.
  tier?: "free" | "paid" | "roaster" | null;
  region?: string | null;
  currentStreak?: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Stage 1 thresholds. */
const TIERED_REGIONAL_ERROR_THRESHOLD = 0.005; // 0.5%
const TIERED_STREAK_THRESHOLD = 14;

/** Stage 2/3 threshold. */
const REACTIVE_ERROR_THRESHOLD = 0.01; // 1%

/**
 * Returns true iff the given user should be evening-pre-brewed under the
 * supplied policy. See module-level JSDoc for stage semantics.
 */
export async function shouldPrebrewFor(
  user: PrebrewUser,
  providerHealth: ProviderHealth,
  policy: PrebrewPolicy,
): Promise<boolean> {
  // Per-user engagement gate — applied first, in every stage.
  if (user.prebrewEnabled === false) return false;
  if (user.lastSeenAt === null) return false;
  const ageMs = Date.now() - user.lastSeenAt.getTime();
  if (ageMs > SEVEN_DAYS_MS) return false;

  switch (policy) {
    case "always":
      return true;

    case "tiered": {
      if (user.tier === "paid" || user.tier === "roaster") return true;
      if ((user.currentStreak ?? 0) >= TIERED_STREAK_THRESHOLD) return true;
      const region = user.region ?? "global";
      const rate = await providerHealth.regionalErrorRate(region);
      return rate > TIERED_REGIONAL_ERROR_THRESHOLD;
    }

    case "reactive": {
      const rate = await providerHealth.last24hErrorRate();
      return rate > REACTIVE_ERROR_THRESHOLD;
    }

    case "smart-resume": {
      // TODO(sprint-4): also return true when the user's journal themes have
      // shifted since the most recent prebrew (journal-themes-changed input).
      const rate = await providerHealth.last24hErrorRate();
      return rate > REACTIVE_ERROR_THRESHOLD;
    }

    default: {
      // Exhaustiveness guard. New policies must be added explicitly.
      const _exhaustive: never = policy;
      void _exhaustive;
      return false;
    }
  }
}
