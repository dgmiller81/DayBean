"use client";

import { useEffect, useState, useTransition } from "react";
import { setThemePrefs } from "@/server/actions/settings";
import type { Theme } from "@/components/primitives/ThemeToggle";

const THEMES: Array<{ id: Theme; label: string; group: "Light" | "Dark" }> = [
  { id: "light",    label: "Light",      group: "Light" },
  { id: "snow",     label: "Snow White", group: "Light" },
  { id: "sepia",    label: "Sepia",      group: "Light" },
  { id: "warm",     label: "Warm",       group: "Light" },
  { id: "dark",     label: "Dark",       group: "Dark" },
  { id: "black",    label: "Black",      group: "Dark" },
  { id: "slate",    label: "Slate",      group: "Dark" },
  { id: "steel",    label: "Steel",      group: "Dark" },
  { id: "crimson",  label: "Crimson",    group: "Dark" },
  { id: "ember",    label: "Ember",      group: "Dark" },
  { id: "forest",   label: "Forest",     group: "Dark" },
  { id: "midnight", label: "Midnight",   group: "Dark" },
  { id: "space",    label: "Dark Space", group: "Dark" },
  { id: "aurora",   label: "Aurora",     group: "Dark" },
  { id: "ai",       label: "AI",         group: "Dark" },
];

function applyThemeNow(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // S1-T05 — db_theme is canonical; clear legacy mm_theme.
  document.cookie = `db_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  if (document.cookie.includes("mm_theme=")) {
    document.cookie = "mm_theme=; path=/; max-age=0; SameSite=Lax";
  }
}

function applyBgImageNow(url: string | null) {
  const el = document.documentElement;
  if (url && url.trim().length > 0) {
    el.style.setProperty("--bg-image", `url("${url.replace(/"/g, '\\"')}")`);
    el.dataset.bgImage = "1";
  } else {
    el.style.removeProperty("--bg-image");
    el.dataset.bgImage = "0";
  }
}

function applyOverlayNow(overlay: number) {
  const v = Math.max(0, Math.min(100, overlay)) / 100;
  document.documentElement.style.setProperty("--bg-overlay-opacity", String(v));
}

const KNOWN_THEMES: Theme[] = THEMES.map((t) => t.id);

function readLiveTheme(fallback: Theme): Theme {
  if (typeof document === "undefined") return fallback;
  // Prefer the value the html element is actually rendering — that survives
  // closing/reopening the settings modal even though the SSR-passed
  // `initialTheme` prop is the stale one from the initial page load.
  const live = document.documentElement.dataset.theme as Theme | undefined;
  if (live && KNOWN_THEMES.includes(live)) return live;
  // Fall back to the cookie if the dataset isn't set yet.
  // S1-T05 — accept either prefix.
  const m = document.cookie.match(/(?:^|;\s*)(?:db_theme|mm_theme)=([^;]+)/);
  if (m) {
    const cookied = decodeURIComponent(m[1]) as Theme;
    if (KNOWN_THEMES.includes(cookied)) return cookied;
  }
  return fallback;
}

export function ThemesTab({
  initialTheme,
  initialBgImageUrl,
  initialBgOverlay,
}: {
  initialTheme: Theme;
  initialBgImageUrl: string | null;
  initialBgOverlay: number;
}) {
  const [theme, setTheme] = useState<Theme>(() => readLiveTheme(initialTheme));
  const [bgUrl, setBgUrl] = useState(initialBgImageUrl ?? "");
  const [overlay, setOverlay] = useState(initialBgOverlay);
  const [pending, startTransition] = useTransition();

  // Keep CSS vars in sync with local state for instant preview.
  useEffect(() => { applyThemeNow(theme); }, [theme]);
  useEffect(() => { applyOverlayNow(overlay); }, [overlay]);

  const persistBg = (url: string) => {
    startTransition(async () => {
      try {
        await setThemePrefs({ bgImageUrl: url || null });
      } catch {
        /* ignore — preview is already applied */
      }
    });
  };

  const persistOverlay = (v: number) => {
    startTransition(async () => {
      try {
        await setThemePrefs({ bgOverlay: v });
      } catch {
        /* ignore */
      }
    });
  };

  const onPickTheme = (t: Theme) => {
    setTheme(t);
    /* theme stays cookie-only — no DB write needed (existing pattern) */
  };

  const onBgUrlChange = (val: string) => {
    setBgUrl(val);
    applyBgImageNow(val);
  };

  const onBgUrlCommit = () => {
    persistBg(bgUrl.trim());
  };

  const onClearBg = () => {
    setBgUrl("");
    applyBgImageNow(null);
    persistBg("");
  };

  const groups: Array<"Light" | "Dark"> = ["Light", "Dark"];

  return (
    <div className="themes-tab">
      <section className="themes-section">
        <h3 className="themes-h">Theme</h3>
        <p className="themes-sub">Pick the palette that drives the whole app.</p>
        {groups.map((g) => (
          <div key={g} className="themes-group">
            <div className="themes-group-label">{g}</div>
            <div className="themes-grid">
              {THEMES.filter((t) => t.group === g).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-card${theme === t.id ? " active" : ""}`}
                  data-theme-preview={t.id}
                  onClick={() => onPickTheme(t.id)}
                  aria-pressed={theme === t.id}
                >
                  <div className="theme-swatch" aria-hidden>
                    <span className="sw-bg" />
                    <span className="sw-card" />
                    <span className="sw-sage" />
                    <span className="sw-gold" />
                    <span className="sw-accent" />
                  </div>
                  <span className="theme-card-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="themes-section">
        <h3 className="themes-h">Background image</h3>
        <p className="themes-sub">
          Optional. Paste an https URL — the image sits behind everything and the
          theme color overlay sits on top of it.
        </p>
        <div className="themes-bg-row">
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com/wallpaper.jpg"
            value={bgUrl}
            onChange={(e) => onBgUrlChange(e.target.value)}
            onBlur={onBgUrlCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onBgUrlCommit();
              }
            }}
            className="themes-input"
          />
          <button
            type="button"
            className="themes-btn ghost"
            onClick={onClearBg}
            disabled={!bgUrl}
          >
            Clear
          </button>
        </div>

        <div className="themes-slider-row">
          <label htmlFor="bg-overlay" className="themes-slider-label">
            Theme overlay opacity
          </label>
          <div className="themes-slider-control">
            <input
              id="bg-overlay"
              type="range"
              min={0}
              max={100}
              value={overlay}
              onChange={(e) => setOverlay(parseInt(e.target.value, 10))}
              onMouseUp={() => persistOverlay(overlay)}
              onTouchEnd={() => persistOverlay(overlay)}
              onKeyUp={() => persistOverlay(overlay)}
              className="themes-slider"
            />
            <span className="themes-slider-val">{overlay}%</span>
          </div>
          <p className="themes-slider-hint">
            0% shows the image fully · 100% hides the image and shows only the theme color.
          </p>
        </div>

        {pending && <div className="themes-saving">Saving…</div>}
      </section>
    </div>
  );
}
