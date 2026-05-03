"use server";
import { cookies } from "next/headers";
import { z } from "zod";

const TabSchema = z.enum(["tasks", "goals", "bookmarks"]);
export type DrawerTab = z.infer<typeof TabSchema>;

const COOKIE_NAME = "mm_drawer_tab";
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
}
