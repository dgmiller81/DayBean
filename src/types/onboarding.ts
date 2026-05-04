// S0-T03 — Type contract for the First Pour onboarding flow (S6).

import { z } from "zod";
import { GoalCategorySchema, HobbySchema, HouseholdMemberSchema } from "./slow-sip";

export const FaithPrefSchema = z.enum([
  "christian",
  "jewish",
  "muslim",
  "hindu",
  "buddhist",
  "spiritual",
  "secular",
  "none",
]);
export type FaithPref = z.infer<typeof FaithPrefSchema>;

export const OnboardingStepSchema = z.enum([
  "name",
  "work",
  "growing",
  "company",
  "bean",
  "morning",
]);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

/** Final payload submitted by completeOnboarding (S6-T04). All fields optional
 * except name; user can skip any step and the section falls back to defaults. */
export const OnboardingPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  companyStage: z.string().trim().max(64).optional(),
  hobbies: z.array(HobbySchema).max(20).optional(),
  livesWith: z.array(HouseholdMemberSchema).max(5).optional(),
  faith: FaithPrefSchema.optional(),
  scripturePref: z.string().trim().max(32).optional(),
  theme: z.string().trim().max(32).optional(),
  refreshHour: z.number().int().min(0).max(23).optional(),
  bgImageUrl: z.string().url().optional(),
});
export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>;

/** Re-export so onboarding components only import from one place. */
export { GoalCategorySchema };
export type { Hobby, HouseholdMember, GoalCategory } from "./slow-sip";
