import { describe, expect, it } from "vitest";
import { extractThemes } from "@/server/lib/theme-extraction";

describe("extractThemes", () => {
  it("returns [] for empty input", () => {
    expect(extractThemes([], "2026-05-03")).toEqual([]);
  });

  it("extracts themes from a single entry sorted by weight desc", () => {
    const out = extractThemes(
      [{ id: "a", iso: "2026-05-03", content: "garden garden garden sunlight" }],
      "2026-05-03",
    );
    expect(out.length).toBeGreaterThan(0);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]!.weight).toBeGreaterThanOrEqual(out[i]!.weight);
    }
    expect(out[0]!.theme).toBe("Garden");
  });

  it("scores recurring themes higher than one-offs", () => {
    const out = extractThemes(
      [
        { id: "a", iso: "2026-05-03", content: "courage courage strength" },
        { id: "b", iso: "2026-05-02", content: "courage practice" },
        { id: "c", iso: "2026-05-01", content: "courage rest" },
      ],
      "2026-05-03",
    );
    const courage = out.find((t) => t.theme === "Courage");
    const rest = out.find((t) => t.theme === "Rest");
    expect(courage).toBeDefined();
    expect(rest).toBeDefined();
    expect(courage!.weight).toBeGreaterThan(rest!.weight);
  });

  it("recency: today's entry contributes more than 7d-old", () => {
    const today = extractThemes(
      [{ id: "a", iso: "2026-05-03", content: "anchor anchor anchor" }],
      "2026-05-03",
    );
    const old = extractThemes(
      [{ id: "a", iso: "2026-04-26", content: "anchor anchor anchor" }],
      "2026-05-03",
    );
    expect(today[0]!.weight).toBeGreaterThan(old[0]!.weight);
    expect(old[0]!.weight / today[0]!.weight).toBeCloseTo(Math.exp(-1), 2);
  });

  it("lemmatizes inflections to a shared theme", () => {
    const out = extractThemes(
      [
        { id: "a", iso: "2026-05-03", content: "worries worried worry" },
        { id: "b", iso: "2026-05-03", content: "testing tests tested" },
      ],
      "2026-05-03",
    );
    const themes = out.map((t) => t.theme);
    expect(themes.filter((t) => t === "Worry")).toHaveLength(1);
    expect(themes.filter((t) => t === "Test")).toHaveLength(1);
  });

  it("returns at most 12 themes", () => {
    const content = Array.from({ length: 30 }, (_, i) => `token${i}word`).join(" ");
    const out = extractThemes(
      [{ id: "a", iso: "2026-05-03", content }],
      "2026-05-03",
    );
    expect(out.length).toBeLessThanOrEqual(12);
  });
});
