"use client";
import { useEffect, useRef, useState } from "react";

type Phase = "Inhale" | "Hold" | "Exhale";
const SCRIPT: Array<{ phase: Phase; secs: number }> = [
  { phase: "Inhale", secs: 4 },
  { phase: "Hold", secs: 7 },
  { phase: "Exhale", secs: 8 },
];

export function BreathTimer() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("Inhale");
  const [count, setCount] = useState(SCRIPT[0].secs);
  const stepIx = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      tickRef.current += 1;
      const cur = SCRIPT[stepIx.current];
      const remaining = cur.secs - (tickRef.current % cur.secs);
      if (tickRef.current % cur.secs === 0) {
        stepIx.current = (stepIx.current + 1) % SCRIPT.length;
        const next = SCRIPT[stepIx.current];
        setPhase(next.phase);
        setCount(next.secs);
      } else {
        setCount(remaining);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    stepIx.current = 0;
    tickRef.current = 0;
    setPhase("Inhale");
    setCount(SCRIPT[0].secs);
    setRunning(true);
  };
  const stop = () => setRunning(false);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Practice</div>
          <div className="card-title">Breathe</div>
        </div>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: ".92rem", marginBottom: 14 }}>
        4 in, 7 hold, 8 out. One round at a stoplight resets your day.
      </p>
      {running && (
        <div style={{ marginBottom: 14, textAlign: "center" }}>
          <div className="serif" style={{ fontSize: "1.2rem", color: "var(--ink-soft)" }}>
            {phase}
          </div>
          <div className="serif" style={{ fontSize: "2.4rem", color: "var(--sage-deep)", lineHeight: 1 }}>
            {count}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={running ? stop : start}
        style={{
          background: "var(--sage)",
          color: "white",
          border: 0,
          borderRadius: 999,
          padding: "10px 20px",
          fontWeight: 600,
          fontSize: ".88rem",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <svg className="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          {running ? (
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          ) : (
            <polygon points="6 4 20 12 6 20 6 4" />
          )}
        </svg>
        <span>{running ? "Stop" : "Start 4-7-8"}</span>
      </button>
    </div>
  );
}
