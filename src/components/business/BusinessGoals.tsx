import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor } from "@/lib/progress";
import { toggleCheckGoal, incrementCountGoal, removeGoal } from "@/server/actions/goals";
import { AddBusinessGoalForm } from "./AddBusinessGoalForm";

export async function BusinessGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "business"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BUSINESS GOALS
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {goals.map((g) => {
          const p = progressFor(g, day, clicks);
          const done = p.pct >= 100;
          const toggleAction = toggleCheckGoal.bind(null, { userId, goalId: g.id, iso });
          const incrementAction = incrementCountGoal.bind(null, { userId, goalId: g.id, iso });
          const removeAction = removeGoal.bind(null, { userId, goalId: g.id });
          return (
            <li key={g.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              {g.type === "check" && (
                <form action={toggleAction}>
                  <button type="submit" aria-label={done ? "Mark incomplete" : "Mark complete"}
                    style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid var(--accent)",
                      background: done ? "var(--accent)" : "transparent", cursor: "pointer" }} />
                </form>
              )}
              {g.type === "count" && (
                <form action={incrementAction}>
                  <button type="submit"
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid var(--accent)",
                      background: done ? "var(--accent)" : "transparent",
                      color: done ? "white" : "var(--accent)", cursor: "pointer", minWidth: 56 }}>
                    {p.current}/{p.target}
                  </button>
                </form>
              )}
              <span style={{ flex: 1, color: done ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: done ? "line-through" : "none" }}>
                {g.title}
              </span>
              {!g.isDefault && (
                <form action={removeAction}>
                  <button type="submit" aria-label={`Remove ${g.title}`}
                    style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 16 }}>
                    ×
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      <AddBusinessGoalForm userId={userId} />
    </section>
  );
}
