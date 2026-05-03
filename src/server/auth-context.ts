import "server-only";

const LOCAL_DEFAULT_USER_ID = "local-default";

/**
 * Phase 2: returns the seeded local user.
 * Phase 7: replaced with Auth.js session lookup; throws if unauthenticated.
 */
export async function getCurrentUserId(): Promise<string> {
  return LOCAL_DEFAULT_USER_ID;
}

export function localDefaultUserId(): string {
  return LOCAL_DEFAULT_USER_ID;
}
