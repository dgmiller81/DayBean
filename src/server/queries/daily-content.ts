import "server-only";
import { db } from "@/server/db";
import { DailyContentSchema, type DailyContent } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";
import { dedupeContent } from "@/lib/dedupe-content";

export type DailyContentSource = "manual" | "llm" | "fixture";
export type DailyContentWithMeta = {
  content: DailyContent;
  source: DailyContentSource;
};

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
    return { content: dedupeContent(fixtureFor(iso)), source: "fixture" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.contentJson);
  } catch (e) {
    console.error("[daily-content] row has invalid JSON, falling back to fixture", {
      userId, iso, error: (e as Error).message,
    });
    return { content: dedupeContent(fixtureFor(iso)), source: "fixture" };
  }

  const result = DailyContentSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[daily-content] row failed schema validation, falling back to fixture", {
      userId, iso, issues: result.error.issues.length,
    });
    return { content: dedupeContent(fixtureFor(iso)), source: "fixture" };
  }

  const source = isValidSource(row.source) ? row.source : "manual";
  // Defensive dedupe at read time — covers rows persisted before the dedupe
  // post-processor was added, and acts as a safety net if the LLM sneaks
  // a duplicate past the prompt rule.
  return { content: dedupeContent(result.data), source };
}

function isValidSource(s: string): s is DailyContentSource {
  return s === "manual" || s === "llm" || s === "fixture";
}
