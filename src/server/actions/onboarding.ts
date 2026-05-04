"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";
import { refreshDailyContent } from "@/server/llm/refresh";
import { todayISO } from "@/lib/dates";
import { HouseholdMemberSchema } from "@/types/slow-sip";

// S6-T04 — accepts the full First Pour 6-step payload. Field names match the
// shell's submit; we still tolerate the legacy `personalInterests` /
// `businessInterests` names if anything else posts to this action.
const Input = z.object({
  name: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  companyStage: z.string().trim().max(64).optional(),
  hobbies: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  livesWith: z.array(HouseholdMemberSchema).max(5).default([]),
  faith: z.string().trim().max(80).optional(), // resolved per the rule below
  faithCustom: z.string().trim().max(80).optional(),
  scripturePref: z.string().trim().max(32).optional(),
  theme: z.string().trim().max(32).optional(),
  refreshHour: z.number().int().min(0).max(23).optional(),
  bgImageUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: "bgImageUrl must be an http(s) URL",
    }),
});

function parseTagList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const VALID_HOUSEHOLD = new Set<string>(HouseholdMemberSchema.options);
const THEME_COOKIE = "db_theme";
const LEGACY_THEME_COOKIE = "mm_theme";
// S6-T05 — edge-readable signal for the middleware-level onboarding gate.
const ONBOARDED_COOKIE = "db_onboarded";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function completeOnboardingAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const userId = await getCurrentUserId();

  // The shell's submit lives at FirstPour.tsx; field names match this parse.
  // `hobbies` accepts either the new `hobbies` key or the legacy
  // `personalInterests` key (defensive).
  const hobbiesRaw =
    formData.get("hobbies") ?? formData.get("personalInterests");
  const livesWithRaw = formData.get("livesWith");
  const refreshHourRaw = formData.get("refreshHour");

  const refreshHourParsed =
    typeof refreshHourRaw === "string" && refreshHourRaw.length > 0
      ? Number(refreshHourRaw)
      : undefined;

  const livesWithList = parseTagList(livesWithRaw).filter((m) =>
    VALID_HOUSEHOLD.has(m),
  );

  const parsed = Input.safeParse({
    name: (formData.get("name") as string | null) ?? "",
    jobTitle: (formData.get("jobTitle") as string | null) || undefined,
    industry:
      (formData.get("industry") as string | null) ||
      (formData.get("businessInterests") as string | null) ||
      undefined,
    companyStage: (formData.get("companyStage") as string | null) || undefined,
    hobbies: parseTagList(hobbiesRaw),
    livesWith: livesWithList,
    faith: (formData.get("faith") as string | null) || undefined,
    faithCustom: (formData.get("faithCustom") as string | null) || undefined,
    scripturePref:
      (formData.get("scripturePref") as string | null) || undefined,
    theme: (formData.get("theme") as string | null) || undefined,
    refreshHour:
      refreshHourParsed !== undefined && Number.isFinite(refreshHourParsed)
        ? refreshHourParsed
        : undefined,
    bgImageUrl: (formData.get("bgImageUrl") as string | null) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Faith resolution: '' or 'secular' → 'none'; 'custom' → faithCustom (or
  // 'custom' literal if blank); everything else passes through. The read path
  // already understands this convention.
  const rawFaith = v.faith ?? "";
  const faithFinal =
    rawFaith === "custom"
      ? v.faithCustom?.trim() || "custom"
      : rawFaith === "" || rawFaith === "secular"
        ? "none"
        : rawFaith;

  const hobbiesJson = v.hobbies.length > 0 ? JSON.stringify(v.hobbies) : null;
  const livesWithJson =
    v.livesWith.length > 0 ? JSON.stringify(v.livesWith) : null;
  const scripturePref =
    faithFinal === "christian" ? v.scripturePref || null : null;

  const prefData = {
    jobTitle: v.jobTitle || null,
    industry: v.industry || null,
    companyStage: v.companyStage || null,
    hobbies: hobbiesJson,
    livesWith: livesWithJson,
    faith: faithFinal,
    scripturePref,
    bgImageUrl: v.bgImageUrl || null,
    ...(v.refreshHour !== undefined ? { refreshHour: v.refreshHour } : {}),
  };

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { name: v.name, onboardedAt: new Date() },
    }),
    db.pref.upsert({
      where: { userId },
      update: prefData,
      create: { userId, ...prefData },
    }),
  ]);

  // Theme is cookie-backed (not on Pref). Mirror the live-set the shell does.
  const c = await cookies();
  if (v.theme) {
    c.set(THEME_COOKIE, v.theme, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: false,
    });
    // Legacy migration: keep mm_theme in sync so stale clients don't shadow.
    c.set(LEGACY_THEME_COOKIE, v.theme, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  // S6-T05: now that onboardedAt is set, write the edge-readable gate cookie
  // so the next request (post-redirect) skips the middleware redirect.
  c.set(ONBOARDED_COOKIE, "1", {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });

  // Warm-up generation so Day 1 isn't a generic fixture. If this fails for any
  // reason (no provider, network, validation) the read path falls back to the
  // S2-T03 fixture — no need to surface the error.
  try {
    await refreshDailyContent(userId, todayISO(), "cold-start");
  } catch (err) {
    console.error("[onboarding] warm-up refresh failed:", err);
  }

  redirect("/");
}
