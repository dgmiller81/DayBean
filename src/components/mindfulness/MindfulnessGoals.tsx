import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddGoalForm } from "./AddGoalForm";
import { TAB_LABELS } from "@/lib/constants";

export async function MindfulnessGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "mindfulness"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Daily intentions</div>
          <div className="card-title">{TAB_LABELS.mindfulness} goals</div>
        </div>
      </div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={goals}
        day={day}
        clicks={clicks}
        emptyMessage={`Add your first ${TAB_LABELS.mindfulness} goal to begin.`}
        footer={<AddGoalForm userId={userId} />}
      />
    </div>
  );
}
