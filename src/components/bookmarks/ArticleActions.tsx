"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addBookmark, removeBookmarkByUrl, recordShare } from "@/server/actions/bookmarks";

export function ArticleActions({
  userId,
  url,
  title,
  source,
  excerpt,
  initialBookmarked = false,
}: {
  userId: string;
  url: string;
  title: string;
  source?: string;
  excerpt?: string;
  initialBookmarked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [shareNote, setShareNote] = useState<"" | "copied" | "shared" | "failed">("");
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const node = wrapRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const toggleBookmark = (e: React.MouseEvent) => {
    stop(e);
    if (bookmarked) {
      setBookmarked(false);
      startTransition(async () => {
        try {
          await removeBookmarkByUrl({ userId, url });
        } catch {
          setBookmarked(true);
        }
      });
    } else {
      setBookmarked(true);
      startTransition(async () => {
        try {
          await addBookmark({ userId, url, title, source, excerpt });
        } catch {
          setBookmarked(false);
        }
      });
    }
    setOpen(false);
  };

  const share = async (e: React.MouseEvent) => {
    stop(e);
    setOpen(false);
    type NavigatorWithShare = Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as NavigatorWithShare;
    let succeeded = false;
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        setShareNote("shared");
        succeeded = true;
      } catch {
        setShareNote("failed");
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setShareNote("copied");
        succeeded = true;
      } catch {
        setShareNote("failed");
      }
    } else {
      setShareNote("failed");
    }
    if (succeeded) {
      startTransition(async () => {
        try {
          await recordShare({ userId, url, title, source, excerpt });
        } catch {
          /* non-fatal — sharing UX already happened */
        }
      });
    }
    window.setTimeout(() => setShareNote(""), 1800);
  };

  return (
    <div className="article-actions" ref={wrapRef}>
      <button
        type="button"
        className={`article-actions-trigger${open ? " active" : ""}${bookmarked ? " bookmarked" : ""}`}
        onClick={(e) => {
          stop(e);
          setOpen((p) => !p);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Article actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title={bookmarked ? "Bookmarked" : "Bookmark or share"}
      >
        {bookmarked ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="5" cy="12" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="19" cy="12" r="1.4" />
          </svg>
        )}
      </button>

      {open && (
        <div className="article-actions-menu" role="menu" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" role="menuitem" onClick={toggleBookmark} disabled={pending}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {bookmarked ? "Remove bookmark" : "Bookmark"}
          </button>
          <button type="button" role="menuitem" onClick={share}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>
      )}

      {shareNote && (
        <span className="article-actions-toast" role="status">
          {shareNote === "copied" ? "Link copied" : shareNote === "shared" ? "Shared" : "Couldn't share"}
        </span>
      )}
    </div>
  );
}
