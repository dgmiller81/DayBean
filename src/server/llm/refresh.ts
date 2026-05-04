import "server-only";
import { db } from "@/server/db";
import { DailyContentSchema, type DailyContent } from "@/types/daily-content";
import { setDailyContent } from "@/server/actions/daily-content";
import { todayISO } from "@/lib/dates";
import { getJournalSignal } from "@/server/queries/journal-themes";
import { dedupeContent } from "@/lib/dedupe-content";
import { getAdapter, type LlmProvider } from "./index";
import { getEnvLlmConfig } from "./env-config";
import type { LlmContext } from "./types";
import type { RefreshPhase } from "@/types/refresh";

export type RefreshResult =
  | { ok: true; iso: string }
  | { ok: false; code: "no-credential" }
  | { ok: false; code: "provider-error"; message: string }
  | { ok: false; code: "validation-error"; message: string };

// RefreshLog.source is the legacy column kept for backward compatibility.
// `phase` is the new authoritative tag (S0-T02). Map phase → source so the
// pre-S2 reports keep working until they're rewritten to read `phase`.
function phaseToLegacySource(phase: RefreshPhase): "manual" | "cron" | "cold-start" {
  if (phase === "manual") return "manual";
  if (phase === "cold-start") return "cold-start";
  return "cron"; // morning | evening-prebrew
}

export async function refreshDailyContent(
  userId: string,
  iso: string,
  phase: RefreshPhase,
): Promise<RefreshResult> {
  const legacySource = phaseToLegacySource(phase);

  // Env replaces DB when configured.
  const envConfig = getEnvLlmConfig();
  const dbCred = envConfig ? null : await db.llmCredential.findFirst({ where: { userId } });
  const provider: LlmProvider | null = envConfig?.provider ?? (dbCred?.provider as LlmProvider | undefined) ?? null;

  if (!provider) {
    await db.refreshLog.create({
      data: { userId, iso, source: legacySource, phase, status: "no-credential", errorCode: "no-credential" },
    });
    return { ok: false, code: "no-credential" };
  }

  const [pref, user, journalSignal, themesRows] = await Promise.all([
    db.pref.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    getJournalSignal(userId, iso),
    // S4-T03 — JournalTheme rows are the source of truth for theme bias.
    // getJournalSignal still drives recentExcerpts + daysWithEntries.
    db.journalTheme.findMany({
      where: { userId, muted: false },
      orderBy: { weight: "desc" },
      take: 12,
    }),
  ]);

  const themes = themesRows.map((r) => r.theme);
  const themeWeights = Object.fromEntries(themesRows.map((r) => [r.theme, r.weight]));

  let interests: string[] = [];
  if (pref?.contentInterests) {
    try {
      const parsed = JSON.parse(pref.contentInterests);
      if (Array.isArray(parsed)) interests = parsed.filter((s) => typeof s === "string");
    } catch {
      /* ignore */
    }
  }

  let hobbies: string[] = [];
  let livesWith: string[] = [];
  if (pref?.hobbies) {
    try { const p = JSON.parse(pref.hobbies); if (Array.isArray(p)) hobbies = p.filter((s) => typeof s === "string"); } catch {}
  }
  if (pref?.livesWith) {
    try { const p = JSON.parse(pref.livesWith); if (Array.isArray(p)) livesWith = p.filter((s) => typeof s === "string"); } catch {}
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
    hobbies,
    livesWith,
    recentJournalThemes: themes,
    journalThemeWeights: themeWeights,
    recentJournalExcerpts: journalSignal.recentExcerpts,
    journalDaysWithEntries: journalSignal.daysWithEntries,
  };

  const log = await db.refreshLog.create({
    data: { userId, iso, source: legacySource, phase, status: "ok", errorCode: null },
  });

  try {
    const adapter = getAdapter(provider);
    const content = await adapter.generateDailyContent(ctx);
    const validated = DailyContentSchema.parse(content);

    if (validated.date !== iso) {
      validated.date = iso;
    }

    const deduped = dedupeContent(validated);

    if (phase === "evening-prebrew") {
      await writeBackupSlot(userId, iso, deduped, "evening-prebrew");
    } else {
      // morning | cold-start | manual all populate the primary slot.
      await setDailyContent(userId, iso, deduped, "llm");
      await stampPrimarySlot(userId, iso, phase);
    }

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
    // Surface to Railway / stdout — the same string is also persisted on
    // RefreshLog.errorDetail, but RefreshLog isn't reachable from Railway's
    // log viewer without DB access.
    console.error(
      `[refresh] phase=${phase} userId=${userId} iso=${iso} code=${code} provider=${provider} msg=${msg.slice(0, 800)}`,
    );
    await db.refreshLog.update({
      where: { id: log.id },
      data: { status: code, errorCode: code, errorDetail: msg.slice(0, 1000), finishedAt: new Date() },
    });
    return { ok: false, code, message: msg };
  }
}

/**
 * Manual user-triggered refresh — always populates the primary slot.
 */
export async function refreshTodayFor(userId: string): Promise<RefreshResult> {
  return refreshDailyContent(userId, todayISO(), "manual");
}

/**
 * Stamp the primary-slot metadata on the row that `setDailyContent` just
 * upserted. setDailyContent writes contentJson + source; we add the dual-run
 * bookkeeping (primarySource, primaryAt) so the read precedence in
 * daily-content.ts can tell which run produced the row.
 */
async function stampPrimarySlot(
  userId: string,
  iso: string,
  phase: Exclude<RefreshPhase, "evening-prebrew">,
): Promise<void> {
  await db.dailyContent.update({
    where: { userId_iso: { userId, iso } },
    data: { primarySource: phase, primaryAt: new Date() },
  });
}

/**
 * Write the backup slot only — never touches contentJson. Called for
 * evening-prebrew runs. Idempotent: subsequent runs overwrite the backup.
 */
async function writeBackupSlot(
  userId: string,
  iso: string,
  content: DailyContent,
  backupSource: "evening-prebrew" | "manual-prebrew",
): Promise<void> {
  const backupContentJson = JSON.stringify(content);
  const now = new Date();
  await db.dailyContent.upsert({
    where: { userId_iso: { userId, iso } },
    // If no row yet: create one with empty primary slot. The morning brew
    // (or cold-start) on Day N will populate contentJson; the backup is
    // already there to cover failure.
    create: {
      userId,
      iso,
      contentJson: "",
      source: "fixture",
      backupContentJson,
      backupSource,
      backupAt: now,
    },
    update: {
      backupContentJson,
      backupSource,
      backupAt: now,
    },
  });
}
