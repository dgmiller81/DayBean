import "server-only";
import { db } from "@/server/db";

export type BookmarkRecord = {
  id: string;
  url: string;
  title: string;
  source: string | null;
  excerpt: string | null;
  isBookmarked: boolean;
  pinned: boolean;
  pinnedAt: Date | null;
  sortOrder: number;
  shareCount: number;
  lastSharedAt: Date | null;
  createdAt: Date;
};

function rowToRecord(r: {
  id: string;
  url: string;
  title: string;
  source: string | null;
  excerpt: string | null;
  isBookmarked: boolean;
  pinned: boolean;
  pinnedAt: Date | null;
  sortOrder: number;
  shareCount: number;
  lastSharedAt: Date | null;
  createdAt: Date;
}): BookmarkRecord {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    source: r.source,
    excerpt: r.excerpt,
    isBookmarked: r.isBookmarked,
    pinned: r.pinned,
    pinnedAt: r.pinnedAt,
    sortOrder: r.sortOrder,
    shareCount: r.shareCount,
    lastSharedAt: r.lastSharedAt,
    createdAt: r.createdAt,
  };
}

/**
 * Returns every Bookmark row for the user — covers all four sections in
 * the drawer (Pinned, Bookmarked, Recent Shared, Most Shared). The client
 * splits these into the four lists so a row that is both bookmarked AND
 * frequently shared can show in two sections.
 */
export async function listBookmarks(userId: string): Promise<BookmarkRecord[]> {
  const rows = await db.bookmark.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(rowToRecord);
}

export async function isBookmarked(userId: string, url: string): Promise<boolean> {
  const row = await db.bookmark.findUnique({
    where: { userId_url: { userId, url } },
    select: { isBookmarked: true },
  });
  return !!row?.isBookmarked;
}
