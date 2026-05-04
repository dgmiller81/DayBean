"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SettingsSummary } from "@/server/actions/settings";
import { ProfileTab } from "./ProfileTab";
import { LlmTab } from "./LlmTab";
import { JobInterestsTab } from "./JobInterestsTab";
import { ThemesTab } from "./ThemesTab";
import { HobbiesTab } from "./HobbiesTab";
import { HouseholdTab } from "./HouseholdTab";
import { FinanceTab } from "./FinanceTab";
import { JournalThemesTab } from "./JournalThemesTab";
import { PrivacyTab } from "./PrivacyTab";
import type { Theme } from "@/components/primitives/ThemeToggle";

type Tab =
  | "profile"
  | "llm"
  | "context"
  | "hobbies"
  | "household"
  | "finance"
  | "journal-themes"
  | "themes"
  // S7-T03 — account-deletion + privacy controls.
  | "privacy";

function isTab(s: string): s is Tab {
  return (
    s === "profile" ||
    s === "llm" ||
    s === "context" ||
    s === "hobbies" ||
    s === "household" ||
    s === "finance" ||
    s === "journal-themes" ||
    s === "themes" ||
    s === "privacy"
  );
}

export function SettingsModal({
  initial,
  initialTheme,
  open,
  onClose,
  refreshStatusSlot,
  initialTab,
}: {
  initial: SettingsSummary;
  initialTheme: Theme;
  open: boolean;
  onClose: () => void;
  refreshStatusSlot?: ReactNode;
  /** Which tab to open on. Defaults to "llm". The ProfileMenu uses this to
   *  jump straight to "themes" when the user picks the Themes menu item. */
  initialTab?: string;
}) {
  const [tab, setTab] = useState<Tab>(
    initialTab && isTab(initialTab) ? initialTab : "llm",
  );

  // When `initialTab` changes (e.g. user picks "Themes" from the profile menu
  // while the modal was already open), jump to that tab.
  useEffect(() => {
    if (initialTab && isTab(initialTab)) setTab(initialTab);
  }, [initialTab]);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const [spotlight, setSpotlight] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const animRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // First entry to Themes tab: run the entrance animation. The path swoops
  // in from the top-left, glides toward center descending only ~30px, then
  // curls down-left and back up to its rest position at (400, 400) — like
  // a "9" rotated onto its side and mirrored top-to-bottom. The path uses
  // Catmull-Rom interpolation through six waypoints so the loop reads as a
  // continuous curve instead of a kinked polyline.
  useLayoutEffect(() => {
    if (!open || tab !== "themes" || spotlight) return;
    const root = document.documentElement;

    // Waypoints in viewport pixel coords. Times below pace the path so the
    // first leg is "slow" (matches the user's "slowly hits 30px lower"),
    // the loop accelerates, and we ease out onto the final rest spot.
    const vw = window.innerWidth;
    const waypoints: Array<{ x: number; y: number }> = [
      { x: -160,             y: -80 },             // off-screen top-left
      { x: Math.round(vw / 2), y: 30 },             // hits 30px lower, near center
      { x: Math.round(vw * 0.62), y: 220 },         // entering the loop, right side
      { x: Math.round(vw * 0.55), y: 640 },         // bottom of the loop
      { x: 160,              y: 600 },              // curving back to the left
      { x: 100,              y: 470 },              // climbing up the inside of the loop
      { x: 400,              y: 400 },              // final rest position
    ];

    // Catmull-Rom for smooth interpolation through the points.
    const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      );
    };

    const clampIdx = (idx: number) =>
      Math.max(0, Math.min(waypoints.length - 1, idx));

    const sample = (t: number) => {
      const segCount = waypoints.length - 1;
      const ct = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
      const st = ct * segCount;
      const i = Math.max(0, Math.min(Math.floor(st), segCount - 1));
      const localT = st - i;
      const p0 = waypoints[clampIdx(i - 1)];
      const p1 = waypoints[clampIdx(i)];
      const p2 = waypoints[clampIdx(i + 1)];
      const p3 = waypoints[clampIdx(i + 2)];
      return {
        x: catmull(p0.x, p1.x, p2.x, p3.x, localT),
        y: catmull(p0.y, p1.y, p2.y, p3.y, localT),
      };
    };

    // ease-in-out cubic — slow on entry, accelerate through the loop, slow
    // settle onto the final point.
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const duration = 1900; // ms
    const startMs = performance.now();
    let alive = true;

    const tick = (now: number) => {
      if (!alive) return;
      const t = Math.min(1, Math.max(0, (now - startMs) / duration));
      const e = ease(t);
      const { x, y } = sample(e);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        root.style.setProperty("--spotlight-x", `${Math.round(x)}px`);
        root.style.setProperty("--spotlight-y", `${Math.round(y)}px`);
      }
      if (t < 1) {
        animRafRef.current = requestAnimationFrame(tick);
      } else {
        animRafRef.current = null;
        // Hand control over to React state so the user can drag from here.
        setSpotlight({ x: 400, y: 400 });
      }
    };
    animRafRef.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      if (animRafRef.current !== null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
    };
  }, [open, tab, spotlight]);

  // Push spotlight position to :root so the scrim mask + ring + banner all
  // read from one shared source. They live in different parts of the DOM so
  // a CSS variable inherited via :root keeps them in lockstep.
  useLayoutEffect(() => {
    if (!spotlight) return;
    const root = document.documentElement;
    root.style.setProperty("--spotlight-x", `${spotlight.x}px`);
    root.style.setProperty("--spotlight-y", `${spotlight.y}px`);
  }, [spotlight]);

  // Reset spotlight state and clear vars when the modal closes or the user
  // navigates away from the Themes tab, so reopening starts fresh.
  useEffect(() => {
    if (open && tab === "themes") return;
    setSpotlight(null);
    const root = document.documentElement;
    root.style.removeProperty("--spotlight-x");
    root.style.removeProperty("--spotlight-y");
  }, [open, tab]);

  // Drag handlers — attached to the ring + banner. setPointerCapture means
  // subsequent moves go to the same element even if the cursor leaves it.
  const onSpotlightPointerDown = (e: React.PointerEvent) => {
    if (!spotlight) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      offsetX: e.clientX - spotlight.x,
      offsetY: e.clientY - spotlight.y,
    };
  };
  const onSpotlightPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    setSpotlight({
      x: Math.round(e.clientX - dragRef.current.offsetX),
      y: Math.round(e.clientY - dragRef.current.offsetY),
    });
  };
  const onSpotlightPointerEnd = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  if (!open) return null;

  return (
    <>
      <div
        ref={scrimRef}
        aria-hidden
        onClick={onClose}
        className={`settings-scrim${tab === "themes" ? " spotlight" : ""}`}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,15,5,.6)",
          backdropFilter: "blur(2px)", zIndex: 90,
        }}
      />
      {tab === "themes" && (
        <>
          <div
            className="theme-spotlight-ring"
            role="button"
            tabIndex={-1}
            aria-label="Drag to reposition theme preview"
            onPointerDown={onSpotlightPointerDown}
            onPointerMove={onSpotlightPointerMove}
            onPointerUp={onSpotlightPointerEnd}
            onPointerCancel={onSpotlightPointerEnd}
          />
          <div
            className="theme-spotlight-banner"
            role="button"
            tabIndex={-1}
            aria-label="Drag to reposition theme preview"
            onPointerDown={onSpotlightPointerDown}
            onPointerMove={onSpotlightPointerMove}
            onPointerUp={onSpotlightPointerEnd}
            onPointerCancel={onSpotlightPointerEnd}
          >
            Theme preview
          </div>
        </>
      )}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="settings-modal"
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(720px, 92vw)", maxHeight: "86vh",
          background: "var(--surface-solid)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: 0,
          display: "grid", gridTemplateRows: "auto auto 1fr", gap: 0,
          zIndex: 91,
          overflow: "hidden",
        }}
      >
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--line)",
        }}>
          <h2 id="settings-title" className="serif" style={{ margin: 0, fontSize: "1.25rem" }}>
            Settings
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer", color: "var(--ink-muted)" }}
          >×</button>
        </header>

        <div role="tablist" style={{
          display: "flex", gap: 4, padding: "8px 12px",
          borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
        }}>
          {([
            { id: "llm", label: "LLM Provider" },
            { id: "profile", label: "Profile" },
            { id: "context", label: "Job & Interests" },
            { id: "hobbies", label: "Hobbies" },
            { id: "household", label: "Household" },
            { id: "finance", label: "Finance" },
            { id: "journal-themes", label: "What we heard" },
            { id: "themes", label: "Themes" },
            { id: "privacy", label: "Privacy" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 14px",
                border: "1px solid transparent",
                borderRadius: 999,
                background: tab === t.id ? "var(--sage)" : "transparent",
                color: tab === t.id ? "white" : "var(--ink-soft)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: "auto" }}>
          {tab === "llm" && <LlmTab initial={initial.credentials} envOverride={initial.envOverride} refreshStatusSlot={refreshStatusSlot} />}
          {tab === "profile" && <ProfileTab initial={{ name: initial.name, bio: initial.bio }} />}
          {tab === "context" && <JobInterestsTab initial={{ jobTitle: initial.jobTitle, contentInterests: initial.contentInterests, refreshHour: initial.refreshHour }} />}
          {tab === "hobbies" && <HobbiesTab initial={{ hobbies: initial.hobbies }} />}
          {tab === "household" && <HouseholdTab initial={{ livesWith: initial.livesWith }} />}
          {tab === "finance" && (
            <FinanceTab
              initial={{
                financeMode: initial.financeMode,
                netWorth: initial.netWorth,
                cashOnHand: initial.cashOnHand,
                savingsTarget: initial.savingsTarget,
              }}
            />
          )}
          {tab === "journal-themes" && <JournalThemesTab initial={initial.journalThemes} />}
          {tab === "themes" && (
            <ThemesTab
              initialTheme={initialTheme}
              initialBgImageUrl={initial.bgImageUrl}
              initialBgOverlay={initial.bgOverlay}
            />
          )}
          {tab === "privacy" && (
            <PrivacyTab
              initial={{ pendingDeletionAt: initial.pendingDeletionAt }}
            />
          )}
        </div>
      </div>
    </>
  );
}
