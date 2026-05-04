import "server-only";
import { db } from "@/server/db";
import { todayISO, isoOffset } from "@/lib/dates";
import { progressFor } from "@/lib/progress";
import {
  parseGoalsJson,
  parseHealthJson,
  parseFinJson,
} from "@/server/json";
import { specIdFromCompositeId } from "@/lib/default-goals";
import type {
  ClickCounts,
  DayRecord,
  Goal,
  GoalCategory,
  Section,
} from "@/types";

export type StreakResult = {
  /** Current streak length in mornings. 0 if no streak. */
  length: number;
  /** ISO dates that contribute to the streak, oldest first. */
  contributingDays: string[];
  /** True iff today is one of the contributing days. */
  todayCounted: boolean;
};

const MAX_LOOKBACK = 90;

type GoalRow = {
  id: string;
  userId: string;
  section: string;
  title: string;
  type: string;
  target: number;
  isDefault: boolean;
  createdAt: Date;
  category: string | null;
};

function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    specId: specIdFromCompositeId(r.id),
    userId: r.userId,
    section: r.section as Section,
    title: r.title,
    type: r.type as Goal["type"],
    target: r.target,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
    category: (r.category as GoalCategory | null) ?? null,
  };
}

function makeEmptyDay(userId: string, iso: string): DayRecord {
  return {
    iso,
    userId,
    goals: {},
    notes: "",
    health: {},
    disconnect: 0,
    win: "",
    fin: {},
  };
}

function dayQualifies(
  day: DayRecord,
  goals: Goal[],
  clicks: ClickCounts | undefined,
): boolean {
  if (day.notes.trim().length > 0) return true;
  for (const g of goals) {
    if (progressFor(g, day, clicks).pct >= 100) return true;
  }
  return false;
}

/**
 * Compute the user's current consecutive-mornings streak.
 *
 * A day qualifies as "brewed" when the user has either:
 *   - non-empty journal notes on that ISO, OR
 *   - at least one Goal with progress pct >= 100 on that ISO.
 *
 * If today qualifies, the streak starts at today and walks back.
 * If today doesn't qualify yet (e.g. it's morning), the streak starts at
 * yesterday — the user hasn't acted today, but their chain isn't broken.
 *
 * Capped at MAX_LOOKBACK consecutive days for performance.
 */
export async function detectStreak(
  userId: string,
  todayIsoStr: string = todayISO(),
): Promise<StreakResult> {
  const fromIso = isoOffset(todayIsoStr, -(MAX_LOOKBACK - 1));
  const toIso = todayIsoStr;

  const [dayRows, goalRows, clickRows] = await Promise.all([
    db.day.findMany({
      where: { userId, iso: { gte: fromIso, lte: toIso } },
    }),
    db.goal.findMany({ where: { userId } }),
    db.click.findMany({
      where: { userId, iso: { gte: fromIso, lte: toIso } },
    }),
  ]);

  const goals = goalRows.map(rowToGoal);

  const dayByIso = new Map<string, DayRecord>();
  for (const row of dayRows) {
    dayByIso.set(row.iso, {
      iso: row.iso,
      userId: row.userId,
      goals: parseGoalsJson(row.goalsJson),
      notes: row.notes,
      health: parseHealthJson(row.healthJson),
      disconnect: row.disconnect,
      win: row.win,
      fin: parseFinJson(row.finJson),
    });
  }

  const clicksByIso = new Map<string, ClickCounts>();
  for (const r of clickRows) {
    if (
      r.section !== "mindfulness" &&
      r.section !== "business" &&
      r.section !== "personal"
    ) {
      continue;
    }
    const existing =
      clicksByIso.get(r.iso) ??
      ({ mindfulness: 0, business: 0, personal: 0 } as ClickCounts);
    existing[r.section] = r.count;
    clicksByIso.set(r.iso, existing);
  }

  const qualifies = (iso: string): boolean => {
    const day = dayByIso.get(iso) ?? makeEmptyDay(userId, iso);
    return dayQualifies(day, goals, clicksByIso.get(iso));
  };

  // Walk backward: start at today if today qualifies, else at yesterday.
  // Today not qualifying yet doesn't break the streak — user hasn't acted today.
  const todayCounted = qualifies(todayIsoStr);
  let cursor = todayCounted ? todayIsoStr : isoOffset(todayIsoStr, -1);

  const collected: string[] = [];
  while (collected.length < MAX_LOOKBACK) {
    if (!qualifies(cursor)) break;
    collected.push(cursor);
    cursor = isoOffset(cursor, -1);
  }

  // collected is newest-first; reverse to oldest-first per contract.
  const contributingDays = collected.slice().reverse();

  return {
    length: contributingDays.length,
    contributingDays,
    todayCounted: todayCounted && contributingDays.includes(todayIsoStr),
  };
}
