import "server-only";
import { db } from "@/server/db";

/**
 * True iff at least one RefreshLog row exists for (userId, iso) — regardless
 * of status. Once we've ATTEMPTED a refresh today, we don't retry the
 * session-start path until the next ISO day rolls over. This prevents a
 * tight retry-loop when the LLM keeps failing (which would burn API credits
 * + spam logs).
 *
 * Manual refresh (the topbar button + the cron route) is NOT gated by this
 * check — the user can force another try whenever they want.
 */
export async function hasRefreshedToday(userId: string, iso: string): Promise<boolean> {
  const row = await db.refreshLog.findFirst({
    where: { userId, iso },
    select: { id: true },
  });
  return !!row;
}
