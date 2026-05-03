import type { DailyContent } from "@/types/daily-content";

export interface LlmContext {
  userId: string;
  iso: string;
  name: string | null;
  jobTitle: string | null;
  bio: string | null;
  contentInterests: string[];
  /** Theme names sorted by hit count (desc). Empty if no journal hits. */
  recentJournalThemes: string[];
  /** Optional: theme name → hit count, for weighting context. */
  journalThemeWeights?: Record<string, number>;
  /** Up to 3 short recent journal excerpts (≤240 chars each). Soft bias only. */
  recentJournalExcerpts: string[];
  /** Days with notes in the last 14. 0 means "fall back to interests". */
  journalDaysWithEntries: number;
}

export interface LlmAdapter {
  generateDailyContent(ctx: LlmContext): Promise<DailyContent>;
  testConnection(ctx: Pick<LlmContext, "userId">): Promise<{ ok: true } | { ok: false; reason: string }>;
}
