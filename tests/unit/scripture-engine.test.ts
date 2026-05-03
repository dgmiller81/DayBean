import { describe, expect, it } from "vitest";
import {
  themeWeights,
  pickScripture,
  joinJournalText,
} from "@/lib/scripture-engine";

describe("themeWeights", () => {
  it("counts whole-word keyword hits", () => {
    const text = "I felt anxious about the demo. anxiety crept in twice.";
    const w = themeWeights(text);
    expect(w.Anxiety).toBe(2);
  });

  it("ignores keywords inside other words", () => {
    expect(themeWeights("contentment").Contentment).toBe(1);
    expect(themeWeights("incontent")).toEqual({}); // no whole-word match
  });

  it("returns empty object when nothing matches", () => {
    expect(themeWeights("just a regular thursday")).toEqual({});
  });
});

describe("pickScripture", () => {
  it("picks deterministically by date when no themes are active", () => {
    const a = pickScripture("2026-05-02", "");
    const b = pickScripture("2026-05-02", "");
    expect(a.passage.ref).toBe(b.passage.ref);
    expect(a.hint).toBeNull();
  });

  it("different dates yield different (or at minimum cycle through) passages", () => {
    const refs = new Set();
    for (let i = 0; i < 14; i++) {
      const iso = `2026-05-${String((i % 28) + 1).padStart(2, "0")}`;
      refs.add(pickScripture(iso, "").passage.ref);
    }
    expect(refs.size).toBeGreaterThan(1);
  });

  it("when journal mentions humility, it biases toward Humility-tagged scriptures", () => {
    const out = pickScripture("2026-05-02", "I felt humble today.");
    expect(out.passage.theme).toBe("Humility");
    expect(out.hint).toBe("Humility");
  });

  it("multiple active themes — the first one wins as the hint, but the candidate set is the union", () => {
    const out = pickScripture("2026-05-02", "I was anxious and ungrateful and grateful.");
    expect(["Anxiety", "Gratitude"]).toContain(out.hint);
    expect(["Anxiety", "Gratitude"]).toContain(out.passage.theme);
  });
});

describe("joinJournalText", () => {
  it("joins with newlines and lowercases", () => {
    expect(joinJournalText(["A", "b", "C"])).toBe("a\nb\nc");
  });
});
