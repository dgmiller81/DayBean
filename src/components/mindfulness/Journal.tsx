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
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Journal</div>
          <div className="card-title">My reflection for the day</div>
        </div>
      </div>
      <textarea
        className="notes"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        placeholder="One thing I'm grateful for, one thing I noticed, one thing to do better tomorrow… Mention themes like 'humility' or 'contentment' to bias future scriptures."
        maxLength={50_000}
      />
      <div className="save-status">{status}</div>
    </div>
  );
}
