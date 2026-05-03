import "server-only";
import { cookies } from "next/headers";
import type { DrawerTab } from "@/server/actions/drawer";

export async function getLastDrawerTab(): Promise<DrawerTab> {
  const c = await cookies();
  const v = c.get("mm_drawer_tab")?.value;
  if (v === "goals") return "goals";
  if (v === "bookmarks") return "bookmarks";
  return "tasks";
}
