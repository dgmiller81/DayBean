"use client";
import { useState } from "react";
import { setLivesWith } from "@/server/actions/slow-sip";
import { HouseholdMemberSchema, type HouseholdMember } from "@/types";

const OPTIONS: { value: HouseholdMember; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "kids", label: "Kids" },
  { value: "parents", label: "Parents" },
  { value: "roommates", label: "Roommates" },
  { value: "alone", label: "Alone" },
];

export function HouseholdTab({ initial }: { initial: { livesWith: string[] } }) {
  const [selected, setSelected] = useState<string[]>(initial.livesWith ?? []);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  const toggle = (value: HouseholdMember) => {
    setStatus("");
    setSelected((prev) => {
      const has = prev.includes(value);
      if (value === "alone") {
        // Clicking "alone" while it's selected deselects everything;
        // clicking "alone" while it's not selected makes it the only entry.
        return has ? [] : ["alone"];
      }
      // Clicking any other option while "alone" is selected clears "alone".
      const base = prev.filter((v) => v !== "alone");
      return has ? base.filter((v) => v !== value) : [...base, value];
    });
  };

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      const valid = selected.filter(
        (v): v is HouseholdMember => HouseholdMemberSchema.safeParse(v).success,
      );
      await setLivesWith({ livesWith: valid });
      setStatus("Saved.");
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
        Tells Slow Sip whose company shapes your week.
      </p>

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

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontWeight: 600,
          }}
        >
          Save
        </button>
        {status && <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{status}</span>}
      </div>
    </div>
  );
}
