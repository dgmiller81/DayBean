import "server-only";
// S4-T01 — Pure-JS theme extraction for journal entries.
//
// Takes a list of recent journal entries and returns the top theme tokens
// with weights. Used by S4-T03 to upsert JournalTheme rows after every
// journal write, which then bias the LLM prompt for tomorrow's content.
//
// The pipeline is intentionally simple and dependency-free:
//   1. tokenize  — lowercase, split on non-letters, drop short tokens
//   2. stop-word filter (~80 common English fillers)
//   3. lemmatize — small set of English-suffix rules (no real stemmer)
//   4. tf-idf-ish weight per (entry, token)
//   5. exponential recency decay across entries (half-life ~7d)
//   6. aggregate, sort, top 12
//
// Pure: no DB, no I/O, no external deps — fully testable in isolation.

export type JournalEntryInput = {
  id: string;
  /** YYYY-MM-DD — used for recency decay. */
  iso: string;
  content: string;
};

export type ExtractedTheme = {
  theme: string;
  weight: number;
};

const MAX_THEMES = 12;
const MIN_WEIGHT = 0.01;
const RECENCY_HALF_LIFE_DAYS = 7;

const STOP = new Set<string>([
  "the", "and", "for", "with", "that", "this", "have", "has", "had",
  "will", "would", "could", "should", "but", "not", "you", "your",
  "yours", "them", "their", "there", "were", "was", "are", "been",
  "being", "very", "just", "like", "into", "over", "also", "more",
  "much", "many", "some", "any", "each", "every", "what", "when",
  "where", "who", "whom", "why", "how", "then", "than", "even",
  "only", "ever", "still", "both", "near", "far", "off", "around",
  "after", "before", "while", "during", "until", "between", "again",
  "however", "otherwise", "instead", "from", "about", "because",
  "they", "these", "those", "here", "which", "such", "make", "made",
]);

/**
 * Apply a small set of English-suffix rules to collapse simple inflections.
 * Intentionally fuzzy — a few mis-lemmatizations are acceptable.
 */
function lemmatize(token: string): string {
  if (token.length <= 3) return token;

  // worries -> worry  (only when length > 4)
  if (token.length > 4 && token.endsWith("ies")) {
    return token.slice(0, -3) + "y";
  }
  // worried -> worry
  if (token.endsWith("ied")) {
    return token.slice(0, -3) + "y";
  }
  // passes -> pass, boxes -> box, etc.
  if (
    token.endsWith("ses") ||
    token.endsWith("xes") ||
    token.endsWith("zes") ||
    token.endsWith("ches") ||
    token.endsWith("shes")
  ) {
    return token.slice(0, -2);
  }
  // testing -> test
  if (token.length > 5 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }
  // tested -> test; freed -> free (strip extra `e` if result ends in `ee`)
  if (token.length > 4 && token.endsWith("ed")) {
    const base = token.slice(0, -2);
    if (base.endsWith("ee")) return base.slice(0, -1);
    return base;
  }
  // simple plural: tests -> test, but keep ss/us/is endings
  if (
    token.length > 3 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is")
  ) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(content: string): string[] {
  const raw = content.toLowerCase().split(/[^a-z]+/);
  const out: string[] = [];
  for (const t of raw) {
    if (t.length < 3) continue;
    if (STOP.has(t)) continue;
    const lem = lemmatize(t);
    if (lem.length < 3) continue;
    if (STOP.has(lem)) continue;
    out.push(lem);
  }
  return out;
}

/** Days between two YYYY-MM-DD strings (a - b), floored at 0. */
function ageDays(todayIso: string, entryIso: string): number {
  const t = Date.parse(todayIso + "T00:00:00Z");
  const e = Date.parse(entryIso + "T00:00:00Z");
  if (!Number.isFinite(t) || !Number.isFinite(e)) return 0;
  const days = (t - e) / (1000 * 60 * 60 * 24);
  return Math.max(0, days);
}

/** Capitalize for display: "worry" -> "Worry". */
function capitalize(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1).toLowerCase();
}

export function extractThemes(
  entries: JournalEntryInput[],
  todayIso: string,
): ExtractedTheme[] {
  if (entries.length === 0) return [];

  const N = entries.length;

  // Per-entry tokenization + tf
  type PerEntry = { tokens: string[]; tf: Map<string, number>; iso: string };
  const perEntry: PerEntry[] = entries.map((entry) => {
    const tokens = tokenize(entry.content);
    const counts = new Map<string, number>();
    for (const tok of tokens) counts.set(tok, (counts.get(tok) ?? 0) + 1);
    const total = tokens.length;
    const tf = new Map<string, number>();
    if (total > 0) {
      for (const [tok, c] of counts) tf.set(tok, c / total);
    }
    return { tokens, tf, iso: entry.iso };
  });

  // Document frequency: how many entries contain each token
  const df = new Map<string, number>();
  for (const pe of perEntry) {
    const seen = new Set(pe.tokens);
    for (const tok of seen) df.set(tok, (df.get(tok) ?? 0) + 1);
  }

  // Aggregate weights: sum over entries of tf * idf * decay
  const weights = new Map<string, number>();
  for (const pe of perEntry) {
    const decay = Math.exp(-ageDays(todayIso, pe.iso) / RECENCY_HALF_LIFE_DAYS);
    for (const [tok, freq] of pe.tf) {
      const dfTok = df.get(tok) ?? 1;
      const idf = Math.log(1 + N / dfTok);
      const contribution = freq * idf * decay;
      weights.set(tok, (weights.get(tok) ?? 0) + contribution);
    }
  }

  const ranked: ExtractedTheme[] = [];
  for (const [tok, w] of weights) {
    if (w < MIN_WEIGHT) continue;
    ranked.push({ theme: capitalize(tok), weight: w });
  }
  ranked.sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, MAX_THEMES);
}
