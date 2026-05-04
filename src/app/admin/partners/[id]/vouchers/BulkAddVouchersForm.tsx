"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkAddVouchers } from "@/server/actions/admin-partners";

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const labelTextStyle: React.CSSProperties = { fontSize: 12, color: "var(--ink-soft)" };

/** YYYY-MM-DD in UTC for an `<input type="date">`. */
function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date input value -> ISO datetime at start-of-day UTC. */
function dateInputToISO(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

/** Next Monday (UTC) from `now`. If today is Monday, returns *next* Monday. */
function nextMondayUTC(now: Date = new Date()): Date {
  const out = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = out.getUTCDay(); // 0 = Sun ... 1 = Mon
  const daysUntilMonday = ((1 - dow + 7) % 7) || 7;
  out.setUTCDate(out.getUTCDate() + daysUntilMonday);
  return out;
}

/** 8 weeks (56 days) from today, UTC. */
function eightWeeksFromTodayUTC(now: Date = new Date()): Date {
  const out = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  out.setUTCDate(out.getUTCDate() + 56);
  return out;
}

export function BulkAddVouchersForm({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const defaults = useMemo(() => {
    const now = new Date();
    return {
      expiresAt: toDateInputValue(eightWeeksFromTodayUTC(now)),
      weekOf: toDateInputValue(nextMondayUTC(now)),
    };
  }, []);

  const [codesText, setCodesText] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaults.expiresAt);
  const [weekOf, setWeekOf] = useState(defaults.weekOf);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function parseCodes(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setDuplicates([]);

    const codes = parseCodes(codesText);
    if (codes.length === 0) {
      setError("Paste at least one code.");
      return;
    }
    if (codes.length > 1000) {
      setError(`Max 1000 codes per batch (got ${codes.length}).`);
      return;
    }
    if (codes.some((c) => c.length > 64)) {
      setError("Codes must be 64 characters or fewer.");
      return;
    }
    if (!expiresAt || !weekOf) {
      setError("Both expiresAt and weekOf are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkAddVouchers({
          partnerId,
          codes,
          expiresAt: dateInputToISO(expiresAt),
          weekOf: dateInputToISO(weekOf),
        });
        setOk(
          `Added ${res.added} voucher${res.added === 1 ? "" : "s"}.${
            res.duplicates.length
              ? ` Skipped ${res.duplicates.length} duplicate${
                  res.duplicates.length === 1 ? "" : "s"
                }.`
              : ""
          }`,
        );
        setDuplicates(res.duplicates);
        if (res.added > 0) setCodesText("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add vouchers.");
      }
    });
  }

  const lineCount = parseCodes(codesText).length;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelTextStyle}>Codes (one per line, max 1000)</span>
        <textarea
          value={codesText}
          onChange={(e) => setCodesText(e.target.value)}
          rows={8}
          required
          placeholder={"ABC123\nDEF456\n..."}
          style={{
            ...inputStyle,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
            resize: "vertical",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          {lineCount} non-empty line{lineCount === 1 ? "" : "s"}
        </span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>Expires at</span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>Week of (Monday UTC)</span>
          <input
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--rose)", fontSize: 13 }}>
          {error}
        </p>
      )}
      {ok && (
        <p role="status" style={{ margin: 0, color: "var(--sage)", fontSize: 13 }}>
          {ok}
        </p>
      )}
      {duplicates.length > 0 && (
        <details
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            background: "var(--surface-2)",
          }}
        >
          <summary style={{ fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>
            {duplicates.length} duplicate code{duplicates.length === 1 ? "" : "s"} skipped
          </summary>
          <ul
            style={{
              margin: "8px 0 0",
              padding: 0,
              listStyle: "none",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
              fontSize: 12,
              color: "var(--ink)",
              maxHeight: 160,
              overflow: "auto",
            }}
          >
            {duplicates.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {pending ? "Adding…" : "Add vouchers"}
        </button>
      </div>
    </form>
  );
}
