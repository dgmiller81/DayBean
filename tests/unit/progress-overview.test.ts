import { describe, expect, it } from "vitest";
import {
  bestStreakAcrossGoals,
  daysJournaled,
  heatmapLevels,
  ringFraction,
  type DayProbe,
} from "@/lib/progress-overview";

describe("ringFraction", () => {
  it("returns 0 when total is 0", () => {
    expect(ringFraction(0, 0)).toBe(0);
  });
  it("clamps to [0, 1]", () => {
    expect(ringFraction(2, 1)).toBe(1);
    expect(ringFraction(-1, 5)).toBe(0);
  });
  it("returns the simple ratio otherwise", () => {
    expect(ringFraction(3, 4)).toBeCloseTo(0.75);
  });
});

describe("daysJournaled", () => {
  it("counts days with non-empty notes", () => {
    const days: DayProbe[] = [
      { iso: "2026-05-01", notes: "wrote something", goals: {} },
      { iso: "2026-05-02", notes: "", goals: {} },
      { iso: "2026-05-03", notes: "   ", goals: {} },
      { iso: "2026-05-04", notes: "x", goals: {} },
    ];
    expect(daysJournaled(days)).toBe(2);
  });

  it("also counts days that have any tracked goals", () => {
    const days: DayProbe[] = [
      { iso: "2026-05-01", notes: "", goals: { g_god: true } },
      { iso: "2026-05-02", notes: "", goals: {} },
      { iso: "2026-05-03", notes: "", goals: { g_learn: 0 } },
    ];
    expect(daysJournaled(days)).toBe(2);
  });
});

describe("bestStreakAcrossGoals", () => {
  it("returns 0 when there are no goals", () => {
    expect(bestStreakAcrossGoals([], () => 0)).toBe(0);
  });
  it("returns the longest single-goal streak", () => {
    const goals = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const streaks: Record<string, number> = { a: 4, b: 11, c: 2 };
    expect(bestStreakAcrossGoals(goals, (id) => streaks[id])).toBe(11);
  });
  it("does not sum streaks across goals", () => {
    const goals = [{ id: "a" }, { id: "b" }];
    expect(bestStreakAcrossGoals(goals, () => 3)).toBe(3);
  });
});

describe("heatmapLevels", () => {
  const day = (iso: string, completed: number, total: number, hasNotes = false) => ({
    iso, completedToday: completed, totalGoals: total, hasJournalNotes: hasNotes,
  });

  it("level 0 — no goals, no notes", () => {
    expect(heatmapLevels([day("2026-05-01", 0, 5)])[0].level).toBe(0);
  });
  it("level 1 — 0 < ratio < 0.34", () => {
    expect(heatmapLevels([day("2026-05-01", 1, 5)])[0].level).toBe(1);
  });
  it("level 2 — 0.34 ≤ ratio < 0.67", () => {
    expect(heatmapLevels([day("2026-05-01", 2, 5)])[0].level).toBe(2);
    expect(heatmapLevels([day("2026-05-01", 3, 5)])[0].level).toBe(2);
  });
  it("level 3 — 0.67 ≤ ratio < 1", () => {
    expect(heatmapLevels([day("2026-05-01", 4, 5)])[0].level).toBe(3);
  });
  it("level 4 — ratio === 1", () => {
    expect(heatmapLevels([day("2026-05-01", 5, 5)])[0].level).toBe(4);
  });
  it("level 1 from journal notes", () => {
    expect(heatmapLevels([day("2026-05-01", 0, 5, true)])[0].level).toBe(1);
  });
  it("today flag", () => {
    const out = heatmapLevels([day("2026-05-02", 5, 5)], "2026-05-02");
    expect(out[0].iso).toBe("2026-05-02");
    expect(out[0].isToday).toBe(true);
  });
});
