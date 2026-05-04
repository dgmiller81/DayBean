import type { Goal, DayRecord, ClickCounts } from "@/types";
import { progressFor } from "@/lib/progress";
import { specIdFromCompositeId } from "@/lib/default-goals";
import {
  toggleCheckGoal,
  incrementCountGoal,
  removeGoal,
  addTimeMinutes,
} from "@/server/actions/goals";
import { SectionDot } from "@/components/primitives/SectionDot";
import { chipForCategory, labelForCategory } from "@/lib/category-colors";

export type GoalRowProps = {
  userId: string;
  iso: string;
  goal: Goal;
  day: DayRecord;
  clicks: ClickCounts;
  showSectionDot?: boolean;
  streak?: number;
};

export function GoalRow({
  userId,
  iso,
  goal: g,
  day,
  clicks,
  showSectionDot = false,
  streak = 0,
}: GoalRowProps) {
  const p = progressFor(g, day, clicks);
  const done = p.pct >= 100;
  const specId = specIdFromCompositeId(g.id);
  const isDisconnect = specId === "g_disconnect";

  const toggleAction = toggleCheckGoal.bind(null, { userId, goalId: g.id, iso });
  const incrementAction = incrementCountGoal.bind(null, { userId, goalId: g.id, iso });
  const addTimeAction = addTimeMinutes.bind(null, { userId, goalId: g.id, iso, minutes: 15 });
  const removeAction = removeGoal.bind(null, { userId, goalId: g.id });

  return (
    <div className={`goal${done && g.type === "check" ? " is-done" : ""}`}>
      {g.type === "check" && (
        <form action={toggleAction} style={{ display: "contents" }}>
          <button
            type="submit"
            className={`goal-check${done ? " done" : ""}`}
            aria-label={done ? "Mark incomplete" : "Mark complete"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </form>
      )}

      {g.type === "count" && (
        <form action={incrementAction} style={{ display: "contents" }}>
          <button
            type="submit"
            className={`goal-counter${done ? " done" : ""}`}
            aria-label={`Increment ${g.title}`}
          >
            {p.current}/{p.target}
          </button>
        </form>
      )}

      {g.type === "time" && !isDisconnect && (
        <form action={addTimeAction} style={{ display: "contents" }}>
          <button
            type="submit"
            className={`goal-counter${done ? " done" : ""}`}
            aria-label={`Add 15 minutes to ${g.title}`}
          >
            {p.current}/{p.target}m
          </button>
        </form>
      )}

      {g.type === "time" && isDisconnect && (
        <span className={`goal-counter gold${done ? " done" : ""}`}>
          {p.current}/{p.target}m
        </span>
      )}

      <span className="goal-name">
        {showSectionDot && <SectionDot section={g.section} />}
        {g.title}
        {g.category && (() => {
          const chip = chipForCategory(g.category);
          return (
            <span
              aria-label={`Category: ${labelForCategory(g.category)}`}
              title={labelForCategory(g.category)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 6,
                minWidth: 18,
                maxWidth: 24,
                height: 18,
                padding: "0 5px",
                background: chip.bg,
                border: "1px solid",
                borderColor: chip.border,
                borderRadius: "var(--radius-sm)",
                color: chip.fg,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {chip.letter}
            </span>
          );
        })()}
      </span>

      {streak > 0 && (
        <span className="streak-badge" aria-label={`${streak}-day streak`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z" />
          </svg>
          {streak}d
        </span>
      )}

      {!g.isDefault && (
        <form action={removeAction} style={{ display: "contents" }}>
          <button
            type="submit"
            className="goal-remove"
            aria-label={`Remove ${g.title}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
