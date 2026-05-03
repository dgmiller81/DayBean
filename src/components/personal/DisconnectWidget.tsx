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
    <div className="stat-card">
      <div className="lbl">Disconnect</div>
      <h3>Phone-down minutes</h3>
      <div style={{ marginTop: 14 }}>
        <div className="disc-mins">
          <span>{minutes}</span>
          <span>min today</span>
        </div>
        <div className="disc-buttons">
          {[15, 30, 60].map((m) => (
            <button key={m} type="button" className="disc-btn" onClick={() => add(m)}>
              +{m}
            </button>
          ))}
          <button type="button" className="disc-btn minus" onClick={subtractFifteen} aria-label="Subtract 15">
            −15
          </button>
        </div>
      </div>
    </div>
  );
}
