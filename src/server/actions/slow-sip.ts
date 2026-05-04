"use server";

// S0-T05 — Server-action stubs for Slow Sip (Personal) features (S3).
// Real implementation lands in S3-T01..T04. UI consumers build against these.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/auth-context";
import { getJournalSignal } from "@/server/queries/journal-themes";
import { isoOffset } from "@/lib/dates";
import {
  FinanceNumbersSchema,
  HobbySchema,
  HouseholdMemberSchema,
  type FinanceNumbers,
  type GoalCategory,
  type Hobby,
  type HouseholdMember,
  type SlowSipCard,
} from "@/types";

const SetHobbiesInput = z.object({
  hobbies: z.array(HobbySchema).max(24),
});

export async function setHobbies(
  input: { hobbies: Hobby[] },
): Promise<void> {
  const v = SetHobbiesInput.parse(input);
  const userId = await getCurrentUserId();

  await db.pref.upsert({
    where: { userId },
    create: {
      userId,
      hobbies: JSON.stringify(v.hobbies),
    },
    update: {
      hobbies: JSON.stringify(v.hobbies),
    },
  });
  revalidatePath("/");
}

const SetLivesWithInput = z.object({
  livesWith: z.array(HouseholdMemberSchema).max(5),
});

export async function setLivesWith(
  input: { livesWith: HouseholdMember[] },
): Promise<void> {
  const v = SetLivesWithInput.parse(input);

  // Dedupe and enforce mutual exclusivity: "alone" cannot coexist with others.
  const unique = Array.from(new Set(v.livesWith));
  if (unique.includes("alone") && unique.length > 1) {
    throw new Error('"alone" is mutually exclusive with other household members.');
  }

  const userId = await getCurrentUserId();

  await db.pref.upsert({
    where: { userId },
    create: {
      userId,
      livesWith: JSON.stringify(unique),
    },
    update: {
      livesWith: JSON.stringify(unique),
    },
  });
  revalidatePath("/");
}

const SetFinanceModeInput = z.object({
  enabled: z.boolean(),
});

export async function setFinanceMode(
  input: { enabled: boolean },
): Promise<void> {
  const v = SetFinanceModeInput.parse(input);
  const userId = await getCurrentUserId();

  await db.pref.upsert({
    where: { userId },
    create: {
      userId,
      financeMode: v.enabled,
    },
    update: {
      financeMode: v.enabled,
    },
  });
  revalidatePath("/");
}

const SetFinanceNumbersInput = z.object({
  numbers: FinanceNumbersSchema,
});

