"use server";

import "server-only";

// S7-T02 — User-initiated data export.
//
// Flow:
//   1. User clicks "Email my export" in Settings → Privacy.
//   2. We mint a single-use token, persist a DataExport row (24h TTL), and
//      email the user a link to /api/export/<token>.
//   3. The route handler streams the JSON dump, then marks `completedAt`
//      so subsequent GETs 410.
//
// Rate limit: one ACTIVE export at a time. If a non-completed, non-expired
// row already exists, we return that existing expiresAt instead of minting
// a new token. This prevents users from spamming the email and ensures only
// one valid link is ever in flight.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";
import { sendEmail } from "@/server/email/client";
import { renderDataExportEmail } from "@/server/email/templates/data-export";

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24h

export type RequestExportResult =
  | { ok: true; expiresAt: string; reused: boolean }
  | { ok: false; error: string };

export async function requestDataExport(): Promise<RequestExportResult> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return { ok: false, error: "You must be signed in to request an export." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) {
    return { ok: false, error: "User not found." };
  }
  if (!user.email) {
    return {
      ok: false,
      error: "Add an email to your account first — that's where we send the link.",
    };
  }

  const now = new Date();

  // Rate limit: reuse an existing active export rather than minting a new one.
  const existing = await db.dataExport.findFirst({
    where: {
      userId,
      completedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  let token: string;
  let expiresAt: Date;
  let reused = false;

  if (existing) {
    token = existing.token;
    expiresAt = existing.expiresAt;
    reused = true;
  } else {
    token = randomBytes(32).toString("base64url");
    expiresAt = new Date(now.getTime() + TOKEN_LIFETIME_MS);
    await db.dataExport.create({
      data: { userId, token, expiresAt },
    });
  }

  const downloadUrl = `${publicBaseUrl()}/api/export/${token}`;

  const { html, text, subject } = renderDataExportEmail({
    recipientName: user.name ?? "Friend",
    downloadUrl,
    expiresAt: expiresAt.toISOString(),
  });

  const fromAddr = process.env.EMAIL_FROM ?? "DayBeans <hello@daybeans.com>";

  // Fire-and-forget: don't block the action on the email send, but await
  // it inside this scope so the dev console-log fallback is observable in
  // tests. The email client itself never throws.
  const sendResult = await sendEmail({
    from: fromAddr,
    to: user.email,
    subject,
    html,
    text,
  });
  if (!sendResult.ok) {
    // Log but don't fail the request — the user can re-trigger if needed,
    // and the row stays valid for 24h either way.
    console.warn("[export] email send failed:", sendResult.error);
  }

  revalidatePath("/");
  return { ok: true, expiresAt: expiresAt.toISOString(), reused };
}

/**
 * Pick the public base URL the export link should use. Reuses what Railway
 * already injects (`RAILWAY_PUBLIC_DOMAIN`) and falls back to the explicit
 * `NEXT_PUBLIC_BASE_URL` or the local dev port. Never adds a new env var.
 */
function publicBaseUrl(): string {
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway && railway.length > 0) {
    return railway.startsWith("http") ? railway : `https://${railway}`;
  }
  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit && explicit.length > 0) return explicit;
  return "http://localhost:4111";
}
