"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";

const FAITH_VALUES = ["none", "mindfulness", "christian", "jewish", "muslim", "spiritual", "custom"] as const;

const Input = z.object({
  jobTitle: z.string().trim().max(200).optional(),
  businessInterests: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  personalImportance: z.string().trim().max(2000).optional(),
  personalInterests: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  faith: z.enum(FAITH_VALUES).default("none"),
  faithCustom: z.string().trim().max(80).optional(),
  scripturePref: z.string().trim().max(40).optional(),
  spiritualNote: z.string().trim().max(2000).optional(),
});

function parseTagList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function completeOnboardingAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const userId = await getCurrentUserId();

  const parsed = Input.safeParse({
    jobTitle: (formData.get("jobTitle") as string | null) || undefined,
    businessInterests: parseTagList(formData.get("businessInterests")),
    personalImportance: (formData.get("personalImportance") as string | null) || undefined,
    personalInterests: parseTagList(formData.get("personalInterests")),
    faith: (formData.get("faith") as string | null) || "none",
    faithCustom: (formData.get("faithCustom") as string | null) || undefined,
    scripturePref: (formData.get("scripturePref") as string | null) || undefined,
    spiritualNote: (formData.get("spiritualNote") as string | null) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const faithFinal = v.faith === "custom" ? (v.faithCustom?.trim() || "custom") : v.faith;

  // Combine personal + spiritual reflections into the bio that the LLM reads.
  const bioParts: string[] = [];
  if (v.personalImportance) bioParts.push(v.personalImportance);
  if (v.spiritualNote) bioParts.push(v.spiritualNote);
  const bio = bioParts.join("\n\n").trim() || null;

  const contentInterests = [...v.businessInterests, ...v.personalInterests];

  await db.pref.upsert({
    where: { userId },
    update: {
      jobTitle: v.jobTitle || null,
      contentInterests: JSON.stringify(contentInterests),
      faith: faithFinal,
      scripturePref: v.faith === "christian" ? (v.scripturePref || null) : null,
      bio,
    },
    create: {
      userId,
      jobTitle: v.jobTitle || null,
      contentInterests: JSON.stringify(contentInterests),
      faith: faithFinal,
      scripturePref: v.faith === "christian" ? (v.scripturePref || null) : null,
      bio,
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });

  redirect("/");
}
