# Phase 3 — Mindfulness Panel + Journal + Scripture Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Mindfulness panel per spec §3, §8, §9, §14.1, §15. Replaces the Phase 2 smoke test with the real panel: God card, scripture preview that opens the Bible modal, rotating reflections, journal with debounced autosave, mindfulness articles with click tracking, mindfulness goals list (check + count + custom-add), 4-7-8 breath timer.

**Architecture:**
- Server Components for all read-side UI (God card, scripture preview, reflections, articles list, goals list).
- Client islands for interactive parts (Bible modal, journal textarea, breath timer) — narrowly scoped.
- The Scripture engine is **pure** (`src/lib/scripture-engine.ts`) — given today's iso + last 7 days of journal text, it picks a passage. Unit-tested without a DB.
- `DAILY_CONTENT` (god opening/prayer/carry, mindfulness articles) lives in a temporary fixture (`src/lib/daily-content-fixture.ts`). Phase 6 swaps the source from the fixture file to a per-user DB row; the consumer interface (`getDailyContent(iso)`) stays the same so Phase 6 is a one-file change.
- Click tracking on articles uses the Phase 2 `recordClick` server action (with auto-credit for `g_mf_read`).
- Journal autosave: a Client Component with a 500ms debounced server action `setNotes`, then revalidation triggers a Server Component re-render of the scripture preview (so the theme line updates if the new word added a keyword hit).

**Tech additions this phase:** `use-debounce` (for the journal textarea). No other deps — Bible modal uses native `<dialog>` semantics with a Tailwind/CSS-vars styling.

---

## File Structure (created in this phase)

| File | Purpose |
|---|---|
| `src/types/daily-content.ts` | Zod schema + types for `DAILY_CONTENT` (matches spec §5) |
| `src/lib/daily-content-fixture.ts` | Temporary static content (replaced in Phase 6) |
| `src/server/queries/daily-content.ts` | `getDailyContent(userId, iso)` — Phase 3 reads from fixture; Phase 6 swaps to DB |
| `src/lib/scriptures.ts` | `SCRIPTURES` library (12 KJV passages) |
| `src/lib/theme-keywords.ts` | `THEME_KEYWORDS` map |
| `src/lib/scripture-engine.ts` | `recentJournalText`, `themeWeights`, `pickScripture` |
| `src/lib/reflections.ts` | `REFLECTIONS` library + `pickReflections(iso)` rotation |
| `src/components/mindfulness/GodCard.tsx` | Server component |
| `src/components/mindfulness/ScripturePreviewCard.tsx` | Server component (prepares props for the modal) |
| `src/components/mindfulness/BibleModal.tsx` | Client component |
| `src/components/mindfulness/ScriptureWithModal.tsx` | Client wrapper (preview + modal in one island) |
| `src/components/mindfulness/Reflections.tsx` | Server component |
| `src/components/mindfulness/Journal.tsx` | Client component (debounced) |
| `src/components/mindfulness/BreathTimer.tsx` | Client component |
| `src/components/mindfulness/MindfulnessArticles.tsx` | Server component with click-tracked anchors |
| `src/components/mindfulness/MindfulnessGoals.tsx` | Server component (full goals UI: check/count/custom-add) |
| `src/components/mindfulness/AddGoalForm.tsx` | Client component (form with Server Action) |
| `src/components/panels/MindfulnessPanel.tsx` | Replaces Phase 2 smoke test — composes all of the above |
| `tests/unit/scripture-engine.test.ts` | Pure tests for the engine |
| `tests/unit/reflections.test.ts` | Rotation tests |
| `tests/unit/daily-content-schema.test.ts` | Zod schema validation tests |

---

## Task 1: Daily content fixture + schema + getter

**Files:**
- Create: `src/types/daily-content.ts`, `src/lib/daily-content-fixture.ts`, `src/server/queries/daily-content.ts`
- Test: `tests/unit/daily-content-schema.test.ts`

- [ ] **Step 1: Create `src/types/daily-content.ts`**

```ts
import { z } from "zod";

export const ArticleSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  summary: z.string(),
});

export const TopStorySchema = z.object({
  kind: z.enum(["lead", ""]).optional().default(""),
  eyebrow: z.string(),
  badges: z.array(z.tuple([z.string(), z.string()])).default([]),
  title: z.string(),
  body: z.string(),
  url: z.string().url(),
  src: z.string(),
});

export const QuoteSchema = z.object({
  text: z.string(),
  source: z.string(),
  target: z.string().optional().default(""),
  url: z.string().url().optional(),
});

export const RepoSchema = z.object({
  name: z.string(),
  org: z.string(),
  stars: z.string(),
  weekly: z.string(),
  license: z.string(),
  lang: z.string(),
  pitch: z.string(),
  url: z.string().url(),
});

export const DailyContentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subhead: z.string(),
  god: z.object({
    opening: z.string(),
    prayer: z.string(),
    carry: z.string(),
  }),
  mindfulness: z.object({
    articles: z.array(ArticleSchema),
  }),
  business: z.object({
    headline: z.string(),
    briefing: z.string(),
    topStories: z.array(TopStorySchema),
    scan: z.array(z.string()),
    articles: z.array(z.object({
      badges: z.array(z.tuple([z.string(), z.string()])).default([]),
      title: z.string(),
      summary: z.string(),
      url: z.string().url(),
      src: z.string(),
    })),
    quotes: z.array(QuoteSchema),
    repos: z.array(RepoSchema),
    watchlist: z.array(z.string()),
  }),
  personal: z.object({
    headline: z.string(),
    motivation: z.object({
      text: z.string(),
      author: z.string(),
    }),
    articles: z.array(ArticleSchema),
  }),
});

export type DailyContent = z.infer<typeof DailyContentSchema>;
export type Article = z.infer<typeof ArticleSchema>;
```

- [ ] **Step 2: Create `src/lib/daily-content-fixture.ts`**

> Phase 3 uses a single fixture covering today's date. Phase 6 replaces this file's contents with a no-op (or deletes it) and the getter starts reading from the DB.

