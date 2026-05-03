import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatZodError } from "@/lib/format-zod-error";

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  god: z.object({
    opening: z.string().min(1),
    prayer: z.string().min(1),
  }),
  articles: z.array(z.object({
    title: z.string().min(1),
    url: z.string().url(),
  })),
});

describe("formatZodError", () => {
  it("returns one line per issue, with dotted/indexed paths", () => {
    const r = Schema.safeParse({
      date: "May 1",
      god: { opening: "", prayer: "ok" },
      articles: [{ title: "ok", url: "not-a-url" }],
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    const lines = formatZodError(r.error).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines).toContain("date: must be YYYY-MM-DD");
    // The exact min-length message may vary by zod version; just check the prefix
    expect(lines.some((l) => l.startsWith("god.opening:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("articles[0].url:"))).toBe(true);
  });

  it("returns a single line when the root is the wrong type", () => {
    const r = Schema.safeParse("not an object");
    expect(r.success).toBe(false);
    if (r.success) return;
    const out = formatZodError(r.error);
    expect(out.startsWith("(root):")).toBe(true);
  });

  it("limits to first 10 issues to avoid wall-of-text", () => {
    const Many = z.array(z.string());
    const r = Many.safeParse(Array.from({ length: 20 }, () => 0));
    expect(r.success).toBe(false);
    if (r.success) return;
    const out = formatZodError(r.error);
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(11);
    expect(lines[lines.length - 1]).toMatch(/and \d+ more/);
  });
});
