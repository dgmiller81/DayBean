import "server-only";
// S2-T05 — Evening pre-brew cron implementation.
//
// For each user that has at least one LlmCredential, check whether the
// caller's local hour matches Pref.prebrewHour (default 17). When it does,
// consult the policy gate (config.PREBREW_POLICY) and — if it returns true —
// invoke prebrewTomorrow(userId). prebrewTomorrow handles its own idempotency
// (already-prebrewed → skipped: 'already-prebrewed').
//
// One failing user must not abort the rest of the loop.

import { db } from "@/server/db";
import { config } from "@/server/config";
import { prebrewTomorrow } from "@/server/llm/prebrew";
import { providerHealth } from "@/server/observability/provider-health";
import { shouldPrebrewFor, type PrebrewUser } from "@/server/lib/prebrew-policy";
import type { CronJobResult } from "./types";

const DEFAULT_PREBREW_HOUR = 17;

/**
 * Resolve a user's local hour (0-23) given their IANA timezone preference.
 * A null/empty/unknown timezone falls back to UTC. Mirrors the helper in
 * morning-brew.ts (kept local rather than extracted to avoid prematurely
 * coupling the two cron jobs — if a third one shows up, hoist this).
 */
function localHour(timezone: string | null, now: Date): number {
  const tz = timezone && timezone.trim().length > 0 ? timezone : "UTC";

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour12: false,
      hour: "2-digit",
    }).formatToParts(now);
  }

  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "";
  const rawHour = parseInt(hourStr, 10);
  return Number.isFinite(rawHour) ? rawHour % 24 : 0;
}

export async function runEveningPrebrew(): Promise<CronJobResult> {
  const start = Date.now();
  const ranAt = new Date(start).toISOString();
  const now = new Date(start);
  const policy = config.PREBREW_POLICY;

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Pull every user with at least one credential plus the prefs we need.
  const candidates = await db.user.findMany({
    where: { llmCredentials: { some: {} } },
    select: {
      id: true,
      prefs: {
        select: {
          prebrewEnabled: true,
          prebrewHour: true,
          timezone: true,
        },
      },
    },
  });

  for (const user of candidates) {
    try {
      // Users without a Pref row are treated as not-yet-onboarded for prebrew.
      if (!user.prefs) {
        skipped += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=skip reason=no-pref`,
        );
        continue;
      }

      const prebrewHour = user.prefs.prebrewHour ?? DEFAULT_PREBREW_HOUR;
      const timezone = user.prefs.timezone ?? null;
      const hour = localHour(timezone, now);

      if (hour !== prebrewHour) {
        skipped += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=skip reason=hour-mismatch local-hour=${hour} prebrew-hour=${prebrewHour}`,
        );
        continue;
      }

      // lastSeenAt proxy: the most recent RefreshLog.startedAt for this user.
      // It captures any cron, manual, or cold-start run — i.e. signs of life.
      const lastLog = await db.refreshLog.findFirst({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      });

      const policyUser: PrebrewUser = {
        id: user.id,
        prebrewEnabled: user.prefs.prebrewEnabled,
        lastSeenAt: lastLog?.startedAt ?? null,
        // Future-stage fields are not yet on the schema; left undefined so
        // the policy uses its conservative defaults.
      };

      const allowed = await shouldPrebrewFor(policyUser, providerHealth, policy);
      if (!allowed) {
        skipped += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=skip reason=policy policy=${policy}`,
        );
        continue;
      }

      const result = await prebrewTomorrow(user.id);
      if (result.ok && "skipped" in result && result.skipped) {
        skipped += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=skip reason=${result.skipped} iso=${result.iso}`,
        );
      } else if (result.ok) {
        processed += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=run reason=ok iso=${result.iso}`,
        );
      } else {
        errors += 1;
        console.log(
          `[cron:evening-prebrew] user=${user.id} action=error reason=${result.code}`,
        );
      }
    } catch (e) {
      errors += 1;
      const msg = (e as Error).message;
      console.log(
        `[cron:evening-prebrew] user=${user.id} action=error reason=throw msg=${msg}`,
      );
    }
  }

  const durationMs = Date.now() - start;
  return {
    ok: errors === 0,
    ranAt,
    durationMs,
    processed,
    skipped,
    errors,
    notes: `candidates=${candidates.length} policy=${policy}`,
  };
}
