import "server-only";
// S4-T03 — Post-write hook called from the journal-save server actions.
// Two responsibilities:
//   1) Recompute the user's JournalTheme rows from the last 14 days.
//   2) Run intent detection on the just-written entry; insert SuggestedGoal
//      rows for any matched phrase that doesn't already have a pending or
//      accepted row with the same title.
//
// Failures are logged but never bubble up to the calling action — the user
// just saved their journal entry, a background-bias failure shouldn't surface.

import { db } from "@/server/db";
import { detectIntents } from "@/server/lib/intent-detection";
import { recomputeJournalThemes } from "@/server/actions/journal-themes";

export async function onJournalEntryWritten({
  userId,
  entryId,
  content,
}: {
  userId: string;
  entryId: string;
  content: string;
}): Promise<void> {
  // Theme recompute — wrapped in try/catch so a failure doesn't
  // bubble up to the journal-save action.
  try {
    await recomputeJournalThemes(userId);
  } catch (e) {
    console.error("[journal-hook] recomputeJournalThemes failed", {
      userId,
      error: (e as Error).message,
    });
  }

  try {
    const drafts = detectIntents(content);
    if (drafts.length === 0) return;

    // Skip drafts whose title already has a pending or accepted suggestion.
    const existingTitles = new Set(
      (
        await db.suggestedGoal.findMany({
          where: { userId, status: { in: ["pending", "accepted"] } },
          select: { title: true },
        })
      ).map((r) => r.title.toLowerCase()),
    );

    const fresh = drafts.filter((d) => !existingTitles.has(d.title.toLowerCase()));
    if (fresh.length === 0) return;

    await db.suggestedGoal.createMany({
      data: fresh.map((d) => ({
        userId,
        title: d.title,
        cadence: d.cadence,
        category: d.category,
        sourceJournalId: entryId,
        status: "pending",
      })),
    });
  } catch (e) {
    console.error("[journal-hook] intent detection / insert failed", {
      userId,
      entryId,
      error: (e as Error).message,
    });
  }
}
