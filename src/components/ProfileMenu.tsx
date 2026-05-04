"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOutAction } from "@/server/actions/auth";
import { SettingsModal } from "./settings/SettingsModal";
import { HandEditModal } from "./content/HandEditModal";
import type { SettingsSummary } from "@/server/actions/settings";
import type { Theme } from "./primitives/ThemeToggle";
import type { DailyContent } from "@/types/daily-content";
import type { LatestRefresh } from "@/server/queries/refresh-log";

type Props = {
  name: string;
  initialTheme: Theme;
  settings: SettingsSummary;
  refreshStatusSlot?: ReactNode;
  iso: string;
  dailyContent: DailyContent;
  latestRefresh: LatestRefresh | null;
};

/**
 * Topbar profile menu — a single avatar button that opens a dropdown listing
 * the four entry points the user previously had as separate icons in the
 * topbar:
 *
 *   - Settings        → opens SettingsModal on its default tab
 *   - Edit content    → opens HandEditModal for today's iso
 *   - Themes          → opens SettingsModal on the "themes" tab directly
 *   - Sign out        → calls signOutAction (server action redirects to /login)
 *
 * The dropdown closes on Escape, on outside click, and after any item is
 * picked. Modals manage their own open state independently.
 */
export function ProfileMenu({
  name,
  initialTheme,
  settings,
  refreshStatusSlot,
  iso,
  dailyContent,
  latestRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape; close on outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  // Serialize Date → ISO string for the HandEditModal client child.
  const serializedRefresh = latestRefresh
    ? {
        ...latestRefresh,
        startedAt: latestRefresh.startedAt.toISOString(),
        finishedAt: latestRefresh.finishedAt?.toISOString() ?? null,
      }
    : null;

  const initial = (name || "").trim().charAt(0).toUpperCase() || "·";

  const openSettings = (tab?: string) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    setOpen(false);
  };
  const openEdit = () => {
    setEditOpen(true);
    setOpen(false);
  };

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Profile menu — signed in as ${name}`}
          title={name}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "var(--sage)",
            color: "white",
            border: "1px solid var(--line)",
            cursor: "pointer",
            fontFamily: "var(--font-fraunces, serif)",
            fontWeight: 500,
            fontSize: 15,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {initial}
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Profile menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 200,
              background: "var(--surface-solid)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-md)",
              padding: 6,
              display: "grid",
              gap: 2,
              zIndex: 50,
              fontSize: 13,
            }}
          >
            <div
              style={{
                padding: "6px 10px 8px",
                color: "var(--ink-soft)",
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--line)",
                marginBottom: 4,
              }}
            >
              {name}
            </div>
            <MenuItem onClick={() => openSettings()}>Settings</MenuItem>
            <MenuItem onClick={openEdit}>Edit content</MenuItem>
            <MenuItem onClick={() => openSettings("themes")}>Themes</MenuItem>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <form
              action={signOutAction}
              onSubmit={() => setOpen(false)}
              style={{ margin: 0 }}
            >
              <button
                type="submit"
                role="menuitem"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "transparent",
                  border: 0,
                  borderRadius: 4,
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      <SettingsModal
        initial={settings}
        initialTheme={initialTheme}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshStatusSlot={refreshStatusSlot}
        initialTab={settingsTab}
      />
      <HandEditModal
        iso={iso}
        initialContent={dailyContent}
        latestRefresh={serializedRefresh}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        background: "transparent",
        border: 0,
        borderRadius: 4,
        color: "var(--ink)",
        cursor: "pointer",
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}
