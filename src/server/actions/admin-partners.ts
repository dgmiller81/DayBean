"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { PartnerTypeSchema } from "@/types";

async function requireAdmin(): Promise<string> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) throw new Error("Not authorized.");
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) throw new Error("Not authorized.");
  return userId;
}

const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/i, "letters, numbers, hyphens only")
  .min(2)
  .max(64);

const NullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    });

const NullableUrl = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  });

const CreatePartnerInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: SlugSchema,
  type: PartnerTypeSchema,
  city: NullableTrimmedString(120),
  state: NullableTrimmedString(120),
  logoUrl: NullableUrl,
  blurb: NullableTrimmedString(500),
  weeklyBudget: z.number().int().min(0).max(100_000),
});

export async function createPartner(
  input: z.infer<typeof CreatePartnerInput>,
): Promise<{ id: string }> {
  await requireAdmin();
  const v = CreatePartnerInput.parse(input);
  const slug = v.slug.toLowerCase();

  const dup = await db.partner.findUnique({ where: { slug } });
  if (dup) throw new Error(`Slug "${slug}" already in use.`);

  const created = await db.partner.create({
    data: {
      name: v.name,
      slug,
      type: v.type,
      city: v.city,
      state: v.state,
      logoUrl: v.logoUrl,
      blurb: v.blurb,
      weeklyBudget: v.weeklyBudget,
    },
    select: { id: true },
  });

  revalidatePath("/admin/partners");
  return created;
}

const UpdatePartnerInput = CreatePartnerInput.extend({ id: z.string().min(1) });

export async function updatePartner(
  input: z.infer<typeof UpdatePartnerInput>,
): Promise<void> {
  await requireAdmin();
  const v = UpdatePartnerInput.parse(input);
  const slug = v.slug.toLowerCase();

  // Slug-uniqueness on update: lookup any partner with this slug; if found
  // and it's not THIS partner, reject. Otherwise the update is safe.
  const existing = await db.partner.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== v.id) {
    throw new Error(`Slug "${slug}" already in use.`);
  }

  await db.partner.update({
    where: { id: v.id },
    data: {
      name: v.name,
      slug,
      type: v.type,
      city: v.city,
      state: v.state,
      logoUrl: v.logoUrl,
      blurb: v.blurb,
      weeklyBudget: v.weeklyBudget,
    },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${v.id}`);
}

export async function setPartnerActive(input: {
  id: string;
  active: boolean;
}): Promise<void> {
  await requireAdmin();
  const v = z
    .object({ id: z.string().min(1), active: z.boolean() })
    .parse(input);
  await db.partner.update({
    where: { id: v.id },
    data: { active: v.active },
  });
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${v.id}`);
}

const BulkAddInput = z.object({
  partnerId: z.string(),
  codes: z.array(z.string().trim().min(1).max(64)).min(1).max(1000),
  expiresAt: z.string().datetime(),
  weekOf: z.string().datetime(),
});

export async function bulkAddVouchers(
  input: z.infer<typeof BulkAddInput>,
): Promise<{ added: number; duplicates: string[] }> {
  await requireAdmin();
  const v = BulkAddInput.parse(input);
  const partner = await db.partner.findUnique({ where: { id: v.partnerId } });
  if (!partner) throw new Error("Partner not found.");

  // Dedupe within the input first.
  const unique = Array.from(
    new Set(v.codes.map((c) => c.trim()).filter((c) => c.length > 0)),
  );

  // Find existing codes (anywhere — codes are globally unique).
  const existing = await db.voucher.findMany({
    where: { code: { in: unique } },
    select: { code: true },
  });
  const dupSet = new Set(existing.map((r) => r.code));
  const fresh = unique.filter((c) => !dupSet.has(c));

  if (fresh.length === 0) return { added: 0, duplicates: [...dupSet] };

  await db.voucher.createMany({
    data: fresh.map((code) => ({
      partnerId: v.partnerId,
      code,
      issued: false,
      expiresAt: new Date(v.expiresAt),
      weekOf: new Date(v.weekOf),
    })),
  });

  revalidatePath(`/admin/partners/${v.partnerId}`);
  revalidatePath(`/admin/partners/${v.partnerId}/vouchers`);
  return { added: fresh.length, duplicates: [...dupSet] };
}

export async function markVoucherRedeemed(voucherId: string): Promise<void> {
  await requireAdmin();
  await db.voucher.update({
    where: { id: voucherId },
    data: { redeemedAt: new Date() },
  });
  // Find the partner via the updated row, revalidate that route too.
  const v = await db.voucher.findUnique({
    where: { id: voucherId },
    select: { partnerId: true },
  });
  if (v) {
    revalidatePath(`/admin/partners/${v.partnerId}`);
    revalidatePath(`/admin/partners/${v.partnerId}/vouchers`);
  }
}
