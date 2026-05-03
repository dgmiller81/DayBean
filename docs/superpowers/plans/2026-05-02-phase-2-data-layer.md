# Phase 2 — Data Layer & Server Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder data with real Prisma-backed server actions for goals, tasks, days, prefs, and clicks. Land the pure progress/streak helpers (`progressFor`, `streakFor`, `dailyStreak`). After this phase, the dashboard panels can read and mutate persistent state — but no panel is wired yet (that starts in Phase 3).

**Architecture:**
- All mutations go through Next.js server actions in `src/server/actions/*` with Zod-validated inputs.
- All reads happen via Server Components calling helper functions in `src/server/queries/*` (or directly via Prisma; helpers exist when there's logic to share).
- Server actions resolve the active user via `getCurrentUserId()` — Phase 2 returns `"local-default"` (Phase 7 swaps this for the real session lookup).
- After every mutation, the action calls `revalidatePath("/")` so Server Components re-fetch on the next render.
- Pure helpers live in `src/lib/progress.ts` so they can be unit-tested without a DB.
- Click tracking is transactional: writing the click row + auto-crediting the section's "read N articles" goal happen in a single `db.$transaction` block.

**Tech additions this phase:** `zod` (input validation), `server-only` (compile-time guard against bundling server modules into the client).

**No UI work in this phase** beyond a disposable Mindfulness panel smoke test (Task 10). Phases 3–5 wire panels properly.

---

## File Structure (created in this phase)

| File | Purpose |
|---|---|
| `src/types/index.ts` | Shared TS types (`Goal`, `Task`, `DayRecord`, `Section`, `GoalType`, `Filter`) — superset of Prisma types with parsed JSON columns |
| `src/lib/default-goals.ts` | `DEFAULT_GOALS` list (single source for the seed and the UI's "is this a default" check) |
| `src/lib/progress.ts` | Pure functions: `progressFor`, `streakFor`, `dailyStreak`, `aggregateForSection` |
| `src/lib/dates.ts` | (extend) `daysBack(iso, n)`, `isoOffset(iso, deltaDays)` |
| `src/server/auth-context.ts` | `getCurrentUserId()` — returns `"local-default"` for now |
| `src/server/queries/goals.ts` | `listGoals(userId, sectionFilter?)`, `findGoal(userId, goalId)` |
| `src/server/queries/tasks.ts` | `listTasks(userId)` (sorted), `countOpenTasks(userId)` |
| `src/server/queries/days.ts` | `getDayOrEmpty(userId, iso)`, `getDaysRange(userId, fromIso, toIso)` |
| `src/server/queries/clicks.ts` | `getClicksForDay(userId, iso)` |
| `src/server/queries/prefs.ts` | `getPref(userId)` (creates if missing) |
| `src/server/actions/goals.ts` | `addGoal`, `removeGoal`, `toggleCheckGoal`, `incrementCountGoal`, `addTimeMinutes` |
| `src/server/actions/tasks.ts` | `addTask`, `toggleTask`, `deleteTask` |
| `src/server/actions/days.ts` | `setNotes`, `setHealthFlag`, `setWin`, `setFinance`, `setDisconnect` |
| `src/server/actions/prefs.ts` | `setFilter`, `setTheme` |
| `src/server/actions/clicks.ts` | `recordClick` (transactional with auto-credit) |
| `src/server/json.ts` | `parseGoalsJson`, `parseHealthJson`, `parseFinJson`, `serialize*` (typed JSON helpers) |
| `tests/setup-integration.ts` | Per-test DB reset for the integration project |
| `tests/factories.ts` | `makeUser()`, `makeGoal()`, `seedDefaultGoals()` factories |
| `tests/test-db.ts` | Test DB harness (separate file `prisma/test.db`) |
| `tests/unit/progress.test.ts` | Tests for `progressFor`, `streakFor`, `dailyStreak`, `aggregateForSection` |
| `tests/unit/json.test.ts` | Round-trip tests for JSON helpers |
| `tests/integration/goals.test.ts` | DB-backed tests for goal actions |
| `tests/integration/tasks.test.ts` | DB-backed tests for task actions |
| `tests/integration/days.test.ts` | DB-backed tests for day actions |
| `tests/integration/prefs.test.ts` | DB-backed tests for theme + filter |
| `tests/integration/clicks.test.ts` | Auto-credit cascade tests |
| `prisma/test.db` (gitignored) | Test database |
| `vitest.config.ts` | (modify) two projects: `unit` (jsdom) + `integration` (node) |

---

## Task 1: Shared types and JSON helpers

**Files:**
- Create: `src/types/index.ts`, `src/server/json.ts`, `src/lib/default-goals.ts`
- Test: `tests/unit/json.test.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```ts
export type Section = "mindfulness" | "business" | "personal";
export type SectionOrGeneral = Section | "general";
export type Filter = "all" | Section;
export type GoalType = "check" | "count" | "time";

export type Goal = {
  id: string;             // composite "${userId}::${specId}"
  specId: string;         // e.g. "g_god"
  userId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
  isDefault: boolean;
  createdAt: Date;
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  section: SectionOrGeneral;
  done: boolean;
  createdAt: Date;
  completedOn: string | null;   // ISO date
};

export type HealthFlags = {
  slept?: boolean;
  moved?: boolean;
  ate?: boolean;
};

export type Finance = {
  net?: string;
  cash?: string;
  invest?: string;
};

export type DayRecord = {
  iso: string;
  userId: string;
  goals: Record<string, boolean | number>;   // keyed by composite goal id
  notes: string;
  health: HealthFlags;
  disconnect: number;
  win: string;
  fin: Finance;
};

export type ClickCounts = {
  mindfulness: number;
  business: number;
  personal: number;
};

export type Pref = {
  userId: string;
  theme: "light" | "dark";
  filter: Filter;
  jobTitle: string | null;
  interests: string[];        // parsed from JSON
  faith: string | null;
  scripturePref: string | null;
};

export type GoalProgress = { current: number; target: number; pct: number };
```

- [ ] **Step 2: Create `src/lib/default-goals.ts`**

```ts
import type { Section, GoalType } from "@/types";

export type DefaultGoalSpec = {
  specId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
};

export const DEFAULT_GOALS: DefaultGoalSpec[] = [
  { specId: "g_god",            section: "mindfulness", title: "Time with God / prayer", type: "check", target: 1 },
  { specId: "g_meditate",       section: "mindfulness", title: "Meditate (5+ minutes)", type: "check", target: 1 },
  { specId: "g_present_kids",   section: "mindfulness", title: "Be fully present with my kids", type: "check", target: 1 },
  { specId: "g_family",         section: "mindfulness", title: "Connect with family or a friend", type: "check", target: 1 },
  { specId: "g_no_overcommit",  section: "mindfulness", title: "Said no to something I should have", type: "check", target: 1 },
  { specId: "g_selfless",       section: "mindfulness", title: "One selfless act today", type: "check", target: 1 },
  { specId: "g_walk",           section: "mindfulness", title: "Walk the dogs without my phone", type: "check", target: 1 },
  { specId: "g_mf_read",        section: "mindfulness", title: "Read 1 mindfulness article", type: "count", target: 1 },
  { specId: "g_learn",          section: "business",    title: "Continuous improvement — read 3+ AI articles", type: "count", target: 3 },
  { specId: "g_strategy",       section: "business",    title: "30 min on AI strategy & competitive scanning", type: "check", target: 1 },
  { specId: "g_customer",       section: "business",    title: "Talk to a customer (call, email, shadow)", type: "check", target: 1 },
  { specId: "g_product",        section: "business",    title: "Move the top product bet forward by one step", type: "check", target: 1 },
  { specId: "g_team",           section: "business",    title: "Unblock or coach one teammate", type: "check", target: 1 },
  { specId: "g_demos",          section: "business",    title: "Try one new AI tool / model / agent", type: "check", target: 1 },
  { specId: "g_money",          section: "personal",    title: "Check finances", type: "check", target: 1 },
  { specId: "g_move",           section: "personal",    title: "Move 30 minutes", type: "check", target: 1 },
  { specId: "g_disconnect",     section: "personal",    title: "Disconnect 60 minutes", type: "time",  target: 60 },
  { specId: "g_writing",        section: "personal",    title: "Write something (memo, doc, post, journal)", type: "check", target: 1 },
  { specId: "g_per_read",       section: "personal",    title: "Read 1 self-help / motivation article", type: "count", target: 1 },
];

export function compositeGoalId(userId: string, specId: string): string {
  return `${userId}::${specId}`;
}

export function specIdFromCompositeId(id: string): string {
  const ix = id.indexOf("::");
  return ix < 0 ? id : id.slice(ix + 2);
}

const DEFAULT_SPEC_IDS = new Set(DEFAULT_GOALS.map((g) => g.specId));
export function isDefaultGoal(specId: string): boolean {
  return DEFAULT_SPEC_IDS.has(specId);
}
```

> **Refactor:** Phase 1's seed inlined these specs. In Step 5 below, update `prisma/seed.ts` to import from this file so the two cannot drift.

- [ ] **Step 3: Create `src/server/json.ts`**

```ts
import type { HealthFlags, Finance } from "@/types";

export function parseGoalsJson(s: string): Record<string, boolean | number> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, boolean | number>)
      : {};
  } catch {
    return {};
  }
}

