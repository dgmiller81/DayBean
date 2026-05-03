"use client";
import { useState } from "react";
import { addTask } from "@/server/actions/tasks";
import type { SectionOrGeneral } from "@/types";

const SECTIONS: Array<{ value: SectionOrGeneral; label: string }> = [
  { value: "general",     label: "General" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "business",    label: "Business" },
  { value: "personal",    label: "Personal" },
];

export function AddTaskForm({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<SectionOrGeneral>("general");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setPending(true);
        try {
          await addTask({ userId, title: title.trim(), section });
          setTitle("");
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you want to remember?"
        maxLength={200}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
        }}
      />
      <select
        value={section}
        onChange={(e) => setSection(e.target.value as SectionOrGeneral)}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
        }}
      >
        {SECTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <button
        type="submit"
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
      >
        Add
      </button>
    </form>
  );
}
