import { TasksDrawer } from "./TasksDrawer";
import { TaskList } from "@/components/tasks/TaskList";
import { AllGoalsList } from "@/components/tasks/AllGoalsList";
import { countOpenTasks } from "@/server/queries/tasks";
import { getLastDrawerTab } from "@/server/queries/drawer";
import { getCurrentUserId } from "@/server/auth-context";

export async function DrawerHost() {
  const userId = await getCurrentUserId();
  const [openCount, lastTab] = await Promise.all([
    countOpenTasks(userId),
    getLastDrawerTab(),
  ]);

  return (
    <TasksDrawer
      openCount={openCount}
      initialTab={lastTab}
      tasksContent={<TaskList userId={userId} />}
      goalsContent={<AllGoalsList userId={userId} />}
    />
  );
}
