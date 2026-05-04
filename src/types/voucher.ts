// S0-T03 — Type contract for vouchers + reward claims (S5).
// Single-use codes assigned to a user when they cross a streak milestone.

import { z } from "zod";

export const VoucherSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  code: z.string(),
  issued: z.boolean(),
  redeemedAt: z.string().nullable(),
  userId: z.string().nullable(),
  expiresAt: z.string(), // ISO datetime
  weekOf: z.string(),    // ISO datetime — the Monday of the week
});
export type Voucher = z.infer<typeof VoucherSchema>;

/** Public-facing voucher card — code revealed only to the assigned user. */
export type VoucherForUser = {
  id: string;
  code: string;
  partnerName: string;
  expiresAt: string;
  redeemedAt: string | null;
};

export const RewardClaimSchema = z.object({
  id: z.string(),
  userId: z.string(),
  voucherId: z.string(),
  streakLength: z.number().int().min(1),
  claimedAt: z.string(),
});
export type RewardClaim = z.infer<typeof RewardClaimSchema>;
