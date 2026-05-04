"use server";
import { cookies } from "next/headers";
import { z } from "zod";

const TabSchema = z.enum(["tasks", "goals", "bookmarks"]);
export type DrawerTab = z.infer<typeof TabSchema>;

// S1-T05 — db_* preferred; the read path in queries/drawer.ts honors mm_*
// during the migration window.
const COOKIE_NAME = "db_drawer_tab";
const LEGACY_COOKIE_NAME = "mm_drawer_tab";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setDrawerTab({ tab }: { tab: DrawerTab }): Promise<void> {
  const parsed = TabSchema.parse(tab);
  const c = await cookies();
  c.set(COOKIE_NAME, parsed, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });
  // Clear the legacy cookie so it doesn't shadow the new one on stale clients.
  if (c.get(LEGACY_COOKIE_NAME)) {
    c.set(LEGACY_COOKIE_NAME, "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
}
