"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ThemeSchema = z.enum(["light", "dark", "warm", "forest", "midnight"]);
const FilterSchema = z.enum(["all", "mindfulness", "business", "personal"]);

const SetThemeInput = z.object({ userId: z.string(), theme: ThemeSchema });
export async function setTheme(input: z.infer<typeof SetThemeInput>): Promise<void> {
  const v = SetThemeInput.parse(input);
  await db.pref.upsert({
    where: { userId: v.userId },
    create: { userId: v.userId, theme: v.theme },
    update: { theme: v.theme },
  });
  revalidatePath("/");
}

const SetFilterInput = z.object({ userId: z.string(), filter: FilterSchema });
export async function setFilter(input: z.infer<typeof SetFilterInput>): Promise<void> {
  const v = SetFilterInput.parse(input);
  await db.pref.upsert({
    where: { userId: v.userId },
    create: { userId: v.userId, filter: v.filter },
    update: { filter: v.filter },
  });
  revalidatePath("/");
}
