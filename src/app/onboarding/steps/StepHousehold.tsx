"use client";

import type { StepProps } from "../FirstPour";
import type { HouseholdMember } from "@/types";

export type { StepProps };

const OPTIONS: { value: HouseholdMember; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "kids", label: "Kids" },
  { value: "parents", label: "Parents" },
  { value: "roommates", label: "Roommates" },
  { value: "alone", label: "Alone" },
];

/**
 * Step 4 — Household. Multi-select chips. "Alone" is mutually exclusive with
 * the other options (mirrors HouseholdTab UX).
 */
export function StepHousehold({ data, onChange }: StepProps) {
  const selected = data.livesWith;

  const toggle = (value: HouseholdMember) => {
    const has = selected.includes(value);
    let next: HouseholdMember[];
    if (value === "alone") {
      next = has ? [] : ["alone"];
    } else {
      const base = selected.filter((v) => v !== "alone");
      next = has ? base.filter((v) => v !== value) : [...base, value];
    }
    onChange({ livesWith: next });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => toggle(value)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: active ? "1px solid var(--sage)" : "1px solid var(--line)",
                background: active ? "var(--sage)" : "var(--surface-2)",
                color: active ? "white" : "var(--ink-soft)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 12 }}>
        You can pick more than one, or skip. We&apos;ll use this to bias Slow Sip
        articles.
      </p>
    </div>
  );
}
