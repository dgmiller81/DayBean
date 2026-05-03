import "server-only";
import { db } from "@/server/db";

export type JournalPage = "mindfulness" | "business" | "personal" | "overview";

export type JournalEntryRecord = {
  id: string;
  iso: string;
  page: JournalPage;
  content: string;
  createdAt: Date;
};

export async function listJournalEntries(
  userId: string,
  iso: string,
  page: JournalPage,
): Promise<JournalEntryRecord[]> {
  const rows = await db.journalEntry.findMany({
    where: { userId, iso, page },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    iso: r.iso,
    page: r.page as JournalPage,
    content: r.content,
    createdAt: r.createdAt,
  }));
}

export async function listJournalEntriesForDay(
  userId: string,
  iso: string,
): Promise<JournalEntryRecord[]> {
  const rows = await db.journalEntry.findMany({
    where: { userId, iso },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    iso: r.iso,
    page: r.page as JournalPage,
    content: r.content,
    createdAt: r.createdAt,
  }));
}

export async function journalCountsByDay(
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<Map<string, number>> {
  const rows = await db.journalEntry.groupBy({
    by: ["iso"],
    where: { userId, iso: { gte: fromIso, lte: toIso } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.iso, r._count._all);
  }
  return map;
}
