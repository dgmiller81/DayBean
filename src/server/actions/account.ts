"use server";

// S7-T03 — Account deletion with a 24-hour grace window.
//
// requestAccountDeletion sets a future timestamp on User.pendingDeletionAt.
// During the grace window, getDeletionStatus reflects the pending state and
// cancelAccountDeletion clears it. After the window passes, the sweep cron
// (src/server/cron/sweep-deletions.ts) deletes the row; cascade rules on
// every userId foreign key clean up the rest.

import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";

const GRACE_MS = 24 * 60 * 60 * 1000;

export async function requestAccountDeletion(): Promise<{
  ok: true;
  pendingDeletionAt: string;
}> {
  const userId = await getCurrentUserId();
  const pendingDeletionAt = new Date(Date.now() + GRACE_MS);
  await db.user.update({
    where: { id: userId },
    data: { pendingDeletionAt },
  });
  revalidatePath("/");
  return { ok: true, pendingDeletionAt: pendingDeletionAt.toISOString() };
}

export async function cancelAccountDeletion(): Promise<{ ok: true }> {
  const userId = await getCurrentUserId();
  await db.user.update({
    where: { id: userId },
    data: { pendingDeletionAt: null },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function getDeletionStatus(): Promise<{
  pendingDeletionAt: string | null;
}> {
  const userId = await getCurrentUserId();
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { pendingDeletionAt: true },
  });
  return { pendingDeletionAt: u?.pendingDeletionAt?.toISOString() ?? null };
}
