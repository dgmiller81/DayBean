import { describe, expect, it } from "vitest";
import { todayISO, friendlyDate } from "@/lib/dates";

describe("dates", () => {
  it("todayISO produces YYYY-MM-DD", () => {
    expect(todayISO(new Date("2026-05-02T15:00:00"))).toBe("2026-05-02");
  });

  it("friendlyDate formats as Weekday Month D, YYYY", () => {
    expect(friendlyDate("2026-05-02")).toMatch(/Saturday/);
    expect(friendlyDate("2026-05-02")).toMatch(/May 2, 2026/);
  });
});
