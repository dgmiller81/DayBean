// S0-T03 — Type contract for journal-driven suggested goals.
// Server: S4-T02 (intent detection) + S4-T03 (persistence) produce these.
// UI: S4-T06 (Bean Count card) consumes them.

import { z } from "zod";

export const SuggestedGoalCadenceSchema = z.enum(["daily", "weekly"]);
export type SuggestedGoalCadence = z.infer<typeof SuggestedGoalCadenceSchema>;

export const SuggestedGoalStatusSchema = z.enum(["pending", "accepted", "dismissed"]);
export type SuggestedGoalStatus = z.infer<typeof SuggestedGoalStatusSchema>;

export const SuggestedGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(280),
  cadence: SuggestedGoalCadenceSchema,
  category: z.string().nullable(),
  sourceJournalId: z.string().nullable(),
  status: SuggestedGoalStatusSchema,
  createdAt: z.string(), // ISO datetime
});

export type SuggestedGoal = z.infer<typeof SuggestedGoalSchema>;
