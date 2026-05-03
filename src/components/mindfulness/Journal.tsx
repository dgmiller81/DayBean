"use client";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setNotes } from "@/server/actions/days";

export function Journal({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string>("");

  const save = useDebouncedCallback(async (text: string) => {
    setStatus("saving…");
    try {
      await setNotes({ userId, iso, notes: text });
      const t = new Date();
      setStatus(`saved · ${t.toLocaleTimeString()}`);
    } catch {
      setStatus("save failed — retrying on next change");
    }
  }, 500);

  useEffect(() => {
    return () => {
      save.flush();
    };
  }, [save]);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        JOURNAL
      </div>
      <h2 className="serif" style={{ fontSize: "1.2rem", margin: "8px 0 12px" }}>
        Today's reflection
      </h2>
      <textarea
        className="serif notes"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        rows={6}
        placeholder="Mention themes (humility, anxious, contentment) — tomorrow's scripture adapts."
        maxLength={50_000}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: 12,
          fontSize: "1rem",
          lineHeight: 1.6,
          resize: "vertical",
          fontFamily: "var(--font-fraunces)",
        }}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: "var(--ink-muted)" }}>{status}</p>
    </div>
  );
}