```ts
import type { DailyContent } from "@/types/daily-content";
import { todayISO } from "@/lib/dates";

export function fixtureFor(iso: string): DailyContent {
  // Same shape regardless of date until Phase 6 makes content per-day.
  return {
    date: iso,
    subhead: "A fresh page.",
    god: {
      opening:
        "The morning belongs to no one yet. Take a slow breath and let your shoulders drop. The day will arrive — meet it on your own terms.",
      prayer:
        "Father, settle me. Quiet the noise that wants to fill this hour. Make me steady, generous, and a little braver than yesterday. Whatever I face today, let me carry your peace into it.",
      carry: "I am held; I do not need to hold everything.",
    },
    mindfulness: {
      articles: [
        {
          title: "Why morning routines matter more than evening ones",
          source: "Psyche",
          url: "https://psyche.co/ideas/why-morning-routines-matter",
          summary:
            "A short, practical look at how the first 20 minutes of the day shape attention for the next twelve hours.",
        },
        {
          title: "On stillness",
          source: "The Marginalian",
          url: "https://www.themarginalian.org/on-stillness",
          summary:
            "Stillness is not the absence of motion; it is the presence of attention. A quiet meditation on what we lose when we are always busy.",
        },
      ],
    },
    business: {
      headline: "Today's edge: ship the smallest version of the thing.",
      briefing:
        "<strong>Smallest viable cut</strong> beats a beautiful plan you don't ship. Pick one user, one path, one screen. Move it.",
      topStories: [],
      scan: [],
      articles: [],
      quotes: [],
      repos: [],
      watchlist: [],
    },
    personal: {
      headline: "Move your body before you check your phone.",
      motivation: {
        text: "We do not rise to the level of our goals; we fall to the level of our systems.",
        author: "James Clear",
      },
      articles: [],
    },
  };
}

export const TODAY_FIXTURE: DailyContent = fixtureFor(todayISO());
```

- [ ] **Step 3: Create `src/server/queries/daily-content.ts`**

```ts
import "server-only";
import type { DailyContent } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";

/**
 * Phase 3: returns the fixture (same content regardless of user/iso).
 * Phase 6: reads from the DailyContent table keyed by (userId, iso); falls back
 *          to the fixture only if the user has no row yet (e.g. new users).
 */
export async function getDailyContent(_userId: string, iso: string): Promise<DailyContent> {
  return fixtureFor(iso);
}
```

- [ ] **Step 4: Write `tests/unit/daily-content-schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { DailyContentSchema } from "@/types/daily-content";
import { fixtureFor } from "@/lib/daily-content-fixture";

describe("DailyContent schema", () => {
  it("validates the fixture", () => {
    const r = DailyContentSchema.safeParse(fixtureFor("2026-05-02"));
    expect(r.success).toBe(true);
  });

  it("rejects malformed dates", () => {
    const bad = { ...fixtureFor("2026-05-02"), date: "May 2" };
    expect(DailyContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid URLs", () => {
    const bad = fixtureFor("2026-05-02");
    bad.mindfulness.articles[0].url = "not a url";
    expect(DailyContentSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 5: Run, verify pass**

```bash
pnpm test tests/unit/daily-content-schema.test.ts
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add src/types/daily-content.ts src/lib/daily-content-fixture.ts src/server/queries/daily-content.ts tests/unit/daily-content-schema.test.ts
git commit -m "feat(content): daily-content schema + temporary fixture + getter (Phase 6 replaces source)"
```

---

## Task 2: Scriptures library + theme keywords

**Files:**
- Create: `src/lib/scriptures.ts`, `src/lib/theme-keywords.ts`

- [ ] **Step 1: Create `src/lib/scriptures.ts`** (the 12 KJV passages from spec §9.1)

```ts
export type Verse = { v: number; text: string };
export type Commentary = { title: string; body: string };
export type Scripture = {
  ref: string;
  theme: string;
  themes: string[];
  passage: Verse[];
  commentary: Commentary[];
};