export function serializeGoalsJson(v: Record<string, boolean | number>): string {
  return JSON.stringify(v);
}

export function parseHealthJson(s: string): HealthFlags {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as HealthFlags) : {};
  } catch {
    return {};
  }
}

export function serializeHealthJson(v: HealthFlags): string {
  return JSON.stringify(v);
}

export function parseFinJson(s: string): Finance {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Finance) : {};
  } catch {
    return {};
  }
}

export function serializeFinJson(v: Finance): string {
  return JSON.stringify(v);
}

export function parseStringList(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeStringList(v: string[]): string {
  return JSON.stringify(v);
}
```

- [ ] **Step 4: Write the failing test `tests/unit/json.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  parseGoalsJson,
  serializeGoalsJson,
  parseHealthJson,
  parseFinJson,
  parseStringList,
  serializeStringList,
} from "@/server/json";

describe("json helpers", () => {
  it("parseGoalsJson rejects malformed and array inputs", () => {
    expect(parseGoalsJson("")).toEqual({});
    expect(parseGoalsJson("not json")).toEqual({});
    expect(parseGoalsJson("null")).toEqual({});
    expect(parseGoalsJson("[]")).toEqual({});
  });

  it("goals round-trip", () => {
    const v = { "u::g_god": true, "u::g_learn": 2, "u::g_disconnect": 45 };
    expect(parseGoalsJson(serializeGoalsJson(v))).toEqual(v);
  });

  it("health and finance default to empty objects on bad input", () => {
    expect(parseHealthJson("")).toEqual({});
    expect(parseFinJson("garbage")).toEqual({});
  });

  it("string list filters non-strings and tolerates null", () => {
    expect(parseStringList(null)).toEqual([]);
    expect(parseStringList(undefined)).toEqual([]);
    expect(parseStringList(serializeStringList(["ai", "ml"]))).toEqual(["ai", "ml"]);
    expect(parseStringList(JSON.stringify(["ok", 7, null, "fine"]))).toEqual(["ok", "fine"]);
  });
});
```

- [ ] **Step 5: Refactor `prisma/seed.ts` to import from `default-goals.ts`**

Replace the inline `DEFAULTS` array with:
```ts
import { DEFAULT_GOALS, compositeGoalId } from "../src/lib/default-goals";
```

And the seed loop becomes:
```ts
for (const g of DEFAULT_GOALS) {
  await db.goal.upsert({
    where: { id: compositeGoalId(user.id, g.specId) },
    update: {},
    create: {
      id: compositeGoalId(user.id, g.specId),
      userId: user.id,
      section: g.section,
      title: g.title,
      type: g.type,
      target: g.target,
      isDefault: true,
    },
  });
}
```

- [ ] **Step 6: Run tests, verify pass**

Run:
```bash
pnpm test tests/unit/json.test.ts
```

Expected: 4 passing.

- [ ] **Step 7: Re-run seed to make sure refactor is non-breaking**

Run:
```bash
pnpm db:reset
```

Expected: seed completes, "Seeded default user + goals."

- [ ] **Step 8: Commit**

```bash
git add src/types src/lib/default-goals.ts src/server/json.ts prisma/seed.ts tests/unit/json.test.ts
git commit -m "feat(db): shared types, default goals source-of-truth, json helpers"
```

---

## Task 2: Auth context stub + Pref query

**Files:**
- Create: `src/server/auth-context.ts`, `src/server/queries/prefs.ts`

- [ ] **Step 1: Install `server-only`**

Run:
```bash
pnpm add server-only
```

- [ ] **Step 2: Create `src/server/auth-context.ts`**

```ts
import "server-only";

const LOCAL_DEFAULT_USER_ID = "local-default";

/**
 * Phase 2: returns the seeded local user.
 * Phase 7: replaced with Auth.js session lookup; throws if unauthenticated.
 */
export async function getCurrentUserId(): Promise<string> {
  return LOCAL_DEFAULT_USER_ID;
}

/** Convenience for tests + future code that already has a userId. */
export function localDefaultUserId(): string {
  return LOCAL_DEFAULT_USER_ID;
}
```

- [ ] **Step 3: Create `src/server/queries/prefs.ts`**

```ts
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
```

- [ ] **Step 4: Commit**

```bash
git add src/server/auth-context.ts src/server/queries/prefs.ts package.json pnpm-lock.yaml
git commit -m "feat(db): auth-context stub + getPref query with safe defaults"
```

---

## Task 3: Progress / streak helpers (pure)

**Files:**
- Create: `src/lib/progress.ts`, extend `src/lib/dates.ts`
- Test: `tests/unit/progress.test.ts`

- [ ] **Step 1: Extend `src/lib/dates.ts`**

Append:
```ts
export function isoOffset(iso: string, deltaDays: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return todayISO(d);
}

export function daysBack(iso: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(isoOffset(iso, -i));
  return out;
}
```

- [ ] **Step 2: Write the failing test `tests/unit/progress.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  progressFor,
  streakFor,
  dailyStreak,
  aggregateForSection,
} from "@/lib/progress";
import type { DayRecord, Goal } from "@/types";

const goal = (over: Partial<Goal> & Pick<Goal, "specId" | "type" | "target">): Goal => ({
  id: `u::${over.specId}`,
  userId: "u",
  section: "mindfulness",
  title: over.specId,
  isDefault: false,
  createdAt: new Date(0),
  ...over,
});

const day = (iso: string, over: Partial<DayRecord> = {}): DayRecord => ({
  iso,
  userId: "u",
  goals: {},
  notes: "",
  health: {},
  disconnect: 0,
  win: "",
  fin: {},
  ...over,
});

