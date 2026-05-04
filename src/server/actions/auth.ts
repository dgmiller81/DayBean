"use server";

import { cookies } from "next/headers";
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

// S6-T05 — non-security cookie that the edge middleware reads to gate the
// onboarding redirect. Mirrors the option-shape used for db_theme.
const ONBOARDED_COOKIE = "db_onboarded";
const ONE_YEAR = 60 * 60 * 24 * 365;

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

  // S6-T05: edge-readable signal that this user has finished onboarding. Only
  // written when onboardedAt is set; if it's null we deliberately leave the
  // cookie absent so middleware redirects to /onboarding.
  const c = await cookies();
  if (user.onboardedAt) {
    c.set(ONBOARDED_COOKIE, "1", {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: false,
    });
  } else {
    // Defensive: if a stale cookie says "onboarded" but the DB says otherwise,
    // clear it so the onboarding gate fires.
    c.delete(ONBOARDED_COOKIE);
  }

  redirect(user.onboardedAt ? "/" : "/onboarding");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  // S6-T05: clear the onboarded gate cookie so the next login re-evaluates it
  // from the DB. Avoids a stale cookie sticking around across user switches.
  const c = await cookies();
  c.delete(ONBOARDED_COOKIE);
  redirect("/login");
}
