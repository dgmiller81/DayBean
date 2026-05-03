import "server-only";
import { getDaysRange } from "@/server/queries/days";
import { isoOffset } from "@/lib/dates";
import { themeWeights } from "@/lib/scripture-engine";

export type JournalSignal = {
  /** Theme names sorted by hit count (desc), e.g. ["Anxiety", "Trust"]. Empty if none. */
  themes: string[];
  /** Map of theme → hit count for the windowed journal text. */
  weights: Record<string, number>;
  /** Number of days in the window that had non-empty notes. */
  daysWithEntries: number;
  /** Total characters of journal text in the window (cap = WINDOW_DAYS × 50k). */
  totalChars: number;
  /**
   * Up to N short excerpts from the most-recent days (3 entries, 240 chars each).
   * Used as "soft bias" text — the LLM can quote a phrase but the prompt
   * instructs it to abstract not echo. Excerpts are NEVER persisted off-server.
   */
  recentExcerpts: string[];
};

const WINDOW_DAYS = 14;
const EXCERPT_COUNT = 3;
const EXCERPT_MAX_LEN = 240;

export async function getJournalSignal(userId: string, todayIso: string): Promise<JournalSignal> {
  const fromIso = isoOffset(todayIso, -(WINDOW_DAYS - 1));
  const days = await getDaysRange(userId, fromIso, todayIso);

  let totalChars = 0;
  let daysWithEntries = 0;
  const allText: string[] = [];
  // Walk newest → oldest so excerpts skew recent.
  const sorted = [...days].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  const excerpts: string[] = [];
  for (const d of sorted) {
    const t = (d.notes ?? "").trim();
    if (!t) continue;
    daysWithEntries += 1;
    totalChars += t.length;
    allText.push(t);
    if (excerpts.length < EXCERPT_COUNT) {
      excerpts.push(t.length > EXCERPT_MAX_LEN ? t.slice(0, EXCERPT_MAX_LEN - 1).trimEnd() + "…" : t);
    }
  }

  const joined = allText.join("\n").toLowerCase();
  const weights = themeWeights(joined);
  const themes = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  return { themes, weights, daysWithEntries, totalChars, recentExcerpts: excerpts };
}
