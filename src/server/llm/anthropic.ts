import "server-only";
import { generateObject, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { DailyContentSchema } from "@/types/daily-content";
import type { LlmAdapter, LlmContext } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { getEnvLlmConfig } from "./env-config";

async function loadKey(userId: string): Promise<{ apiKey: string; model: string }> {
  const env = getEnvLlmConfig();
  if (env && env.provider === "anthropic") {
    return { apiKey: env.apiKey, model: env.model };
  }
  const row = await db.llmCredential.findUnique({
    where: { userId_provider: { userId, provider: "anthropic" } },
  });
  if (!row) throw new Error("no-credential:anthropic");
  return { apiKey: decrypt(row.encryptedKey, userId), model: row.model };
}

export const anthropicAdapter: LlmAdapter = {
  async generateDailyContent(ctx: LlmContext) {
    const { apiKey, model } = await loadKey(ctx.userId);
    const anthropic = createAnthropic({ apiKey });
    const { object } = await generateObject({
      model: anthropic(model),
      schema: DailyContentSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(ctx),
      temperature: 0.7,
    });
    return object;
  },
  async testConnection({ userId }) {
    try {
      const { apiKey, model } = await loadKey(userId);
      const anthropic = createAnthropic({ apiKey });
      await generateText({ model: anthropic(model), prompt: "ping" });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  },
};
