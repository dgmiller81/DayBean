import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { getFilter } from "@/server/queries/filter";
import { GoalList } from "@/components/goals/GoalList";

export async function MasterGoalList({ userId, iso }: { userId: string; iso: string }) {
  const [allGoals, day, clicks, filter] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
    getFilter(userId),
  ]);

  const visible = filter === "all" ? allGoals : allGoals.filter((g) => g.section === filter);

  return (
    <div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={visible}
        day={day}
        clicks={clicks}
        showSectionDot
        emptyMessage={
          filter === "all"
            ? "No goals tracked yet. Add some on each panel."
            : `No ${filter} goals. Add some from the ${filter} panel.`
        }
      />
    </div>
  );
}
