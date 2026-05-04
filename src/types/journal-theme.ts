// S0-T03 — Type contract for journal-theme extraction.
// Implementation lands in S4-T01 (theme-extraction module) and
// S4-T03 (persistence + scheduler hook). UI consumers (S4-T04) build
// against this type today and integrate at sprint end.

import { z } from "zod";

export const JournalThemeSchema = z.object({
  id: z.string(),
  theme: z.string().min(1).max(64),
  weight: z.number().min(0),
  muted: z.boolean(),
  lastSeen: z.string(), // ISO datetime
});

export type JournalTheme = z.infer<typeof JournalThemeSchema>;

/** Just-extracted theme tokens that haven't been persisted yet. */
export type ExtractedTheme = {
  theme: string;
  weight: number;
};
