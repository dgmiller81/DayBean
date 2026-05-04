"use server";

// S0-T05 — Server-action stubs for Slow Sip (Personal) features (S3).
// Real implementation lands in S3-T01..T04. UI consumers build against these.

import type {
  FinanceNumbers,
  HouseholdMember,
  Hobby,
  SlowSipCard,
} from "@/types";

export async function setHobbies(
  _input: { userId: string; hobbies: Hobby[] },
): Promise<void> {
  throw new Error("not implemented — S3-T01");
}

export async function setLivesWith(
  _input: { userId: string; livesWith: HouseholdMember[] },
): Promise<void> {
  throw new Error("not implemented — S3-T02");
}

export async function setFinanceMode(
  _input: { userId: string; enabled: boolean },
): Promise<void> {
  throw new Error("not implemented — S3-T03");
}

export async function setFinanceNumbers(
  _input: { userId: string; numbers: FinanceNumbers },
): Promise<void> {
  throw new Error("not implemented — S3-T03");
}

/** Returns today's three rotating Slow Sip cards based on user signals
 * (hobbies, livesWith, finance, journal themes) + a fairness rule
 * (no category repeats 3 days running). */
export async function pickSlowSipCards(
  _input: { userId: string; iso: string },
): Promise<SlowSipCard[]> {
  throw new Error("not implemented — S3-T04");
}
