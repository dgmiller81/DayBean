"use client";
import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "warm" | "forest" | "midnight";

const THEMES: Array<{ id: Theme; label: string }> = [
  { id: "light",    label: "Light" },
  { id: "dark",     label: "Dark" },
  { id: "warm",     label: "Warm" },
  { id: "forest",   label: "Forest" },
  { id: "midnight", label: "Midnight" },
];

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `mm_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Theme: ${current.label}. Click to change`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "var(--surface-solid)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 80 }}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              zIndex: 81,
              background: "var(--surface-solid)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-md)",
              padding: 4,
              minWidth: 140,
              display: "grid",
              gap: 2,
            }}
          >
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  style={{
                    background: active ? "var(--sage-soft)" : "transparent",
                    color: active ? "var(--sage-deep)" : "var(--ink)",
                    border: 0,
                    padding: "8px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    textAlign: "left",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
