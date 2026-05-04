"use client";

import { useEffect, useRef } from "react";
import type { StepProps } from "../FirstPour";

export type { StepProps };

/**
 * Step 1 — "What should we call you?"
 *
 * A single text input. Auto-focuses on mount. Pressing Enter advances to the
 * next step. The shell renders the Back/Skip/Next chrome around this; we only
 * own the body.
 */
export function StepName({ data, onChange, onNext }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input
        ref={inputRef}
        type="text"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onNext();
          }
        }}
        maxLength={120}
        placeholder="Your name"
        aria-label="Your name"
        className="serif"
        style={{
          padding: "14px 18px",
          fontSize: 22,
          textAlign: "center",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          color: "var(--ink)",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <p
        style={{
          margin: 0,
          color: "var(--ink-soft)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        We&apos;ll use this on the morning hero. You can change it any time in Settings.
      </p>
    </div>
  );
}
