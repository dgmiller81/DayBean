import "server-only";
import { db } from "@/server/db";
import { DailyContentSchema, type DailyContent } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";
import { dedupeContent } from "@/lib/dedupe-content";

// S2-T03 — `source` reflects WHICH SLOT served the row (read precedence),
// not the legacy `DailyContent.source` column ("manual" | "llm" | "fixture").
// The legacy column is preserved on disk; this enum is the read-time view.
export type DailyContentSource = "primary" | "backup" | "fixture";
export type DailyContentWithMeta = {
  content: DailyContent;
  source: DailyContentSource;
  servedAt: Date | null;
};

// Backups older than 36h are treated as missing — falling through to fixture.
// 36h covers a missed evening prebrew + missed morning brew with a small buffer.
const BACKUP_TTL_MS = 36 * 60 * 60 * 1000;

export async function getDailyContent(userId: string, iso: string): Promise<DailyContent> {
  const meta = await getDailyContentWithMeta(userId, iso);
  return meta.content;
}

export async function getDailyContentWithMeta(
  userId: string,
  iso: string,
): Promise<DailyContentWithMeta> {
  const row = await db.dailyContent.findUnique({
    where: { userId_iso: { userId, iso } },
  });

  if (!row) {
    return {
      content: dedupeContent(fixtureFor(iso)),
      source: "fixture",
      servedAt: null,
    };
  }

  // Level 1: primary slot. The prebrew can leave contentJson === "" as a
  // placeholder while populating only the backup slot — treat that as "no
  // primary" and fall through.
  if (row.contentJson && row.contentJson.length > 0) {
    const primary = tryParseAndValidate(row.contentJson);
    if (primary) {
      return {
        content: dedupeContent(primary),
        source: "primary",
        // Pre-S2 rows have primaryAt = null; fall back to updatedAt so the
        // UI always has a timestamp to render.
        servedAt: row.primaryAt ?? row.updatedAt,
      };
    }
    console.error("[daily-content] primary slot failed to parse/validate, trying backup", {
      userId,
      iso,
    });
  }

  // Level 2: backup slot, if fresh enough.
  if (row.backupContentJson && row.backupAt) {
    const ageMs = Date.now() - row.backupAt.getTime();
    if (ageMs <= BACKUP_TTL_MS) {
      const backup = tryParseAndValidate(row.backupContentJson);
      if (backup) {
        return {
          content: dedupeContent(backup),
          source: "backup",
          servedAt: row.backupAt,
        };
      }
      console.error("[daily-content] backup slot failed to parse/validate, falling back to fixture", {
        userId,
        iso,
      });
    } else {
      console.warn("[daily-content] backup slot is stale, falling back to fixture", {
        userId,
        iso,
        ageHours: Math.round(ageMs / (60 * 60 * 1000)),
      });
    }
  }

  // Level 3: fixture.
  return {
    content: dedupeContent(fixtureFor(iso)),
    source: "fixture",
    servedAt: null,
  };
}

function tryParseAndValidate(json: string): DailyContent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const result = DailyContentSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
