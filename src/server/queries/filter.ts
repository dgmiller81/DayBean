import "server-only";
import { getPref } from "./prefs";
import type { Filter } from "@/types";

export async function getFilter(userId: string): Promise<Filter> {
  const pref = await getPref(userId);
  return pref.filter;
}
