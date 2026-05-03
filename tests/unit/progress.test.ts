import { describe, expect, it } from "vitest";
import {
  progressFor,
  streakFor,
  dailyStreak,
  aggregateForSection,
} from "@/lib/progress";
import type { DayRecord, Goal } from "@/types";

const goal = (over: Partial<Goal> & Pick<Goal, "specId" | "type" | "target">): Goal => ({
  id: `u::${over.specId}`,
  userId: "u",
  section: "mindfulness",
  title: over.specId,
  isDefault: false,
  createdAt: new Date(0),
  ...over,
});

const day = (iso: string, over: Partial<DayRecord> = {}): DayRecord => ({
  iso,
  userId: "u",
  goals: {},
  notes: "",
  health: {},
  disconnect: 0,
  win: "",
  fin: {},
  ...over,
});

describe("progressFor", () => {
  it("check goals are 0% or 100%", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    expect(progressFor(g, day("2026-05-02"))).toEqual({ current: 0, target: 1, pct: 0 });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_god": true } }))).toEqual({
      current: 1, target: 1, pct: 100,
    });
  });

  it("count goals cap pct at 100 but report raw current", () => {
    const g = goal({ specId: "g_learn", type: "count", target: 3, section: "business" });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_learn": 2 } })))
      .toEqual({ current: 2, target: 3, pct: 67 });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_learn": 5 } })))
      .toEqual({ current: 5, target: 3, pct: 100 });
  });

  it("count goals wired to clicks use clicks[section] when present", () => {
    const g = goal({ specId: "g_mf_read", type: "count", target: 1, section: "mindfulness" });
    const d = day("2026-05-02");
    const clicks = { mindfulness: 1, business: 0, personal: 0 };
    expect(progressFor(g, d, clicks).pct).toBe(100);
  });

  it("g_disconnect time goal reads day.disconnect", () => {
    const g = goal({ specId: "g_disconnect", type: "time", target: 60, section: "personal" });
    expect(progressFor(g, day("2026-05-02", { disconnect: 45 })))
      .toEqual({ current: 45, target: 60, pct: 75 });
  });

  it("custom time goals read from day.goals[id]", () => {
    const g = goal({ specId: "g_min_123", type: "time", target: 30, section: "personal" });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_min_123": 30 } })))
      .toEqual({ current: 30, target: 30, pct: 100 });
  });
});

describe("streakFor", () => {
  it("counts consecutive days where pct >= 100", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    const today = "2026-05-02";
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02", { goals: { "u::g_god": true } })],
      ["2026-05-01", day("2026-05-01", { goals: { "u::g_god": true } })],
      ["2026-04-30", day("2026-04-30", { goals: { "u::g_god": false } })],
      ["2026-04-29", day("2026-04-29", { goals: { "u::g_god": true } })],
    ]);
    expect(streakFor(g, today, (iso) => records.get(iso))).toBe(2);
  });

  it("returns 0 when today is not complete", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    expect(streakFor(g, "2026-05-02", () => undefined)).toBe(0);
  });
});

describe("dailyStreak", () => {
  it("walks back while ANY goal hit 100% or any task completed that day", () => {
    const goals = [goal({ specId: "g_god", type: "check", target: 1 })];
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02", { goals: { "u::g_god": true } })],
      ["2026-05-01", day("2026-05-01", { goals: { "u::g_god": true } })],
      ["2026-04-30", day("2026-04-30")],
    ]);
    expect(dailyStreak("2026-05-02", goals, (iso) => records.get(iso), () => false)).toBe(2);
  });

  it("a completed task carries the streak even with no goals progress", () => {
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02")],
      ["2026-05-01", day("2026-05-01")],
    ]);
    const taskCompletedOn = (iso: string) => iso === "2026-05-02" || iso === "2026-05-01";
    expect(dailyStreak("2026-05-02", [], (iso) => records.get(iso), taskCompletedOn)).toBe(2);
  });
});

describe("aggregateForSection", () => {
  it("returns the average pct of all goals in a section", () => {
    const goals = [
      goal({ specId: "g_god", type: "check", target: 1, section: "mindfulness" }),
      goal({ specId: "g_meditate", type: "check", target: 1, section: "mindfulness" }),
    ];
    const d = day("2026-05-02", { goals: { "u::g_god": true, "u::g_meditate": false } });
    expect(aggregateForSection("mindfulness", goals, d)).toBe(50);
  });

  it("returns 0 when no goals are in the section", () => {
    expect(aggregateForSection("personal", [], day("2026-05-02"))).toBe(0);
  });
});
