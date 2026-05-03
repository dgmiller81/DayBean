import { describe, expect, it } from "vitest";
import { DailyContentSchema } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";

describe("DailyContent schema", () => {
  it("validates the fixture", () => {
    const r = DailyContentSchema.safeParse(fixtureFor("2026-05-02"));
    expect(r.success).toBe(true);
  });

  it("rejects malformed dates", () => {
    const bad = { ...fixtureFor("2026-05-02"), date: "May 2" };
    expect(DailyContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid URLs", () => {
    const bad = fixtureFor("2026-05-02");
    bad.mindfulness.articles[0].url = "not a url";
    expect(DailyContentSchema.safeParse(bad).success).toBe(false);
  });
});
