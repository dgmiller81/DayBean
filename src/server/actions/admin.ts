"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { getCurrentUserId } from "@/server/auth-context";
import { DEFAULT_GOALS, compositeGoalId } from "@/lib/default-goals";

async function requireAdmin(): Promise<string> {
  const userId = await getCurrentUserId();
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) {
    throw new Error("Forbidden");
  }
  return userId;
}

const CreateUserInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(512),
  name: z.string().trim().max(120).optional(),
});

export async function createUserAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Forbidden" };
  }

  const parsed = CreateUserInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "A user with that email already exists" };
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: { email, name: name ?? null, passwordHash, isAdmin: false },
  });

  await db.pref.create({ data: { userId: user.id } });

  for (const g of DEFAULT_GOALS) {
    await db.goal.create({
      data: {
        id: compositeGoalId(user.id, g.specId),
        userId: user.id,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
    });
  }

  revalidatePath("/admin");
  return { ok: `Created ${email}. Share their password with them.` };
}
