"use client";

import { useEffect } from "react";
import type { StepProps } from "../FirstPour";

export type { StepProps };

type ThemePreview = {
  id: string;
  label: string;
  bg: string;
  surface: string;
  sage: string;
  gold: string;
};

// Static color samples mirror the canonical token values from globals.css.
// Used purely for the preview card swatches. The live preview applied to
// document.documentElement still uses the real CSS variables — this just
// gives us a stable preview tile that doesn't depend on the active theme.
const THEMES: ThemePreview[] = [
  {
    id: "light",
    label: "Dawn",
    bg: "#f6efe4",
    surface: "#fffaf0",
    sage: "#5d7a6c",
    gold: "#b08d57",
  },
  {
    id: "dark",
    label: "Dusk",
    bg: "#131614",
    surface: "#1c211e",
    sage: "#95b3a2",
    gold: "#d3b070",
  },
  {
    id: "forest",
    label: "Forest",
    bg: "#0f1612",
    surface: "#152721",
    sage: "#a4c7b0",
    gold: "#dab87a",
  },
];

function formatHour(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

/**
 * Step 6 — Morning. Theme picker (3 cards, live-applied to
 * document.documentElement) plus a refresh-hour <select>. bgImageUrl is
 * intentionally omitted from onboarding — power-user setting in Settings.
 */
export function StepMorning({ data, onChange }: StepProps) {
  // On mount, ensure the document reflects whatever's already in state — that
  // way the live preview matches the picker's "selected" indicator from the
  // first paint of this step.
  useEffect(() => {
    if (typeof document !== "undefined" && data.theme) {
      document.documentElement.dataset.theme = data.theme;
    }
    // Run only once on mount; later picks are handled by pickTheme().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickTheme = (id: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = id;
    }
    onChange({ theme: id });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p
        style={{
          margin: 0,
          fontStyle: "italic",
          color: "var(--ink-soft)",
          fontSize: 13,
        }}
      >
        Pick the morning you want.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {THEMES.map((t) => {
          const isActive = data.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => pickTheme(t.id)}
              style={{
                display: "grid",
                gap: 10,
                padding: 12,
                borderRadius: "var(--radius-sm)",
                border: isActive
                  ? "2px solid var(--sage)"
                  : "1px solid var(--line)",
                background: isActive
                  ? "var(--surface-solid)"
                  : "var(--surface-2)",
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <div
                aria-hidden
                style={{
                  height: 64,
                  borderRadius: 8,
                  background: t.bg,
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "0 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    background: t.surface,
                  }}
                />
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: t.sage,
                  }}
                />
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: t.gold,
                  }}
                />
              </div>
              <span
                className="serif"
                style={{ fontSize: 15, fontWeight: 500, textAlign: "center" }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          Daily refresh hour
        </span>
        <select
          value={data.refreshHour}
          onChange={(e) => onChange({ refreshHour: parseInt(e.target.value, 10) })}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            maxWidth: 220,
          }}
        >
          {Array.from({ length: 24 }, (_, h) => h).map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          When DayBeans starts brewing your morning. We&apos;ll have it ready
          when you wake up.
        </span>
      </label>
    </div>
  );
}
