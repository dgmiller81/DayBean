import "server-only";
import { db } from "@/server/db";
import type { ClickCounts } from "@/types";

export async function getClicksForDay(userId: string, iso: string): Promise<ClickCounts> {
  const rows = await db.click.findMany({ where: { userId, iso } });
  const out: ClickCounts = { mindfulness: 0, business: 0, personal: 0 };
  for (const r of rows) {
    if (r.section === "mindfulness" || r.section === "business" || r.section === "personal") {
      out[r.section] = r.count;
    }
  }
  return out;
}