describe("progressFor", () => {
  it("check goals are 0% or 100%", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    expect(progressFor(g, day("2026-05-02"))).toEqual({ current: 0, target: 1, pct: 0 });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_god": true } }))).toEqual({
      current: 1, target: 1, pct: 100,
    });
  });

  it("count goals cap pct at 100 but report raw current", () => {
    const g = goal({ specId: "g_learn", type: "count", target: 3, section: "business" });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_learn": 2 } })))
      .toEqual({ current: 2, target: 3, pct: 67 });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_learn": 5 } })))
      .toEqual({ current: 5, target: 3, pct: 100 });
  });

  it("count goals wired to clicks use clicks[section] when present", () => {
    const g = goal({ specId: "g_mf_read", type: "count", target: 1, section: "mindfulness" });
    const d = day("2026-05-02");
    const clicks = { mindfulness: 1, business: 0, personal: 0 };
    expect(progressFor(g, d, clicks).pct).toBe(100);
  });

  it("g_disconnect time goal reads day.disconnect", () => {
    const g = goal({ specId: "g_disconnect", type: "time", target: 60, section: "personal" });
    expect(progressFor(g, day("2026-05-02", { disconnect: 45 })))
      .toEqual({ current: 45, target: 60, pct: 75 });
  });

  it("custom time goals read from day.goals[id]", () => {
    const g = goal({ specId: "g_min_123", type: "time", target: 30, section: "personal" });
    expect(progressFor(g, day("2026-05-02", { goals: { "u::g_min_123": 30 } })))
      .toEqual({ current: 30, target: 30, pct: 100 });
  });
});

describe("streakFor", () => {
  it("counts consecutive days where pct >= 100", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    const today = "2026-05-02";
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02", { goals: { "u::g_god": true } })],
      ["2026-05-01", day("2026-05-01", { goals: { "u::g_god": true } })],
      ["2026-04-30", day("2026-04-30", { goals: { "u::g_god": false } })],
      ["2026-04-29", day("2026-04-29", { goals: { "u::g_god": true } })],
    ]);
    expect(streakFor(g, today, (iso) => records.get(iso))).toBe(2);
  });

  it("returns 0 when today is not complete", () => {
    const g = goal({ specId: "g_god", type: "check", target: 1 });
    expect(streakFor(g, "2026-05-02", () => undefined)).toBe(0);
  });
});

describe("dailyStreak", () => {
  it("walks back while ANY goal hit 100% or any task completed that day", () => {
    const goals = [goal({ specId: "g_god", type: "check", target: 1 })];
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02", { goals: { "u::g_god": true } })],
      ["2026-05-01", day("2026-05-01", { goals: { "u::g_god": true } })],
      ["2026-04-30", day("2026-04-30")],
    ]);
    expect(dailyStreak("2026-05-02", goals, (iso) => records.get(iso), () => false)).toBe(2);
  });

  it("a completed task carries the streak even with no goals progress", () => {
    const records = new Map<string, DayRecord>([
      ["2026-05-02", day("2026-05-02")],
      ["2026-05-01", day("2026-05-01")],
    ]);
    const taskCompletedOn = (iso: string) => iso === "2026-05-02" || iso === "2026-05-01";
    expect(dailyStreak("2026-05-02", [], (iso) => records.get(iso), taskCompletedOn)).toBe(2);
  });
});

describe("aggregateForSection", () => {
  it("returns the average pct of all goals in a section", () => {
    const goals = [
      goal({ specId: "g_god", type: "check", target: 1, section: "mindfulness" }),
      goal({ specId: "g_meditate", type: "check", target: 1, section: "mindfulness" }),
    ];
    const d = day("2026-05-02", { goals: { "u::g_god": true, "u::g_meditate": false } });
    expect(aggregateForSection("mindfulness", goals, d)).toBe(50);
  });

  it("returns 0 when no goals are in the section", () => {
    expect(aggregateForSection("personal", [], day("2026-05-02"))).toBe(0);
  });
});
```

- [ ] **Step 3: Verify the test fails (no implementation yet)**

Run:
```bash
pnpm test tests/unit/progress.test.ts
```

Expected: failures referencing missing module `@/lib/progress`.

- [ ] **Step 4: Create `src/lib/progress.ts`**

```ts
import type { ClickCounts, DayRecord, Goal, GoalProgress, Section } from "@/types";
import { specIdFromCompositeId } from "@/lib/default-goals";
import { isoOffset } from "@/lib/dates";

const SECTION_TO_AUTOCREDIT_SPEC: Record<Section, string> = {
  mindfulness: "g_mf_read",
  business: "g_learn",
  personal: "g_per_read",
};

export function progressFor(g: Goal, day: DayRecord, clicks?: ClickCounts): GoalProgress {
  if (g.type === "check") {
    const v = day.goals[g.id];
    const current = v === true || (typeof v === "number" && v > 0) ? 1 : 0;
    return { current, target: g.target, pct: current >= g.target ? 100 : 0 };
  }

  if (g.type === "count") {
    const specId = specIdFromCompositeId(g.id);
    const wiredSpec = SECTION_TO_AUTOCREDIT_SPEC[g.section];
    const wired = clicks && specId === wiredSpec ? clicks[g.section] : undefined;
    const fromDay = day.goals[g.id];
    const current =
      typeof wired === "number" ? wired :
      typeof fromDay === "number" ? fromDay :
      0;
    const pct = g.target === 0 ? 0 : Math.min(100, Math.round((current / g.target) * 100));
    return { current, target: g.target, pct };
  }

  // time
  const specId = specIdFromCompositeId(g.id);
  const fromDayRaw = day.goals[g.id];
  const current =
    specId === "g_disconnect" ? day.disconnect :
    typeof fromDayRaw === "number" ? fromDayRaw :
    0;
  const pct = g.target === 0 ? 0 : Math.min(100, Math.round((current / g.target) * 100));
  return { current, target: g.target, pct };
}

export type DayLookup = (iso: string) => DayRecord | undefined;
export type TaskCompletedLookup = (iso: string) => boolean;

export function streakFor(
  g: Goal,
  todayIso: string,
  lookupDay: DayLookup,
  clicksLookup?: (iso: string) => ClickCounts | undefined
): number {
  let streak = 0;
  let cursor = todayIso;
  while (true) {
    const d = lookupDay(cursor);
    if (!d) break;
    const clicks = clicksLookup?.(cursor);
    const { pct } = progressFor(g, d, clicks);
    if (pct < 100) break;
    streak++;
    cursor = isoOffset(cursor, -1);
    if (streak > 366) break;
  }
  return streak;
}

export function dailyStreak(
  todayIso: string,
  goals: Goal[],
  lookupDay: DayLookup,
  hadTaskCompletedOn: TaskCompletedLookup,
  clicksLookup?: (iso: string) => ClickCounts | undefined
): number {
  let streak = 0;
  let cursor = todayIso;
  while (true) {
    const d = lookupDay(cursor);
    const taskHit = hadTaskCompletedOn(cursor);
    if (!d && !taskHit) break;
    const clicks = clicksLookup?.(cursor);
    const goalHit = !!d && goals.some((g) => progressFor(g, d, clicks).pct >= 100);
    if (!goalHit && !taskHit) break;
    streak++;
    cursor = isoOffset(cursor, -1);
    if (streak > 366) break;
  }
  return streak;
}

