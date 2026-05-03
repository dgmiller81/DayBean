import type { Task } from "@/types";
import { toggleTask, deleteTask } from "@/server/actions/tasks";
import { SectionDot } from "@/components/primitives/SectionDot";

export function TaskRow({
  userId,
  iso,
  task: t,
}: {
  userId: string;
  iso: string;
  task: Task;
}) {
  const toggleAction = toggleTask.bind(null, { userId, taskId: t.id, iso });
  const deleteAction = deleteTask.bind(null, { userId, taskId: t.id });

  return (
    <li
      className="task-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <form action={toggleAction}>
        <button
          type="submit"
          aria-label={t.done ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: "1.5px solid var(--sage)",
            background: t.done ? "var(--sage)" : "transparent",
            cursor: "pointer",
          }}
        />
      </form>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          fontSize: 11,
          color: "var(--ink-soft)",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
        }}
      >
        <SectionDot section={t.section} size={6} />
        {t.section}
      </span>

      <span
        style={{
          flex: 1,
          color: t.done ? "var(--ink-muted)" : "var(--ink)",
          textDecoration: t.done ? "line-through" : "none",
          fontSize: 14,
        }}
      >
        {t.title}
      </span>

      <form action={deleteAction}>
        <button
          type="submit"
          aria-label={`Delete ${t.title}`}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--ink-muted)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </form>
    </li>
  );
}
