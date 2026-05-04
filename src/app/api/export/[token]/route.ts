import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { isoOffset, todayISO } from "@/lib/dates";

// S7-T02 — Public download endpoint for tokenized data exports.
//
// - 200 + JSON attachment on first valid hit (within 24h, not yet downloaded)
// - 404 if the token is unknown
// - 410 if the link is expired or has already been used (one-shot)
//
// The token itself is the only authentication: it's 32 random bytes so it's
// effectively unguessable, and it self-expires + self-revokes after one use.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const exportRow = await db.dataExport.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true, completedAt: true },
  });

  if (!exportRow) {
    return NextResponse.json({ error: "Export not found." }, { status: 404 });
  }
  if (exportRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This export link has expired." },
      { status: 410 },
    );
  }
  if (exportRow.completedAt !== null) {
    return NextResponse.json(
      { error: "This export has already been downloaded." },
      { status: 410 },
    );
  }

  const dump = await buildDump(exportRow.userId);

  await db.dataExport.update({
    where: { id: exportRow.id },
    data: { completedAt: new Date() },
  });

  const filename = `daybeans-export-${exportRow.userId}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Pull every user-scoped table the user has authored into a flat JSON object.
 *
 * Privacy carveouts:
 * - User.passwordHash is stripped.
 * - LlmCredential is omitted entirely (we never export decrypted keys).
 * - Voucher is filtered to the user's issued rows; partner-internal fields
 *   are not included since `user.vouchers` already scopes to that user.
 * - DailyContent is capped to the last 90 days to keep the dump small.
 * - All other user-scoped tables: full history.
 */
async function buildDump(userId: string) {
  const today = todayISO();
  const ninetyDaysAgo = isoOffset(today, -90);

  const [
    user,
    pref,
    goals,
    days,
    journalEntries,
    bookmarks,
    clicks,
    refreshLogs,
    journalThemes,
    suggestedGoals,
    vouchers,
    rewardClaims,
    dailyContent,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        onboardedAt: true,
        createdAt: true,
        pendingDeletionAt: true,
        // passwordHash intentionally omitted
      },
    }),
    db.pref.findUnique({ where: { userId } }),
    db.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.day.findMany({ where: { userId }, orderBy: { iso: "asc" } }),
    db.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    db.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    db.click.findMany({ where: { userId }, orderBy: { iso: "asc" } }),
    db.refreshLog.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
    }),
    db.journalTheme.findMany({
      where: { userId },
      orderBy: { weight: "desc" },
    }),
    db.suggestedGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    db.voucher.findMany({
      where: { userId },
      select: {
        id: true,
        code: true,
        issued: true,
        redeemedAt: true,
        expiresAt: true,
        weekOf: true,
        partnerId: true,
        // partner-internal fields are NOT included via `partner: true`
      },
      orderBy: { weekOf: "desc" },
    }),
    db.rewardClaim.findMany({
      where: { userId },
      orderBy: { claimedAt: "asc" },
    }),
    db.dailyContent.findMany({
      where: { userId, iso: { gte: ninetyDaysAgo } },
      orderBy: { iso: "asc" },
    }),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user,
    pref,
    goals,
    days,
    journalEntries,
    bookmarks,
    clicks,
    refreshLogs,
    journalThemes,
    suggestedGoals,
    vouchers,
    rewardClaims,
    dailyContent,
  };
}
