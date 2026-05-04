// S0-T03 — Type contract for coffee partners (S5).
// Server: S5-T06 (admin CRUD) writes these. UI: S5-T04 (reward modal),
// S5-T09 (landing partner strip) read them.

import { z } from "zod";

export const PartnerTypeSchema = z.enum(["chain", "indie"]);
export type PartnerType = z.infer<typeof PartnerTypeSchema>;

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64),
  type: PartnerTypeSchema,
  city: z.string().nullable(),
  state: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  blurb: z.string().nullable(),
  active: z.boolean(),
  weeklyBudget: z.number().int().min(0),
  createdAt: z.string(),
});
export type Partner = z.infer<typeof PartnerSchema>;

/** Public-facing partner card surface — admin-only fields stripped. */
export const PartnerCardSchema = PartnerSchema.pick({
  id: true,
  name: true,
  slug: true,
  type: true,
  city: true,
  state: true,
  logoUrl: true,
  blurb: true,
});
export type PartnerCard = z.infer<typeof PartnerCardSchema>;
