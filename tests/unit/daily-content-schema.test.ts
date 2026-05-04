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

  // URL well-formedness is intentionally NOT enforced at the Zod boundary —
  // OpenAI's structured outputs API rejects JSON Schema's `format: 'uri'`
  // keyword. Validation moves to render-time (anchor href fallback). The
  // prompt still instructs the model to provide real https URLs.
  it("accepts non-URL strings in url fields (validation moved to render-time)", () => {
    const lax = fixtureFor("2026-05-02");
    lax.mindfulness.articles[0].url = "not a url";
    expect(DailyContentSchema.safeParse(lax).success).toBe(true);
  });
});
