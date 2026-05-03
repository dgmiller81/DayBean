import "server-only";
import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { DailyContentSchema } from "@/types/daily-content";
import type { DailyContent } from "@/types/daily-content";
import type { LlmAdapter, LlmContext } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { getEnvLlmConfig } from "./env-config";

async function loadKey(userId: string): Promise<{ apiKey: string; model: string }> {
  // Env replaces DB when configured.
  const env = getEnvLlmConfig();
  if (env && env.provider === "openai") {
    return { apiKey: env.apiKey, model: env.model };
  }
  const row = await db.llmCredential.findUnique({
    where: { userId_provider: { userId, provider: "openai" } },
  });
  if (!row) throw new Error("no-credential:openai");
  return { apiKey: decrypt(row.encryptedKey, userId), model: row.model };
}

export const openaiAdapter: LlmAdapter = {
  async generateDailyContent(ctx: LlmContext): Promise<DailyContent> {
    const { apiKey, model } = await loadKey(ctx.userId);
    const openai = createOpenAI({ apiKey });
    // generateObject forces structured output via OpenAI's JSON-mode + Zod
    // validation. Much more reliable than asking the model to output JSON
    // freely with generateText (which often returns markdown-fenced JSON).
    const { object } = await generateObject({
      model: openai(model),
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
      const openai = createOpenAI({ apiKey });
      await generateText({ model: openai(model), prompt: "ping" });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  },
};
