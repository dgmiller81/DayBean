import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { readEnv } from "@/server/env";
import { refreshDailyContent } from "@/server/llm/refresh";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Triggered by Railway cron (or local node-cron) at the user's configured
 * refresh time. Iterates over all users with an LlmCredential and runs a
 * refresh for today. Idempotent — DailyContent has a (userId, iso) unique
 * constraint, so a duplicate cron tick simply overwrites the row.
 *
 * Authentication: Bearer CRON_SECRET. Hard-fails if the env var is missing
 * (defense in depth — the boot guard already enforces this on Railway).
 */
export async function POST(req: Request) {
  const env = readEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const iso = todayISO();
  const eligible = await db.user.findMany({
    where: { llmCredentials: { some: {} } },
    select: { id: true },
  });

  const results: Array<{ userId: string; ok: boolean; code?: string }> = [];
  for (const u of eligible) {
    const r = await refreshDailyContent(u.id, iso, "cron");
    results.push({
      userId: u.id,
      ok: r.ok,
      code: r.ok ? undefined : r.code,
    });
  }

  return NextResponse.json({
    iso,
    processedUsers: results.length,
    okCount: results.filter((r) => r.ok).length,
    failures: results.filter((r) => !r.ok),
  });
}

// Allow GET too for easy testing — same auth check
export async function GET(req: Request) {
  return POST(req);
}
