"use client";
import { useState, useTransition } from "react";
import { setHealthFlag } from "@/server/actions/days";

type FlagKey = "slept" | "moved" | "ate";
const LABELS: Record<FlagKey, string> = {
  slept: "Slept 7h+",
  moved: "Moved 30m",
  ate:   "Ate well",
};

export function HealthWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: { slept?: boolean; moved?: boolean; ate?: boolean };
}) {
  const [state, setState] = useState({
    slept: !!initial.slept,
    moved: !!initial.moved,
    ate:   !!initial.ate,
  });
  const [, startTransition] = useTransition();

  function toggle(key: FlagKey) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    startTransition(async () => {
      try {
        await setHealthFlag({ userId, iso, key, value: next });
      } catch {
        setState((s) => ({ ...s, [key]: !next }));
      }
    });
  }

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        HEALTH
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {(Object.keys(LABELS) as FlagKey[]).map((k) => {
          const on = state[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`health-toggle${on ? " on" : ""}`}
              aria-pressed={on}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: on ? "var(--sage-soft)" : "var(--surface-2)",
                color: "var(--ink)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13.5,
              }}
            >
              {on ? <CheckCircleSvg /> : <EmptyCircleSvg />}
              <span>{LABELS[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyCircleSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function CheckCircleSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
