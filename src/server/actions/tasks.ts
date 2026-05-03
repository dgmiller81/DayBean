"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Task, SectionOrGeneral } from "@/types";

const SectionOrGeneralSchema = z.enum(["general", "mindfulness", "business", "personal"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AddTaskInput = z.object({
  userId: z.string(),
  title: z.string().trim().min(1).max(200),
  section: SectionOrGeneralSchema,
});

export async function addTask(input: z.infer<typeof AddTaskInput>): Promise<Task> {
  const v = AddTaskInput.parse(input);
  const id = `t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const r = await db.task.create({
    data: { id, userId: v.userId, title: v.title, section: v.section },
  });
  revalidatePath("/");
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    section: r.section as SectionOrGeneral,
    done: r.done,
    createdAt: r.createdAt,
    completedOn: r.completedOn ?? null,
  };
}

const ToggleTaskInput = z.object({
  userId: z.string(),
  taskId: z.string(),
  iso: Iso,
});

export async function toggleTask(input: z.infer<typeof ToggleTaskInput>): Promise<void> {
  const v = ToggleTaskInput.parse(input);
  const t = await db.task.findFirst({ where: { id: v.taskId, userId: v.userId } });
  if (!t) throw new Error("Task not found");
  await db.task.update({
    where: { id: v.taskId },
    data: {
      done: !t.done,
      completedOn: !t.done ? v.iso : null,
    },
  });
  revalidatePath("/");
}

const DeleteTaskInput = z.object({ userId: z.string(), taskId: z.string() });
export async function deleteTask(input: z.infer<typeof DeleteTaskInput>): Promise<void> {
  const v = DeleteTaskInput.parse(input);
  const t = await db.task.findFirst({ where: { id: v.taskId, userId: v.userId } });
  if (!t) throw new Error("Task not found");
  await db.task.delete({ where: { id: v.taskId } });
  revalidatePath("/");
}
