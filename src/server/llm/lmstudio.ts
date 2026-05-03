import "server-only";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/server/db";
import { DailyContentSchema } from "@/types/daily-content";
import type { LlmAdapter, LlmContext } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { getEnvLlmConfig } from "./env-config";
import { parseLlmJson } from "./parse-json";

const DEFAULT_LMSTUDIO_BASE_URL = "http://localhost:1234/v1";
const LMSTUDIO_FAKE_KEY = "lm-studio-no-key-needed";

async function loadConfig(userId: string): Promise<{ apiKey: string; model: string; baseURL: string }> {
  const env = getEnvLlmConfig();
  if (env && env.provider === "lmstudio") {
    return { apiKey: env.apiKey, model: env.model, baseURL: env.baseURL ?? DEFAULT_LMSTUDIO_BASE_URL };
  }
  const row = await db.llmCredential.findUnique({
    where: { userId_provider: { userId, provider: "lmstudio" } },
  });
  if (!row) throw new Error("no-credential:lmstudio");
  return {
    apiKey: LMSTUDIO_FAKE_KEY,
    model: row.model,
    baseURL: process.env.LMSTUDIO_BASE_URL || DEFAULT_LMSTUDIO_BASE_URL,
  };
}

export const lmstudioAdapter: LlmAdapter = {
  async generateDailyContent(ctx: LlmContext) {
    const { apiKey, model, baseURL } = await loadConfig(ctx.userId);
    const lms = createOpenAI({ apiKey, baseURL });
    const { text } = await generateText({
      model: lms(model),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(ctx),
      temperature: 0.7,
    });
    return DailyContentSchema.parse(parseLlmJson(text));
  },
  async testConnection({ userId }) {
    try {
      const { apiKey, model, baseURL } = await loadConfig(userId);
      const lms = createOpenAI({ apiKey, baseURL });
      await generateText({ model: lms(model), prompt: "ping" });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  },
};
