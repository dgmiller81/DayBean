"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddInput = z.object({
  userId: z.string(),
  url: z.string().url(),
  title: z.string().trim().min(1).max(500),
  source: z.string().max(64).optional(),
  excerpt: z.string().max(2_000).optional(),
});

export async function addBookmark(input: z.infer<typeof AddInput>): Promise<void> {
  const v = AddInput.parse(input);
  await db.bookmark.upsert({
    where: { userId_url: { userId: v.userId, url: v.url } },
    update: {
      title: v.title,
      source: v.source ?? null,
      excerpt: v.excerpt ?? null,
      isBookmarked: true,
    },
    create: {
      userId: v.userId,
      url: v.url,
      title: v.title,
      source: v.source ?? null,
      excerpt: v.excerpt ?? null,
      isBookmarked: true,
    },
  });
  revalidatePath("/");
}

const RemoveByUrl = z.object({ userId: z.string(), url: z.string().url() });
export async function removeBookmarkByUrl(input: z.infer<typeof RemoveByUrl>): Promise<void> {
  const v = RemoveByUrl.parse(input);
  const row = await db.bookmark.findUnique({
    where: { userId_url: { userId: v.userId, url: v.url } },
  });
  if (!row) return;
  await unbookmarkOrDelete(row.id, row.shareCount);
  revalidatePath("/");
}

const RemoveById = z.object({ userId: z.string(), id: z.string() });
export async function removeBookmark(input: z.infer<typeof RemoveById>): Promise<void> {
  const v = RemoveById.parse(input);
  const row = await db.bookmark.findFirst({
    where: { id: v.id, userId: v.userId },
  });
  if (!row) return;
  await unbookmarkOrDelete(row.id, row.shareCount);
  revalidatePath("/");
}

async function unbookmarkOrDelete(id: string, shareCount: number) {
  if (shareCount > 0) {
    // Keep the row so share-history sections still show it; just unset bookmark/pin flags.
    await db.bookmark.update({
      where: { id },
      data: { isBookmarked: false, pinned: false, pinnedAt: null },
    });
  } else {
    await db.bookmark.delete({ where: { id } });
  }
}

const TogglePin = z.object({ userId: z.string(), id: z.string() });
export async function togglePinBookmark(input: z.infer<typeof TogglePin>): Promise<void> {
  const v = TogglePin.parse(input);
  const row = await db.bookmark.findFirst({
    where: { id: v.id, userId: v.userId },
  });
  if (!row) return;
  const next = !row.pinned;
  await db.bookmark.update({
    where: { id: row.id },
    data: { pinned: next, pinnedAt: next ? new Date() : null },
  });
  revalidatePath("/");
}

const RecordShare = z.object({
  userId: z.string(),
  url: z.string().url(),
  title: z.string().trim().min(1).max(500),
  source: z.string().max(64).optional(),
  excerpt: z.string().max(2_000).optional(),
});
export async function recordShare(input: z.infer<typeof RecordShare>): Promise<void> {
  const v = RecordShare.parse(input);
  const existing = await db.bookmark.findUnique({
    where: { userId_url: { userId: v.userId, url: v.url } },
    select: { id: true, shareCount: true },
  });
  if (existing) {
    await db.bookmark.update({
      where: { id: existing.id },
      data: {
        shareCount: existing.shareCount + 1,
        lastSharedAt: new Date(),
        title: v.title,
        source: v.source ?? undefined,
        excerpt: v.excerpt ?? undefined,
      },
    });
  } else {
    await db.bookmark.create({
      data: {
        userId: v.userId,
        url: v.url,
        title: v.title,
        source: v.source ?? null,
        excerpt: v.excerpt ?? null,
        isBookmarked: false,
        shareCount: 1,
        lastSharedAt: new Date(),
      },
    });
  }
  revalidatePath("/");
}

const Reorder = z.object({
  userId: z.string(),
  ids: z.array(z.string()).max(500),
});
export async function reorderBookmarks(input: z.infer<typeof Reorder>): Promise<void> {
  const v = Reorder.parse(input);
  // Apply new sortOrder by index. Only touch rows that match userId for safety.
  await db.$transaction(
    v.ids.map((id, idx) =>
      db.bookmark.updateMany({
        where: { id, userId: v.userId },
        data: { sortOrder: idx },
      }),
    ),
  );
  revalidatePath("/");
}