export function aggregateForSection(
  section: Section,
  goals: Goal[],
  day: DayRecord,
  clicks?: ClickCounts
): number {
  const inSection = goals.filter((g) => g.section === section);
  if (inSection.length === 0) return 0;
  const sum = inSection.reduce((acc, g) => acc + progressFor(g, day, clicks).pct, 0);
  return Math.round(sum / inSection.length);
}
```

- [ ] **Step 5: Run the test, verify pass**

Run:
```bash
pnpm test tests/unit/progress.test.ts
```

Expected: 8 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/progress.ts src/lib/dates.ts tests/unit/progress.test.ts
git commit -m "feat(progress): progressFor / streakFor / dailyStreak / aggregateForSection helpers"
```

---

## Task 4: Test infrastructure — Vitest projects, factories, integration DB

**Files:**
- Modify: `vitest.config.ts`, `.gitignore`
- Create: `tests/setup-integration.ts`, `tests/factories.ts`, `tests/test-db.ts`, `tests/integration/smoke.test.ts`

- [ ] **Step 1: Add test DB to `.gitignore`**

Append:
```
prisma/test.db
prisma/test.db-journal
```

- [ ] **Step 2: Update `vitest.config.ts` to support unit + integration projects**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    workspace: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup-integration.ts"],
          fileParallelism: false,
          pool: "forks",
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Create `tests/test-db.ts`**

> **Security note:** uses `execFileSync` with an explicit argv — no shell, no interpolation, no injection surface. The migration command is constant, the only runtime variable (`DATABASE_URL`) is built from a path constant resolved at module load.

```ts
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_PATH = path.resolve(__dirname, "../prisma/test.db");
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

// Set BEFORE creating the Prisma client so its connection string is correct.
process.env.DATABASE_URL = TEST_DATABASE_URL;

export const testDb = new PrismaClient();

export async function resetTestDb() {
  await testDb.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const journal = `${TEST_DB_PATH}-journal`;
  if (fs.existsSync(journal)) fs.unlinkSync(journal);

  // pnpm exec prisma migrate deploy — no shell, fixed argv
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
    shell: false,
  });

  await testDb.$connect();
}

export async function closeTestDb() {
  await testDb.$disconnect();
}
```

- [ ] **Step 4: Create `tests/setup-integration.ts`**

```ts
import { afterAll, beforeEach } from "vitest";
import { resetTestDb, closeTestDb } from "./test-db";

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await closeTestDb();
});
```

- [ ] **Step 5: Create `tests/factories.ts`**

```ts
import { testDb } from "./test-db";
import { DEFAULT_GOALS, compositeGoalId } from "@/lib/default-goals";
import type { Section, GoalType } from "@/types";

export async function makeUser(id = "u_test", name = "Test User") {
  await testDb.user.upsert({
    where: { id },
    create: { id, name },
    update: {},
  });
  await testDb.pref.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
  });
  return id;
}

export async function seedDefaultGoals(userId: string) {
  for (const g of DEFAULT_GOALS) {
    await testDb.goal.upsert({
      where: { id: compositeGoalId(userId, g.specId) },
      create: {
        id: compositeGoalId(userId, g.specId),
        userId,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
      update: {},
    });
  }
}

export async function makeGoal(userId: string, opts: {
  specId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
  isDefault?: boolean;
}) {
  return testDb.goal.create({
    data: {
      id: compositeGoalId(userId, opts.specId),
      userId,
      section: opts.section,
      title: opts.title,
      type: opts.type,
      target: opts.target,
      isDefault: opts.isDefault ?? false,
    },
  });
}
```

- [ ] **Step 6: Create `tests/integration/smoke.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";

describe("integration smoke", () => {
  it("can create a user, seed goals, and query them", async () => {
    const userId = await makeUser();
    await seedDefaultGoals(userId);
    const goals = await testDb.goal.findMany({ where: { userId } });
    expect(goals).toHaveLength(19);
  });
});
```

- [ ] **Step 7: Run all tests**

Run:
```bash
pnpm test
```

Expected: unit project passes (8+ tests), integration project passes (1 smoke).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/ .gitignore
git commit -m "test: vitest workspace (unit+integration), test DB harness, factories"
```

---

## Task 5: Goal server actions

**Files:**
- Create: `src/server/queries/goals.ts`, `src/server/actions/goals.ts`
- Test: `tests/integration/goals.test.ts`

- [ ] **Step 1: Install `zod`**

Run:
```bash
pnpm add zod
```

- [ ] **Step 2: Create `src/server/queries/goals.ts`**

```ts
import "server-only";
import { db } from "@/server/db";
import type { Goal, Section } from "@/types";
import { specIdFromCompositeId } from "@/lib/default-goals";

type GoalRow = {
  id: string;
  userId: string;
  section: string;
  title: string;
  type: string;
  target: number;
  isDefault: boolean;
  createdAt: Date;
};

function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    specId: specIdFromCompositeId(r.id),
    userId: r.userId,
    section: r.section as Section,
    title: r.title,
    type: r.type as Goal["type"],
    target: r.target,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  };
}

