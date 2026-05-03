"use client";
import { useState, useTransition } from "react";
import { setHealthFlag } from "@/server/actions/days";

type FlagKey = "slept" | "moved" | "ate";
const LABELS: Record<FlagKey, string> = {
  slept: "Slept 7h+",
  moved: "Moved 30m",
  ate: "Ate well",
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
    ate: !!initial.ate,
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
    <div className="stat-card">
      <div className="lbl">Health</div>
      <h3>Sleep · Move · Eat</h3>
      <div className="health-toggles">
        {(Object.keys(LABELS) as FlagKey[]).map((k) => {
          const on = state[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`health-toggle${on ? " on" : ""}`}
              aria-pressed={on}
            >
              <span aria-hidden>
                {on ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </span>
              <span className="lbl">{LABELS[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
