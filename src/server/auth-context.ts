import "server-only";
import { readEnv } from "./env";
import { getSession } from "./auth/session";

const LOCAL_DEFAULT_USER_ID = "local-default";

export class UnauthenticatedError extends Error {
  constructor(message = "not authenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/**
 * Returns the current user's id.
 * - AUTH_MODE=none: returns "local-default"
 * - AUTH_MODE=simple: returns "local-default" if signed in, else throws
 * - AUTH_MODE=full: (deferred) — returns Auth.js session userId or throws
 */
export async function getCurrentUserId(): Promise<string> {
  const env = readEnv();

  if (env.AUTH_MODE === "none") {
    return LOCAL_DEFAULT_USER_ID;
  }

  if (env.AUTH_MODE === "simple") {
    const session = await getSession();
    if (!session.userId) {
      throw new UnauthenticatedError();
    }
    return session.userId;
  }

  // full mode: deferred — for now, fall through to local-default
  // (will be replaced when Auth.js wiring lands)
  return LOCAL_DEFAULT_USER_ID;
}

export function localDefaultUserId(): string {
  return LOCAL_DEFAULT_USER_ID;
}

/**
 * Non-throwing variant — returns null if not signed in (for layout/guard logic
 * that needs to redirect rather than crash).
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  try {
    return await getCurrentUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return null;
    throw e;
  }
}