export async function listGoals(userId: string, section?: Section): Promise<Goal[]> {
  const rows = await db.goal.findMany({
    where: { userId, ...(section ? { section } : {}) },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(rowToGoal);
}

export async function findGoal(userId: string, goalId: string): Promise<Goal | null> {
  const r = await db.goal.findFirst({ where: { userId, id: goalId } });
  return r ? rowToGoal(r) : null;
}
```

- [ ] **Step 3: Write failing integration tests `tests/integration/goals.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";
import {
  addGoal,
  removeGoal,
  toggleCheckGoal,
  incrementCountGoal,
  addTimeMinutes,
} from "@/server/actions/goals";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson } from "@/server/json";

const TODAY = "2026-05-02";

describe("goal actions", () => {
  it("addGoal creates a custom goal", async () => {
    const u = await makeUser();
    const g = await addGoal({ userId: u, section: "personal", title: "Read poetry", type: "check", target: 1 });
    expect(g.isDefault).toBe(false);
    expect(g.specId).toMatch(/^g_min_/);
  });

  it("removeGoal deletes only custom goals", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const g = await addGoal({ userId: u, section: "personal", title: "Read poetry", type: "check", target: 1 });
    await removeGoal({ userId: u, goalId: g.id });
    expect(await testDb.goal.findFirst({ where: { id: g.id } })).toBeNull();

    await expect(removeGoal({ userId: u, goalId: compositeGoalId(u, "g_god") }))
      .rejects.toThrow(/default/i);
  });

  it("toggleCheckGoal flips today's value", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const id = compositeGoalId(u, "g_god");
    await toggleCheckGoal({ userId: u, goalId: id, iso: TODAY });
    let day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[id]).toBe(true);
    await toggleCheckGoal({ userId: u, goalId: id, iso: TODAY });
    day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[id]).toBe(false);
  });

  it("incrementCountGoal advances numeric counter", async () => {
    const u = await makeUser();
    const g = await addGoal({ userId: u, section: "business", title: "Calls", type: "count", target: 5 });
    await incrementCountGoal({ userId: u, goalId: g.id, iso: TODAY });
    await incrementCountGoal({ userId: u, goalId: g.id, iso: TODAY });
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[g.id]).toBe(2);
  });

  it("addTimeMinutes — g_disconnect updates day.disconnect; custom time goes into goals JSON", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    const disc = compositeGoalId(u, "g_disconnect");
    await addTimeMinutes({ userId: u, goalId: disc, iso: TODAY, minutes: 30 });
    let day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(day!.disconnect).toBe(30);

    const custom = await addGoal({ userId: u, section: "personal", title: "Stretch", type: "time", target: 30 });
    await addTimeMinutes({ userId: u, goalId: custom.id, iso: TODAY, minutes: 15 });
    day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[custom.id]).toBe(15);
  });

  it("rejects mutations cross-user", async () => {
    const a = await makeUser("u_a");
    const b = await makeUser("u_b");
    await seedDefaultGoals(a);
    const aGoal = compositeGoalId(a, "g_god");
    await expect(toggleCheckGoal({ userId: b, goalId: aGoal, iso: TODAY }))
      .rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 4: Run, verify they fail (no implementation)**

Run:
```bash
pnpm test tests/integration/goals.test.ts
```

Expected: failures referencing missing module `@/server/actions/goals`.

- [ ] **Step 5: Create `src/server/actions/goals.ts`**

```ts
"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Goal, Section, GoalType } from "@/types";
import { compositeGoalId, specIdFromCompositeId } from "@/lib/default-goals";
import { parseGoalsJson, serializeGoalsJson } from "@/server/json";
import { findGoal } from "@/server/queries/goals";

const SectionSchema = z.enum(["mindfulness", "business", "personal"]);
const GoalTypeSchema = z.enum(["check", "count", "time"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AddGoalInput = z.object({
  userId: z.string().min(1),
  section: SectionSchema,
  title: z.string().trim().min(1).max(200),
  type: GoalTypeSchema,
  target: z.number().int().min(1).max(10_000),
});

export async function addGoal(input: z.infer<typeof AddGoalInput>): Promise<Goal> {
  const v = AddGoalInput.parse(input);
  const specId = `g_min_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const id = compositeGoalId(v.userId, specId);
  const r = await db.goal.create({
    data: {
      id,
      userId: v.userId,
      section: v.section,
      title: v.title,
      type: v.type,
      target: v.target,
      isDefault: false,
    },
  });
  revalidatePath("/");
  return {
    id: r.id,
    specId,
    userId: r.userId,
    section: r.section as Section,
    title: r.title,
    type: r.type as GoalType,
    target: r.target,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  };
}

const RemoveGoalInput = z.object({ userId: z.string(), goalId: z.string() });
export async function removeGoal(input: z.infer<typeof RemoveGoalInput>): Promise<void> {
  const v = RemoveGoalInput.parse(input);
  const g = await findGoal(v.userId, v.goalId);
  if (!g) throw new Error("Goal not found");
  if (g.isDefault) throw new Error("Cannot remove a default goal");
  await db.goal.delete({ where: { id: v.goalId } });
  revalidatePath("/");
}

const DayMutateInput = z.object({
  userId: z.string(),
  goalId: z.string(),
  iso: Iso,
});

async function ensureGoalOwned(userId: string, goalId: string): Promise<Goal> {
  const g = await findGoal(userId, goalId);
  if (!g) throw new Error("Goal not found");
  return g;
}

async function mutateDayGoals(
  userId: string,
  iso: string,
  mutator: (current: Record<string, boolean | number>) => Record<string, boolean | number>
) {
  const existing = await db.day.findUnique({ where: { userId_iso: { userId, iso } } });
  const current = parseGoalsJson(existing?.goalsJson ?? "{}");
  const next = mutator(current);
  if (existing) {
    await db.day.update({
      where: { userId_iso: { userId, iso } },
      data: { goalsJson: serializeGoalsJson(next) },
    });
  } else {
    await db.day.create({
      data: { userId, iso, goalsJson: serializeGoalsJson(next) },
    });
  }
}

export async function toggleCheckGoal(input: z.infer<typeof DayMutateInput>): Promise<void> {
  const v = DayMutateInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "check") throw new Error("toggleCheckGoal only valid for check goals");
  await mutateDayGoals(v.userId, v.iso, (cur) => ({ ...cur, [v.goalId]: !cur[v.goalId] }));
  revalidatePath("/");
}

export async function incrementCountGoal(input: z.infer<typeof DayMutateInput>): Promise<void> {
  const v = DayMutateInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "count") throw new Error("incrementCountGoal only valid for count goals");
  await mutateDayGoals(v.userId, v.iso, (cur) => {
    const prev = typeof cur[v.goalId] === "number" ? (cur[v.goalId] as number) : 0;
    return { ...cur, [v.goalId]: prev + 1 };
  });
  revalidatePath("/");
}

const AddTimeInput = DayMutateInput.extend({ minutes: z.number().int().min(1).max(24 * 60) });
export async function addTimeMinutes(input: z.infer<typeof AddTimeInput>): Promise<void> {
  const v = AddTimeInput.parse(input);
  const g = await ensureGoalOwned(v.userId, v.goalId);
  if (g.type !== "time") throw new Error("addTimeMinutes only valid for time goals");

  const specId = specIdFromCompositeId(v.goalId);
  if (specId === "g_disconnect") {
    const existing = await db.day.findUnique({ where: { userId_iso: { userId: v.userId, iso: v.iso } } });
    if (existing) {
      await db.day.update({
        where: { userId_iso: { userId: v.userId, iso: v.iso } },
        data: { disconnect: existing.disconnect + v.minutes },
      });
    } else {
      await db.day.create({ data: { userId: v.userId, iso: v.iso, disconnect: v.minutes } });
    }
  } else {
    await mutateDayGoals(v.userId, v.iso, (cur) => {
      const prev = typeof cur[v.goalId] === "number" ? (cur[v.goalId] as number) : 0;
      return { ...cur, [v.goalId]: prev + v.minutes };
    });
  }
  revalidatePath("/");
}
```

- [ ] **Step 6: Run tests, verify pass**

Run:
```bash
pnpm test tests/integration/goals.test.ts
```

Expected: 6 passing.

- [ ] **Step 7: Commit**

```bash
git add src/server/queries/goals.ts src/server/actions/goals.ts tests/integration/goals.test.ts package.json pnpm-lock.yaml
git commit -m "feat(goals): server actions (add/remove/toggle/increment/addTime) + queries"
```

---

## Task 6: Task server actions

**Files:**
- Create: `src/server/queries/tasks.ts`, `src/server/actions/tasks.ts`
- Test: `tests/integration/tasks.test.ts`

- [ ] **Step 1: Create `src/server/queries/tasks.ts`**

```ts
import "server-only";
import { db } from "@/server/db";
import type { Task, SectionOrGeneral } from "@/types";

export async function listTasks(userId: string): Promise<Task[]> {
  const rows = await db.task.findMany({ where: { userId } });
  return rows
    .map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      section: r.section as SectionOrGeneral,
      done: r.done,
      createdAt: r.createdAt,
      completedOn: r.completedOn ?? null,
    }))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.done) return b.createdAt.getTime() - a.createdAt.getTime();
      const ac = a.completedOn ?? "";
      const bc = b.completedOn ?? "";
      return ac < bc ? 1 : ac > bc ? -1 : 0;
    });
}

export async function countOpenTasks(userId: string): Promise<number> {
  return db.task.count({ where: { userId, done: false } });
}
```

- [ ] **Step 2: Write failing tests `tests/integration/tasks.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import { addTask, toggleTask, deleteTask } from "@/server/actions/tasks";
import { listTasks, countOpenTasks } from "@/server/queries/tasks";

const TODAY = "2026-05-02";

