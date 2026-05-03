"use client";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setFinance } from "@/server/actions/days";

export function FinancialWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: { net?: string; cash?: string; invest?: string };
}) {
  const [fin, setFin] = useState({
    net:    initial.net    ?? "",
    cash:   initial.cash   ?? "",
    invest: initial.invest ?? "",
  });
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const lastSavedAt = useRef<string>("");

  const persist = useDebouncedCallback(async (next: typeof fin) => {
    setStatus("saving");
    try {
      await setFinance({ userId, iso, fin: next });
      lastSavedAt.current = new Date().toLocaleTimeString();
      setStatus("saved");
    } catch {
      setStatus("");
    }
  }, 500);

  function update(k: keyof typeof fin, v: string) {
    const next = { ...fin, [k]: v };
    setFin(next);
    setStatus("saving");
    persist(next);
  }

  useEffect(() => {
    return () => {
      persist.cancel();
    };
  }, [persist]);

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        FINANCIAL
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "4px 0 10px" }}>
        Manual until connectors are wired.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {(["net", "cash", "invest"] as const).map((k) => (
          <label key={k} style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "capitalize" }}>{k}</span>
            <input
              type="text"
              inputMode="decimal"
              value={fin[k]}
              onChange={(e) => update(k, e.target.value)}
              placeholder="$0"
              maxLength={32}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            />
          </label>
        ))}
      </div>
      <div className="save-status" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 8, minHeight: 14 }}>
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
