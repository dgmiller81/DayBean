import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";
import { recordClick } from "@/server/actions/clicks";
import { getClicksForDay } from "@/server/queries/clicks";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson } from "@/server/json";

const TODAY = "2026-05-02";

describe("click tracker", () => {
  it("first click increments to 1 and auto-credits g_mf_read", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    expect((await getClicksForDay(u, TODAY)).mindfulness).toBe(1);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[compositeGoalId(u, "g_mf_read")]).toBe(1);
  });

  it("multiple clicks accumulate; business clicks credit g_learn", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    for (let i = 0; i < 4; i++) await recordClick({ userId: u, iso: TODAY, section: "business" });
    expect((await getClicksForDay(u, TODAY)).business).toBe(4);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[compositeGoalId(u, "g_learn")]).toBe(4);
  });

  it("personal clicks credit g_per_read; sections are independent", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    await recordClick({ userId: u, iso: TODAY, section: "personal" });
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    const g = parseGoalsJson(day!.goalsJson);
    expect(g[compositeGoalId(u, "g_per_read")]).toBe(1);
    expect(g[compositeGoalId(u, "g_mf_read")]).toBe(1);
  });

  it("a user with no default 'read N articles' goal gets the click recorded but no credit", async () => {
    const u = await makeUser();
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    const click = await testDb.click.findUnique({
      where: { userId_iso_section: { userId: u, iso: TODAY, section: "mindfulness" } },
    });
    expect(click?.count).toBe(1);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(day).toBeNull();
  });
});
