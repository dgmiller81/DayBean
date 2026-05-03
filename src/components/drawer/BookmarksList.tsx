import { listBookmarks } from "@/server/queries/bookmarks";
import { BookmarksListClient, type BookmarkItem } from "./BookmarksListClient";

export async function BookmarksList({ userId }: { userId: string }) {
  const rows = await listBookmarks(userId);
  const initial: BookmarkItem[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    source: r.source,
    isBookmarked: r.isBookmarked,
    pinned: r.pinned,
    pinnedAt: r.pinnedAt ? r.pinnedAt.toISOString() : null,
    sortOrder: r.sortOrder,
    shareCount: r.shareCount,
    lastSharedAt: r.lastSharedAt ? r.lastSharedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
  return <BookmarksListClient userId={userId} initial={initial} />;
}
