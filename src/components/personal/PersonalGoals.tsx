import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddPersonalGoalForm } from "./AddPersonalGoalForm";

export async function PersonalGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "personal"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Personal goals</div>
          <div className="card-title">Today's intentions</div>
        </div>
      </div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={goals}
        day={day}
        clicks={clicks}
        emptyMessage="No personal goals yet."
        footer={<AddPersonalGoalForm userId={userId} />}
      />
    </div>
  );
}