describe("task actions", () => {
  it("add → list → toggle → list (sorted) → delete", async () => {
    const u = await makeUser();
    const t1 = await addTask({ userId: u, title: "Pick up bread", section: "personal" });
    await new Promise((r) => setTimeout(r, 5));
    const t2 = await addTask({ userId: u, title: "Email Dale", section: "business" });
    expect((await listTasks(u)).map((t) => t.id)).toEqual([t2.id, t1.id]);
    expect(await countOpenTasks(u)).toBe(2);

    await toggleTask({ userId: u, taskId: t1.id, iso: TODAY });
    const after = await listTasks(u);
    expect(after.map((t) => [t.id, t.done])).toEqual([[t2.id, false], [t1.id, true]]);
    expect(await countOpenTasks(u)).toBe(1);

    await deleteTask({ userId: u, taskId: t2.id });
    expect((await listTasks(u))).toHaveLength(1);
  });

  it("toggle records completedOn ISO when marking done; clears when un-done", async () => {
    const u = await makeUser();
    const t = await addTask({ userId: u, title: "x", section: "general" });
    await toggleTask({ userId: u, taskId: t.id, iso: TODAY });
    expect((await listTasks(u))[0].completedOn).toBe(TODAY);
    await toggleTask({ userId: u, taskId: t.id, iso: TODAY });
    expect((await listTasks(u))[0].completedOn).toBeNull();
  });

  it("rejects cross-user delete", async () => {
    const a = await makeUser("u_a");
    const b = await makeUser("u_b");
    const t = await addTask({ userId: a, title: "x", section: "general" });
    await expect(deleteTask({ userId: b, taskId: t.id })).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 3: Create `src/server/actions/tasks.ts`**

```ts
"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Task, SectionOrGeneral } from "@/types";

const SectionOrGeneralSchema = z.enum(["general", "mindfulness", "business", "personal"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AddTaskInput = z.object({
  userId: z.string(),
  title: z.string().trim().min(1).max(200),
  section: SectionOrGeneralSchema,
});

export async function addTask(input: z.infer<typeof AddTaskInput>): Promise<Task> {
  const v = AddTaskInput.parse(input);
  const id = `t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const r = await db.task.create({
    data: { id, userId: v.userId, title: v.title, section: v.section },
  });
  revalidatePath("/");
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    section: r.section as SectionOrGeneral,
    done: r.done,
    createdAt: r.createdAt,
    completedOn: r.completedOn ?? null,
  };
}

const ToggleTaskInput = z.object({
  userId: z.string(),
  taskId: z.string(),
  iso: Iso,
});

export async function toggleTask(input: z.infer<typeof ToggleTaskInput>): Promise<void> {
  const v = ToggleTaskInput.parse(input);
  const t = await db.task.findFirst({ where: { id: v.taskId, userId: v.userId } });
  if (!t) throw new Error("Task not found");
  await db.task.update({
    where: { id: v.taskId },
    data: {
      done: !t.done,
      completedOn: !t.done ? v.iso : null,
    },
  });
  revalidatePath("/");
}

const DeleteTaskInput = z.object({ userId: z.string(), taskId: z.string() });
export async function deleteTask(input: z.infer<typeof DeleteTaskInput>): Promise<void> {
  const v = DeleteTaskInput.parse(input);
  const t = await db.task.findFirst({ where: { id: v.taskId, userId: v.userId } });
  if (!t) throw new Error("Task not found");
  await db.task.delete({ where: { id: v.taskId } });
  revalidatePath("/");
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test tests/integration/tasks.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/server/queries/tasks.ts src/server/actions/tasks.ts tests/integration/tasks.test.ts
git commit -m "feat(tasks): server actions (add/toggle/delete) + queries with sort"
```

---

## Task 7: Day server actions (notes, health, win, finance, disconnect)

**Files:**
- Create: `src/server/queries/days.ts`, `src/server/actions/days.ts`
- Test: `tests/integration/days.test.ts`

- [ ] **Step 1: Create `src/server/queries/days.ts`**

```ts
import "server-only";
import { db } from "@/server/db";
import type { DayRecord } from "@/types";
import { parseGoalsJson, parseHealthJson, parseFinJson } from "@/server/json";

export async function getDayOrEmpty(userId: string, iso: string): Promise<DayRecord> {
  const row = await db.day.findUnique({ where: { userId_iso: { userId, iso } } });
  if (!row) {
    return {
      iso,
      userId,
      goals: {},
      notes: "",
      health: {},
      disconnect: 0,
      win: "",
      fin: {},
    };
  }
  return {
    iso,
    userId,
    goals: parseGoalsJson(row.goalsJson),
    notes: row.notes,
    health: parseHealthJson(row.healthJson),
    disconnect: row.disconnect,
    win: row.win,
    fin: parseFinJson(row.finJson),
  };
}

export async function getDaysRange(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<DayRecord[]> {
  const rows = await db.day.findMany({
    where: { userId, iso: { gte: fromIso, lte: toIso } },
    orderBy: { iso: "asc" },
  });
  return rows.map((row) => ({
    iso: row.iso,
    userId: row.userId,
    goals: parseGoalsJson(row.goalsJson),
    notes: row.notes,
    health: parseHealthJson(row.healthJson),
    disconnect: row.disconnect,
    win: row.win,
    fin: parseFinJson(row.finJson),
  }));
}
```

- [ ] **Step 2: Write failing tests `tests/integration/days.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import {
  setNotes,
  setHealthFlag,
  setWin,
  setFinance,
  setDisconnect,
} from "@/server/actions/days";
import { getDayOrEmpty } from "@/server/queries/days";

const TODAY = "2026-05-02";

describe("day actions", () => {
  it("getDayOrEmpty returns a default record for a missing day", async () => {
    const u = await makeUser();
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.notes).toBe("");
    expect(d.disconnect).toBe(0);
    expect(d.health).toEqual({});
  });

  it("setNotes upserts and getDayOrEmpty roundtrips", async () => {
    const u = await makeUser();
    await setNotes({ userId: u, iso: TODAY, notes: "Felt anxious about the demo." });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.notes).toBe("Felt anxious about the demo.");
  });

  it("setHealthFlag merges flags rather than overwriting", async () => {
    const u = await makeUser();
    await setHealthFlag({ userId: u, iso: TODAY, key: "slept", value: true });
    await setHealthFlag({ userId: u, iso: TODAY, key: "moved", value: true });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.health).toEqual({ slept: true, moved: true });
  });

  it("setWin and setFinance persist scalar/string values", async () => {
    const u = await makeUser();
    await setWin({ userId: u, iso: TODAY, win: "Shipped Phase 2." });
    await setFinance({ userId: u, iso: TODAY, fin: { net: "$1.2M", cash: "$50K", invest: "$1.1M" } });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.win).toBe("Shipped Phase 2.");
    expect(d.fin).toEqual({ net: "$1.2M", cash: "$50K", invest: "$1.1M" });
  });

  it("setDisconnect — set absolute (used by direct overrides; +15/+30/+60 deltas use addTimeMinutes)", async () => {
    const u = await makeUser();
    await setDisconnect({ userId: u, iso: TODAY, minutes: 45 });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.disconnect).toBe(45);
  });

  it("rejects notes longer than 50k chars", async () => {
    const u = await makeUser();
    await expect(setNotes({ userId: u, iso: TODAY, notes: "x".repeat(50_001) }))
      .rejects.toThrow();
  });
});
```

- [ ] **Step 3: Create `src/server/actions/days.ts`**

```ts
"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  parseHealthJson,
  parseFinJson,
  serializeHealthJson,
  serializeFinJson,
} from "@/server/json";
import type { HealthFlags, Finance } from "@/types";

