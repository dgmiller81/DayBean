import "server-only";
import { readEnv } from "./env";

const KEY_LEN = 32;

export function runBootGuard(): void {
  const env = readEnv();

  // Validate APP_ENCRYPTION_KEY is 32 bytes (base64)
  let keyBytes = 0;
  try {
    keyBytes = Buffer.from(env.APP_ENCRYPTION_KEY, "base64").length;
  } catch {
    throw new Error("APP_ENCRYPTION_KEY: must be base64-encoded");
  }
  if (keyBytes !== KEY_LEN) {
    throw new Error(`APP_ENCRYPTION_KEY: must decode to ${KEY_LEN} bytes (got ${keyBytes})`);
  }

  // Railway deployments must NOT use AUTH_MODE=none (anyone could read+write the DB)
  if (env.DEPLOY_TARGET === "railway" && env.AUTH_MODE === "none") {
    throw new Error(
      "Railway deployments must use AUTH_MODE=simple or AUTH_MODE=full (got AUTH_MODE=none)",
    );
  }

  // simple/full modes need a signing secret
  if ((env.AUTH_MODE === "simple" || env.AUTH_MODE === "full") && !env.AUTH_SECRET) {
    throw new Error(`AUTH_MODE=${env.AUTH_MODE} requires AUTH_SECRET (32+ random bytes, base64)`);
  }

  // Railway needs CRON_SECRET so external cron triggers can authenticate
  if (env.DEPLOY_TARGET === "railway" && !env.CRON_SECRET) {
    throw new Error("DEPLOY_TARGET=railway requires CRON_SECRET");
  }

  // simple mode needs the password hash
  if (env.AUTH_MODE === "simple" && !env.SIMPLE_PASSWORD_HASH) {
    throw new Error(
      "AUTH_MODE=simple requires SIMPLE_PASSWORD_HASH — generate with: pnpm exec tsx scripts/hash-password.ts",
    );
  }
}
