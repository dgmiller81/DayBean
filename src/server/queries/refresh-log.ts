import "server-only";
import { db } from "@/server/db";

export type LatestRefresh = {
  source: "manual" | "cron" | "cold-start";
  status: string;
  errorCode: string | null;
  errorDetail: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

/** Most recent RefreshLog row for this user (any iso, any status). */
export async function getLatestRefresh(userId: string): Promise<LatestRefresh | null> {
  const row = await db.refreshLog.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  });
  if (!row) return null;
  return {
    source: row.source as LatestRefresh["source"],
    status: row.status,
    errorCode: row.errorCode,
    errorDetail: row.errorDetail,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}
