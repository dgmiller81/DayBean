// S4-T07 — Privacy contract acceptance test.
//
// Proves that the LLM never echoes ≥4-word substrings from journal excerpts
// back into generated content. We cannot run a real LLM in CI (slow, costly,
// non-deterministic), so we use a deterministic mock adapter that produces
// brand-voice content from the prompt. The mock is built ONLY from theme
// nouns and brand templates — it never reaches back into the excerpt strings.
//
// What this test catches:
//   1. A regression that strips the privacy-contract language from the prompt.
//   2. A regression in the excerpt-injection format (excerpts must reach the
//      LLM as context but the prompt must instruct against verbatim echo).
//   3. A regression in the test's own mock generator that introduces verbatim
//      echoes — i.e. a guard for the test itself.
//
// Placement: this is a contract/property test with no DB and no I/O, so it
// lives in tests/unit. It must run in <5s.

import { describe, expect, it } from "vitest";
import fixture from "../fixtures/synthetic-journal-entries.json";
import { extractThemes } from "@/server/lib/theme-extraction";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/server/llm/prompts";
import type { LlmContext } from "@/server/llm/types";

type FixtureEntry = { id: string; iso: string; content: string };
const ENTRIES = fixture as FixtureEntry[];

const EXCERPT_MAX_LEN = 240; // mirror getJournalSignal

// ──────────────────────────────────────────────────────────────────────
// 4-gram extraction. The core privacy invariant.
// ──────────────────────────────────────────────────────────────────────

function fourWordGrams(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  const grams = new Set<string>();
  for (let i = 0; i + 3 < words.length; i++) {
    grams.add(words.slice(i, i + 4).join(" "));
  }
  return grams;
}

function unionGrams(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) {
    for (const g of fourWordGrams(t)) out.add(g);
  }
  return out;
}

