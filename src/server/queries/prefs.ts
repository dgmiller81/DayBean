import "server-only";
import { db } from "@/server/db";
import type { Pref, Filter } from "@/types";
import { parseStringList } from "@/server/json";

function asFilter(s: string): Filter {
  return s === "mindfulness" || s === "business" || s === "personal" ? s : "all";
}

export async function getPref(userId: string): Promise<Pref> {
  const row = await db.pref.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return {
    userId: row.userId,
    theme: row.theme === "dark" ? "dark" : "light",
    filter: asFilter(row.filter),
    jobTitle: row.jobTitle ?? null,
    interests: parseStringList(row.interests),
    faith: row.faith ?? null,
    scripturePref: row.scripturePref ?? null,
  };
}
