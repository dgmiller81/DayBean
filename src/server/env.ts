import "server-only";
import { z } from "zod";

const optStr = z.string().optional();

const Schema = z.object({
  DEPLOY_TARGET: z.enum(["local", "railway"]).default("local"),
  AUTH_MODE: z.enum(["none", "simple", "full"]).default("none"),
  AUTH_SECRET: z.string().min(16).optional(),
  APP_ENCRYPTION_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  SIMPLE_PASSWORD_HASH: optStr,
  ADMIN_EMAIL: optStr,

  // --- LLM env-var fallback (optional). Used only when the user has no
  //     per-user LlmCredential row. Lets you self-host with a single shared
  //     key in .env without going through the Settings UI.
  LLM_DEFAULT: optStr,            // "OpenAI" | "Anthropic" | "LM Studio" (case-insensitive)
  MODEL_DEFAULT: optStr,          // e.g. "gpt-4o"
  OPENAI_API_KEY: optStr,
  ANTHROPIC_API_KEY: optStr,
  LMSTUDIO_BASE_URL: optStr,      // override default http://localhost:1234/v1

  // Optional. Personal access token raises GitHub Search rate limits from
  // 10/min unauthenticated to 30/min. Used by getGitHubBuzz() for the
  // Business → "GitHub buzz" card.
  GITHUB_TOKEN: optStr,

  // --- Voucher email (S5-T05). Both optional — when RESEND_API_KEY is unset
  //     the email client logs the would-be email and returns a fake
  //     messageId, so the claim flow still works in dev / pre-launch.
  RESEND_API_KEY: optStr,
  EMAIL_FROM: optStr,            // e.g. "DayBeans <hello@daybeans.com>"

  // S0-T09 — Dual-run cost-graduation policy. Validated separately in
  // src/server/config.ts (default 'always'); listed here so the schema
  // accepts the value and so deploy docs have one place to read.
  PREBREW_POLICY: optStr,
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function readEnv(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function __resetEnvForTests() {
  cached = null;
}
