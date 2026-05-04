// S0-T07 — App-wide constants. Centralized so every surface reads from
// one place; the rebrand pass in S1 changes only this file plus the
// component(s) that don't go through it.

export const APP_NAME = "DayBeans";

export const APP_TAGLINE = "Different beans. Same morning.";

export const APP_SUBHEAD =
  "One quiet page that knows what kind of day you need to face.";

export const APP_DESCRIPTION =
  "DayBeans is one quiet page that gathers your scripture, today's edge in tech, what to read, and your goals — written each day for who you are.";

/**
 * Tab names. Tab IDs (mindfulness, business, personal, overview) stay the
 * same to preserve cookies and routes; only the labels change with the
 * brand pivot in S1-T02.
 */
export const TAB_LABELS = {
  mindfulness: "Pour Over",
  business: "Daily Grind",
  personal: "Slow Sip",
  overview: "Bean Count",
} as const;

export const TAB_EYEBROWS = {
  mindfulness: "Mindful Soul",
  business: "Professional",
  personal: "Personal",
  overview: "Goals overview",
} as const;
