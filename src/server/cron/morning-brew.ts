import "server-only";
// S2-T04 — Morning brew cron implementation.
// For each user that has at least one LlmCredential row, check whether the
// caller's local hour matches Pref.refreshHour (default 4). When it does and
// no successful morning RefreshLog exists for the user's local-today ISO,
// invoke refreshDailyContent(userId, today, 'morning'). One failing user must
// not abort the rest of the loop.

import { db } from "@/server/db";
import { refreshDailyContent } from "@/server/llm/refresh";
import type { CronJobResult } from "./types";

const DEFAULT_REFRESH_HOUR = 4;

/**
 * Resolve a user's local hour (0-23) and local-today ISO date (YYYY-MM-DD)
 * given their IANA timezone preference. A null/empty/unknown timezone falls
 * back to UTC.
 *
 * We avoid pulling in a date library — Intl.DateTimeFormat with the timeZone
 * option handles DST transitions correctly and is built into Node.
 */
function localHourAndIso(
  timezone: string | null,
  now: Date,
): { hour: number; iso: string } {
  const tz = timezone && timezone.trim().length > 0 ? timezone : "UTC";

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    }).formatToParts(now);
  } catch {
    // Unrecognised IANA name — fall back to UTC rather than throwing.
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    }).formatToParts(now);
  }

  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = lookup("year");
  const month = lookup("month");
  const day = lookup("day");
  // hour can be reported as "24" at midnight in some locales; coerce to 0.
  const rawHour = parseInt(lookup("hour"), 10);
  const hour = Number.isFinite(rawHour) ? rawHour % 24 : 0;
  const iso = `${year}-${month}-${day}`;
  return { hour, iso };
}

export async function runMorningBrew(): Promise<CronJobResult> {
  const start = Date.now();
  const ranAt = new Date(start).toISOString();
  const now = new Date(start);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Single Prisma query: pull every user with at least one credential along
  // with their Pref row. Thousands of users at this width is fine.
  const candidates = await db.user.findMany({
    where: { llmCredentials: { some: {} } },
    select: {
      id: true,
      prefs: { select: { refreshHour: true, timezone: true } },
    },
  });

  for (const user of candidates) {
    try {
      const refreshHour = user.prefs?.refreshHour ?? DEFAULT_REFRESH_HOUR;
      const timezone = user.prefs?.timezone ?? null;
      const { hour, iso } = localHourAndIso(timezone, now);

      if (hour !== refreshHour) {
        skipped += 1;
        console.log(
          `[cron:morning-brew] user=${user.id} action=skip reason=hour-mismatch local-hour=${hour} refresh-hour=${refreshHour} iso=${iso}`,
        );
        continue;
      }

      const existing = await db.refreshLog.findFirst({
        where: { userId: user.id, iso, phase: "morning", status: "ok" },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        console.log(
          `[cron:morning-brew] user=${user.id} action=skip reason=already-ok iso=${iso}`,
        );
        continue;
      }

      const result = await refreshDailyContent(user.id, iso, "morning");
      if (result.ok) {
        processed += 1;
        console.log(
          `[cron:morning-brew] user=${user.id} action=run reason=ok iso=${iso}`,
        );
      } else {
        errors += 1;
        console.log(
          `[cron:morning-brew] user=${user.id} action=error reason=${result.code} iso=${iso}`,
        );
      }
    } catch (e) {
      errors += 1;
      const msg = (e as Error).message;
      console.log(
        `[cron:morning-brew] user=${user.id} action=error reason=throw msg=${msg}`,
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
    notes: `candidates=${candidates.length}`,
  };
}
