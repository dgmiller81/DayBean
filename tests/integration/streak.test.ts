import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, makeGoal } from "../factories";
import { compositeGoalId } from "@/lib/default-goals";
import { detectStreak } from "@/server/lib/streak";
import { isoOffset } from "@/lib/dates";
import { serializeGoalsJson } from "@/server/json";

const TODAY = "2026-05-02";

async function writeDay(opts: {
  userId: string;
  iso: string;
  goals?: Record<string, boolean | number>;
  notes?: string;
}) {
  return testDb.day.create({
    data: {
      userId: opts.userId,
      iso: opts.iso,
      goalsJson: serializeGoalsJson(opts.goals ?? {}),
      notes: opts.notes ?? "",
    },
  });
}

describe("detectStreak", () => {
  it("returns length 0 for an empty user (no Day rows, no goals)", async () => {
    const u = await makeUser("u_empty");
    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(0);
    expect(result.contributingDays).toEqual([]);
    expect(result.todayCounted).toBe(false);
  });

  it("today qualifies via a completed Goal — length 1, todayCounted true", async () => {
    const u = await makeUser("u_today");
    await makeGoal(u, {
      specId: "g_god",
      section: "mindfulness",
      title: "Time with God",
      type: "check",
      target: 1,
      isDefault: true,
    });
    const goalId = compositeGoalId(u, "g_god");
    await writeDay({ userId: u, iso: TODAY, goals: { [goalId]: true } });

    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(1);
    expect(result.contributingDays).toEqual([TODAY]);
    expect(result.todayCounted).toBe(true);
  });

  it("5 consecutive days qualify but today is empty — length 5, todayCounted false", async () => {
    const u = await makeUser("u_yesterday");
    await makeGoal(u, {
      specId: "g_god",
      section: "mindfulness",
      title: "Time with God",
      type: "check",
      target: 1,
      isDefault: true,
    });
    const goalId = compositeGoalId(u, "g_god");

    // Days at offsets -1..-5 qualify; today (offset 0) does not.
    for (let i = 1; i <= 5; i++) {
      const iso = isoOffset(TODAY, -i);
      await writeDay({ userId: u, iso, goals: { [goalId]: true } });
    }

    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(5);
    expect(result.todayCounted).toBe(false);
    // Oldest first: -5, -4, -3, -2, -1
    expect(result.contributingDays).toEqual([
      isoOffset(TODAY, -5),
      isoOffset(TODAY, -4),
      isoOffset(TODAY, -3),
      isoOffset(TODAY, -2),
      isoOffset(TODAY, -1),
    ]);
  });

  it("a single miss in the middle of a chain returns only the recent contiguous tail", async () => {
    const u = await makeUser("u_gap");
    await makeGoal(u, {
      specId: "g_god",
      section: "mindfulness",
      title: "Time with God",
      type: "check",
      target: 1,
      isDefault: true,
    });
    const goalId = compositeGoalId(u, "g_god");

    // Qualify offsets -1, -2, -3 (and today).  Gap at -4. Then qualifying -5, -6.
    for (const off of [0, -1, -2, -3, -5, -6]) {
      await writeDay({
        userId: u,
        iso: isoOffset(TODAY, off),
        goals: { [goalId]: true },
      });
    }

    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(4); // today + 3 days back, then miss at -4
    expect(result.todayCounted).toBe(true);
    expect(result.contributingDays).toEqual([
      isoOffset(TODAY, -3),
      isoOffset(TODAY, -2),
      isoOffset(TODAY, -1),
      TODAY,
    ]);
  });

  it("caps at 90 days even with 100 consecutive qualifying days", async () => {
    const u = await makeUser("u_cap");
    await makeGoal(u, {
      specId: "g_god",
      section: "mindfulness",
      title: "Time with God",
      type: "check",
      target: 1,
      isDefault: true,
    });
    const goalId = compositeGoalId(u, "g_god");

    // Seed 100 consecutive qualifying days ending at TODAY.
    for (let i = 0; i < 100; i++) {
      await writeDay({
        userId: u,
        iso: isoOffset(TODAY, -i),
        goals: { [goalId]: true },
      });
    }

    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(90);
    expect(result.todayCounted).toBe(true);
    expect(result.contributingDays[result.contributingDays.length - 1]).toBe(TODAY);
  });

  it("a notes-only day (no goal completions) still counts", async () => {
    const u = await makeUser("u_notes");
    // No goals seeded — qualification must come from notes alone.
    await writeDay({
      userId: u,
      iso: TODAY,
      notes: "Felt grounded today after the morning walk.",
    });

    const result = await detectStreak(u, TODAY);
    expect(result.length).toBe(1);
    expect(result.todayCounted).toBe(true);
    expect(result.contributingDays).toEqual([TODAY]);
  });
});
