import "server-only";
import { db } from "@/server/db";
import { DailyContentSchema } from "@/types/daily-content";
import { setDailyContent } from "@/server/actions/daily-content";
import { todayISO } from "@/lib/dates";
import { getJournalSignal } from "@/server/queries/journal-themes";
import { dedupeContent } from "@/lib/dedupe-content";
import { getAdapter, type LlmProvider } from "./index";
import { getEnvLlmConfig } from "./env-config";
import type { LlmContext } from "./types";

export type RefreshSource = "manual" | "cron" | "cold-start";

export type RefreshResult =
  | { ok: true; iso: string }
  | { ok: false; code: "no-credential" }
  | { ok: false; code: "provider-error"; message: string }
  | { ok: false; code: "validation-error"; message: string };

export async function refreshDailyContent(
  userId: string,
  iso: string,
  source: RefreshSource,
): Promise<RefreshResult> {
  // Env replaces DB when configured.
  const envConfig = getEnvLlmConfig();
  const dbCred = envConfig ? null : await db.llmCredential.findFirst({ where: { userId } });
  const provider: LlmProvider | null = envConfig?.provider ?? (dbCred?.provider as LlmProvider | undefined) ?? null;

  if (!provider) {
    await db.refreshLog.create({
      data: { userId, iso, source, status: "no-credential", errorCode: "no-credential" },
    });
    return { ok: false, code: "no-credential" };
  }

  const [pref, user, journalSignal] = await Promise.all([
    db.pref.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    getJournalSignal(userId, iso),
  ]);

  let interests: string[] = [];
  if (pref?.contentInterests) {
    try {
      const parsed = JSON.parse(pref.contentInterests);
      if (Array.isArray(parsed)) interests = parsed.filter((s) => typeof s === "string");
    } catch {
      /* ignore */
    }
  }

  const ctx: LlmContext = {
    userId,
    iso,
    name: user?.name ?? null,
    jobTitle: pref?.jobTitle ?? null,
    bio: pref?.bio ?? null,
    faith: pref?.faith ?? null,
    scripturePref: pref?.scripturePref ?? null,
    contentInterests: interests,
    recentJournalThemes: journalSignal.themes,
    journalThemeWeights: journalSignal.weights,
    recentJournalExcerpts: journalSignal.recentExcerpts,
    journalDaysWithEntries: journalSignal.daysWithEntries,
  };

  const log = await db.refreshLog.create({
    data: { userId, iso, source, status: "ok", errorCode: null },
  });

  try {
    const adapter = getAdapter(provider);
    const content = await adapter.generateDailyContent(ctx);
    const validated = DailyContentSchema.parse(content);

    if (validated.date !== iso) {
      validated.date = iso;
    }

    const deduped = dedupeContent(validated);

    await setDailyContent(userId, iso, deduped, "llm");
    await db.refreshLog.update({
      where: { id: log.id },
      data: { status: "ok", finishedAt: new Date() },
    });
    return { ok: true, iso };
  } catch (e) {
    const msg = (e as Error).message;
    const code: "validation-error" | "provider-error" =
      msg.includes("ZodError") || /schema|validation/i.test(msg)
        ? "validation-error"
        : "provider-error";
    await db.refreshLog.update({
      where: { id: log.id },
      data: { status: code, errorCode: code, errorDetail: msg.slice(0, 1000), finishedAt: new Date() },
    });
    return { ok: false, code, message: msg };
  }
}

export async function refreshTodayFor(userId: string): Promise<RefreshResult> {
  return refreshDailyContent(userId, todayISO(), "manual");
}
