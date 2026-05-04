// S3-T07 — Deterministic per-category tinting derived from existing brand
// tokens via color-mix. No new tokens or hex literals are introduced.

import type { GoalCategory } from "@/types";

export type CategoryChip = {
  /** Short-label fallback if the parent doesn't already display the name. */
  short: string;
  /** Single-letter glyph for ultra-compact chips. */
  letter: string;
  /** Background fill for chips. */
  bg: string;
  /** Border color. */
  border: string;
  /** Foreground/text color. */
  fg: string;
};

const BASE_BG = "var(--surface-2)";
const BASE_BORDER = "var(--line)";
const BASE_FG = "var(--ink-muted)";

/**
 * Map each GoalCategory to a subtle tint. We only have a single accent token
 * (`--sage` / `--sage-deep`) plus neutral tokens. To differentiate six
 * categories without introducing new hues, we vary the mix ratio of the
 * accent against `--surface-2`, and lean on letter glyphs for the rest of
 * the visual cue. Mapping (intent in comments matches spec):
 *   family  → deep sage tint
 *   finance → strong sage tint
 *   hobby   → mid sage tint
 *   fitness → light sage-accent tint (with stronger border for "warmth")
 *   faith   → soft sage tint
 *   work    → pure neutral
 */
export function chipForCategory(category: GoalCategory | null | undefined): CategoryChip {
  switch (category) {
    case "family":
      return {
        short: "Family",
        letter: "Fa",
        bg: "color-mix(in oklab, var(--sage-deep) 28%, var(--surface-2))",
        border: "color-mix(in oklab, var(--sage-deep) 40%, var(--line))",
        fg: "color-mix(in oklab, var(--sage-deep) 70%, var(--ink))",
      };
    case "finance":
      return {
        short: "Finance",
        letter: "$",
        bg: "color-mix(in oklab, var(--sage) 35%, var(--surface-2))",
        border: "color-mix(in oklab, var(--sage) 50%, var(--line))",
        fg: "color-mix(in oklab, var(--sage-deep) 60%, var(--ink))",
      };
    case "hobby":
      return {
        short: "Hobby",
        letter: "Ho",
        bg: "color-mix(in oklab, var(--sage) 20%, var(--surface-2))",
        border: "color-mix(in oklab, var(--sage) 35%, var(--line))",
        fg: "color-mix(in oklab, var(--sage-deep) 50%, var(--ink))",
      };
    case "fitness":
      return {
        short: "Fitness",
        letter: "Fi",
        bg: "color-mix(in oklab, var(--sage) 12%, var(--surface-2))",
        border: "color-mix(in oklab, var(--sage-deep) 55%, var(--line))",
        fg: "color-mix(in oklab, var(--sage-deep) 60%, var(--ink))",
      };
    case "faith":
      return {
        short: "Faith",
        letter: "Fa",
        bg: "color-mix(in oklab, var(--sage-soft) 60%, var(--surface-2))",
        border: "color-mix(in oklab, var(--sage) 25%, var(--line))",
        fg: "color-mix(in oklab, var(--sage-deep) 45%, var(--ink))",
      };
    case "work":
      return {
        short: "Work",
        letter: "Wo",
        bg: BASE_BG,
        border: "var(--line-strong)",
        fg: "var(--ink-soft)",
      };
    default:
      return {
        short: "",
        letter: "",
        bg: BASE_BG,
        border: BASE_BORDER,
        fg: BASE_FG,
      };
  }
}

/** Display label for a category enum value. */
export function labelForCategory(category: GoalCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** Stable order matching the task spec. */
export const CATEGORY_ORDER: GoalCategory[] = [
  "family",
  "finance",
  "hobby",
  "fitness",
  "faith",
  "work",
];
