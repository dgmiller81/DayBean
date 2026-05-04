// S0-T03 — Type contract for Slow Sip (Personal) features (S3).

import { z } from "zod";

export const HouseholdMemberSchema = z.enum([
  "partner",
  "kids",
  "parents",
  "roommates",
  "alone",
]);
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

export const HobbySchema = z.string().trim().min(1).max(64);
export type Hobby = z.infer<typeof HobbySchema>;

export const GoalCategorySchema = z.enum([
  "family",
  "finance",
  "hobby",
  "fitness",
  "faith",
  "work",
]);
export type GoalCategory = z.infer<typeof GoalCategorySchema>;

/** What a single rotating Slow Sip card surfaces today. */
export type SlowSipCard = {
  id: string;
  category: GoalCategory;
  title: string;
  body: string;
  meta?: string; // e.g. "14 nights done · 7-day streak"
};

/** Optional finance display strings — no bank integration, BYO numbers only. */
export const FinanceNumbersSchema = z.object({
  netWorth: z.string().max(64).nullable(),
  cashOnHand: z.string().max(64).nullable(),
  savingsTarget: z.string().max(64).nullable(),
});
export type FinanceNumbers = z.infer<typeof FinanceNumbersSchema>;
