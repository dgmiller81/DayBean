import "server-only";
import { getDayOrEmpty, getDaysRange } from "@/server/queries/days";
import { isoOffset } from "@/lib/dates";
import { joinJournalText, pickScripture } from "@/lib/scripture-engine";
import type { Scripture } from "@/lib/scriptures";

export async function selectScriptureForUser(
  userId: string,
  iso: string
): Promise<{ passage: Scripture; hint: string | null }> {
  const sevenAgo = isoOffset(iso, -6);
  const days = await getDaysRange(userId, sevenAgo, iso);
  const todayDay = await getDayOrEmpty(userId, iso);
  const allNotes = [...days.map((d) => d.notes), todayDay.notes].filter(Boolean);
  return pickScripture(iso, joinJournalText(allNotes));
}
