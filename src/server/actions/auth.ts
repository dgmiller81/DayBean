"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { readEnv } from "@/server/env";
import { verifyPassword } from "@/server/auth/password";
import { setSessionUser, destroySession } from "@/server/auth/session";
import { localDefaultUserId } from "@/server/auth-context";

const SignInInput = z.object({
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
  if (!env.SIMPLE_PASSWORD_HASH) {
    return { error: "Server is not configured for password login" };
  }

  const parsed = SignInInput.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: "Password is required" };
  }

  const ok = await verifyPassword(env.SIMPLE_PASSWORD_HASH, parsed.data.password);
  if (!ok) {
    return { error: "Incorrect password" };
  }

  await setSessionUser(localDefaultUserId());
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
