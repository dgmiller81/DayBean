"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/server/auth-context";
import { refreshDailyContent, type RefreshResult } from "@/server/llm/refresh";
import { todayISO } from "@/lib/dates";

export async function refreshTodayAction(): Promise<RefreshResult> {
  const userId = await getCurrentUserId();
  const result = await refreshDailyContent(userId, todayISO(), "manual");
  if (result.ok) revalidatePath("/");
  return result;
}
