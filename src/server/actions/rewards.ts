"use server";

// S0-T05 — Server-action stubs for the coffee streak rewards system (S5).
// Real implementation lands in S5-T01 (streak detection) + S5-T02 (claim flow).
// UI: S5-T03 (badge), S5-T04 (modal) consume these.

import type { Partner, Voucher, VoucherForUser } from "@/types";

/** Returns the user's current streak length (in mornings). 0 if no streak. */
export async function currentStreak(_userId: string): Promise<number> {
  throw new Error("not implemented — S5-T01");
}

/** Partners with available vouchers in this week's pool. */
export async function availablePartners(_userId: string): Promise<Partner[]> {
  throw new Error("not implemented — S5-T02");
}

/** Idempotent voucher claim. Returns the assigned voucher (with code revealed
 * to the user). Locks against double-claim with row-level locking on Voucher. */
export async function claimReward(
  _input: { userId: string; partnerId: string },
): Promise<VoucherForUser> {
  throw new Error("not implemented — S5-T02");
}

export async function dismissReward(_input: { userId: string }): Promise<void> {
  throw new Error("not implemented — S5-T02");
}

/** All vouchers a user has been issued (active and expired). */
export async function listMyVouchers(_userId: string): Promise<VoucherForUser[]> {
  throw new Error("not implemented — S5-T02");
}

// Re-export the type so consumers can import everything from one place.
export type { Voucher, VoucherForUser };
