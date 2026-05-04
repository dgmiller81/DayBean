"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";
import type { Section, GoalType, GoalCategory } from "@/types";
import { GoalCategoryPicker } from "@/components/goals/GoalCategoryPicker";

const SECTIONS: Array<{ value: Section; label: string }> = [
  { value: "mindfulness", label: "Mindfulness" },
  { value: "business",    label: "Business" },
  { value: "personal",    label: "Personal" },
];

const TYPES: Array<{ value: GoalType; label: string }> = [
  { value: "check", label: "Check (yes/no)" },
  { value: "count", label: "Count (e.g. 3)" },
  { value: "time",  label: "Time (minutes)" },
];

export function AddGoalAnyForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<Section>("mindfulness");
  const [type, setType] = useState<GoalType>("check");
  const [target, setTarget] = useState(1);
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px dashed var(--line-strong)",
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        + Add goal across any section
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
          await addGoal({
            userId,
            section,
            title: title.trim(),
            type,
            target: type === "check" ? 1 : Math.max(1, target),
            category,
          });
          setTitle("");
          setTarget(1);
          setCategory(null);
          setOpen(false);
        } finally {
          setPending(false);
        }
      }}
      style={{
        display: "grid", gap: 8, padding: 12,
        border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title"
        maxLength={200}
        autoFocus
        style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
        >
          {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as GoalType)}
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number" min={1} max={999}
          value={target}
          onChange={(e) => setTarget(parseInt(e.target.value, 10) || 1)}
          disabled={type === "check"}
          aria-label="Target"
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)", opacity: type === "check" ? 0.5 : 1 }}
        />
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--ink-muted)", letterSpacing: 0.2 }}>Category</span>
        <GoalCategoryPicker value={category} onChange={setCategory} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          style={{
            background: "var(--sage)", color: "white", border: 0,
            padding: "8px 16px", borderRadius: "var(--radius-sm)",
            cursor: pending || !title.trim() ? "default" : "pointer",
            opacity: pending || !title.trim() ? 0.6 : 1,
            fontWeight: 600, flex: 1,
          }}
        >Add goal</button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); }}
          style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", padding: "8px 12px" }}
        >Cancel</button>
      </div>
    </form>
  );
}
