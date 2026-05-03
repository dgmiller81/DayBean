"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  removeBookmark,
  togglePinBookmark,
  recordShare,
  reorderBookmarks,
} from "@/server/actions/bookmarks";

export type BookmarkItem = {
  id: string;
  url: string;
  title: string;
  source: string | null;
  isBookmarked: boolean;
  pinned: boolean;
  pinnedAt: string | null;
  sortOrder: number;
  shareCount: number;
  lastSharedAt: string | null;
  createdAt: string;
};

const RECENT_LIMIT = 5;
const MOST_LIMIT = 5;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function tsOf(s: string | null): number {
  return s ? new Date(s).getTime() : 0;
}

function splitSections(items: BookmarkItem[]) {
  const pinned = items
    .filter((b) => b.isBookmarked && b.pinned)
    .sort((a, b) => tsOf(b.pinnedAt) - tsOf(a.pinnedAt));

  const bookmarked = items
    .filter((b) => b.isBookmarked && !b.pinned)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return tsOf(b.createdAt) - tsOf(a.createdAt);
    });

  const sharedAll = items.filter((b) => b.shareCount > 0);
  const recentShared = [...sharedAll]
    .sort((a, b) => tsOf(b.lastSharedAt) - tsOf(a.lastSharedAt))
    .slice(0, RECENT_LIMIT);
  const mostShared = [...sharedAll]
    .sort((a, b) => b.shareCount - a.shareCount || tsOf(b.lastSharedAt) - tsOf(a.lastSharedAt))
    .slice(0, MOST_LIMIT);

  return { pinned, bookmarked, recentShared, mostShared };
}

