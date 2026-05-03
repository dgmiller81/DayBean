import type { ClickCounts, DayRecord, Goal, GoalProgress, Section } from "@/types";
import { specIdFromCompositeId } from "@/lib/default-goals";
import { isoOffset } from "@/lib/dates";

const SECTION_TO_AUTOCREDIT_SPEC: Record<Section, string> = {
  mindfulness: "g_mf_read",
  business: "g_learn",
  personal: "g_per_read",
};

export function progressFor(g: Goal, day: DayRecord, clicks?: ClickCounts): GoalProgress {
  if (g.type === "check") {
    const v = day.goals[g.id];
    const current = v === true || (typeof v === "number" && v > 0) ? 1 : 0;
    return { current, target: g.target, pct: current >= g.target ? 100 : 0 };
  }

  if (g.type === "count") {
    const specId = specIdFromCompositeId(g.id);
    const wiredSpec = SECTION_TO_AUTOCREDIT_SPEC[g.section];
    const wired = clicks && specId === wiredSpec ? clicks[g.section] : undefined;
    const fromDay = day.goals[g.id];
    const current =
      typeof wired === "number" ? wired :
      typeof fromDay === "number" ? fromDay :
      0;
    const pct = g.target === 0 ? 0 : Math.min(100, Math.round((current / g.target) * 100));
    return { current, target: g.target, pct };
  }

  // time
  const specId = specIdFromCompositeId(g.id);
  const fromDayRaw = day.goals[g.id];
  const current =
    specId === "g_disconnect" ? day.disconnect :
    typeof fromDayRaw === "number" ? fromDayRaw :
    0;
  const pct = g.target === 0 ? 0 : Math.min(100, Math.round((current / g.target) * 100));
  return { current, target: g.target, pct };
}

export type DayLookup = (iso: string) => DayRecord | undefined;
export type TaskCompletedLookup = (iso: string) => boolean;

export function streakFor(
  g: Goal,
  todayIso: string,
  lookupDay: DayLookup,
  clicksLookup?: (iso: string) => ClickCounts | undefined
): number {
  let streak = 0;
  let cursor = todayIso;
  while (true) {
    const d = lookupDay(cursor);
    if (!d) break;
    const clicks = clicksLookup?.(cursor);
    const { pct } = progressFor(g, d, clicks);
    if (pct < 100) break;
    streak++;
    cursor = isoOffset(cursor, -1);
    if (streak > 366) break;
  }
  return streak;
}

export function dailyStreak(
  todayIso: string,
  goals: Goal[],
  lookupDay: DayLookup,
  hadTaskCompletedOn: TaskCompletedLookup,
  clicksLookup?: (iso: string) => ClickCounts | undefined
): number {
  let streak = 0;
  let cursor = todayIso;
  while (true) {
    const d = lookupDay(cursor);
    const taskHit = hadTaskCompletedOn(cursor);
    if (!d && !taskHit) break;
    const clicks = clicksLookup?.(cursor);
    const goalHit = !!d && goals.some((g) => progressFor(g, d, clicks).pct >= 100);
    if (!goalHit && !taskHit) break;
    streak++;
    cursor = isoOffset(cursor, -1);
    if (streak > 366) break;
  }
  return streak;
}

export function aggregateForSection(
  section: Section,
  goals: Goal[],
  day: DayRecord,
  clicks?: ClickCounts
): number {
  const inSection = goals.filter((g) => g.section === section);
  if (inSection.length === 0) return 0;
  const sum = inSection.reduce((acc, g) => acc + progressFor(g, day, clicks).pct, 0);
  return Math.round(sum / inSection.length);
}
