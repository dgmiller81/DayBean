import "server-only";
import { db } from "@/server/db";

/**
 * True iff at least one RefreshLog row exists for (userId, iso) — regardless
 * of status. Once we've ATTEMPTED a refresh today, we don't retry the
 * session-start path until the next ISO day rolls over. This prevents a
 * tight retry-loop when the LLM keeps failing (which would burn API credits
 * + spam logs).
 *
 * Manual refresh (the topbar button + the cron route) is NOT gated by this
 * check — the user can force another try whenever they want.
 */
export async function hasRefreshedToday(userId: string, iso: string): Promise<boolean> {
  const row = await db.refreshLog.findFirst({
    where: { userId, iso },
    select: { id: true },
  });
  return !!row;
}

/**
 * Snapshot of the dual-run scheduler health from the user's perspective:
 *   - which slot served today's content RIGHT NOW
 *   - when each phase last succeeded
 *
 * Surfaced in Settings → LLM tab so users can see whether the morning brew
 * fired, whether last night's pre-brew rescued them, or whether everything
 * fell back to the fixture. We do NOT re-validate JSON here — that's the
 * read-path's job (getDailyContentWithMeta). This is a scheduler-health view,
 * not a content-correctness view.
 */
export type RefreshStatusSnapshot = {
  /** Most recent successful morning brew (any iso). null if never. */
  lastMorningAt: Date | null;
  /** Most recent successful evening pre-brew. null if never. */
  lastPrebrewAt: Date | null;
  /** Which slot served today's content right now: 'primary' | 'backup' | 'fixture' | null (no row). */
  todaysSource: "primary" | "backup" | "fixture" | null;
  /** Date primaryAt or backupAt of the served row, for display. */
  todaysServedAt: Date | null;
};

const BACKUP_TTL_MS = 36 * 60 * 60 * 1000; // 36 hours

export async function getRefreshStatus(
  userId: string,
  todayIso: string,
): Promise<RefreshStatusSnapshot> {
  const [todayRow, lastMorning, lastPrebrew] = await Promise.all([
    db.dailyContent.findUnique({
      where: { userId_iso: { userId, iso: todayIso } },
      select: {
        contentJson: true,
        backupContentJson: true,
        primaryAt: true,
        backupAt: true,
      },
    }),
    db.refreshLog.findFirst({
      where: { userId, phase: "morning", status: "ok" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    db.refreshLog.findFirst({
      where: { userId, phase: "evening-prebrew", status: "ok" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  let todaysSource: RefreshStatusSnapshot["todaysSource"] = null;
  let todaysServedAt: Date | null = null;

  if (todayRow) {
    const hasPrimary = !!todayRow.contentJson && todayRow.contentJson.length > 0;
    const hasBackup = !!todayRow.backupContentJson;
    const backupFresh =
      hasBackup &&
      todayRow.backupAt !== null &&
      Date.now() - todayRow.backupAt.getTime() <= BACKUP_TTL_MS;

    if (hasPrimary) {
      todaysSource = "primary";
      todaysServedAt = todayRow.primaryAt;
    } else if (backupFresh) {
      todaysSource = "backup";
      todaysServedAt = todayRow.backupAt;
    } else {
      todaysSource = "fixture";
      todaysServedAt = null;
    }
  }

  return {
    lastMorningAt: lastMorning?.startedAt ?? null,
    lastPrebrewAt: lastPrebrew?.startedAt ?? null,
    todaysSource,
    todaysServedAt,
  };
}
