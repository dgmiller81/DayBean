"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SideTab } from "./Fab";
import { setDrawerTab, type DrawerTab } from "@/server/actions/drawer";

const WIDTH_KEY = "mm_drawer_width";
const PIN_KEY = "mm_drawer_pinned";
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 420;

function clampWidth(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(n)));
}

export function TasksDrawer({
  openCount,
  initialTab,
  tasksContent,
  goalsContent,
  bookmarksContent,
  bookmarksCount,
  journalContent,
}: {
  openCount: number;
  initialTab: DrawerTab;
  tasksContent: ReactNode;
  goalsContent: ReactNode;
  bookmarksContent: ReactNode;
  bookmarksCount: number;
  journalContent: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const w = localStorage.getItem(WIDTH_KEY);
      if (w) setWidth(clampWidth(parseInt(w, 10)));
      const p = localStorage.getItem(PIN_KEY);
      if (p === "1") {
        setPinned(true);
        setOpen(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch {
      /* noop */
    }
    document.documentElement.style.setProperty("--drawer-width", `${width}px`);
  }, [width]);

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
    } catch {
      /* noop */
    }
    document.body.dataset.drawerPinned = pinned && open ? "1" : "0";
    return () => {
      delete document.body.dataset.drawerPinned;
    };
  }, [pinned, open]);

  useEffect(() => {
    if (!open || pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const node = asideRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // pointerdown so we close before downstream click handlers fire
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, pinned]);

  const switchTab = (next: DrawerTab) => {
    setTab(next);
    void setDrawerTab({ tab: next });
    try {
      sessionStorage.setItem("mm_drawer_tab", next);
    } catch {
      /* noop */
    }
  };

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = dragState.current.startX - e.clientX;
    setWidth(clampWidth(dragState.current.startWidth + dx));
  };

  const onResizeEnd = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const togglePin = () => {
    setPinned((prev) => {
      const next = !prev;
      if (next) setOpen(true);
      return next;
    });
  };

  return (
    <>
      <SideTab openCount={openCount} visible={!open} onOpen={() => setOpen(true)} />

      {!pinned && (
        <div
          className={`drawer-scrim${open ? " open" : ""}`}
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        ref={asideRef}
        className={`drawer-right${open ? " open" : ""}${pinned ? " pinned" : ""}`}
        role={pinned ? "complementary" : "dialog"}
        aria-label="Tasks and goals drawer"
        aria-hidden={!open}
        style={{ width: `${width}px` }}
      >
        <div
          className="drawer-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize drawer"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
        />

        <div className="drawer-handle">
          <h2 className="serif" style={{ fontSize: "1.15rem", margin: 0 }}>
            {tab === "tasks" ? "Today's tasks" : tab === "goals" ? "All goals" : "Bookmarks"}
          </h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              onClick={togglePin}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin drawer" : "Pin drawer"}
              title={pinned ? "Unpin drawer" : "Pin drawer"}
              className="drawer-iconbtn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: pinned ? "rotate(0deg)" : "rotate(45deg)" }}>
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14l-1.5-2.5V9a4 4 0 0 0-3-3.87V4h-1V3h-3v1h-1v1.13A4 4 0 0 0 6.5 9v5.5L5 17z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close drawer"
              className="drawer-iconbtn"
              style={{ fontSize: 20, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="drawer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="drawer-tab"
            aria-selected={tab === "tasks"}
            onClick={() => switchTab("tasks")}
          >
            Tasks{openCount > 0 ? ` · ${openCount}` : ""}
          </button>
          <button
            type="button"
            role="tab"
            className="drawer-tab"
            aria-selected={tab === "goals"}
            onClick={() => switchTab("goals")}
          >
            Goals
          </button>
          <button
            type="button"
            role="tab"
            className="drawer-tab"
            aria-selected={tab === "bookmarks"}
            onClick={() => switchTab("bookmarks")}
          >
            Bookmarks{bookmarksCount > 0 ? ` · ${bookmarksCount}` : ""}
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: tab === "tasks" ? "block" : "none" }}>{tasksContent}</div>
          <div style={{ display: tab === "goals" ? "block" : "none" }}>{goalsContent}</div>
          <div style={{ display: tab === "bookmarks" ? "block" : "none" }}>{bookmarksContent}</div>
        </div>

        <div className="drawer-footer">{journalContent}</div>
      </aside>
    </>
  );
}
