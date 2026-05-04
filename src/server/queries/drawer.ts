import "server-only";
import { cookies } from "next/headers";
import type { DrawerTab } from "@/server/actions/drawer";

export async function getLastDrawerTab(): Promise<DrawerTab> {
  const c = await cookies();
  // S1-T05 — db_* preferred; mm_* honored during migration.
  const v = c.get("db_drawer_tab")?.value ?? c.get("mm_drawer_tab")?.value;
  if (v === "goals") return "goals";
  if (v === "bookmarks") return "bookmarks";
  return "tasks";
}
