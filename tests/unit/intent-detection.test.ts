import { describe, expect, it } from "vitest";
import { detectIntents } from "@/server/lib/intent-detection";

describe("detectIntents", () => {
  it("returns [] for empty input", () => {
    expect(detectIntents("")).toEqual([]);
    expect(detectIntents("Today was fine. Nothing in particular.")).toEqual([]);
  });

  it("captures 'I want to wake up earlier.'", () => {
    const drafts = detectIntents("I want to wake up earlier.");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].cadence).toBe("daily");
    expect(drafts[0].category).toBeNull();
    expect(drafts[0].title.startsWith("Wake up earlier")).toBe(true);
  });

  it("captures 'I keep checking my phone first thing.'", () => {
    const drafts = detectIntents("I keep checking my phone first thing.");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].cadence).toBe("daily");
    expect(drafts[0].category).toBeNull();
    expect(drafts[0].title.toLowerCase()).toContain("checking my phone first thing");
  });

  it("infers family + weekly for 'I want to call my dad every week.'", () => {
    const drafts = detectIntents("I want to call my dad every week.");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].category).toBe("family");
    expect(drafts[0].cadence).toBe("weekly");
  });

  it("infers fitness + weekly for 'I'm going to start running 3 days a week.'", () => {
    const drafts = detectIntents("I'm going to start running 3 days a week.");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].category).toBe("fitness");
    expect(drafts[0].cadence).toBe("weekly");
  });

  it("infers faith + daily for 'I should pray more in the mornings.'", () => {
    const drafts = detectIntents("I should pray more in the mornings.");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].category).toBe("faith");
    expect(drafts[0].cadence).toBe("daily");
  });

  it("returns multiple drafts when multiple intents are present", () => {
    const entry = "I want to wake up earlier. I should pray more. I keep checking my phone.";
    const drafts = detectIntents(entry);
    expect(drafts.length).toBeGreaterThanOrEqual(3);
  });

  it("caps output at 5 drafts even with many matches", () => {
    const entry = Array.from({ length: 12 }, (_, i) => `I want to do task ${i + 1}.`).join(" ");
    const drafts = detectIntents(entry);
    expect(drafts.length).toBe(5);
  });

  it("dedupes overlapping matches: 'I want to ship the launch on Friday.' produces ONE draft", () => {
    const drafts = detectIntents("I want to ship the launch on Friday.");
    expect(drafts).toHaveLength(1);
  });
});
