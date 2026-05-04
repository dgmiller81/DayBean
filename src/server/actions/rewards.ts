"use server";

// S5-T02 — Voucher pool + claim flow.
// Streak detection lives in @/server/lib/streak.
// Auth identity is sourced from auth-context, not passed in.

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";
import { detectStreak } from "@/server/lib/streak";
import type { Partner, Voucher, VoucherForUser } from "@/types";

/** Streak length at or above which a user is eligible to claim a reward. */
const CLAIM_THRESHOLD = 7;

/** Window during which a successful claim suppresses follow-up claim attempts. */
const CLAIM_IDEMPOTENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** UTC midnight Monday for the calendar week containing `d`. */
function monday00z(d: Date): Date {
  const base = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // 0=Sunday, 1=Monday, ... — shift so Monday=0.
  const daysSinceMonday = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - daysSinceMonday);
  return base;
}

type PartnerRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  blurb: string | null;
  active: boolean;
  weeklyBudget: number;
  createdAt: Date;
};

function rowToPartner(r: PartnerRow): Partner {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    type: r.type as Partner["type"],
    city: r.city,
    state: r.state,
    logoUrl: r.logoUrl,
    blurb: r.blurb,
    active: r.active,
    weeklyBudget: r.weeklyBudget,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Returns the user's current streak length (in mornings). 0 if no streak. */
export async function currentStreak(): Promise<number> {
  const userId = await getCurrentUserId();
  const { length } = await detectStreak(userId);
  return length;
}

/** Partners with at least one available voucher in this week's pool. */
export async function availablePartners(): Promise<Partner[]> {
  await getCurrentUserId();
  const now = new Date();
  const startOfWeek = monday00z(now);

  const rows = await db.partner.findMany({
    where: {
      active: true,
      vouchers: {
        some: {
          issued: false,
          expiresAt: { gt: now },
          weekOf: { gte: startOfWeek },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map(rowToPartner);
}

/**
 * Idempotent voucher claim. Returns the assigned voucher (with code revealed
 * to the user). Locks against double-claim with row-level updateMany check.
 *
 * Idempotency window: 7 days. If the user has any RewardClaim younger than
 * 7 days, the existing voucher is returned instead of issuing a new one.
 */
export async function claimReward(
  input: { partnerId: string },
): Promise<VoucherForUser> {
  const userId = await getCurrentUserId();
  const { partnerId } = input;

  // Eligibility check.
  const { length: streakLength } = await detectStreak(userId);
  if (streakLength < CLAIM_THRESHOLD) {
    throw new Error("Streak too short");
  }

  // Idempotency: any claim within the last 7 days returns its voucher.
  const sevenDaysAgo = new Date(Date.now() - CLAIM_IDEMPOTENCY_WINDOW_MS);
  const existingClaim = await db.rewardClaim.findFirst({
    where: { userId, claimedAt: { gt: sevenDaysAgo } },
    orderBy: { claimedAt: "desc" },
    include: {
      voucher: { include: { partner: { select: { name: true } } } },
    },
  });
  if (existingClaim) {
    const v = existingClaim.voucher;
    return {
      id: v.id,
      code: v.code,
      partnerName: v.partner.name,
      expiresAt: v.expiresAt.toISOString(),
      redeemedAt: v.redeemedAt ? v.redeemedAt.toISOString() : null,
    };
  }

  // Atomic claim: pick a voucher, mark it issued + assigned, create the claim row.
  const result = await db.$transaction(async (tx) => {
    const partner = await tx.partner.findUnique({ where: { id: partnerId } });
    if (!partner || !partner.active) {
      throw new Error("Partner not available.");
    }

    const candidate = await tx.voucher.findFirst({
      where: {
        partnerId,
        issued: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "asc" },
    });
    if (!candidate) {
      throw new Error("No vouchers available for this partner this week.");
    }

    // Idempotent + race-safe: only update if still unissued.
    const updated = await tx.voucher.updateMany({
      where: { id: candidate.id, issued: false },
      data: { issued: true, userId },
    });
    if (updated.count !== 1) {
      throw new Error("Voucher race — try again.");
    }

    await tx.rewardClaim.create({
      data: {
        userId,
        voucherId: candidate.id,
        streakLength,
      },
    });

    return {
      voucher: candidate,
      partnerName: partner.name,
    };
  });

  revalidatePath("/");

  // Send the voucher email — non-blocking. Failure logs but doesn't bubble.
  try {
    const { sendVoucherEmail } = await import("@/server/email/voucher");
    const r = await sendVoucherEmail({
      userId,
      voucherCode: result.voucher.code,
      partnerName: result.partnerName,
      expiresAt: result.voucher.expiresAt.toISOString(),
      streakLength,
    });
    if (!r.ok) {
      console.error("[claim-reward] email send failed", {
        userId,
        error: r.error,
      });
    }
  } catch (e) {
    console.error("[claim-reward] email module import failed", {
      userId,
      error: (e as Error).message,
    });
  }

  return {
    id: result.voucher.id,
    code: result.voucher.code,
    partnerName: result.partnerName,
    expiresAt: result.voucher.expiresAt.toISOString(),
    redeemedAt: result.voucher.redeemedAt
      ? result.voucher.redeemedAt.toISOString()
      : null,
  };
}

/**
 * Marks the user's current "ready-to-claim" prompt as dismissed.
 * v1: no-op. The badge in S5-T03 is persistent until a claim happens.
 * TODO(s5-future): persist dismissals — needs a Pref column or a new table.
 */
export async function dismissReward(): Promise<void> {
  await getCurrentUserId();
  // Intentionally a no-op.
}

/** All vouchers a user has been issued (active and expired). */
export async function listMyVouchers(): Promise<VoucherForUser[]> {
  const userId = await getCurrentUserId();
  const rows = await db.voucher.findMany({
    where: { userId },
    include: { partner: { select: { name: true } } },
    orderBy: { expiresAt: "desc" },
  });
  return rows.map((v) => ({
    id: v.id,
    code: v.code,
    partnerName: v.partner.name,
    expiresAt: v.expiresAt.toISOString(),
    redeemedAt: v.redeemedAt ? v.redeemedAt.toISOString() : null,
  }));
}

// Re-export the type so consumers can import everything from one place.
export type { Voucher, VoucherForUser };
