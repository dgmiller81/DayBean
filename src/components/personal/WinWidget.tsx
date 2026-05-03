"use client";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setWin } from "@/server/actions/days";

export function WinWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: string;
}) {
  const [text, setText] = useState(initial ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const lastSavedAt = useRef<string>("");

  const persist = useDebouncedCallback(async (val: string) => {
    setStatus("saving");
    try {
      await setWin({ userId, iso, win: val });
      lastSavedAt.current = new Date().toLocaleTimeString();
      setStatus("saved");
    } catch {
      setStatus("");
    }
  }, 500);

  useEffect(() => {
    return () => {
      persist.cancel();
    };
  }, [persist]);

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        WIN OF THE DAY
      </div>
      <textarea
        className="win-area serif"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setStatus("saving");
          persist(v);
        }}
        placeholder="What worked today?"
        rows={4}
        maxLength={1000}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 12,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
          fontFamily: "Fraunces, Georgia, serif",
          fontStyle: "italic",
          fontSize: "1rem",
          lineHeight: 1.55,
          resize: "vertical",
        }}
      />
      <div className="save-status" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6, minHeight: 14 }}>
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
