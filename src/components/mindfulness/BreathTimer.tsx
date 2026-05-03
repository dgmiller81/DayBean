"use client";
import { useEffect, useRef, useState } from "react";

type Phase = "Inhale" | "Hold" | "Exhale";
const SCRIPT: Array<{ phase: Phase; secs: number }> = [
  { phase: "Inhale", secs: 4 },
  { phase: "Hold",   secs: 7 },
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
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BREATH · 4–7–8
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div>
          <div className="serif" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
            {running ? phase : "Ready"}
          </div>
          <div className="serif" style={{ fontSize: "2.4rem", color: "var(--sage-deep)" }}>
            {running ? count : "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={running ? stop : start}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "10px 18px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 600,
            letterSpacing: ".08em",
          }}
        >
          {running ? "Stop" : "Start 4-7-8"}
        </button>
      </div>
    </div>
  );
}
