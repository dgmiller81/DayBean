import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddGoalAnyForm } from "@/components/goals/AddGoalAnyForm";
import { todayISO } from "@/lib/dates";

export async function AllGoalsList({ userId }: { userId: string }) {
  const iso = todayISO();
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div>
      <AddGoalAnyForm userId={userId} />
      <div style={{ marginTop: 12 }}>
        <GoalList
          userId={userId}
          iso={iso}
          goals={goals}
          day={day}
          clicks={clicks}
          showSectionDot
          emptyMessage="No goals yet. Use the form above to add the first one."
        />
      </div>
    </div>
  );
}
