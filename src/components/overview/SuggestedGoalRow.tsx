"use client";

// S4-T06 — One pending suggested goal, with accept/dismiss controls.
// Optimistic local hide on action; revert + show error line on failure.

import { useState, useTransition } from "react";
import {
  acceptSuggestedGoal,
  dismissSuggestedGoal,
} from "@/server/actions/suggested-goals";
import { chipForCategory, labelForCategory } from "@/lib/category-colors";
import type { SuggestedGoal, GoalCategory } from "@/types";

const KNOWN_CATEGORIES: GoalCategory[] = [
  "family",
  "finance",
  "hobby",
  "fitness",
  "faith",
  "work",
];

function asGoalCategory(c: string | null): GoalCategory | null {
  if (!c) return null;
  return (KNOWN_CATEGORIES as string[]).includes(c)
    ? (c as GoalCategory)
    : null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SuggestedGoalRow({
  suggestion,
}: {
  suggestion: SuggestedGoal;
}) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (hidden && !error) return null;

  const category = asGoalCategory(suggestion.category);
  const chip = category ? chipForCategory(category) : null;

  const onAccept = () => {
    setError(null);
    setHidden(true);
    startTransition(async () => {
      try {
        await acceptSuggestedGoal({ id: suggestion.id });
      } catch (e) {
        setHidden(false);
        setError(
          e instanceof Error ? e.message : "Couldn't add this goal — try again.",
        );
      }
    });
  };

  const onDismiss = () => {
    setError(null);
    setHidden(true);
    startTransition(async () => {
      try {
        await dismissSuggestedGoal({ id: suggestion.id });
      } catch (e) {
        setHidden(false);
        setError(
          e instanceof Error ? e.message : "Couldn't dismiss — try again.",
        );
      }
    });
  };

  return (
    <li
      style={{
        listStyle: "none",
        padding: "12px 0",
        borderTop: "1px solid var(--line)",
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif, var(--font-display, serif))",
          fontSize: 16,
          lineHeight: 1.35,
          color: "var(--ink)",
          fontWeight: 500,
        }}
      >
        {capitalize(suggestion.title)}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--ink-muted)",
        }}
      >
        <span style={{ textTransform: "capitalize" }}>{suggestion.cadence}</span>
        {category && chip && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              background: chip.bg,
              border: "1px solid",
              borderColor: chip.border,
              borderRadius: "var(--radius-sm)",
              color: chip.fg,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {labelForCategory(category)}
          </span>
        )}
        <span
          style={{
            fontStyle: "italic",
            color: "var(--ink-soft)",
          }}
        >
          Picked up from last night's journal.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={onAccept}
          disabled={pending}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={pending}
          style={{
            background: "transparent",
            color: "var(--ink-soft)",
            border: "1px solid var(--line)",
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontSize: 13,
          }}
        >
          Dismiss
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            fontSize: 12,
            color: "var(--danger, #b04a4a)",
          }}
        >
          {error}
        </div>
      )}
    </li>
  );
}
