import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddBusinessGoalForm } from "./AddBusinessGoalForm";

export async function BusinessGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "business"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Business goals</div>
          <div className="card-title">Today's intentions</div>
        </div>
      </div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={goals}
        day={day}
        clicks={clicks}
        emptyMessage="No business goals yet."
        footer={<AddBusinessGoalForm userId={userId} />}
      />
    </div>
  );
}
