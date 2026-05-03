import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";
import {
  addGoal,
  removeGoal,
  toggleCheckGoal,
  incrementCountGoal,
  addTimeMinutes,
} from "@/server/actions/goals";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson } from "@/server/json";

const TODAY = "2026-05-02";

describe("goal actions", () => {
  it("addGoal creates a custom goal", async () => {
    const u = await makeUser();
    const g = await addGoal({ userId: u, section: "personal", title: "Read poetry", type: "check", target: 1 });
    expect(g.isDefault).toBe(false);
    expect(g.specId).toMatch(/^g_min_/);
  });

  it("removeGoal deletes only custom goals", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const g = await addGoal({ userId: u, section: "personal", title: "Read poetry", type: "check", target: 1 });
    await removeGoal({ userId: u, goalId: g.id });
    expect(await testDb.goal.findFirst({ where: { id: g.id } })).toBeNull();

    await expect(removeGoal({ userId: u, goalId: compositeGoalId(u, "g_god") }))
      .rejects.toThrow(/default/i);
  });

  it("toggleCheckGoal flips today's value", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const id = compositeGoalId(u, "g_god");
    await toggleCheckGoal({ userId: u, goalId: id, iso: TODAY });
    let day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[id]).toBe(true);
    await toggleCheckGoal({ userId: u, goalId: id, iso: TODAY });
    day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[id]).toBe(false);
  });

  it("incrementCountGoal advances numeric counter", async () => {
    const u = await makeUser();
    const g = await addGoal({ userId: u, section: "business", title: "Calls", type: "count", target: 5 });
    await incrementCountGoal({ userId: u, goalId: g.id, iso: TODAY });
    await incrementCountGoal({ userId: u, goalId: g.id, iso: TODAY });
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[g.id]).toBe(2);
  });

  it("addTimeMinutes — g_disconnect updates day.disconnect; custom time goes into goals JSON", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const disc = compositeGoalId(u, "g_disconnect");
    await addTimeMinutes({ userId: u, goalId: disc, iso: TODAY, minutes: 30 });
    let day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(day!.disconnect).toBe(30);

    const custom = await addGoal({ userId: u, section: "personal", title: "Stretch", type: "time", target: 30 });
    await addTimeMinutes({ userId: u, goalId: custom.id, iso: TODAY, minutes: 15 });
    day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[custom.id]).toBe(15);
  });

  it("rejects mutations cross-user", async () => {
    const a = await makeUser("u_a");
    const b = await makeUser("u_b");
    await seedDefaultGoals(a);
    const aGoal = compositeGoalId(a, "g_god");
    await expect(toggleCheckGoal({ userId: b, goalId: aGoal, iso: TODAY }))
      .rejects.toThrow(/not found/i);
  });
});
