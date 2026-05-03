import "server-only";
import type { DailyContent } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";

/**
 * Phase 3: returns the fixture (same content regardless of user/iso).
 * Phase 6: reads from the DailyContent table keyed by (userId, iso); falls back
 *          to the fixture only if the user has no row yet (e.g. new users).
 */
export async function getDailyContent(_userId: string, iso: string): Promise<DailyContent> {
  return fixtureFor(iso);
}
