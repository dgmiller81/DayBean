"use client";
import { useState } from "react";
import { saveProfile } from "@/server/actions/settings";

export function ProfileTab({
  initial,
}: {
  initial: { name: string; bio: string | null };
}) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  const onSave = async () => {
    if (pending || !name.trim()) return;
    setPending(true);
    setStatus("");
    try {
      await saveProfile({ name: name.trim(), bio: bio.trim() || undefined });
      setStatus("Saved.");
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Display name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
          }}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>About you (optional, for LLM context)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={2000}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-fraunces)",
            resize: "vertical",
          }}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !name.trim()}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: pending || !name.trim() ? "default" : "pointer",
            opacity: pending || !name.trim() ? 0.6 : 1,
            fontWeight: 600,
          }}
        >Save</button>
        {status && <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{status}</span>}
      </div>
    </div>
  );
}
