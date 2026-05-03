"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";

export function AddGoalForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px dashed var(--line-strong)",
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          marginTop: 12,
          fontSize: 13,
        }}
      >
        + Add a mindfulness goal
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setPending(true);
        try {
          await addGoal({ userId, section: "mindfulness", title: title.trim(), type: "check", target: 1 });
          setTitle("");
          setOpen(false);
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "flex", gap: 8, marginTop: 12 }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A new daily check…"
        maxLength={200}
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
        type="submit"
        disabled={pending}
        style={{
          background: "var(--sage)",
          color: "white",
          border: 0,
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}
      >
        Cancel
      </button>
    </form>
  );
}
