"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Fab } from "./Fab";
import { setDrawerTab, type DrawerTab } from "@/server/actions/drawer";

export function TasksDrawer({
  openCount,
  initialTab,
  tasksContent,
  goalsContent,
}: {
  openCount: number;
  initialTab: DrawerTab;
  tasksContent: ReactNode;
  goalsContent: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const switchTab = (next: DrawerTab) => {
    setTab(next);
    void setDrawerTab({ tab: next });
    try {
      sessionStorage.setItem("mm_drawer_tab", next);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <Fab openCount={openCount} onOpen={() => setOpen(true)} />

      <div
        className={`drawer-scrim${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        className={`drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tasks and goals drawer"
        aria-hidden={!open}
      >
        <div className="drawer-handle">
          <h2 className="serif" style={{ fontSize: "1.15rem", margin: 0 }}>
            {tab === "tasks" ? "Today's tasks" : "All goals"}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close drawer"
            style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}
          >
            ×
          </button>
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
            All goals
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: tab === "tasks" ? "block" : "none" }}>{tasksContent}</div>
          <div style={{ display: tab === "goals" ? "block" : "none" }}>{goalsContent}</div>
        </div>
      </aside>
    </>
  );
}
