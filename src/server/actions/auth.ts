"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { readEnv } from "@/server/env";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { setSessionUser, destroySession } from "@/server/auth/session";

const SignInInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(512),
});

export async function signInWithPasswordAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const env = readEnv();

  if (env.AUTH_MODE !== "simple") {
    return { error: "Password sign-in only available when AUTH_MODE=simple" };
  }

  const parsed = SignInInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Email and password are required" };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, onboardedAt: true },
  });

  // Don't reveal whether the email exists.
  if (!user || !user.passwordHash) {
    return { error: "Invalid email or password" };
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) {
    return { error: "Invalid email or password" };
  }

  await setSessionUser(user.id);
  redirect(user.onboardedAt ? "/" : "/onboarding");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