export async function setFinanceNumbers(
  input: { numbers: FinanceNumbers },
): Promise<void> {
  const v = SetFinanceNumbersInput.parse(input);
  const userId = await getCurrentUserId();

  // Treat empty strings as null so the column is cleared cleanly.
  const norm = (s: string | null) => (s && s.trim().length > 0 ? s : null);
  const data = {
    netWorth: norm(v.numbers.netWorth),
    cashOnHand: norm(v.numbers.cashOnHand),
    savingsTarget: norm(v.numbers.savingsTarget),
  };

  await db.pref.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// S3-T04 — Slow Sip rotating cards picker.
//
// Deterministic, server-side. No LLM. Bias on user signals (hobbies, livesWith,
// financeMode, faith) plus journal-theme weights from getJournalSignal().
// Fairness: re-runs the picker for iso-1 and iso-2; any category that appears
// in BOTH prior days is excluded today (no 3-days-running repeats).
// ---------------------------------------------------------------------------

type CandidateCategory =
  | "family"
  | "partner"
  | "parenting"
  | "finance"
  | "friendships"
  | "hobbies"
  | "faith"
  | "fitness"
  | "self";

const ALL_CANDIDATES: CandidateCategory[] = [
  "family",
  "partner",
  "parenting",
  "finance",
  "friendships",
  "hobbies",
  "faith",
  "fitness",
  "self",
];

/** Lossy mapping from richer candidate → existing GoalCategory enum. */
function toGoalCategory(c: CandidateCategory): GoalCategory {
  switch (c) {
    case "family":
    case "partner":
    case "parenting":
    case "friendships":
      return "family";
    case "finance":
      return "finance";
    case "hobbies":
      return "hobby";
    case "fitness":
    case "self":
      return "fitness";
    case "faith":
      return "faith";
  }
}

/** Tiny stable string-hash → uint32. djb2-style. Used for seeded picks. */
function seedHash(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** Pick deterministically from an array using a seed string. */
function pickFromSeed<T>(arr: readonly T[], seed: string): T {
  const idx = seedHash(seed) % arr.length;
  return arr[idx]!;
}

// Fixture copy — warm, calm, never scoldy. 4-5 lines per category.
const FIXTURES: Record<
  CandidateCategory,
  { eyebrow: string; titles: string[]; bodies: string[] }
> = {
  family: {
    eyebrow: "Family",
    titles: [
      "The people who know your name",
      "A small thread, kept warm",
      "Stay close, even quietly",
      "The slow loop of love",
      "Today, a little tending",
    ],
    bodies: [
      "Send one message that doesn't need a reply. Just a thread of presence.",
      "Family time doesn't always announce itself. A short check-in counts.",
      "The boring days are the ones they'll remember. Keep showing up.",
      "Tend the small thing today and the big thing takes care of itself.",
      "Pick a name and reach out — no agenda, just hello.",
    ],
  },
  partner: {
    eyebrow: "Partner",
    titles: [
      "A small kindness, on purpose",
      "The one you choose, again",
      "Make one moment easy",
      "Tend the everyday",
      "An unrequired gesture",
    ],
    bodies: [
      "Pick one moment today to make easy for them. The kind that doesn't get filed.",
      "Small attentions outlast grand ones. Notice something and say it out loud.",
      "Ask them how today actually is. Then listen long enough that you mean it.",
      "Do the small chore they were going to do. Don't bring it up.",
      "Send one message that doesn't ask for anything back.",
    ],
  },
  parenting: {
    eyebrow: "Parenting",
    titles: [
      "They're watching how you handle today",
      "A patient minute",
      "The long, quiet work",
      "Small, on their level",
      "Show up, slowly",
    ],
    bodies: [
      "Five unhurried minutes of attention is the whole curriculum today.",
      "They don't need a perfect parent. They need a present one.",
      "Get on the floor. Match their pace. The day will keep.",
      "Name what you see them doing well. Specifically. Out loud.",
      "Tonight, the mood you bring through the door is the lesson.",
    ],
  },
  finance: {
    eyebrow: "Finance",
    titles: [
      "Quietly, you're closer than you think",
      "A small move, stacked",
      "Tend the long line",
      "Boring is the win",
      "Today's small, tomorrow's big",
    ],
    bodies: [
      "Money work is mostly the same small motions, repeated. Today's one is enough.",
      "Open the account. Look at one number. That's the whole task.",
      "The unglamorous habit is the one that compounds. Keep at it.",
      "You don't have to optimize today. You just have to not undo yesterday.",
      "One small contribution, one fewer impulse. That's the day.",
    ],
  },
  friendships: {
    eyebrow: "Friendships",
    titles: [
      "Reach out before you need to",
      "An old thread, picked back up",
      "The friends you don't have to perform for",
      "Send the small message",
      "Tend the wider circle",
    ],
    bodies: [
      "Think of someone you haven't messaged in months. Send the unimportant text.",
      "Friendships need watering, not events. A short check-in is enough today.",
      "Most reconnections start with a sentence. Send yours.",
      "Pick one person. Ask them something specific you remember.",
      "The friendship doesn't need a reason today. Just a hello.",
    ],
  },
  hobbies: {
    eyebrow: "Hobbies",
    titles: [
      "Twenty minutes of the thing",
      "The play that's just yours",
      "Pick it up, put it down",
      "A short visit to the workshop",
      "No outcome required",
    ],
    bodies: [
      "Spend twenty minutes on the thing nobody is grading you on.",
      "Hobbies don't have to be productive. They just have to be yours.",
      "Pick it up for ten minutes. Put it back. That's the whole thing.",
      "The point isn't progress. The point is that you keep showing up.",
      "Make something small. Don't show anyone. Don't post it.",
    ],
  },
  faith: {
    eyebrow: "Faith",
    titles: [
      "A quiet minute, kept",
      "The breath before the day",
      "Small practice, steady",
      "Tend the still place",
      "Return, without fuss",
    ],
    bodies: [
      "A short prayer, a single verse, a quiet breath. Any of these counts.",
      "The practice doesn't have to be long. It just has to be yours.",
      "Sit for one minute before you decide what comes next.",
      "Faith is mostly the choice to come back. So come back.",
      "Today, less explanation. More presence.",
    ],
  },
  fitness: {
    eyebrow: "Fitness",
    titles: [
      "Move a little, on purpose",
      "The body, included",
      "A short walk counts",
      "Begin smaller than you'd planned",
      "Steady, not heroic",
    ],
    bodies: [
      "A walk around the block is a workout. So is the one set you do.",
      "The smallest version of the thing still counts. Do that.",
      "Stretch for two minutes. Notice what loosens.",
      "Today's session doesn't have to be the best one. Just one of them.",
      "Move long enough that your shoulders drop. That's the dose.",
    ],
  },
  self: {
    eyebrow: "Self",
    titles: [
      "The version of you who eats lunch",
      "One thing that's just yours",
      "Tend the inside",
      "Less performance, more presence",
      "A small loop, closed",
    ],
    bodies: [
      "Take a real break today. Not a phone-scroll one. The kind your body notices.",
      "Eat something. Drink water. Stand up. Reset, then continue.",
      "Five minutes alone with no input. That's the whole assignment.",
      "Notice one thing you did well today, before you list what's left.",
      "Be a little kinder to yourself than seems strictly necessary.",
    ],
  },
};

/** Lower-cased token-set check: does any token of `target` appear in `bag`? */
function tokenHit(target: string, bag: string): boolean {
  const t = target.toLowerCase();
  return bag.includes(t);
}

/** Score every candidate based on user signals + journal themes. */
function scoreCandidates(args: {
  hobbies: string[];
  livesWith: string[];
  financeMode: boolean;
  faith: string | null;
  themeBag: string;
}): Record<CandidateCategory, number> {
  const { hobbies, livesWith, financeMode, faith, themeBag } = args;
  const score: Record<CandidateCategory, number> = {
    family: 0,
    partner: 0,
    parenting: 0,
    finance: 0,
    friendships: 0,
    hobbies: 0,
    faith: 0,
    fitness: 1,
    self: 1,
  };

  if (livesWith.includes("partner")) score.partner += 3;
  if (livesWith.includes("kids")) {
    score.parenting += 3;
    score.family += 3;
  }
  if (livesWith.includes("parents")) score.family += 2;
  if (livesWith.includes("alone") || livesWith.includes("roommates")) {
    score.friendships += 2;
  }

  if (hobbies.length > 0) {
    // 1 hobby → +2, 2 → +3, 3+ → +4 (capped).
    score.hobbies += Math.min(4, 1 + hobbies.length);
  }

  if (financeMode) score.finance += 3;
  if (faith && faith !== "none") score.faith += 2;

  // Journal-theme bias. +2 per candidate whose name appears as a token in the bag.
  for (const c of ALL_CANDIDATES) {
    if (tokenHit(c, themeBag)) score[c] += 2;
  }

  return score;
}

/**
 * Compute the top-3 categories for a given iso WITHOUT applying the fairness
 * rule. Used internally to look back at iso-1 / iso-2 history.
 *
 * The picker is deterministic given the same scores + seed (userId+iso),
 * so re-running with the same inputs gives the same result.
 */
function pickTopThree(
  scores: Record<CandidateCategory, number>,
  seedKey: string,
  exclude: Set<CandidateCategory> = new Set(),
): CandidateCategory[] {
  // Sort by score desc, breaking ties by a deterministic hash so order is stable
  // across runs but doesn't always favor the same tied category.
  const entries = (Object.entries(scores) as [CandidateCategory, number][])
    .filter(([c]) => !exclude.has(c))
    .map(([c, s]) => ({
      c,
      s,
      tie: seedHash(seedKey + ":" + c),
    }));
  entries.sort((a, b) => (b.s - a.s) || (a.tie - b.tie));
  return entries.slice(0, 3).map((e) => e.c);
}

/** Returns today's three rotating Slow Sip cards based on user signals
 * (hobbies, livesWith, finance, journal themes) + a fairness rule
 * (no category repeats 3 days running). */
export async function pickSlowSipCards(
  input: { userId: string; iso: string },
): Promise<SlowSipCard[]> {
  const { userId, iso } = input;

  // 1) Read Pref. Defensive parse of JSON arrays.
  const pref = await db.pref.findUnique({ where: { userId } });
  const safeParseArr = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const hobbies = safeParseArr(pref?.hobbies);
  const livesWith = safeParseArr(pref?.livesWith);
  const financeMode = !!pref?.financeMode;
  const faith = pref?.faith ?? null;

  // 2) Journal signal (theme names + weights). Build a single lower-cased bag
  // we can token-check against candidate names.
  const journal = await getJournalSignal(userId, iso);
  const themeBag = journal.themes.join(" ").toLowerCase();

  // 3) Score the candidates.
  const scores = scoreCandidates({ hobbies, livesWith, financeMode, faith, themeBag });

  // 4) Fairness rule: compute prior-day picks (no exclusions) and reject any
  //    category that appears in BOTH iso-1 and iso-2.
  const isoY = isoOffset(iso, -1);
  const isoYY = isoOffset(iso, -2);
  // For history we use the SAME score weights — the user's signals are stable
  // day-to-day; the deterministic seed is what makes the tie-break vary.
  const priorY = pickTopThree(scores, userId + ":" + isoY);
  const priorYY = pickTopThree(scores, userId + ":" + isoYY);
  const exclude = new Set<CandidateCategory>(
    priorY.filter((c) => priorYY.includes(c)),
  );

  // 5) Today's picks, with fairness rule applied.
  let picks = pickTopThree(scores, userId + ":" + iso, exclude);
  // Edge case: if exclusion drops us below 3 (e.g., very stable signals), top
  // up from the excluded set in deterministic order so we always render 3 cards.
  if (picks.length < 3) {
    const fill = pickTopThree(scores, userId + ":" + iso).filter(
      (c) => !picks.includes(c),
    );
    picks = [...picks, ...fill].slice(0, 3);
  }

  // 6) Compose SlowSipCard objects from fixture copy.
  return picks.map((c) => {
    const fx = FIXTURES[c];
    const title = pickFromSeed(fx.titles, userId + ":" + iso + ":t:" + c);
    const body = pickFromSeed(fx.bodies, userId + ":" + iso + ":b:" + c);
    return {
      id: "sc_" + c + "_" + iso,
      category: toGoalCategory(c),
      title,
      body,
      meta: "Today's Slow Sip pick",
    } satisfies SlowSipCard;
  });
}