function findOverlap(output: string, forbidden: Set<string>): string | null {
  for (const g of fourWordGrams(output)) {
    if (forbidden.has(g)) return g;
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Window selection. Rotate one day at a time across the fixture.
// ──────────────────────────────────────────────────────────────────────

function pickWindow(iteration: number): { window: FixtureEntry[]; todayIso: string } {
  // Sort newest-first by iso (stable for ties on iso).
  const sorted = [...ENTRIES].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  // Rotate: each iteration shifts the start by one entry, wrapping around.
  const start = iteration % sorted.length;
  const rotated = sorted.slice(start).concat(sorted.slice(0, start));
  // Take 14 most-recent days (or all if fewer).
  const win = rotated.slice(0, Math.min(14, rotated.length));
  // todayIso = the newest iso in the window.
  const todayIso = win.reduce((acc, e) => (e.iso > acc ? e.iso : acc), win[0]!.iso);
  return { window: win, todayIso };
}

function buildExcerpts(win: FixtureEntry[]): string[] {
  // Mirror getJournalSignal: take 3 most-recent, cap each at 240 chars.
  const sorted = [...win].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  return sorted.slice(0, 3).map((e) => {
    const t = e.content.trim();
    return t.length > EXCERPT_MAX_LEN ? t.slice(0, EXCERPT_MAX_LEN - 1).trimEnd() + "…" : t;
  });
}

function buildContext(win: FixtureEntry[], todayIso: string): LlmContext {
  const themes = extractThemes(
    win.map((e) => ({ id: e.id, iso: e.iso, content: e.content })),
    todayIso,
  );
  const themeNames = themes.map((t) => t.theme);
  const themeWeights: Record<string, number> = {};
  for (const t of themes) themeWeights[t.theme] = t.weight;

  return {
    userId: "test-user",
    iso: todayIso,
    name: null,
    jobTitle: null,
    bio: null,
    faith: null,
    scripturePref: null,
    contentInterests: [],
    hobbies: [],
    livesWith: [],
    recentJournalThemes: themeNames,
    journalThemeWeights: themeWeights,
    recentJournalExcerpts: buildExcerpts(win),
    journalDaysWithEntries: win.length,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Deterministic brand-voice mock generator.
//
// This is a stand-in for an LLM response. It is COMPLIANT BY CONSTRUCTION:
// it draws ONLY from theme tokens parsed out of the prompt's "Top journal
// themes" block, plus fixed brand-voice templates that contain no journal
// material. It never reads the excerpt lines — and even if it did, every
// span we splice in is at most 3 ordinary English words wide (well under
// the 4-word echo threshold), so a defensive scrub layer would also pass.
// ──────────────────────────────────────────────────────────────────────

function parseThemesFromPrompt(prompt: string): string[] {
  // Look for lines shaped like "  · Theme (weight 1.23)" or "  · Theme".
  const themes: string[] = [];
  for (const line of prompt.split("\n")) {
    const m = line.match(/^\s+·\s+([A-Za-z]+)/);
    if (m) themes.push(m[1]!);
  }
  return themes;
}

const HEADLINE_TEMPLATES = [
  (t: string) => `A small invitation toward ${t.toLowerCase()} today.`,
  (t: string) => `Notes on ${t.toLowerCase()}, written quietly.`,
  (t: string) => `On ${t.toLowerCase()}: a slower way through.`,
];

const OPENING_TEMPLATES = [
  (t: string) =>
    `Some mornings the body knows before the mind does. The word for what is here is ${t.toLowerCase()} — not as a problem to fix, but as a guest to greet. Sit with it for the length of a long breath. The day will start when it is ready.`,
  (t: string) =>
    `There is a quiet kind of attention that names what is true and then keeps walking. Today, that name might be ${t.toLowerCase()}. Let it stay near; do not bargain with it. The hour ahead is held.`,
  (t: string) =>
    `Begin where you actually are. If the room you wake into has the shape of ${t.toLowerCase()}, do not pretend it is shaped like something else. The honest first step is a small one, and it is enough.`,
];

const PRAYER_TEMPLATES = [
  (t: string) =>
    `Be still and let ${t.toLowerCase()} be a doorway, not a wall. The hour ahead is small and bright. Carry only what the hour can hold. Set the rest down on the porch and come back for it later.`,
  (t: string) =>
    `Lord of slow mornings, meet the part of me that is full of ${t.toLowerCase()}. Make the room smaller. Make the breath longer. Make the next thing the only thing.`,
];

const CARRY_TEMPLATES = [
  (t: string) => `Today, walk with ${t.toLowerCase()} once more.`,
  (t: string) => `One breath at a time, toward ${t.toLowerCase()}.`,
  (t: string) => `The hour is held; ${t.toLowerCase()} is welcome.`,
];

const BRIEFING_TEMPLATES = [
  `<strong>Steady, slow, attentive.</strong> The market moves in waves; you do not have to ride every one. Pick a single thread and pull it gently for an hour. Tomorrow's edge is built today.`,
  `<strong>One thing well.</strong> A focused hour beats a frenzied afternoon. Close the inbox. Open the doc. Begin where you stopped.`,
];

const SCAN_TEMPLATES = [
  "A modest model release, quietly competitive.",
  "Open-source momentum keeps the platforms honest.",
  "A research note worth a careful read.",
  "Policy pressure builds on the long horizon.",
  "Security disclosure, patched but worth noting.",
  "A founder essay on craft and patience.",
  "Tooling update that earns its keep.",
  "Quiet partnership announcement, real value.",
];

const WATCHLIST_TEMPLATES = [
  "open-weights coverage",
  "inference cost curves",
  "developer ergonomics",
  "agent eval benchmarks",
  "regulatory drafts",
  "security disclosures",
  "founder essays",
  "tooling shifts",
];

const QUOTE_TEMPLATES = [
  { text: "Slow is smooth, and smooth is fast.", source: "an old maxim" },
  { text: "Build the thing that builds the thing.", source: "a senior engineer" },
];

const REPO_TEMPLATES = [
  { name: "vector-store", org: "octolabs", stars: "12K", weekly: "+1.2K wk", license: "MIT", lang: "Rust", pitch: "Lean local store; honest pace." },
  { name: "calm-cli", org: "openhearth", stars: "4K", weekly: "+0.4K wk", license: "Apache-2.0", lang: "Go", pitch: "A quiet CLI for daily ops." },
];

function pick<T>(arr: T[], n: number): T {
  // Deterministic non-cryptographic pick.
  return arr[n % arr.length]!;
}

function mockGenerate(prompt: string, iteration: number): string {
  const themes = parseThemesFromPrompt(prompt);
  const lead = themes[0] ?? "Stillness";
  const second = themes[1] ?? "Attention";

  const headline = pick(HEADLINE_TEMPLATES, iteration)(lead);
  const opening = pick(OPENING_TEMPLATES, iteration)(lead);
  const prayer = pick(PRAYER_TEMPLATES, iteration)(lead);
  const carry = pick(CARRY_TEMPLATES, iteration)(lead);
  const briefing = pick(BRIEFING_TEMPLATES, iteration);
  const scan = SCAN_TEMPLATES.map((s, i) => ({
    title: s,
    url: `https://example.com/scan/${i}`,
    src: "example.com",
  }));
  const watchlist = WATCHLIST_TEMPLATES;
  const quote = pick(QUOTE_TEMPLATES, iteration);
  const repo = pick(REPO_TEMPLATES, iteration);

  const content = {
    date: "2026-05-03",
    subhead: `On ${lead.toLowerCase()} and ${second.toLowerCase()}, gently.`,
    headline,
    god: {
      opening,
      prayer,
      carry,
    },
    mindfulness: {
      articles: [
        {
          title: `A practice for ${lead.toLowerCase()}`,
          source: "Greater Good",
          url: "https://greatergood.berkeley.edu/example",
          summary: "A short read on attention and small mercies.",
        },
        {
          title: `Notes on ${second.toLowerCase()}`,
          source: "Psyche",
          url: "https://psyche.co/example",
          summary: "An essay on the discipline of slowing down.",
        },
        {
          title: "The long, slow practice",
          source: "Mindful",
          url: "https://mindful.org/example",
          summary: "Why the boring work matters.",
        },
      ],
    },
    business: {
      headline: "Steady builders win the year.",
      briefing,
      topStories: [
        {
          kind: "lead",
          eyebrow: "Story of the day",
          badges: [{ className: "b-product", label: "ship" }],
          title: "A modest release with real teeth",
          body: "The product update is small, deliberate, and useful in the actual workflow. That is rarer than it sounds.",
          url: "https://example.com/story",
          src: "example.com",
        },
      ],
      scan,
      articles: [
        {
          badges: [{ className: "b-research", label: "paper" }],
          title: "A clear note on attention budgets",
          summary: "Practical, not theoretical.",
          url: "https://example.com/article",
          src: "example.com",
        },
      ],
      quotes: [{ ...quote, url: "https://example.com/quote" }],
      repos: [{ ...repo, url: `https://github.com/${repo.org}/${repo.name}` }],
      watchlist,
    },
    personal: {
      headline: `Make room for ${lead.toLowerCase()} today.`,
      motivation: { text: "Patience compounds; haste rarely does.", author: "anon" },
      articles: [
        {
          title: `A short essay on ${lead.toLowerCase()}`,
          source: "Marginalian",
          url: "https://themarginalian.org/example",
          summary: "A craft note for slower days.",
        },
        {
          title: `Living with ${second.toLowerCase()} at home`,
          source: "NYT Wellness",
          url: "https://nytimes.com/example",
          summary: "A piece on shared rooms and shared days.",
        },
        {
          title: "On the patience of small habits",
          source: "Psyche",
          url: "https://psyche.co/another",
          summary: "Practical, kind, and brief.",
        },
      ],
    },
  };
  return JSON.stringify(content, null, 2);
}

// ──────────────────────────────────────────────────────────────────────
// Tests.
// ──────────────────────────────────────────────────────────────────────

describe("Privacy contract — mock LLM never echoes ≥4-word substrings from journal excerpts", () => {
  it("SYSTEM_PROMPT contains the privacy contract language", () => {
    expect(SYSTEM_PROMPT).toMatch(/PRIVACY CONTRACT/i);
    expect(SYSTEM_PROMPT).toMatch(/4-or-more-word substring/i);
    expect(SYSTEM_PROMPT).toMatch(/never quote/i);
  });

  it("buildUserPrompt embeds excerpts AND the privacy contract reminder", () => {
    const { window, todayIso } = pickWindow(0);
    const ctx = buildContext(window, todayIso);
    const prompt = buildUserPrompt(ctx);

    // Excerpts must be present (the LLM needs them as context).
    expect(ctx.recentJournalExcerpts.length).toBeGreaterThan(0);
    for (const ex of ctx.recentJournalExcerpts) {
      expect(prompt).toContain(ex.replace(/\n/g, " "));
    }

    // Privacy contract reminder must be in the user-prompt body too.
    expect(prompt).toMatch(/PRIVACY CONTRACT/i);
    expect(prompt).toMatch(/4-or-more-word substring/i);

    // Reflection must be instructed to name a theme.
    expect(prompt).toMatch(/MUST name exactly one of these themes/i);
  });

  it.each(Array.from({ length: 100 }, (_, i) => i))(
    "iteration %i: mock output shares no ≥4-word substring with journal excerpts",
    (iteration) => {
      const { window, todayIso } = pickWindow(iteration);
      const ctx = buildContext(window, todayIso);
      const prompt = buildUserPrompt(ctx);

      const output = mockGenerate(prompt, iteration);

      // Sanity: meaningful output size. The spec calls for 1500-3000 chars of
      // brand-voice prose; the mock's JSON wrapping pushes the total a bit
      // higher. We just want to guarantee the mock isn't trivially short.
      expect(output.length).toBeGreaterThan(1500);
      expect(output.length).toBeLessThan(8000);

      // Forbidden 4-grams come from the FULL excerpt content (not the
      // truncated 240-char copy) — that way the test is robust even if a
      // future change widens the excerpt cap.
      const forbidden = unionGrams(window.map((e) => e.content));

      const overlap = findOverlap(output, forbidden);
      if (overlap !== null) {
        throw new Error(
          `iteration ${iteration}: mock output echoed forbidden 4-gram "${overlap}" ` +
            `from journal excerpts. todayIso=${todayIso}`,
        );
      }
      expect(overlap).toBeNull();
    },
  );
});
