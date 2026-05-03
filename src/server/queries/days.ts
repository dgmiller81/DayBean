import "server-only";
import { db } from "@/server/db";
import type { DayRecord } from "@/types";
import { parseGoalsJson, parseHealthJson, parseFinJson } from "@/server/json";

export async function getDayOrEmpty(userId: string, iso: string): Promise<DayRecord> {
  const row = await db.day.findUnique({ where: { userId_iso: { userId, iso } } });
  if (!row) {
    return {
      iso,
      userId,
      goals: {},
      notes: "",
      health: {},
      disconnect: 0,
      win: "",
      fin: {},
    };
  }
  return {
    iso,
    userId,
    goals: parseGoalsJson(row.goalsJson),
    notes: row.notes,
    health: parseHealthJson(row.healthJson),
    disconnect: row.disconnect,
    win: row.win,
    fin: parseFinJson(row.finJson),
  };
}

export async function getDaysRange(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<DayRecord[]> {
  const rows = await db.day.findMany({
    where: { userId, iso: { gte: fromIso, lte: toIso } },
    orderBy: { iso: "asc" },
  });
  return rows.map((row) => ({
    iso: row.iso,
    userId: row.userId,
    goals: parseGoalsJson(row.goalsJson),
    notes: row.notes,
    health: parseHealthJson(row.healthJson),
    disconnect: row.disconnect,
    win: row.win,
    fin: parseFinJson(row.finJson),
  }));
}
