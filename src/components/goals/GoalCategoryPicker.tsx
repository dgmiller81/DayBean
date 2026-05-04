"use client";

import type { GoalCategory } from "@/types";

const CATEGORIES: Array<{ value: GoalCategory; label: string }> = [
  { value: "family", label: "Family" },
  { value: "finance", label: "Finance" },
  { value: "hobby", label: "Hobby" },
  { value: "fitness", label: "Fitness" },
  { value: "faith", label: "Faith" },
  { value: "work", label: "Work" },
];

export function GoalCategoryPicker({
  value,
  onChange,
}: {
  value: GoalCategory | null;
  onChange: (next: GoalCategory | null) => void;
}) {
  const chipBase = {
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 120ms, border-color 120ms, color 120ms",
  } as const;

  return (
    <div
      role="group"
      aria-label="Goal category"
      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
    >
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        style={{
          ...chipBase,
          background: value === null ? "var(--sage)" : "var(--surface-2)",
          border: `1px solid ${value === null ? "var(--sage)" : "var(--line)"}`,
          color: value === null ? "white" : "var(--ink-soft)",
        }}
      >
        None
      </button>
      {CATEGORIES.map((c) => {
        const selected = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(c.value)}
            style={{
              ...chipBase,
              background: selected ? "var(--sage)" : "var(--surface-2)",
              border: `1px solid ${selected ? "var(--sage)" : "var(--line)"}`,
              color: selected ? "white" : "var(--ink-soft)",
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