export function BookmarksListClient({
  userId,
  initial,
}: {
  userId: string;
  initial: BookmarkItem[];
}) {
  const [items, setItems] = useState<BookmarkItem[]>(initial);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  // Re-sync from server whenever the parent re-renders with new initial data
  // (e.g. after addBookmark or recordShare from somewhere else triggers
  // revalidatePath). Without this the panel stayed frozen with stale state.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const sections = useMemo(() => splitSections(items), [items]);

  const optimistic = (updater: (items: BookmarkItem[]) => BookmarkItem[], action: () => Promise<void>) => {
    const prev = items;
    setItems(updater(items));
    startTransition(async () => {
      try {
        await action();
      } catch {
        setItems(prev);
      }
    });
  };

  const handleDelete = (id: string) => {
    optimistic(
      (xs) => xs.filter((b) => b.id !== id),
      () => removeBookmark({ userId, id }),
    );
  };

  const handleTogglePin = (id: string) => {
    optimistic(
      (xs) => xs.map((b) => (b.id === id ? { ...b, pinned: !b.pinned, pinnedAt: !b.pinned ? new Date().toISOString() : null } : b)),
      () => togglePinBookmark({ userId, id }),
    );
  };

  const handleShare = async (b: BookmarkItem) => {
    type NavigatorWithShare = Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as NavigatorWithShare;
    let succeeded = false;
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: b.title, url: b.url });
        succeeded = true;
      } catch {
        /* user cancelled or blocked */
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(b.url);
        succeeded = true;
      } catch {
        /* clipboard denied */
      }
    }
    if (succeeded) {
      const now = new Date().toISOString();
      optimistic(
        (xs) => xs.map((x) => (x.id === b.id ? { ...x, shareCount: x.shareCount + 1, lastSharedAt: now } : x)),
        () => recordShare({ userId, url: b.url, title: b.title, source: b.source ?? undefined }),
      );
    }
  };

  // Drag-reorder for the Bookmarked (non-pinned) section.
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* noop */
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDropOn = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ordered = sections.bookmarked.map((b) => b.id);
    const from = ordered.indexOf(dragId);
    const to = ordered.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = ordered.slice();
    next.splice(from, 1);
    next.splice(to, 0, dragId);

    setDragId(null);
    optimistic(
      (xs) => xs.map((b) => {
        const idx = next.indexOf(b.id);
        return idx >= 0 ? { ...b, sortOrder: idx } : b;
      }),
      () => reorderBookmarks({ userId, ids: next }),
    );
  };

  const isEmpty =
    sections.pinned.length === 0 &&
    sections.bookmarked.length === 0 &&
    sections.recentShared.length === 0 &&
    sections.mostShared.length === 0;

  if (isEmpty) {
    return (
      <div className="bookmarks-empty">
        Nothing saved yet. Hover any article and choose Bookmark or Share.
      </div>
    );
  }

  return (
    <div className="bookmarks-sections">
      {sections.pinned.length > 0 && (
        <Section title="Pinned">
          {sections.pinned.map((b) => (
            <BookmarkRow
              key={b.id}
              item={b}
              pending={pending}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onShare={handleShare}
            />
          ))}
        </Section>
      )}

      {sections.bookmarked.length > 0 && (
        <Section title="Bookmarked" hint="Drag to reorder">
          {sections.bookmarked.map((b) => (
            <BookmarkRow
              key={b.id}
              item={b}
              pending={pending}
              draggable
              isDragging={dragId === b.id}
              onDragStart={(e) => onDragStart(e, b.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDropOn(e, b.id)}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onShare={handleShare}
            />
          ))}
        </Section>
      )}

      {sections.recentShared.length > 0 && (
        <Section title="Recent Shared">
          {sections.recentShared.map((b) => (
            <BookmarkRow
              key={`r-${b.id}`}
              item={b}
              pending={pending}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onShare={handleShare}
              metaSuffix={b.lastSharedAt ? formatRelative(b.lastSharedAt) : undefined}
            />
          ))}
        </Section>
      )}

      {sections.mostShared.length > 0 && (
        <Section title="Most Shared">
          {sections.mostShared.map((b) => (
            <BookmarkRow
              key={`m-${b.id}`}
              item={b}
              pending={pending}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onShare={handleShare}
              metaSuffix={`${b.shareCount}×`}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bookmarks-section">
      <header className="bookmarks-section-head">
        <span className="bookmarks-section-title">{title}</span>
        {hint && <span className="bookmarks-section-hint">{hint}</span>}
      </header>
      <ul className="bookmarks-list">{children}</ul>
    </section>
  );
}

function BookmarkRow({
  item,
  pending,
  draggable,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDelete,
  onTogglePin,
  onShare,
  metaSuffix,
}: {
  item: BookmarkItem;
  pending: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onShare: (item: BookmarkItem) => void | Promise<void>;
  metaSuffix?: string;
}) {
  return (
    <li
      className={`bookmark-row${isDragging ? " dragging" : ""}${draggable ? " drag-handle" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="bookmark-link">
        <div className="bookmark-title">{item.title}</div>
        <div className="bookmark-meta">
          <span>{hostOf(item.url)}</span>
          {item.source && <span className="bookmark-source"> · {item.source}</span>}
          {metaSuffix && <span className="bookmark-meta-suffix"> · {metaSuffix}</span>}
        </div>
      </a>
      <div className="bookmark-actions">
        <button
          type="button"
          className="bookmark-icon"
          onClick={() => onShare(item)}
          aria-label="Share"
          title="Share"
          disabled={pending}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <button
          type="button"
          className={`bookmark-icon${item.pinned ? " active" : ""}`}
          onClick={() => onTogglePin(item.id)}
          aria-label={item.pinned ? "Unpin" : "Pin"}
          aria-pressed={item.pinned}
          title={item.pinned ? "Unpin" : "Pin"}
          disabled={pending}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={item.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14l-1.5-2.5V9a4 4 0 0 0-3-3.87V4h-1V3h-3v1h-1v1.13A4 4 0 0 0 6.5 9v5.5L5 17z" />
          </svg>
        </button>
        <button
          type="button"
          className="bookmark-icon danger"
          onClick={() => onDelete(item.id)}
          aria-label="Delete bookmark"
          title="Delete"
          disabled={pending}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString();
}
