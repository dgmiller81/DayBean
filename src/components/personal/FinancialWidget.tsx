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
    net: initial.net ?? "",
    cash: initial.cash ?? "",
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
    <div className="stat-card">
      <div className="lbl">Financial</div>
      <h3>YNAB · USBank · IBKR</h3>
      <p style={{ fontSize: ".78rem", color: "var(--ink-muted)", marginTop: 6 }}>
        Manual until connectors are wired.
      </p>
      <div className="fin-inputs">
        {(["net", "cash", "invest"] as const).map((k) => (
          <label key={k}>
            {k.charAt(0).toUpperCase() + k.slice(1)}
            <input
              type="text"
              inputMode="decimal"
              value={fin[k]}
              onChange={(e) => update(k, e.target.value)}
              placeholder="$—"
              maxLength={32}
            />
          </label>
        ))}
      </div>
      <div className="save-status" style={{ marginTop: 8 }}>
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
