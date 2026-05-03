import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { readEnv } from "@/server/env";

export type SessionData = {
  userId?: string;
  signedInAt?: number;
};

const COOKIE_NAME = "mm_session";

function sessionOptions(): SessionOptions {
  const env = readEnv();
  if (!env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET required for sessions");
  }
  return {
    password: env.AUTH_SECRET,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      secure: env.DEPLOY_TARGET === "railway",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const c = await cookies();
  return getIronSession<SessionData>(c, sessionOptions());
}

export async function setSessionUser(userId: string): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.signedInAt = Date.now();
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
