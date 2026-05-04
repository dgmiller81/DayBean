"use client";

import { useState } from "react";
import type { StepProps } from "../FirstPour";

export type { StepProps };

const SUGGESTIONS = [
  "photography",
  "woodworking",
  "gardening",
  "languages",
  "music",
  "baking",
  "hiking",
  "cycling",
  "running",
  "reading",
  "painting",
  "cooking",
  "yoga",
  "climbing",
  "gaming",
  "podcasting",
];

const MAX_HOBBIES = 24;

/**
 * Step 3 — "What are you growing into?"
 *
 * Tag picker with suggestion chips and a free-text Add input. Mirrors the
 * visual conventions of `HobbiesTab` so the same field looks the same in
 * onboarding and Settings.
 */
export function StepGrowing({ data, onChange, onNext }: StepProps) {
  const [draft, setDraft] = useState("");
  const hobbies = data.hobbies;

  const hasHobby = (v: string) =>
    hobbies.some((h) => h.toLowerCase() === v.toLowerCase());

  const addHobby = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (hasHobby(v)) return;
    if (hobbies.length >= MAX_HOBBIES) return;
    onChange({ hobbies: [...hobbies, v] });
  };

  const onAddDraft = () => {
    addHobby(draft);
    setDraft("");
  };

  const removeHobby = (h: string) => {
    onChange({ hobbies: hobbies.filter((x) => x !== h) });
  };

  const remainingSuggestions = SUGGESTIONS.filter((s) => !hasHobby(s));
  const atCap = hobbies.length >= MAX_HOBBIES;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p
        style={{
          margin: 0,
          fontStyle: "italic",
          color: "var(--ink-soft)",
          fontSize: 13,
        }}
      >
        This is the part where you put the hobbies you keep meaning to make time for.
      </p>

      <div>
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-soft)",
            display: "block",
            marginBottom: 4,
          }}
        >
          Your hobbies
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {hobbies.map((h) => (
            <span
              key={h}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--sage)",
                background: "var(--sage-soft)",
                color: "var(--sage-deep)",
                fontSize: 12,
              }}
            >
              {h}
              <button
                type="button"
                onClick={() => removeHobby(h)}
                aria-label={`Remove ${h}`}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
          {hobbies.length === 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              Nothing yet — pick a few below or type your own.
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) {
                  onAddDraft();
                } else {
                  onNext();
                }
              }
            }}
            maxLength={64}
            placeholder="e.g. pottery, jiu-jitsu, sourdough"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
          <button
            type="button"
            onClick={onAddDraft}
            disabled={!draft.trim() || atCap}
            style={{
              background: "var(--sage)",
              color: "white",
              border: 0,
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              cursor: !draft.trim() || atCap ? "default" : "pointer",
              opacity: !draft.trim() || atCap ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </div>

        {remainingSuggestions.length > 0 && !atCap && (
          <div>
            <span
              style={{
                fontSize: 11,
                color: "var(--ink-muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Suggestions
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {remainingSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addHobby(s)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px dashed var(--line)",
                    background: "transparent",
                    color: "var(--ink-soft)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {atCap && (
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            Cap reached ({MAX_HOBBIES}). Remove one to add another.
          </span>
        )}
      </div>
    </div>
  );
}
