import "server-only";

// S5-T05 — Voucher email orchestrator. Resolves recipient, renders template,
// dispatches via the Resend wrapper. Returns { ok, messageId } | { ok, error }
// — callers in the claim flow log failures but never throw.

import { db } from "@/server/db";
import { sendEmail } from "./client";
import { renderVoucherEmail } from "./templates/voucher";

export type SendVoucherEmailInput = {
  userId: string;
  voucherCode: string;
  partnerName: string;
  expiresAt: string; // ISO
  streakLength: number;
};

export async function sendVoucherEmail(
  input: SendVoucherEmailInput,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, name: true },
  });
  if (!user || !user.email) {
    return { ok: false, error: "User has no email on file." };
  }

  const fromAddr = process.env.EMAIL_FROM ?? "DayBeans <hello@daybeans.com>";

  const { html, text, subject } = renderVoucherEmail({
    recipientName: user.name ?? "Friend",
    partnerName: input.partnerName,
    voucherCode: input.voucherCode,
    expiresAt: input.expiresAt,
    streakLength: input.streakLength,
  });

  return sendEmail({
    from: fromAddr,
    to: user.email,
    subject,
    html,
    text,
  });
}
