"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";

export function AddPersonalGoalForm({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="add-goal-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setPending(true);
        try {
          await addGoal({ userId, section: "personal", title: title.trim(), type: "check", target: 1 });
          setTitle("");
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a personal goal…"
        maxLength={200}
      />
      <button type="submit" disabled={pending}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add
      </button>
    </form>
  );
}
