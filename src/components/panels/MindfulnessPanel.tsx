import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";
import { toggleCheckGoal } from "@/server/actions/goals";

export async function MindfulnessPanel() {
  const userId = await getCurrentUserId();
  const today = todayISO();
  const [goals, day] = await Promise.all([
    listGoals(userId, "mindfulness"),
    getDayOrEmpty(userId, today),
  ]);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MINDFULNESS · GOALS PREVIEW
      </div>
      <h2 className="serif" style={{ fontSize: "1.35rem", fontWeight: 500, margin: "8px 0 0" }}>
        Phase 2 smoke test
      </h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {goals
          .filter((g) => g.type === "check")
          .map((g) => {
            const done = day.goals[g.id] === true;
            const toggleAction = toggleCheckGoal.bind(null, { userId, goalId: g.id, iso: today });
            return (
              <li
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <form action={toggleAction}>
                  <button
                    type="submit"
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: "1.5px solid var(--sage)",
                      background: done ? "var(--sage)" : "transparent",
                      cursor: "pointer",
                    }}
                  />
                </form>
                <span style={{
                  color: done ? "var(--ink-muted)" : "var(--ink)",
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {g.title}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
