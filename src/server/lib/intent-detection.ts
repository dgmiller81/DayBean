import "server-only";
// S4-T02 — Regex-first intent detection for journal entries.
//
// Scans a single journal entry for phrases like "I want to...", "I keep...",
// "I should..." and produces draft SuggestedGoal objects. Used by S4-T03 to
// insert pending suggestions after every journal write.
//
// Pure JS — no LLM call in v1. Cap of 5 drafts per call to avoid spam from
// long entries. Overlapping matches are de-duplicated by preferring the
// longer (more specific) prefix.

export type DraftSuggestedGoal = {
  /** Short, action-y title. <= 200 chars. Always trimmed. */
  title: string;
  /** Inferred cadence ('daily' | 'weekly'). Defaults to 'daily' when ambiguous. */
  cadence: "daily" | "weekly";
  /** Category mapped to one of the GoalCategory enum values when inferable. */
  category: "family" | "finance" | "hobby" | "fitness" | "faith" | "work" | null;
  /** The matched phrase from the journal — for debugging / observability only. */
  matchedPhrase: string;
};

type Pattern = {
  /** Length of the prefix (e.g. "i want to " = 10). Used for overlap dedupe. */
  prefixLength: number;
  regex: RegExp;
};

// Patterns ordered roughly most-specific first; final dedupe pass uses
// `prefixLength` to choose the winner among overlapping matches.
const PATTERNS: Pattern[] = [
  { prefixLength: 10, regex: /\bi want to (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 12, regex: /\bi'd like to (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 13, regex: /\bi'm going to (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 7, regex: /\bi keep (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 9, regex: /\bi should (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 10, regex: /\bi need to (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 13, regex: /\bi'm trying to (.{3,200}?)(?=[.!?\n]|$)/gi },
  { prefixLength: 7, regex: /\bi want (.{3,200}?)(?=[.!?\n]|$)/gi },
];

const CATEGORY_PATTERNS: { category: NonNullable<DraftSuggestedGoal["category"]>; regex: RegExp }[] = [
  { category: "finance", regex: /\b(spend|spending|saving|budget|money|invest|debt|finances?)\b/i },
  { category: "fitness", regex: /\b(run|running|gym|workout|lift|lifting|train|training|cardio|stretch|yoga|exercise)\b/i },
  { category: "family", regex: /\b(kids?|wife|husband|partner|parents?|mom|dad|family|dinner|home)\b/i },
  { category: "hobby", regex: /\b(piano|guitar|paint|painting|read|reading|book|garden|gardening|practice)\b/i },
  { category: "faith", regex: /\b(pray|prayer|scripture|god|faith|meditat|silen)\b/i },
  { category: "work", regex: /\b(work|launch|ship|email|meeting|focus|deep work|deadline)\b/i },
];

const WEEKLY_HINT = /\b(weekly|every week|once a week|each week|on weekends?|days a week|times a week)\b/i;

const TRAILING_CONNECTOR = /\s+(?:and|but|because|so|then|though|although|while|since|or|yet)\s*$/i;

const MAX_DRAFTS = 5;
const MAX_TITLE_LEN = 200;

type RawMatch = {
  start: number;
  end: number;
  prefixLength: number;
  fullMatch: string;
  actionClause: string;
};

/**
 * Scan a single journal entry for intent phrases and return draft
 * SuggestedGoal objects. Pure-JS — no LLM call in v1.
 */
export function detectIntents(content: string): DraftSuggestedGoal[] {
  if (!content || content.length === 0) return [];

  // 1) Collect all matches across all patterns.
  const raw: RawMatch[] = [];
  for (const pattern of PATTERNS) {
    // Re-create per call (gi flag stateful via lastIndex).
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const fullMatch = m[0].trim();
      const actionClause = (m[1] ?? "").trim();
      if (actionClause.length === 0) continue;
      raw.push({
        start: m.index,
        end: m.index + m[0].length,
        prefixLength: pattern.prefixLength,
        fullMatch,
        actionClause,
      });
    }
  }

  if (raw.length === 0) return [];

  // 2) Overlap dedupe: when two matches share a span, prefer the longer prefix.
  // Sort by start asc, prefix desc; walk and skip any match whose span overlaps
  // a previously kept one — unless the new match has a longer prefix at the same
  // start, in which case it replaces the keeper.
  raw.sort((a, b) => (a.start - b.start) || (b.prefixLength - a.prefixLength));
  const kept: RawMatch[] = [];
  for (const m of raw) {
    const overlap = kept.find((k) => m.start < k.end && m.end > k.start);
    if (overlap) {
      if (m.prefixLength > overlap.prefixLength && m.start === overlap.start) {
        const idx = kept.indexOf(overlap);
        kept[idx] = m;
      }
      continue;
    }
    kept.push(m);
  }

  // 3) Build drafts, capped at MAX_DRAFTS.
  const drafts: DraftSuggestedGoal[] = [];
  for (const m of kept) {
    const draft = buildDraft(content, m);
    if (draft) drafts.push(draft);
    if (drafts.length >= MAX_DRAFTS) break;
  }
  return drafts;
}

function buildDraft(source: string, m: RawMatch): DraftSuggestedGoal | null {
  // Strip trailing connectors ("...running and", "...phone but").
  let clause = m.actionClause.trim();
  for (let i = 0; i < 3; i++) {
    const next = clause.replace(TRAILING_CONNECTOR, "").trim();
    if (next === clause) break;
    clause = next;
  }

  // Quality filter: need >= 2 word characters of content.
  const wordChars = clause.replace(/[^A-Za-z0-9]/g, "");
  if (wordChars.length < 2) return null;

  // Capitalize first letter only; rest preserves original case.
  const title = (clause.charAt(0).toUpperCase() + clause.slice(1)).slice(0, MAX_TITLE_LEN).trim();

  // Cadence: check matched phrase + a small window of surrounding text.
  const windowStart = Math.max(0, m.start - 40);
  const windowEnd = Math.min(source.length, m.end + 40);
  const surrounding = source.slice(windowStart, windowEnd);
  const cadence: "daily" | "weekly" = WEEKLY_HINT.test(surrounding) ? "weekly" : "daily";

  // Category: first match wins.
  let category: DraftSuggestedGoal["category"] = null;
  for (const c of CATEGORY_PATTERNS) {
    if (c.regex.test(clause)) {
      category = c.category;
      break;
    }
  }

  return {
    title,
    cadence,
    category,
    matchedPhrase: m.fullMatch,
  };
}
