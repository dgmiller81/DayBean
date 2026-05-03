import "server-only";
import { db } from "@/server/db";
import type { Task, SectionOrGeneral } from "@/types";

export async function listTasks(userId: string): Promise<Task[]> {
  const rows = await db.task.findMany({ where: { userId } });
  return rows
    .map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      section: r.section as SectionOrGeneral,
      done: r.done,
      createdAt: r.createdAt,
      completedOn: r.completedOn ?? null,
    }))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.done) return b.createdAt.getTime() - a.createdAt.getTime();
      const ac = a.completedOn ?? "";
      const bc = b.completedOn ?? "";
      return ac < bc ? 1 : ac > bc ? -1 : 0;
    });
}

export async function countOpenTasks(userId: string): Promise<number> {
  return db.task.count({ where: { userId, done: false } });
}
