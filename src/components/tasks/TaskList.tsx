import { listTasks } from "@/server/queries/tasks";
import { todayISO } from "@/lib/dates";
import { TaskRow } from "./TaskRow";
import { AddTaskForm } from "./AddTaskForm";

export async function TaskList({ userId }: { userId: string }) {
  const iso = todayISO();
  // listTasks already returns sorted (open by createdAt desc, done by completedOn desc)
  const tasks = await listTasks(userId);

  return (
    <div>
      <AddTaskForm userId={userId} />
      {tasks.length === 0 ? (
        <p style={{ color: "var(--ink-muted)", fontSize: 13, marginTop: 16 }}>
          No tasks yet. Add the first thing you want to remember today.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {tasks.map((t) => (
            <TaskRow key={t.id} userId={userId} iso={iso} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
