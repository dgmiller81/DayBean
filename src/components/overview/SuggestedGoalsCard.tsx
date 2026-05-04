// S4-T06 — Bean Count card surfacing pending journal-derived suggestions.
// Server component; renders nothing when there's nothing pending. Each row is
// a client component with accept / dismiss controls.

import { listSuggestedGoals } from "@/server/actions/suggested-goals";
import { SuggestedGoalRow } from "./SuggestedGoalRow";

export async function SuggestedGoalsCard() {
  const suggestions = await listSuggestedGoals();
  if (suggestions.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Picked up from your journal</div>
          <div className="card-title">Make these real?</div>
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {suggestions.map((s) => (
          <SuggestedGoalRow key={s.id} suggestion={s} />
        ))}
      </ul>
    </div>
  );
}
