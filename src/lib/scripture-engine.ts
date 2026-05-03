import { SCRIPTURES, type Scripture } from "@/lib/scriptures";
import { THEME_KEYWORDS } from "@/lib/theme-keywords";

export function joinJournalText(notes: string[]): string {
  return notes.join("\n").toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function themeWeights(text: string): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
    let count = 0;
    for (const kw of kws) {
      const re = new RegExp("\\b" + escapeRegex(kw) + "\\b", "gi");
      const m = text.match(re);
      if (m) count += m.length;
    }
    if (count > 0) weights[theme] = count;
  }
  return weights;
}

export function pickScripture(
  todayIso: string,
  recentJournalText: string
): { passage: Scripture; hint: string | null } {
  const weights = themeWeights(recentJournalText);
  const themed = Object.keys(weights);

  let candidates: Scripture[] = SCRIPTURES;
  if (themed.length > 0) {
    const filtered = SCRIPTURES.filter((s) => themed.includes(s.theme));
    if (filtered.length > 0) candidates = filtered;
  }

  // Seed by date so the same passage shows all day
  const dayNum = Math.floor(new Date(todayIso + "T00:00:00").getTime() / 86_400_000);
  const passage = candidates[dayNum % candidates.length];
  return {
    passage,
    hint: themed.length > 0 ? themed[0] : null,
  };
}
