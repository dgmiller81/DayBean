"use client";
import { useState } from "react";
import { saveJobInterests, setRefreshHour } from "@/server/actions/settings";

export function JobInterestsTab({
  initial,
}: {
  initial: { jobTitle: string | null; contentInterests: string[]; refreshHour: number };
}) {
  const [jobTitle, setJobTitle] = useState(initial.jobTitle ?? "");
  const [interests, setInterests] = useState<string[]>(initial.contentInterests);
  const [draft, setDraft] = useState("");
  const [hour, setHour] = useState(initial.refreshHour ?? 4);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  const addInterest = () => {
    const v = draft.trim();
    if (!v || interests.includes(v) || interests.length >= 40) return;
    setInterests((prev) => [...prev, v]);
    setDraft("");
  };

  const removeInterest = (i: string) => {
    setInterests((prev) => prev.filter((x) => x !== i));
  };

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      await Promise.all([
        saveJobInterests({ jobTitle: jobTitle.trim() || undefined, contentInterests: interests }),
        setRefreshHour({ hour }),
      ]);
      setStatus("Saved.");
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
        These bias the LLM's content selection — your role and topics you care about.
      </p>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Job title</span>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. CTO, designer, parent"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
          }}
        />
      </label>

      <div>
        <span style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
          Content interests
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {interests.map((i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--sage)",
                background: "var(--sage-soft)",
                color: "var(--sage-deep)",
                fontSize: 12,
              }}
            >
              {i}
              <button
                type="button"
                onClick={() => removeInterest(i)}
                aria-label={`Remove ${i}`}
                style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest();
              }
            }}
            maxLength={80}
            placeholder="e.g. AI strategy, contemplative theology"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={!draft.trim() || interests.length >= 40}
            style={{
              background: "var(--sage)",
              color: "white",
              border: 0,
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              cursor: !draft.trim() || interests.length >= 40 ? "default" : "pointer",
              opacity: !draft.trim() || interests.length >= 40 ? 0.5 : 1,
            }}
          >Add</button>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "4px 0" }} />

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          Daily refresh time (local hour)
        </span>
        <select
          value={hour}
          onChange={(e) => setHour(parseInt(e.target.value, 10))}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            maxWidth: 220,
          }}
        >
          {Array.from({ length: 24 }, (_, h) => h).map((h) => (
            <option key={h} value={h}>
              {h.toString().padStart(2, "0")}:00 — {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          Cron runs at this hour. If the server was off when the time passed and you load the dashboard later, content auto-refreshes once.
        </span>
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