const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function upsertDay(userId: string, iso: string, patch: Record<string, unknown>) {
  await db.day.upsert({
    where: { userId_iso: { userId, iso } },
    update: patch,
    create: { userId, iso, ...patch },
  });
  revalidatePath("/");
}

const SetNotesInput = z.object({
  userId: z.string(),
  iso: Iso,
  notes: z.string().max(50_000),
});
export async function setNotes(input: z.infer<typeof SetNotesInput>): Promise<void> {
  const v = SetNotesInput.parse(input);
  await upsertDay(v.userId, v.iso, { notes: v.notes });
}

const HealthKey = z.enum(["slept", "moved", "ate"]);
const SetHealthInput = z.object({
  userId: z.string(),
  iso: Iso,
  key: HealthKey,
  value: z.boolean(),
});
export async function setHealthFlag(input: z.infer<typeof SetHealthInput>): Promise<void> {
  const v = SetHealthInput.parse(input);
  const existing = await db.day.findUnique({
    where: { userId_iso: { userId: v.userId, iso: v.iso } },
    select: { healthJson: true },
  });
  const current: HealthFlags = parseHealthJson(existing?.healthJson ?? "{}");
  const next = { ...current, [v.key]: v.value };
  await upsertDay(v.userId, v.iso, { healthJson: serializeHealthJson(next) });
}

const SetWinInput = z.object({ userId: z.string(), iso: Iso, win: z.string().max(2_000) });
export async function setWin(input: z.infer<typeof SetWinInput>): Promise<void> {
  const v = SetWinInput.parse(input);
  await upsertDay(v.userId, v.iso, { win: v.win });
}

const FinanceSchema = z.object({
  net: z.string().max(64).optional(),
  cash: z.string().max(64).optional(),
  invest: z.string().max(64).optional(),
});
const SetFinanceInput = z.object({ userId: z.string(), iso: Iso, fin: FinanceSchema });
export async function setFinance(input: z.infer<typeof SetFinanceInput>): Promise<void> {
  const v = SetFinanceInput.parse(input);
  const existing = await db.day.findUnique({
    where: { userId_iso: { userId: v.userId, iso: v.iso } },
    select: { finJson: true },
  });
  const current: Finance = parseFinJson(existing?.finJson ?? "{}");
  const next = { ...current, ...v.fin };
  await upsertDay(v.userId, v.iso, { finJson: serializeFinJson(next) });
}

