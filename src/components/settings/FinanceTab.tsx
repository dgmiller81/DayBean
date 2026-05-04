"use client";
import { useState } from "react";
import { setFinanceMode, setFinanceNumbers } from "@/server/actions/slow-sip";

const inputStyle = {
  padding: "8px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
} as const;

export function FinanceTab({
  initial,
}: {
  initial: {
    financeMode: boolean;
    netWorth: string | null;
    cashOnHand: string | null;
    savingsTarget: string | null;
  };
}) {
  const [enabled, setEnabled] = useState<boolean>(initial.financeMode);
  const [netWorth, setNetWorth] = useState(initial.netWorth ?? "");
  const [cashOnHand, setCashOnHand] = useState(initial.cashOnHand ?? "");
  const [savingsTarget, setSavingsTarget] = useState(initial.savingsTarget ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      const numbers = {
        netWorth: netWorth.trim().length > 0 ? netWorth : null,
        cashOnHand: cashOnHand.trim().length > 0 ? cashOnHand : null,
        savingsTarget: savingsTarget.trim().length > 0 ? savingsTarget : null,
      };
      await Promise.all([
        setFinanceMode({ enabled }),
        setFinanceNumbers({ numbers }),
      ]);
      setStatus("Saved.");
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  const disabledFields = !enabled;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
        Numbers you enter here are display-only. They never leave your account, and we never benchmark you against anyone else.
      </p>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
            Finance check-in
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Optional. Display strings only — we never connect to your bank.
          </span>
        </span>
      </label>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "4px 0" }} />

      <label style={{ display: "grid", gap: 4, opacity: disabledFields ? 0.5 : 1 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Net worth</span>
        <input
          type="text"
          value={netWorth}
          onChange={(e) => setNetWorth(e.target.value)}
          maxLength={64}
          disabled={disabledFields}
          placeholder="e.g. $420k"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 4, opacity: disabledFields ? 0.5 : 1 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Cash on hand</span>
        <input
          type="text"
          value={cashOnHand}
          onChange={(e) => setCashOnHand(e.target.value)}
          maxLength={64}
          disabled={disabledFields}
          placeholder="e.g. $32k"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 4, opacity: disabledFields ? 0.5 : 1 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Savings target</span>
        <input
          type="text"
          value={savingsTarget}
          onChange={(e) => setSavingsTarget(e.target.value)}
          maxLength={64}
          disabled={disabledFields}
          placeholder="e.g. $1m by 45"
          style={inputStyle}
        />
      </label>

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
        >Save</button>
        {status && <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{status}</span>}
      </div>
    </div>
  );
}
