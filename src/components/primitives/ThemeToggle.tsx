"use client";
import { useEffect, useState } from "react";

export type Theme =
  | "light"
  | "dark"
  | "warm"
  | "forest"
  | "midnight"
  | "black"
  | "space"
  | "ai"
  | "snow"
  | "sepia"
  | "slate"
  | "crimson"
  | "aurora"
  | "steel"
  | "ember";

const DARK_THEMES = new Set<Theme>([
  "dark", "forest", "midnight", "black", "space", "ai",
  "slate", "crimson", "aurora", "steel", "ember",
]);

function isDark(t: Theme): boolean {
  return DARK_THEMES.has(t);
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `mm_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  const dark = isDark(theme);
  const next: Theme = dark ? "light" : "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
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
      {dark ? (
        // Sun — currently dark, click to go light
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon — currently light, click to go dark
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
