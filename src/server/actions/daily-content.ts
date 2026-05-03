"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";
import { DailyContentSchema } from "@/types/daily-content";
import { formatZodError } from "@/lib/format-zod-error";
import { DailyContentValidationError } from "@/server/errors/daily-content";
import type { DailyContent } from "@/types/daily-content";

export async function setDailyContent(
  userId: string,
  iso: string,
  json: unknown,
  source: "manual" | "llm" = "manual",
): Promise<DailyContent> {
  const result = DailyContentSchema.safeParse(json);
  if (!result.success) {
    throw new DailyContentValidationError(formatZodError(result.error));
  }
  const data = result.data;

  if (data.date !== iso) {
    throw new DailyContentValidationError(
      `date: payload date (${data.date}) does not match the day being saved (${iso})`,
    );
  }

  await db.dailyContent.upsert({
    where: { userId_iso: { userId, iso } },
    create: { userId, iso, contentJson: JSON.stringify(data), source },
    update: { contentJson: JSON.stringify(data), source },
  });

  return data;
}

export async function saveDailyContentAction(
  iso: string,
  rawJson: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return {
      ok: false,
      error: `(root): not valid JSON — ${(e as Error).message}`,
    };
  }

  const userId = await getCurrentUserId();

  try {
    await setDailyContent(userId, iso, parsed, "manual");
  } catch (e) {
    if (e instanceof DailyContentValidationError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  revalidatePath("/");
  return { ok: true };
}
