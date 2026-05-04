"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { onJournalEntryWritten } from "@/server/lib/journal-write-hook";
import { recomputeJournalThemes } from "@/server/actions/journal-themes";

const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Page = z.enum(["mindfulness", "business", "personal", "overview"]);

const AddInput = z.object({
  userId: z.string(),
  iso: Iso,
  page: Page,
  content: z.string().trim().min(1).max(10_000),
});

export async function addJournalEntry(input: z.infer<typeof AddInput>): Promise<void> {
  const v = AddInput.parse(input);
  const created = await db.journalEntry.create({
    data: { userId: v.userId, iso: v.iso, page: v.page, content: v.content },
  });
  if (v.page === "mindfulness") {
    await db.day.upsert({
      where: { userId_iso: { userId: v.userId, iso: v.iso } },
      update: { notes: v.content },
      create: { userId: v.userId, iso: v.iso, notes: v.content },
    });
  }
  // Post-write hook: theme recompute + intent detection. Failures are logged
  // inside the hook and never bubble up to this action.
  try {
    await onJournalEntryWritten({
      userId: v.userId,
      entryId: created.id,
      content: v.content,
    });
  } catch (e) {
    console.error("[addJournalEntry] post-write hook failed", { error: (e as Error).message });
  }
  revalidatePath("/");
}

const DeleteInput = z.object({
  userId: z.string(),
  id: z.string(),
});

export async function deleteJournalEntry(input: z.infer<typeof DeleteInput>): Promise<void> {
  const v = DeleteInput.parse(input);
  const before = await db.journalEntry.findFirst({
    where: { id: v.id, userId: v.userId },
  });
  if (!before) return;
  await db.journalEntry.delete({ where: { id: before.id } });
  if (before.page === "mindfulness") {
    // Clear day.notes so the Mindfulness panel textarea reflects the deletion.
    await db.day.updateMany({
      where: { userId: v.userId, iso: before.iso },
      data: { notes: "" },
    });
  }
  // Deletion changes the corpus — recompute themes. No intent detection
  // (no content to scan).
  try {
    await recomputeJournalThemes(v.userId);
  } catch (e) {
    console.error("[deleteJournalEntry] recomputeJournalThemes failed", {
      error: (e as Error).message,
    });
  }
  revalidatePath("/");
}

const UpdateInput = z.object({
  userId: z.string(),
  id: z.string(),
  content: z.string().trim().min(1).max(10_000),
});

export async function updateJournalEntry(input: z.infer<typeof UpdateInput>): Promise<void> {
  const v = UpdateInput.parse(input);
  const before = await db.journalEntry.findFirst({
    where: { id: v.id, userId: v.userId },
  });
  if (!before) return;
  await db.journalEntry.update({
    where: { id: before.id },
    data: { content: v.content },
  });
  if (before.page === "mindfulness") {
    await db.day.upsert({
      where: { userId_iso: { userId: v.userId, iso: before.iso } },
      update: { notes: v.content },
      create: { userId: v.userId, iso: before.iso, notes: v.content },
    });
  }
  try {
    await onJournalEntryWritten({
      userId: v.userId,
      entryId: before.id,
      content: v.content,
    });
  } catch (e) {
    console.error("[updateJournalEntry] post-write hook failed", { error: (e as Error).message });
  }
  revalidatePath("/");
}
