"use client";
import { useState } from "react";
import { muteJournalTheme } from "@/server/actions/journal-themes";
import { formatRelative } from "@/lib/relative-time";
import type { JournalTheme } from "@/types";

// S4-T04 — "What we heard" Settings tab.
//
// Shows the user's top journal themes (extracted in S4-T01, persisted in
// S4-T03) with a per-row mute toggle. The voice cue at the top is the
// privacy promise: themes are never the user's words.

const MAX_DISPLAY = 30;

type RowState = {
  muted: boolean;
  pending: boolean;
  error: string | null;
};

export function JournalThemesTab({ initial }: { initial: JournalTheme[] }) {
  const top = initial.slice(0, MAX_DISPLAY);
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const seed: Record<string, RowState> = {};
    for (const t of top) {
      seed[t.theme] = { muted: t.muted, pending: false, error: null };
    }
    return seed;
  });

  const onToggle = async (theme: string) => {
    const current = rows[theme];
    if (!current || current.pending) return;
    const next = !current.muted;
    // Optimistic flip.
    setRows((prev) => ({
      ...prev,
      [theme]: { muted: next, pending: true, error: null },
    }));
    try {
      await muteJournalTheme({ theme, muted: next });
      setRows((prev) => ({
        ...prev,
        [theme]: { muted: next, pending: false, error: null },
      }));
    } catch (e) {
      // Revert on failure.
      setRows((prev) => ({
        ...prev,
        [theme]: {
          muted: current.muted,
          pending: false,
          error: `Save failed: ${(e as Error).message}`,
        },
      }));
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <p
          style={{
            margin: 0,
            fontStyle: "italic",
            color: "var(--ink-soft)",
            fontSize: 13,
          }}
        >
          Themes only. We never include your words.
        </p>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>
          These are the words tomorrow&apos;s content listens to. Mute any that
          don&apos;t fit.
        </p>
      </div>

      {top.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "var(--ink-soft)",
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          We haven&apos;t heard anything yet. Write a few journal entries and
          check back.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
          }}
        >
          {top.map((t, idx) => {
            const state = rows[t.theme] ?? {
              muted: t.muted,
              pending: false,
              error: null,
            };
            return (
              <li
                key={t.id}
                style={{
                  padding: "12px 0",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line)",
                  opacity: state.muted ? 0.5 : 1,
                  transition: "opacity 120ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        textTransform: "capitalize",
                        color: "var(--ink)",
                        fontSize: 14,
                      }}
                    >
                      {t.theme}
                    </span>
                    <span
                      style={{
                        color: "var(--ink-muted)",
                        fontSize: 11,
                      }}
                    >
                      weight {t.weight.toFixed(2)}
                    </span>
                    {state.muted && (
                      <span
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 11,
                          fontStyle: "italic",
                        }}
                      >
                        (muted)
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      color: "var(--ink-muted)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatRelative(t.lastSeen)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(t.theme)}
                    disabled={state.pending}
                    aria-pressed={state.muted}
                    aria-label={
                      state.muted ? `Unmute ${t.theme}` : `Mute ${t.theme}`
                    }
                    style={{
                      background: state.muted
                        ? "transparent"
                        : "var(--sage-soft)",
                      color: state.muted ? "var(--ink-soft)" : "var(--sage-deep)",
                      border: `1px solid ${
                        state.muted ? "var(--line)" : "var(--sage)"
                      }`,
                      padding: "4px 12px",
                      borderRadius: 999,
                      cursor: state.pending ? "default" : "pointer",
                      opacity: state.pending ? 0.6 : 1,
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {state.muted ? "Unmute" : "Mute"}
                  </button>
                </div>
                {state.error && (
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--rust, #b04a3a)",
                      fontSize: 11,
                    }}
                  >
                    {state.error}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
