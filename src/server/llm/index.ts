import "server-only";
import type { LlmAdapter } from "./types";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { lmstudioAdapter } from "./lmstudio";

export type LlmProvider = "openai" | "anthropic" | "lmstudio";

const adapters: Record<LlmProvider, LlmAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  lmstudio: lmstudioAdapter,
};

export function getAdapter(provider: LlmProvider): LlmAdapter {
  const a = adapters[provider];
  if (!a) throw new Error(`unknown provider: ${provider}`);
  return a;
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  lmstudio: "LM Studio (local)",
};

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  lmstudio: "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
};
