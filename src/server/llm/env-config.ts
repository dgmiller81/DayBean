import "server-only";
import { readEnv } from "@/server/env";
import type { LlmProvider } from "./index";

const PROVIDER_ALIAS: Record<string, LlmProvider> = {
  openai: "openai",
  "open ai": "openai",
  anthropic: "anthropic",
  claude: "anthropic",
  lmstudio: "lmstudio",
  "lm studio": "lmstudio",
  local: "lmstudio",
};

const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  lmstudio: "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
};

const LMSTUDIO_FAKE_KEY = "lm-studio-no-key-needed";

export type EnvLlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
};

/**
 * If LLM_DEFAULT + the matching API key are set in .env, return a config
 * that REPLACES whatever is in LlmCredential for this user. Returns null
 * when env is unset or incomplete — caller should fall back to the DB row.
 *
 * "Replace, not fall back": when env is set, the per-user DB credential is
 * ignored entirely. This is for self-hosted single-user installs that prefer
 * a shared .env key over the Settings UI.
 */
export function getEnvLlmConfig(): EnvLlmConfig | null {
  const env = readEnv();
  if (!env.LLM_DEFAULT) return null;

  const provider = PROVIDER_ALIAS[env.LLM_DEFAULT.trim().toLowerCase()];
  if (!provider) return null;

  const model = env.MODEL_DEFAULT?.trim() || DEFAULT_MODEL[provider];

  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) return null;
    return { provider, apiKey: env.OPENAI_API_KEY, model };
  }
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) return null;
    return { provider, apiKey: env.ANTHROPIC_API_KEY, model };
  }
  // LM Studio runs locally with no real key
  return {
    provider,
    apiKey: LMSTUDIO_FAKE_KEY,
    model,
    baseURL: env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
  };
}