export const SCRIPTURES: Scripture[] = [
  {
    ref: "Philippians 4:11-13",
    theme: "Contentment",
    themes: ["contentment", "content", "peace", "enough", "satisfied"],
    passage: [
      { v: 11, text: "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content." },
      { v: 12, text: "I know both how to be abased, and I know how to abound: every where and in all things I am instructed both to be full and to be hungry, both to abound and to suffer need." },
      { v: 13, text: "I can do all things through Christ which strengtheneth me." },
    ],
    commentary: [
      { title: "Contentment is learned, not given", body: "Paul says he has 'learned' to be content — even contentment is a discipline practiced in good seasons and hard ones." },
      { title: "v.13 in context", body: "This famous verse sits inside a passage about being content with little. Strength here is the strength to need less, not the strength to acquire more." },
    ],
  },
  {
    ref: "Micah 6:8",
    theme: "Humility",
    themes: ["humble", "humility", "pride", "prideful", "arrogant", "ego"],
    passage: [
      { v: 8, text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },
    ],
    commentary: [
      { title: "Three things, in order", body: "Justice (right action), mercy (kind heart), humility (right posture) — the order is deliberate. The first two are easier when the third is in place." },
    ],
  },
  {
    ref: "Matthew 6:25-27, 33-34",
    theme: "Anxiety",
    themes: ["anxious", "anxiety", "worry", "worried", "stressed", "overwhelm", "fear", "fearful", "dread"],
    passage: [
      { v: 25, text: "Therefore I say unto you, Take no thought for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than meat, and the body than raiment?" },
      { v: 26, text: "Behold the fowls of the air: for they sow not, neither do they reap, nor gather into barns; yet your heavenly Father feedeth them. Are ye not much better than they?" },
      { v: 27, text: "Which of you by taking thought can add one cubit unto his stature?" },
      { v: 33, text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
      { v: 34, text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof." },
    ],
    commentary: [
      { title: "Birds and lilies", body: "Jesus's argument is from the lesser to the greater: if creation is provided for without anxiety, how much more you?" },
      { title: "Sufficient for today", body: "Worry is borrowing trouble from a tomorrow that isn't here. Today's portion is the only portion you've been given." },
    ],
  },
  {
    ref: "1 Thessalonians 5:16-18",
    theme: "Gratitude",
    themes: ["grateful", "gratitude", "thankful", "thanks", "blessing", "bless"],
    passage: [
      { v: 16, text: "Rejoice evermore." },
      { v: 17, text: "Pray without ceasing." },
      { v: 18, text: "In every thing give thanks: for this is the will of God in Christ Jesus concerning you." },
    ],
    commentary: [
      { title: "In, not for", body: "It says 'in' every thing, not 'for' every thing. Gratitude is found alongside hard things, not in pretending they are good." },
    ],
  },
  {
    ref: "Colossians 3:12-14",
    theme: "Forgiveness",
    themes: ["forgive", "forgiveness", "grudge", "resent", "resentment", "bitter", "bitterness"],
    passage: [
      { v: 12, text: "Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering;" },
      { v: 13, text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye." },
      { v: 14, text: "And above all these things put on charity, which is the bond of perfectness." },
    ],
    commentary: [
      { title: "Put on", body: "The verb is active and daily. Forgiveness is something you wear — not something that happens to you." },
    ],
  },
  {
    ref: "Proverbs 3:5-6",
    theme: "Trust",
    themes: ["trust", "control", "controlling", "plan", "uncertain", "uncertainty", "doubt"],
    passage: [
      { v: 5, text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
      { v: 6, text: "In all thy ways acknowledge him, and he shall direct thy paths." },
    ],
    commentary: [
      { title: "Lean not", body: "The verse is not anti-thinking. It is anti-leaning — i.e., do not put your weight where it cannot hold." },
    ],
  },
  {
    ref: "Galatians 6:9",
    theme: "Perseverance",
    themes: ["discipline", "consistent", "persevere", "quit", "give up", "tired", "weary", "burnout"],
    passage: [
      { v: 9, text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not." },
    ],
    commentary: [
      { title: "Due season", body: "The harvest comes on its own clock, not yours. The work today is a deposit; the season is the withdrawal." },
    ],
  },
  {
    ref: "Ephesians 6:4",
    theme: "Fatherhood",
    themes: ["kids", "children", "dad", "father", "parent", "parenting"],
    passage: [
      { v: 4, text: "And, ye fathers, provoke not your children to wrath: but bring them up in the nurture and admonition of the Lord." },
    ],
    commentary: [
      { title: "Provoke not", body: "The first instruction to fathers is restraint. Discipline begins with the father's own self-control, not the child's." },
    ],
  },
  {
    ref: "Colossians 3:23-24",
    theme: "Work",
    themes: ["career", "work", "job", "project", "team", "leadership", "ceo", "cto"],
    passage: [
      { v: 23, text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;" },
      { v: 24, text: "Knowing that of the Lord ye shall receive the reward of the inheritance: for ye serve the Lord Christ." },
    ],
    commentary: [
      { title: "Heartily", body: "Wholeheartedness is the antidote to status anxiety at work. The audience changes; the work changes with it." },
    ],
  },
  {
    ref: "2 Corinthians 9:7",
    theme: "Generosity",
    themes: ["generous", "generosity", "giving", "selfless", "tithe", "share"],
    passage: [
      { v: 7, text: "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." },
    ],
    commentary: [
      { title: "Cheerful, not coerced", body: "The text rules out two distortions: giving from guilt, and giving from pressure. Cheerfulness is the test." },
    ],
  },
  {
    ref: "Psalm 23:1-4",
    theme: "Stillness",
    themes: ["still", "stillness", "rest", "quiet", "silence", "calm", "sabbath"],
    passage: [
      { v: 1, text: "The LORD is my shepherd; I shall not want." },
      { v: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
      { v: 3, text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake." },
      { v: 4, text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me." },
    ],
    commentary: [
      { title: "Maketh me", body: "Sometimes rest is not chosen — it is led to. The shepherd is more insistent on stillness than the sheep." },
    ],
  },
  {
    ref: "Psalm 46:10",
    theme: "Stillness",
    themes: ["still", "stillness", "rest", "quiet", "silence", "calm", "sabbath"],
    passage: [
      { v: 10, text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
    ],
    commentary: [
      { title: "Stillness is knowledge", body: "The verse links being still to knowing — not to doing nothing. Quiet is how some truths arrive." },
    ],
  },
];
```

- [ ] **Step 2: Create `src/lib/theme-keywords.ts`** (spec §9.1)

```ts
export const THEME_KEYWORDS: Record<string, string[]> = {
  Contentment: ["content", "contentment", "enough", "satisfied", "comparison", "jealous", "envy"],
  Humility:    ["humble", "humility", "pride", "prideful", "arrogant", "ego"],
  Anxiety:     ["anxious", "anxiety", "worry", "worried", "stressed", "overwhelm", "fear", "fearful", "dread"],
  Gratitude:   ["grateful", "gratitude", "thankful", "thanks", "blessing", "bless"],
  Forgiveness: ["forgive", "forgiveness", "grudge", "resent", "resentment", "bitter", "bitterness"],
  Trust:       ["trust", "control", "controlling", "plan", "uncertain", "uncertainty", "doubt"],
  Perseverance:["discipline", "consistent", "persevere", "quit", "give up", "tired", "weary", "burnout"],
  Fatherhood:  ["kids", "children", "dad", "father", "parent", "parenting"],
  Work:        ["career", "work", "job", "project", "team", "leadership", "ceo", "cto"],
  Generosity:  ["generous", "generosity", "giving", "selfless", "tithe", "share"],
  Stillness:   ["still", "stillness", "rest", "quiet", "silence", "calm", "sabbath"],
};
```

> The spec includes user-specific tokens (kids' names, friends, company). Onboarding (Phase 9) will let the user opt-in to extending these sets per-user; for v1 these are the generic seeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scriptures.ts src/lib/theme-keywords.ts
git commit -m "feat(scripture): SCRIPTURES library (12 KJV passages) + THEME_KEYWORDS map"
```

---

## Task 3: Scripture engine (pure)

**Files:**
- Create: `src/lib/scripture-engine.ts`
- Test: `tests/unit/scripture-engine.test.ts`

- [ ] **Step 1: Write the failing test `tests/unit/scripture-engine.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  themeWeights,
  pickScripture,
  joinJournalText,
} from "@/lib/scripture-engine";

describe("themeWeights", () => {
  it("counts whole-word keyword hits", () => {
    const text = "I felt anxious about the demo. anxiety crept in twice.";
    const w = themeWeights(text);
    expect(w.Anxiety).toBe(2);
  });

  it("ignores keywords inside other words", () => {
    expect(themeWeights("contentment").Contentment).toBe(1);
    expect(themeWeights("incontent")).toEqual({}); // no whole-word match
  });

  it("returns empty object when nothing matches", () => {
    expect(themeWeights("just a regular thursday")).toEqual({});
  });
});

describe("pickScripture", () => {
  it("picks deterministically by date when no themes are active", () => {
    const a = pickScripture("2026-05-02", "");
    const b = pickScripture("2026-05-02", "");
    expect(a.passage.ref).toBe(b.passage.ref);
    expect(a.hint).toBeNull();
  });

  it("different dates yield different (or at minimum cycle through) passages", () => {
    const refs = new Set();
    for (let i = 0; i < 14; i++) {
      const iso = `2026-05-${String((i % 28) + 1).padStart(2, "0")}`;
      refs.add(pickScripture(iso, "").passage.ref);
    }
    expect(refs.size).toBeGreaterThan(1);
  });

  it("when journal mentions humility, it biases toward Humility-tagged scriptures", () => {
    const out = pickScripture("2026-05-02", "I felt humble today.");
    expect(out.passage.theme).toBe("Humility");
    expect(out.hint).toBe("Humility");
  });

  it("multiple active themes — the first one wins as the hint, but the candidate set is the union", () => {
    const out = pickScripture("2026-05-02", "I was anxious and ungrateful and grateful.");
    // both Anxiety and Gratitude match; one of them is the hint
    expect(["Anxiety", "Gratitude"]).toContain(out.hint);
    // the picked passage's theme must be in the union
    expect(["Anxiety", "Gratitude"]).toContain(out.passage.theme);
  });
});

describe("joinJournalText", () => {
  it("joins with newlines and lowercases", () => {
    expect(joinJournalText(["A", "b", "C"])).toBe("a\nb\nc");
  });
});
```

- [ ] **Step 2: Create `src/lib/scripture-engine.ts`**

```ts
import { SCRIPTURES, type Scripture } from "@/lib/scriptures";
import { THEME_KEYWORDS } from "@/lib/theme-keywords";

export function joinJournalText(notes: string[]): string {
  return notes.join("\n").toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function themeWeights(text: string): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
    let count = 0;
    for (const kw of kws) {
      const re = new RegExp("\\b" + escapeRegex(kw) + "\\b", "gi");
      const m = text.match(re);
      if (m) count += m.length;
    }
    if (count > 0) weights[theme] = count;
  }
  return weights;
}

export function pickScripture(
  todayIso: string,
  recentJournalText: string
): { passage: Scripture; hint: string | null } {
  const weights = themeWeights(recentJournalText);
  const themed = Object.keys(weights);

  let candidates: Scripture[] = SCRIPTURES;
  if (themed.length > 0) {
    const filtered = SCRIPTURES.filter((s) => themed.includes(s.theme));
    if (filtered.length > 0) candidates = filtered;
  }

  // Seed by date so the same passage shows all day
  const dayNum = Math.floor(new Date(todayIso + "T00:00:00").getTime() / 86_400_000);
  const passage = candidates[dayNum % candidates.length];
  return {
    passage,
    hint: themed.length > 0 ? themed[0] : null,
  };
}
```

- [ ] **Step 3: Run, verify pass**

```bash
pnpm test tests/unit/scripture-engine.test.ts
```

Expected: 7 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scripture-engine.ts tests/unit/scripture-engine.test.ts
git commit -m "feat(scripture): pure engine — themeWeights + pickScripture (date-seeded, journal-biased)"
```

---

## Task 4: Reflections library + rotation

**Files:**
- Create: `src/lib/reflections.ts`
- Test: `tests/unit/reflections.test.ts`

The original HTML file ships 15 reflections with names from Dallas's life. For v1 we ship a generic 15 that any user can read; Phase 9 onboarding lets the user customize. Names are intentionally absent from these baseline entries.

- [ ] **Step 1: Create `src/lib/reflections.ts`**

```ts
export type Reflection = {
  title: string;
  body: string;
  practice: string;
};

export const REFLECTIONS: Reflection[] = [
  { title: "Begin where you are", body: "Today is not last year, and it is not next quarter. The version of you that wakes up has only the next hour to attend to.", practice: "Name three things you can see, hear, and feel — let your nervous system catch up to your morning." },
  { title: "The work is the work", body: "Mastery is a series of unremarkable Tuesdays. The temptation is to look for the breakthrough; the practice is to do the next small thing well.", practice: "Pick one thing you've been avoiding because it isn't impressive. Do it before noon." },
  { title: "Less is more often the answer", body: "If you can't decide, the menu is too long. Cut the options in half before you re-read them.", practice: "List today's commitments. Cross out anything that wouldn't matter if you didn't do it." },
  { title: "Friction tells you something", body: "When the same task feels heavy three days in a row, the task isn't the problem — the framing is.", practice: "Ask: what would make this easier? Then change one thing about the conditions, not the work." },
  { title: "People are not problems", body: "When you find yourself rehearsing what someone did wrong, you're not solving anything; you're rehearsing.", practice: "Write the most generous interpretation of their behavior you can sustain." },
  { title: "The second arrow", body: "Pain is the first arrow. The story you tell about the pain — that you should be over it, that it shouldn't have happened — is the second one. The second is the one that lingers.", practice: "Notice when you start narrating your discomfort. Let the first arrow be the only one." },
  { title: "Walk a slower mile", body: "Speed eats attention. There is a pace at which you start noticing the people you live with again.", practice: "Take a walk without your phone. Count the trees on your block. Yes, really." },
  { title: "Generosity is a discipline", body: "The instinct to be small with your time, your money, and your praise is older than your values. Discipline is choosing the value over the instinct.", practice: "Compliment someone today, specifically and without qualification." },
  { title: "Sleep is a position", body: "You will not solve the hard problem at midnight. You will solve a worse version of it at 5 AM, rested.", practice: "Decide tonight's bedtime now, and write it where you'll see it at 9 PM." },
  { title: "The body keeps the score", body: "Tension you ignore in your shoulders becomes tension in your speech. Move first, decide second.", practice: "Stand up. Roll your shoulders three times. Whatever you were thinking about, think about it again." },
  { title: "Read for surprise", body: "The point of reading widely is to be wrong about something you thought you knew.", practice: "Read one essay outside your field today. Highlight the sentence that bothered you." },
  { title: "You are not your last meeting", body: "An hour with the wrong energy can color the whole afternoon if you let it.", practice: "Between meetings, take 90 seconds. Stand. Breathe. Re-enter your own life." },
  { title: "Care without urgency", body: "Anxious caring tells the people you love that they are responsible for your peace. Calm caring tells them they are loved.", practice: "Ask someone how they are — and stay quiet long enough to hear them." },
  { title: "Smaller, sooner", body: "Waiting until you can do it all at once is how you don't do it at all. The first attempt is allowed to be embarrassing.", practice: "Ship the smallest version of the thing today, even if it makes you wince." },
  { title: "Notice the gift", body: "There is at least one thing about today that, in five years, you will wish you had paid more attention to.", practice: "Tonight, write one sentence about a moment you almost missed." },
];

export function pickReflections(iso: string, n = 5): Reflection[] {
  const seed = Math.floor(new Date(iso + "T00:00:00").getTime() / 86_400_000);
  const out: Reflection[] = [];
  for (let i = 0; i < n; i++) {
    out.push(REFLECTIONS[(seed + i * 3) % REFLECTIONS.length]);
  }
  return out;
}
```

- [ ] **Step 2: Write `tests/unit/reflections.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { pickReflections, REFLECTIONS } from "@/lib/reflections";

describe("pickReflections", () => {
  it("returns 5 reflections", () => {
    expect(pickReflections("2026-05-02")).toHaveLength(5);
  });

  it("the same date returns the same set", () => {
    expect(pickReflections("2026-05-02")).toEqual(pickReflections("2026-05-02"));
  });

  it("different dates can return different sets", () => {
    const sets = new Set();
    for (let i = 1; i <= 14; i++) {
      const iso = `2026-05-${String(i).padStart(2, "0")}`;
      sets.add(pickReflections(iso).map((r) => r.title).join("|"));
    }
    expect(sets.size).toBeGreaterThan(1);
  });

  it("the 15-entry library has no duplicate titles", () => {
    const titles = REFLECTIONS.map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
```

- [ ] **Step 3: Run, verify pass**

```bash
pnpm test tests/unit/reflections.test.ts
```

Expected: 4 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/reflections.ts tests/unit/reflections.test.ts
git commit -m "feat(reflections): 15-entry library + date-seeded rotation (5 per day, stride 3)"
```

---

## Task 5: God card + Scripture preview server components

**Files:**
- Create: `src/components/mindfulness/GodCard.tsx`, `src/components/mindfulness/ScripturePreviewCard.tsx`

- [ ] **Step 1: Create `src/components/mindfulness/GodCard.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function GodCard({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const { opening, prayer, carry } = content.god;

  return (
    <article
      className="card"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, var(--gold-soft), transparent 60%), var(--surface-solid)",
      }}
    >
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DAILY · GOD
      </div>
      <p className="serif" style={{ fontSize: "1.05rem", lineHeight: 1.65, marginTop: 12, color: "var(--ink)" }}>
        {opening}
      </p>
      <blockquote
        className="serif"
        style={{
          margin: "16px 0 0",
          padding: "16px 20px",
          borderLeft: "3px solid var(--gold)",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          fontSize: "1.02rem",
          lineHeight: 1.65,
          color: "var(--ink)",
        }}
      >
        {prayer}
      </blockquote>
      <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>
        Carry today: {carry}
      </p>
    </article>
  );
}
```

- [ ] **Step 2: Create `src/components/mindfulness/ScripturePreviewCard.tsx`**

This is the *server-side* preview. The interactive opener (button + modal) is wired in Task 7's `ScriptureWithModal` client wrapper.

```tsx
import { getDayOrEmpty } from "@/server/queries/days";
import { getDaysRange } from "@/server/queries/days";
import { isoOffset } from "@/lib/dates";
import { joinJournalText, pickScripture } from "@/lib/scripture-engine";
import type { Scripture } from "@/lib/scriptures";

export async function selectScriptureForUser(
  userId: string,
  iso: string
): Promise<{ passage: Scripture; hint: string | null }> {
  const sevenAgo = isoOffset(iso, -6);
  const days = await getDaysRange(userId, sevenAgo, iso);
  const todayDay = await getDayOrEmpty(userId, iso);
  const allNotes = [...days.map((d) => d.notes), todayDay.notes].filter(Boolean);
  return pickScripture(iso, joinJournalText(allNotes));
}

export function ScripturePreview({
  passage,
  hint,
}: {
  passage: Scripture;
  hint: string | null;
}) {
  const first = passage.passage[0];
  const snippet =
    first.text.length > 140 ? first.text.slice(0, 137).trimEnd() + "…" : first.text;

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      style={{
        background:
          "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
        color: "var(--paper-ink)",
        borderColor: "var(--paper-line)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <BookSvg />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)" }}>
            DAILY SCRIPTURE · KJV
          </div>
          <div className="serif" style={{ fontSize: "1.15rem", marginTop: 2 }}>
            {passage.ref}
          </div>
          <p
            className="serif"
            style={{
              margin: "8px 0 0",
              fontStyle: "italic",
              fontSize: "0.98rem",
              lineHeight: 1.6,
            }}
          >
            “{snippet}”
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--paper-ink)", opacity: 0.75 }}>
            Theme: {passage.theme}
            {hint ? ` · biased by your journal (${hint})` : ""}
          </p>
        </div>
        <span aria-hidden style={{ fontSize: 18, opacity: 0.6 }}>›</span>
      </div>
    </div>
  );
}

function BookSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z" />
      <path d="M4 17a3 3 0 0 1 3-3h12" />
    </svg>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mindfulness/GodCard.tsx src/components/mindfulness/ScripturePreviewCard.tsx
git commit -m "feat(mindfulness): God card and Scripture preview (server components)"
```

---

## Task 6: Bible modal (client component) + ScriptureWithModal wrapper

**Files:**
- Create: `src/components/mindfulness/BibleModal.tsx`, `src/components/mindfulness/ScriptureWithModal.tsx`

- [ ] **Step 1: Create `src/components/mindfulness/BibleModal.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { Scripture } from "@/lib/scriptures";

export function BibleModal({
  passage,
  hint,
  open,
  onClose,
}: {
  passage: Scripture;
  hint: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,15,5,.78)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bible-ref"
        style={{
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background:
            "radial-gradient(60% 40% at 30% 20%, rgba(58,46,28,0.06), transparent 60%), radial-gradient(60% 40% at 70% 80%, rgba(58,46,28,0.06), transparent 60%), linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
          color: "var(--paper-ink)",
          border: "1px solid var(--paper-line)",
          borderRadius: 8,
          boxShadow: "0 40px 100px rgba(0,0,0,.65), 0 0 0 1px rgba(58,46,28,.18)",
          padding: "20px 28px",
        }}
      >
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".18em", fontWeight: 600, color: "var(--gold)" }}>
              HOLY BIBLE · KING JAMES VERSION
            </div>
            <h2 id="bible-ref" className="serif" style={{ fontSize: "1.4rem", margin: "4px 0 0" }}>
              {passage.ref}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {hint ? (
              <span
                style={{
                  background: "rgba(58,46,28,0.08)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: ".08em",
                }}
              >
                Theme: {passage.theme} · biased ({hint})
              </span>
            ) : (
              <span style={{ fontSize: 11, opacity: 0.7 }}>Theme: {passage.theme}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: "none", border: 0, cursor: "pointer", color: "var(--paper-ink)", fontSize: 22 }}
            >
              ×
            </button>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid var(--paper-line)",
          }}
        >
          <section className="bible-col">
            <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)", marginBottom: 10 }}>
              THE PASSAGE
            </div>
            <div className="serif" style={{ fontSize: "1.05rem", lineHeight: 1.85 }}>
              {passage.passage.map((v) => (
                <p key={v.v} style={{ paddingLeft: "1.6em", textIndent: "-1.6em", margin: "0 0 8px" }}>
                  <span
                    style={{
                      color: "var(--gold)",
                      fontFamily: "var(--font-inter)",
                      fontSize: 11,
                      verticalAlign: "super",
                      marginRight: 4,
                    }}
                  >
                    {v.v}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          </section>

          <section style={{ borderLeft: "1px solid var(--paper-line)", paddingLeft: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)", marginBottom: 10 }}>
              NOTES &amp; COMMENTARY
            </div>
            {passage.commentary.map((c, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <h3 className="serif" style={{ fontSize: "1rem", margin: "0 0 4px" }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: "0.92rem", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </section>
        </div>

        <footer
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid var(--paper-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ opacity: 0.7 }}>
            Mention a theme in your journal — tomorrow's pick adapts.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--paper-ink)",
              color: "var(--paper)",
              border: 0,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/mindfulness/ScriptureWithModal.tsx`**

```tsx
"use client";
import { useState } from "react";
import { ScripturePreview } from "./ScripturePreviewCard";
import { BibleModal } from "./BibleModal";
import type { Scripture } from "@/lib/scriptures";

export function ScriptureWithModal({
  passage,
  hint,
}: {
  passage: Scripture;
  hint: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Open ${passage.ref}`}
      >
        <ScripturePreview passage={passage} hint={hint} />
      </div>
      <BibleModal passage={passage} hint={hint} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mindfulness/BibleModal.tsx src/components/mindfulness/ScriptureWithModal.tsx
git commit -m "feat(mindfulness): Bible modal (parchment, verse numbers, commentary, ESC/scrim/Close)"
```

---

## Task 7: Journal textarea (client, debounced)

**Files:**
- Create: `src/components/mindfulness/Journal.tsx`

- [ ] **Step 1: Install `use-debounce`**

```bash
pnpm add use-debounce
```

- [ ] **Step 2: Create `src/components/mindfulness/Journal.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setNotes } from "@/server/actions/days";

export function Journal({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string>("");

  const save = useDebouncedCallback(async (text: string) => {
    setStatus("saving…");
    try {
      await setNotes({ userId, iso, notes: text });
      const t = new Date();
      setStatus(`saved · ${t.toLocaleTimeString()}`);
    } catch {
      setStatus("save failed — retrying on next change");
    }
  }, 500);

  useEffect(() => {
    return () => save.flush();
  }, [save]);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        JOURNAL
      </div>
      <h2 className="serif" style={{ fontSize: "1.2rem", margin: "8px 0 12px" }}>
        Today's reflection
      </h2>
      <textarea
        className="serif notes"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        rows={6}
        placeholder="Mention themes (humility, anxious, contentment) — tomorrow's scripture adapts."
        maxLength={50_000}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: 12,
          fontSize: "1rem",
          lineHeight: 1.6,
          resize: "vertical",
          fontFamily: "var(--font-fraunces)",
        }}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: "var(--ink-muted)" }}>{status}</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mindfulness/Journal.tsx package.json pnpm-lock.yaml
git commit -m "feat(journal): debounced textarea autosave (500ms) wired to setNotes"
```

---

## Task 8: 4-7-8 breath timer (client)

**Files:**
- Create: `src/components/mindfulness/BreathTimer.tsx`

- [ ] **Step 1: Create `src/components/mindfulness/BreathTimer.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type Phase = "Inhale" | "Hold" | "Exhale";
const SCRIPT: Array<{ phase: Phase; secs: number }> = [
  { phase: "Inhale", secs: 4 },
  { phase: "Hold",   secs: 7 },
  { phase: "Exhale", secs: 8 },
];

export function BreathTimer() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("Inhale");
  const [count, setCount] = useState(SCRIPT[0].secs);
  const stepIx = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      tickRef.current += 1;
      const cur = SCRIPT[stepIx.current];
      const remaining = cur.secs - (tickRef.current % cur.secs);
      if (tickRef.current % cur.secs === 0) {
        stepIx.current = (stepIx.current + 1) % SCRIPT.length;
        const next = SCRIPT[stepIx.current];
        setPhase(next.phase);
        setCount(next.secs);
      } else {
        setCount(remaining);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    stepIx.current = 0;
    tickRef.current = 0;
    setPhase("Inhale");
    setCount(SCRIPT[0].secs);
    setRunning(true);
  };
  const stop = () => setRunning(false);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BREATH · 4–7–8
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div>
          <div className="serif" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
            {running ? phase : "Ready"}
          </div>
          <div className="serif" style={{ fontSize: "2.4rem", color: "var(--sage-deep)" }}>
            {running ? count : "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={running ? stop : start}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "10px 18px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 600,
            letterSpacing: ".08em",
          }}
        >
          {running ? "Stop" : "Start 4-7-8"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mindfulness/BreathTimer.tsx
git commit -m "feat(breath): 4-7-8 timer (Inhale 4 / Hold 7 / Exhale 8) cycle"
```

---

## Task 9: Mindfulness articles (with click tracking) + Reflections + Goals + Panel composition

**Files:**
- Create: `src/components/mindfulness/MindfulnessArticles.tsx`, `src/components/mindfulness/Reflections.tsx`, `src/components/mindfulness/MindfulnessGoals.tsx`, `src/components/mindfulness/AddGoalForm.tsx`
- Modify: `src/components/panels/MindfulnessPanel.tsx`

- [ ] **Step 1: Create `src/components/mindfulness/MindfulnessArticles.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";

export async function MindfulnessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.mindfulness.articles;
  if (articles.length === 0) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TODAY'S READING
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {articles.map((a) => (
          <form
            key={a.url}
            action={async () => {
              "use server";
              await recordClick({ userId, iso, section: "mindfulness" });
            }}
            style={{ display: "contents" }}
          >
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              data-track-cat="mindfulness"
              onClick={(e) => {
                // Server-side credit happens via the form action below;
                // but anchor click also navigates — so we submit the form first.
                const f = (e.currentTarget as HTMLAnchorElement).closest("form");
                f?.requestSubmit();
              }}
              style={{
                display: "block",
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500 }}>{a.title}</div>
              <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)" }}>{a.summary}</p>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{a.source}</div>
            </a>
          </form>
        ))}
      </div>
    </section>
  );
}
```

> **Note on click + navigate:** the anchor opens the article in a new tab; the inline form action records the click via the Phase 2 `recordClick` server action. Since the anchor target is `_blank`, the original tab stays on the dashboard while the server action runs.

- [ ] **Step 2: Create `src/components/mindfulness/Reflections.tsx`**

```tsx
import { pickReflections } from "@/lib/reflections";

export function Reflections({ iso }: { iso: string }) {
  const items = pickReflections(iso);
  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        REFLECTIONS · TODAY
      </div>
      <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
        {items.map((r, i) => (
          <article key={i}>
            <h3 className="serif" style={{ fontSize: "1.05rem", margin: "0 0 4px", color: "var(--ink)" }}>
              {r.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{r.body}</p>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--sage-deep)", fontStyle: "italic" }}>
              Practice: {r.practice}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/mindfulness/AddGoalForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";

export function AddGoalForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px dashed var(--line-strong)",
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          marginTop: 12,
          fontSize: 13,
        }}
      >
        + Add a mindfulness goal
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setPending(true);
        try {
          await addGoal({ userId, section: "mindfulness", title: title.trim(), type: "check", target: 1 });
          setTitle("");
          setOpen(false);
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "flex", gap: 8, marginTop: 12 }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A new daily check…"
        maxLength={200}
        style={{
          flex: 1,
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
        }}
      />
      <button
        type="submit"
        disabled={pending}
        style={{
          background: "var(--sage)",
          color: "white",
          border: 0,
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}
      >
        Cancel
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/components/mindfulness/MindfulnessGoals.tsx`**

Replaces Phase 2's smoke. Renders all mindfulness goals (check + count + custom time), plus the add form. Custom goals get a remove button.

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor } from "@/lib/progress";
import { toggleCheckGoal, incrementCountGoal, removeGoal } from "@/server/actions/goals";
import { AddGoalForm } from "./AddGoalForm";

export async function MindfulnessGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "mindfulness"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MINDFULNESS GOALS
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {goals.map((g) => {
          const p = progressFor(g, day, clicks);
          const done = p.pct >= 100;
          return (
            <li
              key={g.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {g.type === "check" && (
                <form action={async () => {
                  "use server";
                  await toggleCheckGoal({ userId, goalId: g.id, iso });
                }}>
                  <button
                    type="submit"
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: "1.5px solid var(--sage)",
                      background: done ? "var(--sage)" : "transparent",
                      cursor: "pointer",
                    }}
                  />
                </form>
              )}
              {g.type === "count" && (
                <form action={async () => {
                  "use server";
                  await incrementCountGoal({ userId, goalId: g.id, iso });
                }}>
                  <button
                    type="submit"
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1.5px solid var(--sage)",
                      background: done ? "var(--sage)" : "transparent",
                      color: done ? "white" : "var(--sage)",
                      cursor: "pointer",
                      minWidth: 56,
                    }}
                  >
                    {p.current}/{p.target}
                  </button>
                </form>
              )}
              <span style={{
                flex: 1,
                color: done ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: done ? "line-through" : "none",
              }}>
                {g.title}
              </span>
              {!g.isDefault && (
                <form action={async () => {
                  "use server";
                  await removeGoal({ userId, goalId: g.id });
                }}>
                  <button
                    type="submit"
                    aria-label="Remove goal"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      <AddGoalForm userId={userId} />
    </section>
  );
}
```

- [ ] **Step 5: Replace `src/components/panels/MindfulnessPanel.tsx`**

```tsx
import { GodCard } from "@/components/mindfulness/GodCard";
import { ScriptureWithModal } from "@/components/mindfulness/ScriptureWithModal";
import { selectScriptureForUser } from "@/components/mindfulness/ScripturePreviewCard";
import { Reflections } from "@/components/mindfulness/Reflections";
import { Journal } from "@/components/mindfulness/Journal";
import { BreathTimer } from "@/components/mindfulness/BreathTimer";
import { MindfulnessArticles } from "@/components/mindfulness/MindfulnessArticles";
import { MindfulnessGoals } from "@/components/mindfulness/MindfulnessGoals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function MindfulnessPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  const [day, scripture] = await Promise.all([
    getDayOrEmpty(userId, iso),
    selectScriptureForUser(userId, iso),
  ]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GodCard userId={userId} iso={iso} />
      <ScriptureWithModal passage={scripture.passage} hint={scripture.hint} />
      <Reflections iso={iso} />
      <Journal userId={userId} iso={iso} initial={day.notes} />
      <BreathTimer />
      <MindfulnessArticles userId={userId} iso={iso} />
      <MindfulnessGoals userId={userId} iso={iso} />
    </div>
  );
}
```

- [ ] **Step 6: Run dev server and verify the panel**

```bash
pnpm dev
```

Open http://localhost:3000 → Mindfulness tab. Verify:
- God card shows opening + prayer + carry
- Scripture preview card shows today's pick (default = `Philippians 4:11-13` on a fresh DB; pick rotates by date and biases by journal)
- Click the scripture card → Bible modal opens with verses + commentary; ESC / scrim / Close button all dismiss
- Reflections section lists 5 entries; refreshing keeps the same set within the same day
- Journal: typing then waiting 500ms shows "saved · HH:MM:SS"; reload preserves text
- Breath timer: click "Start 4-7-8", phases cycle Inhale 4 → Hold 7 → Exhale 8
- Mindfulness articles: click an anchor → opens in new tab AND increments `g_mf_read` count (visible in goals list)
- Goals: check goals toggle; count goals (`g_mf_read`) display the current count vs target; custom goal can be added and removed

Type the word "anxious" in the journal, wait for save, refresh — the scripture should switch to `Matthew 6:25-27, 33-34` and the theme line should append `· biased by your journal (Anxiety)`.

- [ ] **Step 7: Run tests + build**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/mindfulness/ src/components/panels/MindfulnessPanel.tsx
git commit -m "feat(mindfulness): full panel — articles, reflections, goals, journal, breath, scripture"
```

---

## Phase 3 Acceptance Criteria

Maps to spec sections §8.4, §9.5, §15, §14.1.

- [ ] God card renders opening + prayer + carry from `getDailyContent`
- [ ] Scripture preview shows today's pick on the Mindfulness panel; snippet uses first verse, truncated at ~140 chars
- [ ] Mentioning a theme keyword in the journal updates the next render: theme line appends `· biased by your journal (X)`, picked passage's theme is in the active set
- [ ] Bible modal opens from the card, the chevron, and via Enter/Space when focused
- [ ] Modal is a true overlay with strong scrim
- [ ] Verse numbers render in gold superscript; passage in serif; commentary on the right column
- [ ] Modal closes on ✕, footer Close, scrim click, or Escape
- [ ] Adding a new entry to `SCRIPTURES` makes it eligible the next time `pickScripture()` runs (no rebuild)
- [ ] Adding a new keyword to `THEME_KEYWORDS` immediately changes detection (no rebuild)
- [ ] Journal saves to `mm_days[today].notes` after 500ms idle
- [ ] Reload restores the saved notes
- [ ] Saving the journal triggers a scripture re-render (theme line updates)
- [ ] Breath timer cycles Inhale 4 → Hold 7 → Exhale 8; button label flips Start ↔ Stop
- [ ] Reflections render 5 from 15 by date-seeded stride; refresh same day = same set
- [ ] Articles list: clicking an anchor records a click and auto-credits `g_mf_read`
- [ ] Mindfulness goals list shows check, count (`g_mf_read`), and custom rows; remove visible only on custom; add form works
- [ ] All unit tests pass (scripture-engine, reflections, daily-content schema, plus prior phases)
- [ ] `pnpm build` succeeds with strict TS

When all boxes are checked, Phase 3 is done. Move to Phase 4 (Business + Personal panels): write `phase-4-business-personal.md` immediately before starting it.

---

## Notes for the agent executing this plan

1. **Phase 6 contract.** When Phase 6 lands the `DailyContent` table, only `src/server/queries/daily-content.ts` changes — every consumer above keeps importing `getDailyContent`. The fixture file stays in the tree as a "starter content" template until v2.
2. **The articles form-action approach.** Server actions can be triggered from form submissions inside Server Components without making the wrapper a client component. The `onClick`-with-`requestSubmit` is needed because anchors don't submit forms by default. A simpler alternative is making the article tile a Client Component that calls `recordClick` directly — adopt that if the form/anchor coupling proves brittle in testing.
3. **No emojis.** All icons are inline SVG (BookSvg) or text characters chosen for typographic intent (× for close, › for chevron). Spec §3.4 is non-negotiable.
4. **Modal accessibility.** ARIA `dialog` role + `aria-modal="true"` + focus trap is partial here — Phase 14's hardening pass adds a proper focus trap and inert background. v1 ships ESC / scrim / Close button, which the spec explicitly accepts.
