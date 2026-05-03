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
    <div className="stat-card">
      <div className="lbl">Success</div>
      <h3>Win of the day</h3>
      <textarea
        className="win-area"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setStatus("saving");
          persist(v);
        }}
        placeholder="One small thing you'll be proud of by tonight…"
        rows={4}
        maxLength={1000}
      />
      <div className="save-status">
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
