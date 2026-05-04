"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { encrypt, last4Of } from "@/server/crypto";
import { getCurrentUserId } from "@/server/auth-context";
import { getAdapter, type LlmProvider } from "@/server/llm";
import { getEnvLlmConfig } from "@/server/llm/env-config";

const ProviderSchema = z.enum(["openai", "anthropic", "lmstudio"]);

const SaveLlmInput = z.object({
  provider: ProviderSchema,
  apiKey: z.string().min(1).max(512),
  model: z.string().min(1).max(200),
});

export type LlmCredentialSummary = {
  provider: LlmProvider;
  last4: string;
  model: string;
};

export async function saveLlmCredential(
  input: z.infer<typeof SaveLlmInput>,
): Promise<LlmCredentialSummary> {
  const v = SaveLlmInput.parse(input);
  const userId = await getCurrentUserId();
  const encryptedKey = encrypt(v.apiKey, userId);
  const last4 = last4Of(v.apiKey);

  await db.llmCredential.upsert({
    where: { userId_provider: { userId, provider: v.provider } },
    create: {
      userId,
      provider: v.provider,
      encryptedKey,
      last4,
      model: v.model,
    },
    update: {
      encryptedKey,
      last4,
      model: v.model,
    },
  });

  revalidatePath("/");
  return { provider: v.provider, last4, model: v.model };
}

export async function deleteLlmCredential({ provider }: { provider: LlmProvider }): Promise<void> {
  ProviderSchema.parse(provider);
  const userId = await getCurrentUserId();
  await db.llmCredential.deleteMany({ where: { userId, provider } });
  revalidatePath("/");
}

export async function testLlmConnection({
  provider,
}: {
  provider: LlmProvider;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  ProviderSchema.parse(provider);
  const userId = await getCurrentUserId();
  return getAdapter(provider).testConnection({ userId });
}

const SaveProfileInput = z.object({
  name: z.string().trim().min(1).max(120),
  bio: z.string().max(2000).optional(),
});

export async function saveProfile(input: z.infer<typeof SaveProfileInput>): Promise<void> {
  const v = SaveProfileInput.parse(input);
  const userId = await getCurrentUserId();

  await db.user.update({ where: { id: userId }, data: { name: v.name } });
  await db.pref.upsert({
    where: { userId },
    create: { userId, bio: v.bio ?? null },
    update: { bio: v.bio ?? null },
  });
  revalidatePath("/");
}

const SaveJobInterestsInput = z.object({
  jobTitle: z.string().trim().max(200).optional(),
  contentInterests: z.array(z.string().trim().min(1).max(80)).max(40),
});

export async function saveJobInterests(
  input: z.infer<typeof SaveJobInterestsInput>,
): Promise<void> {
  const v = SaveJobInterestsInput.parse(input);
  const userId = await getCurrentUserId();

  await db.pref.upsert({
    where: { userId },
    create: {
      userId,
      jobTitle: v.jobTitle ?? null,
      contentInterests: JSON.stringify(v.contentInterests),
    },
    update: {
      jobTitle: v.jobTitle ?? null,
      contentInterests: JSON.stringify(v.contentInterests),
    },
  });
  revalidatePath("/");
}

const SetRefreshHourInput = z.object({
  hour: z.number().int().min(0).max(23),
});

export async function setRefreshHour(input: z.infer<typeof SetRefreshHourInput>): Promise<void> {
  const v = SetRefreshHourInput.parse(input);
  const userId = await getCurrentUserId();
  await db.pref.upsert({
    where: { userId },
    create: { userId, refreshHour: v.hour },
    update: { refreshHour: v.hour },
  });
  revalidatePath("/");
}

const ThemePrefsInput = z.object({
  bgImageUrl: z.string().trim().max(2048).nullable().optional(),
  bgOverlay: z.number().int().min(0).max(100).optional(),
});

export async function setThemePrefs(input: z.infer<typeof ThemePrefsInput>): Promise<void> {
  const v = ThemePrefsInput.parse(input);
  const userId = await getCurrentUserId();

  const data: { bgImageUrl?: string | null; bgOverlay?: number } = {};
  if (v.bgImageUrl !== undefined) {
    const trimmed = v.bgImageUrl?.trim() ?? "";
    data.bgImageUrl = trimmed.length === 0 ? null : trimmed;
  }
  if (v.bgOverlay !== undefined) data.bgOverlay = v.bgOverlay;

  if (Object.keys(data).length === 0) return;

  await db.pref.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  revalidatePath("/");
}

export type SettingsSummary = {
  name: string;
  bio: string | null;
  jobTitle: string | null;
  contentInterests: string[];
  refreshHour: number;
  bgImageUrl: string | null;
  bgOverlay: number;
  credentials: LlmCredentialSummary[];
  /** When set, the env (.env file) is overriding any per-user credential. */
  envOverride: { provider: LlmProvider; model: string } | null;
  // S3 — Slow Sip personalization signals.
  hobbies: string[];
  livesWith: string[];
  financeMode: boolean;
  netWorth: string | null;
  cashOnHand: string | null;
  savingsTarget: string | null;
};

export async function getSettings(): Promise<SettingsSummary> {
  const userId = await getCurrentUserId();
  const [user, pref, creds] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.pref.findUnique({ where: { userId } }),
    db.llmCredential.findMany({ where: { userId } }),
  ]);

  const parseStringArray = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
    } catch {
      return [];
    }
  };

  const interests = parseStringArray(pref?.contentInterests ?? null);
  const hobbies = parseStringArray(pref?.hobbies ?? null);
  const livesWith = parseStringArray(pref?.livesWith ?? null);

  const envCfg = getEnvLlmConfig();

  return {
    name: user?.name ?? "Friend",
    bio: pref?.bio ?? null,
    jobTitle: pref?.jobTitle ?? null,
    contentInterests: interests,
    refreshHour: pref?.refreshHour ?? 4,
    bgImageUrl: pref?.bgImageUrl ?? null,
    bgOverlay: pref?.bgOverlay ?? 90,
    credentials: creds.map((c) => ({
      provider: c.provider as LlmProvider,
      last4: c.last4,
      model: c.model,
    })),
    envOverride: envCfg ? { provider: envCfg.provider, model: envCfg.model } : null,
    hobbies,
    livesWith,
    financeMode: pref?.financeMode ?? false,
    netWorth: pref?.netWorth ?? null,
    cashOnHand: pref?.cashOnHand ?? null,
    savingsTarget: pref?.savingsTarget ?? null,
  };
}