const SetDisconnectInput = z.object({
  userId: z.string(),
  iso: Iso,
  minutes: z.number().int().min(0).max(24 * 60),
});
export async function setDisconnect(input: z.infer<typeof SetDisconnectInput>): Promise<void> {
  const v = SetDisconnectInput.parse(input);
  await upsertDay(v.userId, v.iso, { disconnect: v.minutes });
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test tests/integration/days.test.ts
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/server/queries/days.ts src/server/actions/days.ts tests/integration/days.test.ts
git commit -m "feat(days): server actions (notes/health/win/finance/disconnect) + queries"
```

---

## Task 8: Pref actions (theme, filter)

**Files:**
- Create: `src/server/actions/prefs.ts`
- Test: `tests/integration/prefs.test.ts`

- [ ] **Step 1: Write failing test `tests/integration/prefs.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import { setTheme, setFilter } from "@/server/actions/prefs";
import { getPref } from "@/server/queries/prefs";

describe("pref actions", () => {
  it("setTheme persists and getPref reflects", async () => {
    const u = await makeUser();
    expect((await getPref(u)).theme).toBe("light");
    await setTheme({ userId: u, theme: "dark" });
    expect((await getPref(u)).theme).toBe("dark");
  });

  it("setFilter accepts only the four valid values", async () => {
    const u = await makeUser();
    await setFilter({ userId: u, filter: "business" });
    expect((await getPref(u)).filter).toBe("business");
    // @ts-expect-error invalid value
    await expect(setFilter({ userId: u, filter: "garbage" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Create `src/server/actions/prefs.ts`**

```ts
"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ThemeSchema = z.enum(["light", "dark"]);
const FilterSchema = z.enum(["all", "mindfulness", "business", "personal"]);

const SetThemeInput = z.object({ userId: z.string(), theme: ThemeSchema });
export async function setTheme(input: z.infer<typeof SetThemeInput>): Promise<void> {
  const v = SetThemeInput.parse(input);
  await db.pref.upsert({
    where: { userId: v.userId },
    create: { userId: v.userId, theme: v.theme },
    update: { theme: v.theme },
  });
  revalidatePath("/");
}

const SetFilterInput = z.object({ userId: z.string(), filter: FilterSchema });
export async function setFilter(input: z.infer<typeof SetFilterInput>): Promise<void> {
  const v = SetFilterInput.parse(input);
  await db.pref.upsert({
    where: { userId: v.userId },
    create: { userId: v.userId, filter: v.filter },
    update: { filter: v.filter },
  });
  revalidatePath("/");
}
```

- [ ] **Step 3: Run tests, verify pass**

Run:
```bash
pnpm test tests/integration/prefs.test.ts
```

Expected: 2 passing.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/prefs.ts tests/integration/prefs.test.ts
git commit -m "feat(prefs): server actions for theme and filter"
```

---

## Task 9: Click tracking + auto-credit (transactional)

**Files:**
- Create: `src/server/queries/clicks.ts`, `src/server/actions/clicks.ts`
- Test: `tests/integration/clicks.test.ts`

This is the spec §10 "click tracker": one click on an article anchor records the click AND auto-credits the section's "read N articles" goal in the same transaction.

- [ ] **Step 1: Create `src/server/queries/clicks.ts`**

```ts
import "server-only";
import { db } from "@/server/db";
import type { ClickCounts } from "@/types";

export async function getClicksForDay(userId: string, iso: string): Promise<ClickCounts> {
  const rows = await db.click.findMany({ where: { userId, iso } });
  const out: ClickCounts = { mindfulness: 0, business: 0, personal: 0 };
  for (const r of rows) {
    if (r.section === "mindfulness" || r.section === "business" || r.section === "personal") {
      out[r.section] = r.count;
    }
  }
  return out;
}
```

- [ ] **Step 2: Write failing tests `tests/integration/clicks.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";
import { recordClick } from "@/server/actions/clicks";
import { getClicksForDay } from "@/server/queries/clicks";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson } from "@/server/json";

const TODAY = "2026-05-02";

describe("click tracker", () => {
  it("first click increments to 1 and auto-credits g_mf_read", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    expect((await getClicksForDay(u, TODAY)).mindfulness).toBe(1);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[compositeGoalId(u, "g_mf_read")]).toBe(1);
  });

  it("multiple clicks accumulate; business clicks credit g_learn", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    for (let i = 0; i < 4; i++) await recordClick({ userId: u, iso: TODAY, section: "business" });
    expect((await getClicksForDay(u, TODAY)).business).toBe(4);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(parseGoalsJson(day!.goalsJson)[compositeGoalId(u, "g_learn")]).toBe(4);
  });

  it("personal clicks credit g_per_read; sections are independent", async () => {
    const u = await makeUser();
    await seedDefaultGoals(u);
    await recordClick({ userId: u, iso: TODAY, section: "personal" });
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    const g = parseGoalsJson(day!.goalsJson);
    expect(g[compositeGoalId(u, "g_per_read")]).toBe(1);
    expect(g[compositeGoalId(u, "g_mf_read")]).toBe(1);
  });

  it("a user with no default 'read N articles' goal gets the click recorded but no credit", async () => {
    const u = await makeUser();
    await recordClick({ userId: u, iso: TODAY, section: "mindfulness" });
    const click = await testDb.click.findUnique({
      where: { userId_iso_section: { userId: u, iso: TODAY, section: "mindfulness" } },
    });
    expect(click?.count).toBe(1);
    const day = await testDb.day.findUnique({ where: { userId_iso: { userId: u, iso: TODAY } } });
    expect(day).toBeNull();
  });
});
```

- [ ] **Step 3: Create `src/server/actions/clicks.ts`**

```ts
"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Section } from "@/types";
import { compositeGoalId } from "@/lib/default-goals";
import { parseGoalsJson, serializeGoalsJson } from "@/server/json";

const SECTION_TO_AUTOCREDIT_SPEC: Record<Section, string> = {
  mindfulness: "g_mf_read",
  business: "g_learn",
  personal: "g_per_read",
};

const SectionSchema = z.enum(["mindfulness", "business", "personal"]);
const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const RecordClickInput = z.object({
  userId: z.string(),
  iso: Iso,
  section: SectionSchema,
});

export async function recordClick(input: z.infer<typeof RecordClickInput>): Promise<void> {
  const v = RecordClickInput.parse(input);
  const autocreditGoalId = compositeGoalId(v.userId, SECTION_TO_AUTOCREDIT_SPEC[v.section]);

  await db.$transaction(async (tx) => {
    const existing = await tx.click.findUnique({
      where: { userId_iso_section: { userId: v.userId, iso: v.iso, section: v.section } },
    });
    const newCount = (existing?.count ?? 0) + 1;
    if (existing) {
      await tx.click.update({
        where: { userId_iso_section: { userId: v.userId, iso: v.iso, section: v.section } },
        data: { count: newCount },
      });
    } else {
      await tx.click.create({
        data: { userId: v.userId, iso: v.iso, section: v.section, count: newCount },
      });
    }

    const goal = await tx.goal.findFirst({ where: { id: autocreditGoalId, userId: v.userId } });
    if (!goal) return;

    const day = await tx.day.findUnique({ where: { userId_iso: { userId: v.userId, iso: v.iso } } });
    const currentGoals = parseGoalsJson(day?.goalsJson ?? "{}");
    currentGoals[autocreditGoalId] = newCount;
    if (day) {
      await tx.day.update({
        where: { userId_iso: { userId: v.userId, iso: v.iso } },
        data: { goalsJson: serializeGoalsJson(currentGoals) },
      });
    } else {
      await tx.day.create({
        data: { userId: v.userId, iso: v.iso, goalsJson: serializeGoalsJson(currentGoals) },
      });
    }
  });

  revalidatePath("/");
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
pnpm test tests/integration/clicks.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/server/queries/clicks.ts src/server/actions/clicks.ts tests/integration/clicks.test.ts
git commit -m "feat(clicks): transactional click tracker with auto-credit per spec §10"
```

---

## Task 10: End-to-end smoke through one panel

To prove the data layer is wired correctly, replace the Mindfulness placeholder panel with a minimal "Goals only" UI that lists the user's mindfulness goals and lets them toggle the check-type ones. This is **disposable** — Phase 3 rebuilds the Mindfulness panel properly. Its purpose here is live confidence in the data layer.

**Files:**
- Modify: `src/components/panels/MindfulnessPanel.tsx`

- [ ] **Step 1: Convert `MindfulnessPanel` to a Server Component that lists check-type goals**

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";
import { toggleCheckGoal } from "@/server/actions/goals";

export async function MindfulnessPanel() {
  const userId = await getCurrentUserId();
  const today = todayISO();
  const [goals, day] = await Promise.all([
    listGoals(userId, "mindfulness"),
    getDayOrEmpty(userId, today),
  ]);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MINDFULNESS · GOALS PREVIEW
      </div>
      <h2 className="serif" style={{ fontSize: "1.35rem", fontWeight: 500, margin: "8px 0 0" }}>
        Phase 2 smoke test
      </h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {goals
          .filter((g) => g.type === "check")
          .map((g) => {
            const done = day.goals[g.id] === true;
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
                <form action={async () => {
                  "use server";
                  await toggleCheckGoal({ userId, goalId: g.id, iso: today });
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
                <span style={{
                  color: done ? "var(--ink-muted)" : "var(--ink)",
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {g.title}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and verify**

Run:
```bash
pnpm dev
```

Open http://localhost:3000. Click the Mindfulness tab. Verify:
- Mindfulness goals are listed (7 check + 1 count, only the 7 check render here)
- Clicking the checkbox toggles the goal on/off
- Refreshing the page preserves state (it's persisted to SQLite)
- Toggling twice returns the goal to its original state

Stop the server.

- [ ] **Step 3: Run all tests + build**

Run:
```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/MindfulnessPanel.tsx
git commit -m "feat(panel): wire mindfulness check goals to data layer (smoke test)"
```

---

## Phase 2 Acceptance Criteria

- [ ] Single source of truth for default goals (`src/lib/default-goals.ts`); seed and runtime both import from it
- [ ] Pure helpers `progressFor`, `streakFor`, `dailyStreak`, `aggregateForSection` covered by unit tests
- [ ] Server actions exist for: addGoal, removeGoal, toggleCheckGoal, incrementCountGoal, addTimeMinutes, addTask, toggleTask, deleteTask, setNotes, setHealthFlag, setWin, setFinance, setDisconnect, setTheme, setFilter, recordClick
- [ ] Every server action validates input with Zod and resolves the user via `getCurrentUserId()` (Phase 7 will swap the implementation)
- [ ] Every action calls `revalidatePath("/")` after mutating state
- [ ] Click tracker is transactional: click row + auto-credit happen atomically
- [ ] Cross-user mutations are rejected (verified in `goals.test.ts` and `tasks.test.ts`)
- [ ] Vitest workspace separates unit (jsdom) and integration (node) projects; integration uses an isolated DB file
- [ ] Mindfulness panel smoke test demonstrates round-trip persistence
- [ ] `pnpm test` reports all suites green (unit + integration)
- [ ] `pnpm build` succeeds with strict TS, no `any` outside `JSON.parse` boundary
- [ ] `tests/test-db.ts` uses `execFileSync` with explicit argv (no shell, no injection surface)

When all boxes are checked, Phase 2 is done. Move to Phase 3 (Mindfulness panel + journal + scripture engine): write `phase-3-mindfulness.md` immediately before starting it.

---

## Notes for the agent executing this plan

1. **Server-only imports.** Files in `src/server/**` import the `server-only` package at the top — this prevents accidental client bundling.
2. **`prisma/test.db` is gitignored.** Step 1 of Task 4 adds it.
3. **Don't add TanStack Query yet.** Server actions + `revalidatePath` are sufficient through Phase 6. Re-evaluate when the drawer/heatmap demand client-side optimistic updates (Phase 5).
4. **Don't touch the password hash, encryption, or session yet.** Those land in Phases 7 and 8.
5. **`execFileSync` over `execSync`.** Test infrastructure runs `pnpm exec prisma migrate deploy` via `execFileSync` with an explicit argv array — no shell interpolation, no command-injection surface, even though the inputs are constants.
