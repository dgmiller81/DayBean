import type { Goal } from "@/types";

export function ringFraction(numer: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(1, numer / denom));
}

export type DayProbe = {
  iso: string;
  notes?: string;
  goals?: Record<string, boolean | number>;
};

/**
 * Count of days with non-empty notes OR any tracked goals.
 */
export function daysJournaled(days: DayProbe[]): number {
  let n = 0;
  for (const d of days) {
    const hasNotes = (d.notes ?? "").trim().length > 0;
    const hasTracked = !!d.goals && Object.keys(d.goals).length > 0;
    if (hasNotes || hasTracked) n += 1;
  }
  return n;
}

/**
 * Longest single-goal streak across goals.
 */
export function bestStreakAcrossGoals(
  goals: Pick<Goal, "id">[],
  streakOf: (goalId: string) => number
): number {
  let best = 0;
  for (const g of goals) {
    const s = streakOf(g.id);
    if (s > best) best = s;
  }
  return best;
}

export type HeatmapInput = {
  iso: string;
  completedToday: number;
  totalGoals: number;
  hasJournalNotes: boolean;
};

export type HeatmapCell = {
  iso: string;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  ratio: number;
};

/** Spec §12.2 verbatim. */
export function heatmapLevels(
  inputs: HeatmapInput[],
  todayIso?: string
): HeatmapCell[] {
  return inputs.map((d) => {
    const ratio = d.totalGoals > 0 ? d.completedToday / d.totalGoals : 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (ratio >= 1 && d.completedToday > 0) level = 4;
    else if (ratio >= 0.67) level = 3;
    else if (ratio >= 0.34) level = 2;
    else if (ratio > 0) level = 1;
    if (level === 0 && d.hasJournalNotes) level = 1;
    return {
      iso: d.iso,
      level,
      isToday: d.iso === todayIso,
      ratio,
    };
  });
}
