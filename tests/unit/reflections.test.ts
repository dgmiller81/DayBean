import { describe, expect, it } from "vitest";
import { pickReflections, REFLECTIONS } from "@/lib/reflections";

describe("pickReflections", () => {
  it("returns 5 reflections", () => {
    expect(pickReflections("2026-05-02")).toHaveLength(5);
  });

  it("the same date returns the same set", () => {
    expect(pickReflections("2026-05-02")).toEqual(pickReflections("2026-05-02"));
  });

  it("different dates can return different sets", () => {
    const sets = new Set();
    for (let i = 1; i <= 14; i++) {
      const iso = `2026-05-${String(i).padStart(2, "0")}`;
      sets.add(pickReflections(iso).map((r) => r.title).join("|"));
    }
    expect(sets.size).toBeGreaterThan(1);
  });

  it("the 15-entry library has no duplicate titles", () => {
    const titles = REFLECTIONS.map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
