"use client";
import { useState, useTransition } from "react";
import { setDisconnect } from "@/server/actions/days";
import { addTimeMinutes } from "@/server/actions/goals";
import { subtractFloor } from "@/lib/clamp";
import { compositeGoalId } from "@/lib/default-goals";

export function DisconnectWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: number;
}) {
  const [minutes, setMinutes] = useState<number>(initial ?? 0);
  const [, startTransition] = useTransition();

  function add(delta: number) {
    const prev = minutes;
    const next = prev + delta;
    setMinutes(next);
    startTransition(async () => {
      try {
        await addTimeMinutes({
          userId,
          goalId: compositeGoalId(userId, "g_disconnect"),
          iso,
          minutes: delta,
        });
      } catch {
        setMinutes(prev);
      }
    });
  }

  function subtractFifteen() {
    const prev = minutes;
    const next = subtractFloor(prev, 15);
    if (next === prev) return;
    setMinutes(next);
    startTransition(async () => {
      try {
        await setDisconnect({ userId, iso, minutes: next });
      } catch {
        setMinutes(prev);
      }
    });
  }

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DISCONNECT
      </div>
      <div className="serif" style={{ fontSize: "2.4rem", fontWeight: 500, color: "var(--ink)", marginTop: 6 }}>
        {minutes}
        <span style={{ fontSize: "0.95rem", color: "var(--ink-soft)", marginLeft: 6 }}>min</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {[15, 30, 60].map((m) => (
          <button key={m} type="button" onClick={() => add(m)}
            style={{
              padding: "6px 10px", borderRadius: 999,
              border: "1px solid var(--sage)", background: "transparent",
              color: "var(--sage-deep)", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
            +{m}
          </button>
        ))}
        <button type="button" onClick={subtractFifteen}
          aria-label="Subtract 15 minutes"
          style={{
            padding: "6px 10px", borderRadius: 999,
            border: "1px solid var(--line-strong)", background: "transparent",
            color: "var(--ink-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>
          −15
        </button>
      </div>
    </div>
  );
}
