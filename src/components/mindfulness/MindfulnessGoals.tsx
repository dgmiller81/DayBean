import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddGoalForm } from "./AddGoalForm";

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
          <div className="card-title">Mindfulness goals</div>
        </div>
      </div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={goals}
        day={day}
        clicks={clicks}
        emptyMessage="Add your first mindfulness goal to begin."
        footer={<AddGoalForm userId={userId} />}
      />
    </div>
  );
}
