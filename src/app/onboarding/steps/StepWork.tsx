"use client";

import type { StepProps } from "../FirstPour";

export type { StepProps };

const STAGE_OPTIONS: { label: string; value: string }[] = [
  { label: "Pre-seed", value: "pre-seed" },
  { label: "Seed", value: "seed" },
  { label: "Series A", value: "series-a" },
  { label: "Series B+", value: "series-b-plus" },
  { label: "Public", value: "public" },
  { label: "Bootstrapped", value: "bootstrapped" },
  { label: "Solo", value: "solo" },
  { label: "—", value: "" },
];

/**
 * Step 2 — "What kind of work do you do?"
 *
 * Three fields: jobTitle (free text), industry (free text), companyStage
 * (single-select chips). All three are optional; the shell's Skip handles the
 * "I'd rather not say" case.
 */
export function StepWork({ data, onChange }: StepProps) {
  const inputStyle = {
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    color: "var(--ink)",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box" as const,
  };

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
        It&apos;s not a survey. We just don&apos;t want to feed you generic news.
      </p>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Job title</span>
        <input
          type="text"
          value={data.jobTitle}
          onChange={(e) => onChange({ jobTitle: e.target.value })}
          maxLength={120}
          placeholder='e.g. Founder, Carpenter, Designer at Figma'
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Industry</span>
        <input
          type="text"
          value={data.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
          maxLength={120}
          placeholder="e.g. B2B SaaS, construction, education"
          style={inputStyle}
        />
      </label>

      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Company stage</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STAGE_OPTIONS.map((opt) => {
            const selected = data.companyStage === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange({ companyStage: opt.value })}
                aria-pressed={selected}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: selected
                    ? "1px solid var(--sage)"
                    : "1px dashed var(--line)",
                  background: selected ? "var(--sage-soft)" : "transparent",
                  color: selected ? "var(--sage-deep)" : "var(--ink-soft)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
