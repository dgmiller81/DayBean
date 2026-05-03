# Phase 11 — Calendar Navigation & Weekend Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard date-aware. Add prev / next chevrons and a calendar popover to the hero so the user can look back on past days. Past days render read-only (server enforces, client shows disabled). Future days redirect to today. Saturdays and Sundays render in a "weekend" variant — a softer accent palette, a warmer background, and the Business panel swaps for a `WeekendPanel` ("Sunday Slow" / "Saturday Slow") with a curated short reading, a "call-a-friend" prompt, and a "no-screens hour" suggestion.

**Why now:** Phases 1–10 anchored the dashboard to today, exactly as the spec called for in §1 and §6. The mockup spec said *"The dashboard is anchored to today. There is no date scrubbing."* and *"Past days are read-only (the UI does not navigate to them)."* — Phase 11 changes the first half (we add scrubbing) but **preserves the second half** (past days remain read-only). The user's requirement: *"we need a forward, backward and calendar selector to look back on things. It would be awesome to support something a little fun on non-business days (Saturday and Sunday) but also focus on unplugging."*

**Deploy target this phase:** `local` and `railway` (the change is pure frontend + server-action guards; no infra moves). Schema is unchanged — we already key Day, Click, journal, etc. by `(userId, iso)`. We're just adjusting which `iso` we read.

**Architecture:**

- The **URL** is the source of truth for the active viewing date — `?d=2026-04-28`. Server Components read it directly via `searchParams`; Client Components consume it via `useSearchParams`. Cookies are not used for date — date is shareable, bookmarkable, and back/forward-friendly.
- A new helper `getCurrentDayISO(searchParams)` resolves the viewing date or falls back to today, validates the format, and rejects future dates by redirecting back to today.
- All mutating server actions (`toggleCheckGoal`, `incrementCountGoal`, `bumpDisconnect`, `setNotes`, `setHealth`, `setWin`, `setFin`, `addTask`, `toggleTask`, `deleteTask`, `addGoal`, `deleteGoal`, `recordClick`) gain a single guard via `assertWritable(iso)` that throws when `iso < todayISO()`. A second guard rejects `iso > todayISO()` with the same error (we do not write into the future).
- The dashboard renders a **read-only banner** above the panels when `iso !== todayISO()`. Goal rows, task rows, and stat-widget controls receive a `readOnly` prop; their underlying buttons render with `disabled` and the form actions short-circuit. The CSS for `[data-readonly="true"]` slightly desaturates and removes hover lifts.
- Weekend detection is a pure function: `isWeekend(iso)` returns true when `getDay()` of the `iso` is 0 or 6. The root layout sets `<html data-mood="weekend">` (alongside `data-theme`) and `globals.css` defines the alternate palette under `[data-mood="weekend"]`. The Tabs component reads `isWeekend(iso)`; if true, the second tab's label is `"Slow"` and its content is `<WeekendPanel>` instead of `<BusinessPanel>`.
- Weekend content is a small static fixture (`src/lib/weekend-content.ts`) — Phase 12 lets the user customize it. The fixture is keyed by the `getDay()` value (0 = Sunday, 6 = Saturday) so Saturday and Sunday can have different prompts.
- The calendar popover is a Client Component built without extra dependencies — a 7-column month grid, prev/next month chevrons, "Today" snap-back. We make a deliberate call below to skip `react-day-picker` for v1 (keeps the bookish aesthetic and avoids 80 KB of dependency for a small surface).

**Tech Stack additions:** none. Uses existing Next.js 15 App Router (`searchParams`, `redirect`), React 19 (Client Components, `useSearchParams`, `useRouter`), Vitest + React Testing Library.

**Spec reference:**
- §1 product overview — *"anchored to today"* — Phase 11 changes this line; we update it in `mockup/spec.md` only by adding a note. The reference HTML is left untouched.
- §6 storage — *"Past days are read-only (the UI does not navigate to them)"* — Phase 11 keeps "read-only" but flips "the UI does not navigate to them" to "the UI navigates but does not mutate."
- §3 design system — palette tokens in §3.3 are extended (not replaced) with `data-mood="weekend"` overrides.
- Master roadmap §5 design call #5 — *"Past-day editing is forbidden in v1"* — enforced server-side here.
- Master roadmap §5 design call #7 — *"Weekend mode is a render variant, not a separate route"* — same data layer, different render tree.

---

## File Structure (created or modified in this phase)

| File | Action | Purpose |
|---|---|---|
| `src/lib/dates.ts` | modify | Add `parseISO`, `addDays`, `isWeekend`, `weekendDayName`, `compareISO`, `MIN_HISTORY_ISO` |
| `src/lib/current-day.ts` | create | `getCurrentDayISO(searchParams)` — resolves the active viewing day; redirects future to today |
| `src/lib/weekend-content.ts` | create | Static fixture: per-weekend-day reading, call-a-friend prompt, no-screens-hour suggestion |
| `src/server/actions/guards.ts` | create | `assertWritable(iso)` — server-side read-only enforcement |
| `src/server/actions/goals.ts` | modify | Goal-mutating actions call `assertWritable` first |
| `src/server/actions/tasks.ts` | modify | Task-mutating actions call `assertWritable` first |
| `src/server/actions/days.ts` | modify | Day-mutating actions (notes, health, win, fin, disconnect) call `assertWritable` first |
| `src/server/actions/clicks.ts` | modify | `recordClick(iso, section)` calls `assertWritable` first |
| `src/app/layout.tsx` | modify | Compute `data-mood` from `searchParams` and set on `<html>` |
| `src/app/page.tsx` | modify | Resolve viewing day, pass `iso` and `readOnly` to children, render `ReadOnlyBanner` when applicable |
| `src/components/Hero.tsx` | modify | Render `<DateNav>` next to the date line |
| `src/components/DateNav.tsx` | create | Client component — prev / next / today buttons + `<CalendarPopover>` trigger |
| `src/components/CalendarPopover.tsx` | create | Client component — month grid, keyboard nav, click-to-navigate |
| `src/components/ReadOnlyBanner.tsx` | create | "Viewing 2026-04-28 — read only · [Today]" banner |
| `src/components/Tabs.tsx` | modify | Swap `BusinessPanel` and `WeekendPanel` based on `isWeekend(iso)`; receive `iso` + `readOnly` |
| `src/components/panels/WeekendPanel.tsx` | create | Reading + call-a-friend + no-screens panel |
| `src/components/panels/BusinessPanel.tsx` | modify | Accept `iso` and `readOnly` props, pass through to its goal rows |
| `src/components/panels/MindfulnessPanel.tsx` | modify | Accept `iso` and `readOnly` props |
| `src/components/panels/PersonalPanel.tsx` | modify | Accept `iso` and `readOnly` props |
| `src/components/panels/OverviewPanel.tsx` | modify | Accept `iso`; on past days the heatmap "today" pill highlights the viewing day instead |
| `src/components/goals/GoalRow.tsx` | modify | Accept `readOnly`; render checkbox/buttons as `disabled` when true |
| `src/components/tasks/TasksDrawer.tsx` | modify | Accept `readOnly`; the FAB still opens but the drawer says "Past days are read-only" if `readOnly` |
| `src/styles/globals.css` | modify | Add `[data-mood="weekend"]` palette overrides and `[data-readonly="true"]` styling |
| `src/types/index.ts` | modify | Export `Weekday` and `WeekendContent` types |
| `tests/unit/current-day.test.ts` | create | Unit tests for `getCurrentDayISO` |
| `tests/unit/dates-week.test.ts` | create | Unit tests for `isWeekend`, `addDays`, `compareISO` |
| `tests/unit/weekend-content.test.ts` | create | Unit tests for the fixture shape |
| `tests/integration/readonly-guard.test.ts` | create | Integration: server actions throw on past `iso` |
| `tests/integration/past-day-render.test.tsx` | create | Integration: panels render disabled controls for past `iso` |
| `mockup/spec.md` | modify | Tiny addendum at the end of §1 noting that Phase 11 introduces date navigation |

---

## Key Design Decisions (locked before coding)

These are the irreversible calls. We record them so we don't relitigate.

1. **URL is the only source of truth for "viewing date".** Not cookies, not Zustand, not React context (above the URL). When the user clicks "prev day", we `router.push("?d=...")`; the page re-renders as a fresh Server Component pass with the new `iso`. This makes browser back/forward "just work" and makes URLs shareable.

2. **`?d=` parameter format is `YYYY-MM-DD`, lowercased ISO.** No timestamps, no timezones. Anything else is invalid → fall back to today (no redirect, no error toast — just silent fallback). This matches `todayISO()` and the schema's `Day.iso` column.

3. **Future dates redirect to today.** Not 404, not error. The URL silently rewrites via `redirect()` to the canonical "today" URL (`/`, no `?d=`). Rationale: a stale tab open at midnight should not show "tomorrow" — it should snap to the new today.

4. **The "today" canonical URL is `/` with no query string.** When the user clicks the "Today" button, we `router.push("/")` (not `?d=2026-05-02`). This keeps the home URL clean and lets us bookmark "always today" without it going stale.

5. **History limit is 1 year backward.** `MIN_HISTORY_ISO` = `todayISO()` minus 365 days. The calendar grays out dates older than that. Server actions still allow reads for any past date (no harm), but the UI doesn't expose them. Rationale: most users won't have data older than that anyway, and a year is a reasonable scrolling distance.

6. **Read-only enforcement is server-side AND client-side.** Client shows disabled controls (UX) and the server throws on mutation (safety). Never trust the client. Both share the same predicate (`iso !== todayISO()` for "future or past" — but future is already redirected, so in practice "iso < todayISO()").

7. **The error message is uniform: `"Past days are read-only"`.** Action callers can catch and translate. We don't expose the underlying iso in the error — caller already knows it.

8. **Weekend mode follows the *viewing* date, not the *current* date.** Viewing Saturday two weeks ago in a midweek session still applies the weekend variant. This keeps the UX consistent: the panel labels and palette match the date you're looking at, not "today's day of week."

9. **Weekend palette stays in the warm/bookish family.** We *do not* swap to e.g. neon or cool blue. We dial down the orange `--accent` and bias towards `--rose` and a slightly warmer background gradient. Phase 12's themes will layer on top of this — `data-mood="weekend"` is a *modifier* of `data-theme`, not a replacement.

10. **`WeekendPanel` is a separate component, not a conditional inside `BusinessPanel`.** Two components, two responsibilities. The Tabs component decides which to mount. This keeps the Business panel free of weekend logic and lets Phase 12's customization edit the WeekendPanel's content fixture without touching Business code.

11. **Calendar picker is hand-built, no `react-day-picker`.** Reasons: (a) bundle size — `react-day-picker` is ~80 KB vs. our ~3 KB grid, (b) styling fidelity — matching the bookish palette is easier when we control the markup, (c) we only need a tiny subset of features (month grid, click-to-pick, prev/next month, history-limit gray-out). If we ever need recurring-event highlighting or range selection, Phase 12+ can swap to `react-day-picker` or `cmdk`'s calendar without touching the rest of the app.

12. **No emojis.** Inline SVG only — same rule as spec §3.4.

13. **Spec edit is minimal.** We append one paragraph to §1 of `mockup/spec.md` noting the change. We do **not** edit the reference HTML (`mockup/morning-mindfulness-dashboard.html`) — that remains the v1 anchor.

---

## Task 1: Date helpers — `parseISO`, `addDays`, `isWeekend`, `compareISO`, `MIN_HISTORY_ISO`

> Pure functions first. No React, no DB. Test these in isolation; everything else stacks on top.

**Files:**
- Modify: `src/lib/dates.ts`
- Create: `tests/unit/dates-week.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/dates-week.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parseISO,
  addDays,
  isWeekend,
  weekendDayName,
  compareISO,
  MIN_HISTORY_ISO,
  todayISO,
} from "@/lib/dates";

describe("parseISO", () => {
  it("parses a valid ISO date as a Date at local midnight", () => {
    const d = parseISO("2026-05-02");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(2);
  });

  it("returns null for invalid input", () => {
    expect(parseISO("")).toBeNull();
    expect(parseISO("not-a-date")).toBeNull();
    expect(parseISO("2026-13-01")).toBeNull();
    expect(parseISO("2026-05-32")).toBeNull();
    expect(parseISO("2026/05/02")).toBeNull();
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-05-02", 1)).toBe("2026-05-03");
    expect(addDays("2026-05-02", 30)).toBe("2026-06-01");
  });
  it("subtracts via negative days", () => {
    expect(addDays("2026-05-02", -1)).toBe("2026-05-01");
    expect(addDays("2026-05-01", -1)).toBe("2026-04-30");
  });
  it("handles year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("isWeekend", () => {
  it("returns true for Saturday and Sunday", () => {
    // 2026-05-02 is a Saturday, 2026-05-03 a Sunday
    expect(isWeekend("2026-05-02")).toBe(true);
    expect(isWeekend("2026-05-03")).toBe(true);
  });
  it("returns false for weekdays", () => {
    expect(isWeekend("2026-05-04")).toBe(false); // Mon
    expect(isWeekend("2026-05-05")).toBe(false); // Tue
    expect(isWeekend("2026-05-06")).toBe(false); // Wed
    expect(isWeekend("2026-05-07")).toBe(false); // Thu
    expect(isWeekend("2026-05-08")).toBe(false); // Fri
  });
  it("returns false for invalid input", () => {
    expect(isWeekend("not-a-date")).toBe(false);
  });
});

describe("weekendDayName", () => {
  it("returns 'Saturday' or 'Sunday' for weekend days", () => {
    expect(weekendDayName("2026-05-02")).toBe("Saturday");
    expect(weekendDayName("2026-05-03")).toBe("Sunday");
  });
  it("returns null for weekdays", () => {
    expect(weekendDayName("2026-05-04")).toBeNull();
  });
});

describe("compareISO", () => {
  it("returns negative when a is before b", () => {
    expect(compareISO("2026-05-01", "2026-05-02")).toBeLessThan(0);
  });
  it("returns positive when a is after b", () => {
    expect(compareISO("2026-05-03", "2026-05-02")).toBeGreaterThan(0);
  });
  it("returns 0 when equal", () => {
    expect(compareISO("2026-05-02", "2026-05-02")).toBe(0);
  });
});

describe("MIN_HISTORY_ISO", () => {
  it("is approximately 365 days before today", () => {
    const today = parseISO(todayISO())!;
    const min = parseISO(MIN_HISTORY_ISO())!;
    const diff = Math.round((today.getTime() - min.getTime()) / 86_400_000);
    expect(diff).toBeGreaterThanOrEqual(364);
    expect(diff).toBeLessThanOrEqual(366);
  });
});
```

Run the test, expect failures (functions don't exist yet):

```bash
pnpm test tests/unit/dates-week.test.ts
```

- [ ] **Step 2: Implement the helpers**

Open `src/lib/dates.ts` and append:

```ts
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISO(iso: string): Date | null {
  const m = ISO_RE.exec(iso ?? "");
  if (!m) return null;
  const [, ys, ms, ds] = m;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
  // Reject overflow (e.g. May 32 -> Jun 1)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function isWeekend(iso: string): boolean {
  const d = parseISO(iso);
  if (!d) return false;
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

export function weekendDayName(iso: string): "Saturday" | "Sunday" | null {
  const d = parseISO(iso);
  if (!d) return null;
  const wd = d.getDay();
  if (wd === 0) return "Sunday";
  if (wd === 6) return "Saturday";
  return null;
}

export function compareISO(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function MIN_HISTORY_ISO(now: Date = new Date()): string {
  return addDays(todayISO(now), -365);
}
```

> **Why string comparison works for ISO dates:** `YYYY-MM-DD` strings are lexicographically sortable in the same order as the dates they represent. We avoid `Date` math wherever we can — it's a frequent source of timezone bugs.

- [ ] **Step 3: Run the test, verify all pass**

```bash
pnpm test tests/unit/dates-week.test.ts
```

Expected: all dates-week tests pass. (The exact `MIN_HISTORY_ISO` count may flip between 364–366 depending on the run; the test allows the range.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/dates.ts tests/unit/dates-week.test.ts
git commit -m "feat(dates): add parseISO, addDays, isWeekend, compareISO, MIN_HISTORY_ISO"
```

---

## Task 2: `getCurrentDayISO(searchParams)` resolver

> One helper, called by every Server Component that needs to know which day to render. Encapsulates fallback to today, future redirect, and validation.

**Files:**
- Create: `src/lib/current-day.ts`
- Create: `tests/unit/current-day.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/current-day.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveDayISO } from "@/lib/current-day";
import { todayISO } from "@/lib/dates";

// resolveDayISO is the pure function; getCurrentDayISO wraps it with redirect()
// (we test the impure server function in the integration tests later)

describe("resolveDayISO", () => {
  const today = todayISO();

  it("falls back to today when no search param", () => {
    expect(resolveDayISO(undefined).iso).toBe(today);
    expect(resolveDayISO(undefined).status).toBe("today");
  });

  it("falls back to today on invalid format", () => {
    expect(resolveDayISO("garbage").iso).toBe(today);
    expect(resolveDayISO("garbage").status).toBe("invalid");
    expect(resolveDayISO("2026/05/02").status).toBe("invalid");
    expect(resolveDayISO("").status).toBe("invalid");
  });

  it("returns past date as-is", () => {
    const r = resolveDayISO("2025-01-01");
    expect(r.iso).toBe("2025-01-01");
    expect(r.status).toBe("past");
  });

  it("returns today as-is when explicitly passed", () => {
    expect(resolveDayISO(today).status).toBe("today");
    expect(resolveDayISO(today).iso).toBe(today);
  });

  it("returns 'future' status for tomorrow", () => {
    const tomorrow = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return todayISO(d);
    })();
    const r = resolveDayISO(tomorrow);
    expect(r.status).toBe("future");
    expect(r.iso).toBe(tomorrow);
  });

  it("handles array search params (Next.js can give string[])", () => {
    expect(resolveDayISO(["2025-01-01"]).iso).toBe("2025-01-01");
    expect(resolveDayISO([]).iso).toBe(today);
  });
});
```

Run, expect failure:

```bash
pnpm test tests/unit/current-day.test.ts
```

- [ ] **Step 2: Implement `src/lib/current-day.ts`**

```ts
import { redirect } from "next/navigation";
import { todayISO, parseISO, compareISO } from "@/lib/dates";

export type DayStatus = "today" | "past" | "future" | "invalid";
export type DayResolution = { iso: string; status: DayStatus };

/**
 * Pure function — no Next.js side-effects. Used by tests and by the
 * server wrapper below. Given the raw `?d` value, returns the iso
 * string we should render *and* a status flag.
 *
 * - undefined / "" / non-ISO -> today (status: "invalid" or "today")
 * - past iso -> past
 * - today iso -> today
 * - future iso -> future (caller decides what to do)
 * - array values are normalized to the first element
 */
export function resolveDayISO(raw: string | string[] | undefined): DayResolution {
  const today = todayISO();
  if (raw === undefined) return { iso: today, status: "today" };
  const value = Array.isArray(raw) ? raw[0] ?? "" : raw;
  if (!value) return { iso: today, status: "invalid" };
  if (!parseISO(value)) return { iso: today, status: "invalid" };
  const cmp = compareISO(value, today);
  if (cmp < 0) return { iso: value, status: "past" };
  if (cmp > 0) return { iso: value, status: "future" };
  return { iso: value, status: "today" };
}

/**
 * Server-component helper. Resolves the active day from the URL,
 * redirects future dates to "/" (canonical today), and returns the
 * day plus a `readOnly` flag for the caller.
 *
 * Usage in a Server Component:
 *
 *   const { iso, readOnly } = getCurrentDayISO(await searchParams);
 */
export function getCurrentDayISO(searchParams: { d?: string | string[] }): {
  iso: string;
  readOnly: boolean;
  isToday: boolean;
} {
  const r = resolveDayISO(searchParams.d);
  if (r.status === "future") {
    redirect("/");
  }
  return {
    iso: r.iso,
    readOnly: r.status === "past",
    isToday: r.status === "today" || r.status === "invalid",
  };
}
```

- [ ] **Step 3: Run the test, verify pure function passes**

```bash
pnpm test tests/unit/current-day.test.ts
```

Expected: 6 passing. The wrapper `getCurrentDayISO` is exercised in Task 6's integration tests because it depends on Next.js `redirect`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/current-day.ts tests/unit/current-day.test.ts
git commit -m "feat(dates): getCurrentDayISO resolver — fallback, future-redirect, readOnly flag"
```

---

## Task 3: Server-side guard — `assertWritable(iso)` and applying it everywhere

> Single point of truth on the server: any mutation that targets a date must call this first. Past or future days throw.

**Files:**
- Create: `src/server/actions/guards.ts`
- Modify: `src/server/actions/goals.ts`, `src/server/actions/tasks.ts`, `src/server/actions/days.ts`, `src/server/actions/clicks.ts`
- Create: `tests/integration/readonly-guard.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/readonly-guard.test.ts`:

```ts
import { describe, expect, it, beforeAll } from "vitest";
import { db } from "@/server/db";
import { todayISO, addDays } from "@/lib/dates";
import { toggleCheckGoal } from "@/server/actions/goals";
import { setNotes } from "@/server/actions/days";
import { addTask } from "@/server/actions/tasks";
import { recordClick } from "@/server/actions/clicks";

const USER_ID = "local-default";
const TEST_GOAL_ID = `${USER_ID}::g_god`;

beforeAll(async () => {
  // Ensure the seeded test fixtures exist; run migrations + seed
  // against an isolated test DB. Phase 2's tests already do this,
  // so we mirror their setup. If the DB is fresh, seed it.
  const u = await db.user.findUnique({ where: { id: USER_ID } });
  if (!u) {
    await import("../../prisma/seed");
  }
});

describe("read-only guard — past days", () => {
  const yesterday = addDays(todayISO(), -1);

  it("toggleCheckGoal throws for yesterday", async () => {
    await expect(
      toggleCheckGoal({ userId: USER_ID, iso: yesterday, goalId: TEST_GOAL_ID }),
    ).rejects.toThrow(/Past days are read-only/);
  });

  it("setNotes throws for yesterday", async () => {
    await expect(
      setNotes({ userId: USER_ID, iso: yesterday, notes: "hello" }),
    ).rejects.toThrow(/Past days are read-only/);
  });

  it("addTask throws for yesterday", async () => {
    await expect(
      addTask({ userId: USER_ID, iso: yesterday, title: "x", section: "general" }),
    ).rejects.toThrow(/Past days are read-only/);
  });

  it("recordClick throws for yesterday", async () => {
    await expect(
      recordClick({ userId: USER_ID, iso: yesterday, section: "mindfulness" }),
    ).rejects.toThrow(/Past days are read-only/);
  });
});

describe("read-only guard — today still works", () => {
  it("toggleCheckGoal succeeds for today", async () => {
    await expect(
      toggleCheckGoal({ userId: USER_ID, iso: todayISO(), goalId: TEST_GOAL_ID }),
    ).resolves.toBeDefined();
  });
});
```

> If your Phase 2 actions take slightly different argument shapes, adjust this test to match what landed there. The point is the *guard*, not the exact signature.

Run, expect failure:

```bash
pnpm test tests/integration/readonly-guard.test.ts
```

- [ ] **Step 2: Create `src/server/actions/guards.ts`**

```ts
import { todayISO, parseISO, compareISO } from "@/lib/dates";

const READ_ONLY_MESSAGE = "Past days are read-only";

/**
 * Guard for any server action that mutates day-keyed state.
 * Throws if `iso` is not exactly today (past OR future is rejected;
 * future shouldn't be reachable through the UI, but we defend in depth).
 *
 * Throwing is preferred over returning a result object so server actions
 * fail loudly and can't accidentally silently no-op.
 */
export function assertWritable(iso: string): void {
  if (!parseISO(iso)) {
    throw new Error(`Invalid iso: ${iso}`);
  }
  const cmp = compareISO(iso, todayISO());
  if (cmp !== 0) {
    throw new Error(READ_ONLY_MESSAGE);
  }
}

export const READ_ONLY_ERROR = READ_ONLY_MESSAGE;
```

- [ ] **Step 3: Apply the guard in `src/server/actions/goals.ts`**

Find each mutating action (`toggleCheckGoal`, `incrementCountGoal`, `setTimeGoal`, `addGoal`, `deleteGoal`) and add `assertWritable(iso)` as the first line of the function body. Example:

```ts
import { assertWritable } from "./guards";

export async function toggleCheckGoal({
  userId,
  iso,
  goalId,
}: {
  userId: string;
  iso: string;
  goalId: string;
}) {
  assertWritable(iso);
  // ...existing implementation
}
```

> Note: if `addGoal` and `deleteGoal` were defined without an `iso` parameter in Phase 2 (the goal definition itself is global, not per-day), they don't need the guard. Adding/removing a *goal definition* is allowed regardless of the active viewing day. Only per-day state mutates.

- [ ] **Step 4: Apply the guard in `src/server/actions/days.ts`**

```ts
import { assertWritable } from "./guards";

export async function setNotes({ userId, iso, notes }: ...) {
  assertWritable(iso);
  // ...
}

export async function setHealth({ userId, iso, key, value }: ...) {
  assertWritable(iso);
  // ...
}

export async function setWin({ userId, iso, win }: ...) {
  assertWritable(iso);
  // ...
}

export async function setFin({ userId, iso, fin }: ...) {
  assertWritable(iso);
  // ...
}

export async function bumpDisconnect({ userId, iso, delta }: ...) {
  assertWritable(iso);
  // ...
}
```

- [ ] **Step 5: Apply the guard in `src/server/actions/tasks.ts`**

```ts
import { assertWritable } from "./guards";

export async function addTask({ userId, iso, title, section }: ...) {
  assertWritable(iso);
  // ...
}

export async function toggleTask({ userId, iso, taskId }: ...) {
  assertWritable(iso);
  // ...
}

export async function deleteTask({ userId, iso, taskId }: ...) {
  assertWritable(iso);
  // ...
}
```

> Note on tasks: tasks are not strictly day-keyed in storage (a task is created with `createdAt`, completed with `completedOn`). But the *action of creating, toggling, or deleting a task* is anchored to "today" — you can't time-travel to last Tuesday and add a task to last Tuesday. So we still pass `iso` (which the form sets from the page's current day) and reject anything but today.

- [ ] **Step 6: Apply the guard in `src/server/actions/clicks.ts`**

```ts
import { assertWritable } from "./guards";

export async function recordClick({ userId, iso, section }: ...) {
  assertWritable(iso);
  // ...
}
```

- [ ] **Step 7: Run the integration test, verify all pass**

```bash
pnpm test tests/integration/readonly-guard.test.ts
```

Expected: 5 passing.

- [ ] **Step 8: Commit**

```bash
git add src/server/actions/ tests/integration/readonly-guard.test.ts
git commit -m "feat(actions): assertWritable guard — reject mutations for non-today iso"
```

---

## Task 4: `data-mood="weekend"` palette in `globals.css`

> CSS-only change; no React yet. We define the weekend variant tokens and the read-only styling here so the rest of the phase can lean on them.

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Append the weekend overrides to `globals.css`**

Open `src/styles/globals.css` and append (after the existing `[data-theme="dark"]` block):

```css
/* ---------------- weekend mood (Sat/Sun) ---------------- */

/* Weekend dials down the orange and biases towards rose + warmer cream.
 * It applies on top of either light or dark theme. Keep it in the same
 * warm/bookish family. */

[data-mood="weekend"] {
  --bg-grad-1: #f7eee0;       /* slightly more peach */
  --bg-grad-2: #ecdfc8;       /* slightly more gold */
  --accent: #c97b6e;          /* swap orange-ish accent for rose */
  --accent-soft: #f7e6e1;     /* lighter rose */
}

[data-theme="dark"][data-mood="weekend"] {
  --bg-grad-1: #1a1612;
  --bg-grad-2: #12100c;
  --accent: #d8867a;
  --accent-soft: #2a1815;
}

/* Optional: slightly warmer body radial overlays on weekend.
 * Re-declaring the body background under the mood selector. */
body[data-mood="weekend"],
[data-mood="weekend"] body {
  background-image:
    radial-gradient(1200px 600px at 12% -10%, rgba(201,123,110,.10), transparent 60%),
    radial-gradient(1000px 500px at 110% 0%, rgba(176,141,87,.14), transparent 50%),
    linear-gradient(180deg, var(--bg-grad-1) 0%, var(--bg-grad-2) 100%);
}

/* ---------------- read-only state ---------------- */

/* Applied to any control that is disabled because the user is viewing a
 * past day. The class can also be set on a wrapper to "ghost" a section. */

[data-readonly="true"] {
  pointer-events: none;        /* belt-and-suspenders alongside `disabled` */
  filter: saturate(0.78);
  opacity: 0.85;
}

/* The banner at the top of the page when viewing past days. */
.readonly-banner {
  background: var(--accent-soft);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.readonly-banner .rb-msg { display: inline-flex; align-items: center; gap: 8px; }
.readonly-banner .rb-msg svg { color: var(--gold); }
.readonly-banner a { color: var(--sage); font-weight: 600; text-decoration: none; }
.readonly-banner a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Manually verify in dev**

Run:

```bash
pnpm dev
```

Open `http://localhost:3000` and use DevTools to inspect `<html>`. Add `data-mood="weekend"` manually via the inspector — confirm the body background warms and accent shifts to rose. Remove it — confirm normal palette returns. (We're testing the CSS hookup; the React side hooks it up in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(styles): data-mood weekend palette + read-only banner styles"
```

---

## Task 5: Root layout — wire `data-mood` from `searchParams`

> The layout needs to know the active day to set the right `data-mood`. Next.js's root `layout.tsx` doesn't receive `searchParams` directly (only `params`), so we read the URL via `headers()` or restructure to a `(dash)` route group. We choose the latter: keep `layout.tsx` for global wrapping and let `page.tsx` be the date-aware Server Component.
>
> Cleaner alternative we adopted: set `data-theme` on `<html>` from cookie (already in Phase 1), and set `data-mood` on `<body>` from `page.tsx` using a child wrapper that re-renders per `searchParams`. We do this with a small client-only `<MoodHydrator>` component the page renders right after the body opens.

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/MoodHydrator.tsx`
- Modify: `src/app/page.tsx` (touched again in later tasks; here we only add the hydrator)

- [ ] **Step 1: Create `src/components/MoodHydrator.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export function MoodHydrator({ mood }: { mood: "weekend" | "weekday" }) {
  useEffect(() => {
    if (mood === "weekend") {
      document.documentElement.dataset.mood = "weekend";
    } else {
      delete document.documentElement.dataset.mood;
    }
    return () => {
      delete document.documentElement.dataset.mood;
    };
  }, [mood]);

  return null;
}
```

> Why a client component? `data-mood` toggles based on the *viewing* date, which lives in the URL search params and changes without a full page reload (the user clicks "prev day", `router.push`s, and the page re-renders). A `useEffect` keeps `<html data-mood>` in sync across those navigations without a flash of unstyled content (the SSR pass also sets it — see step 2).

- [ ] **Step 2: Set `data-mood` server-side in the root layout**

We can't read `searchParams` in `layout.tsx`, but we *can* read it in `page.tsx` and write it to the DOM via the hydrator. To avoid a flash, we *also* let the hydrator run as soon as it mounts. There's no SSR data-mood — it's purely client-set after first paint. This is acceptable because the weekend palette is a soft tint; the flash is invisible.

If we later care about zero-flash SSR mood, the cleanest fix is to move the page to a `(dash)/[[...slug]]/page.tsx` catch-all and let layout.tsx receive params. Phase 12 can do that if needed.

For Phase 11, leave `layout.tsx` exactly as Phase 1 wrote it — just confirm it still renders.

- [ ] **Step 3: Render `MoodHydrator` from `page.tsx`**

Edit `src/app/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { Topbar } from "@/components/Topbar";
import { Hero } from "@/components/Hero";
import { Tabs } from "@/components/Tabs";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { MoodHydrator } from "@/components/MoodHydrator";
import { getCurrentDayISO } from "@/lib/current-day";
import { isWeekend } from "@/lib/dates";
import { db } from "@/server/db";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const { iso, readOnly, isToday } = getCurrentDayISO(sp);

  const c = await cookies();
  const theme: "light" | "dark" = c.get("mm_theme")?.value === "dark" ? "dark" : "light";
  const tab =
    (c.get("mm_tab")?.value as "mindfulness" | "business" | "personal" | "overview" | undefined) ??
    "mindfulness";

  const user = await db.user.findUnique({ where: { id: "local-default" } });
  const name = user?.name ?? "Friend";

  const weekend = isWeekend(iso);

  return (
    <main className="app">
      <MoodHydrator mood={weekend ? "weekend" : "weekday"} />
      <Topbar theme={theme} name={name} />
      <Hero name={name} iso={iso} sub={isToday ? "A fresh page." : undefined} />
      {readOnly ? <ReadOnlyBanner iso={iso} /> : null}
      <Tabs initial={tab} iso={iso} readOnly={readOnly} weekend={weekend} />
      <footer
        className="serif"
        style={{
          marginTop: 48,
          textAlign: "center",
          color: "var(--ink-muted)",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        I am here. I am enough. I am loved. I am loving.
        <br />I am exactly where I need to be.
      </footer>
    </main>
  );
}
```

> The `Hero`, `Tabs`, and `ReadOnlyBanner` components don't exist with these signatures yet — Tasks 6–9 fill them in. The page won't compile until those land. That's fine; we commit each task as we go.

- [ ] **Step 4: Commit**

```bash
git add src/components/MoodHydrator.tsx src/app/page.tsx
git commit -m "feat(layout): MoodHydrator + page resolves viewing day via getCurrentDayISO"
```

---

## Task 6: `<DateNav>` — prev / next / today + calendar trigger

> Client component. Renders next to the date in the hero. Reads current `?d=` from `useSearchParams`, computes prev/next ISOs, and `router.push`s the new query.

**Files:**
- Modify: `src/components/Hero.tsx`
- Create: `src/components/DateNav.tsx`

- [ ] **Step 1: Create `src/components/DateNav.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { addDays, todayISO, MIN_HISTORY_ISO } from "@/lib/dates";
import { CalendarPopover } from "./CalendarPopover";

export function DateNav({ iso }: { iso: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const today = todayISO();
  const min = MIN_HISTORY_ISO();
  const prev = addDays(iso, -1);
  const next = addDays(iso, 1);
  const isToday = iso === today;
  const canPrev = prev >= min;
  const canNext = next <= today;

  const goto = (target: string) => {
    if (target === today) {
      router.push("/");
    } else {
      router.push(`/?d=${target}`);
    }
  };

  const btn = (label: string, onClick: () => void, disabled: boolean, kids: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        background: "var(--surface-solid)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        color: "var(--ink-soft)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {kids}
    </button>
  );

  return (
    <div
      ref={popoverRef}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginLeft: 16,
        position: "relative",
      }}
    >
      {btn(
        "Previous day",
        () => goto(prev),
        !canPrev,
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>,
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open calendar"
        aria-expanded={open}
        style={{
          background: "var(--surface-solid)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--ink-soft)",
          fontSize: 12,
        }}
      >
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Calendar</span>
      </button>

      {btn(
        "Next day",
        () => goto(next),
        !canNext,
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>,
      )}

      {!isToday ? (
        <button
          type="button"
          onClick={() => goto(today)}
          style={{
            background: "var(--sage)",
            color: "white",
            border: "none",
            borderRadius: 999,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            marginLeft: 4,
          }}
        >
          Today
        </button>
      ) : null}

      {open ? (
        <CalendarPopover
          iso={iso}
          onPick={(target) => {
            setOpen(false);
            goto(target);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/components/Hero.tsx` to render `<DateNav>`**

```tsx
import { friendlyDate } from "@/lib/dates";
import { DateNav } from "./DateNav";

export function Hero({ name, iso, sub }: { name: string; iso: string; sub?: string }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
        Good morning, {name}
      </h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: 6,
        }}
      >
        <p className="serif" style={{ color: "var(--ink-soft)", margin: 0, fontSize: 18 }}>
          {friendlyDate(iso)}
        </p>
        <DateNav iso={iso} />
      </div>
      {sub ? (
        <p style={{ color: "var(--ink-muted)", margin: "8px 0 0", fontSize: 14 }}>{sub}</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Commit (CalendarPopover stub will follow in next task)**

```bash
git add src/components/DateNav.tsx src/components/Hero.tsx
git commit -m "feat(hero): DateNav with prev / next / today / calendar trigger"
```

---

## Task 7: `<CalendarPopover>` — month grid, hand-built, no deps

**Files:**
- Create: `src/components/CalendarPopover.tsx`

- [ ] **Step 1: Implement the popover**

```tsx
"use client";

import { useState, useMemo } from "react";
import { parseISO, todayISO, MIN_HISTORY_ISO } from "@/lib/dates";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoToYM(iso: string): { year: number; month: number } {
  const d = parseISO(iso) ?? new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

function buildMonth(year: number, month: number): Array<string | null> {
  const first = new Date(year, month, 1);
  const startWd = first.getDay(); // 0 = Sun
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) {
    const y = year;
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${y}-${m}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarPopover({
  iso,
  onPick,
  onClose,
}: {
  iso: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const { year: initY, month: initM } = isoToYM(iso);
  const [year, setYear] = useState(initY);
  const [month, setMonth] = useState(initM);

  const today = todayISO();
  const min = MIN_HISTORY_ISO();
  const cells = useMemo(() => buildMonth(year, month), [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  return (
    <div
      role="dialog"
      aria-label="Pick a date"
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        zIndex: 50,
        background: "var(--surface-solid)",
        border: "1px solid var(--line-strong)",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        padding: 14,
        width: 280,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={prevMonth} aria-label="Previous month" style={chevronStyle}>
          <svg className="ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="serif" style={{ fontSize: 15, color: "var(--ink)" }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <button type="button" onClick={nextMonth} aria-label="Next month" style={chevronStyle}>
          <svg className="ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginTop: 10,
          fontSize: 11,
          color: "var(--ink-muted)",
          textAlign: "center",
        }}
      >
        {DOW.map((d) => (
          <div key={d} style={{ padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginTop: 4,
        }}
      >
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const tooFuture = c > today;
          const tooPast = c < min;
          const disabled = tooFuture || tooPast;
          const isCurrent = c === iso;
          const isTodayCell = c === today;
          return (
            <button
              key={c}
              type="button"
              onClick={() => !disabled && onPick(c)}
              disabled={disabled}
              style={{
                aspectRatio: "1 / 1",
                border: "none",
                background: isCurrent
                  ? "var(--sage)"
                  : isTodayCell
                  ? "var(--sage-soft)"
                  : "transparent",
                color: isCurrent ? "white" : disabled ? "var(--ink-muted)" : "var(--ink)",
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? "default" : "pointer",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: isCurrent || isTodayCell ? 600 : 400,
              }}
            >
              {Number(c.slice(8))}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button
          type="button"
          onClick={() => onPick(today)}
          style={{
            background: "none",
            border: "none",
            color: "var(--sage)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--ink-muted)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

const chevronStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-soft)",
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
};
```

- [ ] **Step 2: Smoke test in dev**

```bash
pnpm dev
```

Open `http://localhost:3000`. Confirm:
- The "Calendar" button opens a popover next to the date.
- Prev / next month chevrons work.
- Clicking a past date in the grid pushes `?d=...` and the page re-renders.
- Today's cell is subtly highlighted; the currently-viewing cell is filled green.
- Future days are visible but disabled-looking.
- Days before `MIN_HISTORY_ISO` are disabled.

- [ ] **Step 3: Commit**

```bash
git add src/components/CalendarPopover.tsx
git commit -m "feat(hero): CalendarPopover — month grid, hand-built, no deps"
```

---

## Task 8: `<ReadOnlyBanner>`

**Files:**
- Create: `src/components/ReadOnlyBanner.tsx`

- [ ] **Step 1: Implement the banner**

```tsx
import { friendlyDate } from "@/lib/dates";
import Link from "next/link";

export function ReadOnlyBanner({ iso }: { iso: string }) {
  return (
    <div className="readonly-banner" role="status">
      <span className="rb-msg">
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          Viewing <strong>{friendlyDate(iso)}</strong> · read only
        </span>
      </span>
      <Link href="/">Today</Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReadOnlyBanner.tsx
git commit -m "feat(hero): ReadOnlyBanner for past-day view"
```

---

## Task 9: Weekend content fixture + `<WeekendPanel>`

**Files:**
- Create: `src/lib/weekend-content.ts`
- Create: `src/components/panels/WeekendPanel.tsx`
- Create: `tests/unit/weekend-content.test.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types in `src/types/index.ts`**

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekendReading = {
  title: string;
  author: string;
  source: string;       // "Essay" | "Poem" | "Chapter" | "Article"
  url: string;
  estMinutes: number;
  pitch: string;        // 1–2 sentence summary
};

export type WeekendContent = {
  dayOfWeek: 0 | 6;     // 0 = Sun, 6 = Sat
  label: string;        // "Sunday Slow" | "Saturday Slow"
  reading: WeekendReading;
  callPrompt: {
    title: string;      // "Call a friend you haven't talked to"
    body: string;       // gentle nudge text
  };
  noScreensHour: {
    title: string;      // "An hour without a screen"
    body: string;       // suggestion text
  };
  closing: string;      // closing line for the panel
};
```

- [ ] **Step 2: Create the fixture `src/lib/weekend-content.ts`**

```ts
import type { WeekendContent, Weekday } from "@/types";

const SATURDAY: WeekendContent = {
  dayOfWeek: 6,
  label: "Saturday Slow",
  reading: {
    title: "On the Pleasure of Long Walks",
    author: "Robert Louis Stevenson",
    source: "Essay",
    url: "https://en.wikisource.org/wiki/Walking_Tours",
    estMinutes: 8,
    pitch:
      "A short, generous essay on what walking does to the mind that nothing else can. Read it slowly.",
  },
  callPrompt: {
    title: "Call a friend, no agenda",
    body:
      "Pick someone you haven't spoken to in a while. Don't text — call. The call doesn't have to be long. Ask how they actually are.",
  },
  noScreensHour: {
    title: "One hour without a screen",
    body:
      "Phone in another room, laptop closed. Sit on the porch, work in the yard, cook something slowly. Notice what your attention does when nothing is feeding it.",
  },
  closing:
    "The week earns its rest. You don't have to do anything productive today.",
};

const SUNDAY: WeekendContent = {
  dayOfWeek: 0,
  label: "Sunday Slow",
  reading: {
    title: "On Solitude",
    author: "Michel de Montaigne",
    source: "Essay",
    url: "https://www.gutenberg.org/files/3600/3600-h/3600-h.htm",
    estMinutes: 12,
    pitch:
      "Montaigne on the room one keeps for oneself, even in a full life. A reminder that quiet is a practice, not an event.",
  },
  callPrompt: {
    title: "Reach out to family",
    body:
      "Your kids, your siblings, your parents — pick one and check in. A two-minute call is enough. The point is the call, not the content.",
  },
  noScreensHour: {
    title: "A long, slow hour",
    body:
      "No catching up on the inbox. No 'just-one-thing.' Make a meal. Read a chapter. Stretch. Walk Parker and Kittle. Let the hour be the hour.",
  },
  closing:
    "Tomorrow will be busy. Today, be a person, not a producer.",
};

export const WEEKEND_CONTENT: Record<0 | 6, WeekendContent> = {
  0: SUNDAY,
  6: SATURDAY,
};

export function getWeekendContent(dayOfWeek: Weekday): WeekendContent | null {
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return WEEKEND_CONTENT[dayOfWeek];
  }
  return null;
}
```

> The two readings are intentionally public-domain texts — both Stevenson and Montaigne are out of copyright, so the URLs (Wikisource and Project Gutenberg) won't rot or paywall. Phase 12's customization can let the user paste their own.

- [ ] **Step 3: Test the fixture shape**

Create `tests/unit/weekend-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getWeekendContent, WEEKEND_CONTENT } from "@/lib/weekend-content";

describe("weekend content fixture", () => {
  it("returns Sunday for 0 and Saturday for 6", () => {
    expect(getWeekendContent(0)?.label).toBe("Sunday Slow");
    expect(getWeekendContent(6)?.label).toBe("Saturday Slow");
  });

  it("returns null for weekdays", () => {
    expect(getWeekendContent(1)).toBeNull();
    expect(getWeekendContent(5)).toBeNull();
  });

  it("each entry has the required fields", () => {
    for (const c of Object.values(WEEKEND_CONTENT)) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.reading.url).toMatch(/^https?:\/\//);
      expect(c.reading.estMinutes).toBeGreaterThan(0);
      expect(c.callPrompt.title.length).toBeGreaterThan(0);
      expect(c.noScreensHour.title.length).toBeGreaterThan(0);
      expect(c.closing.length).toBeGreaterThan(0);
    }
  });
});
```

Run, expect 3 passing:

```bash
pnpm test tests/unit/weekend-content.test.ts
```

- [ ] **Step 4: Create `src/components/panels/WeekendPanel.tsx`**

```tsx
import type { WeekendContent } from "@/types";
import { getWeekendContent } from "@/lib/weekend-content";
import { parseISO } from "@/lib/dates";

export function WeekendPanel({ iso }: { iso: string }) {
  const d = parseISO(iso);
  const wd = (d?.getDay() ?? 6) as 0 | 6;
  const content: WeekendContent | null = getWeekendContent(wd);
  if (!content) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card pulse-hero">
        <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
          {content.label.toUpperCase()}
        </div>
        <h2 className="serif" style={{ fontSize: "1.6rem", fontWeight: 500, margin: "8px 0 0" }}>
          A different kind of day
        </h2>
        <p style={{ color: "var(--ink-soft)", margin: "8px 0 0", fontSize: 14 }}>
          The week earns its rest. Read something slow, call someone you love, and unplug for an hour.
        </p>
      </div>

      <div className="card">
        <div className="card-eyebrow" style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
          A SHORT READ · {content.reading.estMinutes} MIN
        </div>
        <a
          href={content.reading.url}
          target="_blank"
          rel="noopener noreferrer"
          data-track-cat="mindfulness"
          style={{ display: "block", marginTop: 8, color: "inherit", textDecoration: "none" }}
        >
          <h3 className="serif" style={{ fontSize: "1.35rem", fontWeight: 500, margin: 0 }}>
            {content.reading.title}
          </h3>
          <div style={{ color: "var(--ink-muted)", fontSize: 12, marginTop: 4 }}>
            {content.reading.author} · {content.reading.source}
          </div>
          <p style={{ color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.55 }}>
            {content.reading.pitch}
          </p>
        </a>
      </div>

      <div className="card">
        <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
          REACH OUT
        </div>
        <h3 className="serif" style={{ fontSize: "1.2rem", fontWeight: 500, margin: "8px 0 0" }}>
          {content.callPrompt.title}
        </h3>
        <p style={{ color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.6 }}>
          {content.callPrompt.body}
        </p>
      </div>

      <div className="card">
        <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
          UNPLUG
        </div>
        <h3 className="serif" style={{ fontSize: "1.2rem", fontWeight: 500, margin: "8px 0 0" }}>
          {content.noScreensHour.title}
        </h3>
        <p style={{ color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.6 }}>
          {content.noScreensHour.body}
        </p>
      </div>

      <p
        className="serif"
        style={{
          textAlign: "center",
          color: "var(--ink-muted)",
          fontStyle: "italic",
          marginTop: 8,
        }}
      >
        {content.closing}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/weekend-content.ts src/components/panels/WeekendPanel.tsx tests/unit/weekend-content.test.ts src/types/index.ts
git commit -m "feat(weekend): WeekendPanel + static fixture for Sat/Sun"
```

---

## Task 10: Tabs — pass `iso` + `readOnly`, swap Business and Weekend

**Files:**
- Modify: `src/components/Tabs.tsx`
- Modify: `src/components/panels/MindfulnessPanel.tsx`, `BusinessPanel.tsx`, `PersonalPanel.tsx`, `OverviewPanel.tsx`

- [ ] **Step 1: Update each panel to accept `{ iso, readOnly }` props**

For each panel file, change the signature:

```tsx
export function MindfulnessPanel({ iso, readOnly }: { iso: string; readOnly: boolean }) { ... }
```

…and pass `iso` + `readOnly` down to whatever children consume them (in Phase 1 these are placeholders; later phases wire them through goal rows, journal textarea, etc.). For the Phase 1 placeholder, just include them in the displayed text so we can manually verify the prop is reaching the panel:

```tsx
<p style={{ color: "var(--ink-muted)", marginTop: 8 }}>
  Coming in Phase 3 — viewing {iso}{readOnly ? " (read only)" : ""}
</p>
```

(After Phase 3+ have landed, this placeholder text is gone — but the props remain.)

Apply the same change to BusinessPanel, PersonalPanel, OverviewPanel.

- [ ] **Step 2: Modify `src/components/Tabs.tsx`**

```tsx
"use client";
import { useState } from "react";
import { MindfulnessPanel } from "./panels/MindfulnessPanel";
import { BusinessPanel } from "./panels/BusinessPanel";
import { PersonalPanel } from "./panels/PersonalPanel";
import { OverviewPanel } from "./panels/OverviewPanel";
import { WeekendPanel } from "./panels/WeekendPanel";

type Tab = "mindfulness" | "business" | "personal" | "overview";

const BASE_TABS: Array<{ id: Tab; label: string; eyebrow: string; dotClass: string }> = [
  { id: "mindfulness", label: "Mindfulness", eyebrow: "Stillpoint", dotClass: "sec-mindfulness" },
  { id: "business",    label: "Business / AI", eyebrow: "Pulse", dotClass: "sec-business" },
  { id: "personal",    label: "Personal", eyebrow: "Compass", dotClass: "sec-personal" },
  { id: "overview",    label: "Goals Overview", eyebrow: "All-up", dotClass: "sec-general" },
];

export function Tabs({
  initial = "mindfulness",
  iso,
  readOnly,
  weekend,
}: {
  initial?: Tab;
  iso: string;
  readOnly: boolean;
  weekend: boolean;
}) {
  const [active, setActive] = useState<Tab>(initial);

  // Weekend: rebrand the second tab. Same underlying tab id ("business")
  // so cookie + active state survive cleanly across week/weekend transitions.
  const tabs = BASE_TABS.map((t) =>
    weekend && t.id === "business"
      ? { ...t, label: "Slow", eyebrow: "Weekend" }
      : t,
  );

  return (
    <>
      <div
        role="tablist"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          margin: "0 0 24px",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => {
              setActive(t.id);
              document.cookie = `mm_tab=${t.id}; path=/; max-age=31536000; SameSite=Lax`;
            }}
            className="card"
            style={{
              cursor: "pointer",
              padding: "14px 16px",
              textAlign: "left",
              outline: active === t.id ? "2px solid var(--sage)" : "none",
              outlineOffset: -2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={`sec-dot ${t.dotClass}`} />
              <span style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
                {t.eyebrow.toUpperCase()}
              </span>
            </div>
            <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>

      <section>
        {active === "mindfulness" && <MindfulnessPanel iso={iso} readOnly={readOnly} />}
        {active === "business" &&
          (weekend ? <WeekendPanel iso={iso} /> : <BusinessPanel iso={iso} readOnly={readOnly} />)}
        {active === "personal" && <PersonalPanel iso={iso} readOnly={readOnly} />}
        {active === "overview" && <OverviewPanel iso={iso} readOnly={readOnly} />}
      </section>
    </>
  );
}
```

> Why keep the same tab `id` (`"business"`) for the weekend variant? So that toggling between weekend and weekday days doesn't lose the user's tab selection (they were on "business" Friday, switched to Saturday — they should still be on the second tab, which is now "Slow"). The `id` is internal; the *label* is what changes.

- [ ] **Step 3: Smoke test — Saturday view**

Manually navigate to `http://localhost:3000/?d=<some-Saturday>` (e.g. `2026-05-02`).
Confirm:
- The body background warms (rose tint).
- The second tab is labeled "Slow" / eyebrow "WEEKEND".
- Clicking it shows the WeekendPanel with the Saturday reading.
- Mindfulness, Personal, Overview tabs still work.

Navigate to a Wednesday (`?d=2026-04-29`).
Confirm:
- Background returns to neutral cream.
- Second tab reads "Business / AI" again.

- [ ] **Step 4: Commit**

```bash
git add src/components/Tabs.tsx src/components/panels/
git commit -m "feat(tabs): swap Business and WeekendPanel on weekend; pass iso + readOnly"
```

---

## Task 11: Wire `readOnly` through goal rows, task drawer, stat widgets

> The exact files touched here depend on what Phases 3, 4, 5 produced. Below is the minimum we need: goal rows show disabled checkboxes, the tasks drawer shows a "past day" notice, journal textarea is `readOnly`, and the stat-widget +/- buttons are disabled.

**Files:**
- Modify: `src/components/goals/GoalRow.tsx`
- Modify: `src/components/tasks/TasksDrawer.tsx`
- Modify: `src/components/panels/MindfulnessPanel.tsx` (journal textarea)
- Modify: `src/components/panels/PersonalPanel.tsx` (stat widgets)

- [ ] **Step 1: `GoalRow` — add `readOnly` prop**

Find the goal row component (created in Phase 5 — adapt to whatever the actual signature is). Pattern:

```tsx
type GoalRowProps = {
  goal: Goal;
  iso: string;
  readOnly?: boolean;
  /* existing props */
};

export function GoalRow({ goal, iso, readOnly = false, ... }: GoalRowProps) {
  return (
    <div className="goal" data-readonly={readOnly ? "true" : undefined}>
      <button
        type="button"
        disabled={readOnly}
        onClick={readOnly ? undefined : () => /* existing toggle */}
        aria-label={`Toggle ${goal.title}`}
      >
        {/* checkbox SVG */}
      </button>
      {/* rest unchanged */}
    </div>
  );
}
```

Pass `readOnly` from each panel down to its goal lists.

- [ ] **Step 2: `TasksDrawer` — show notice on past days**

```tsx
export function TasksDrawer({ readOnly, ... }: { readOnly: boolean; ... }) {
  // existing state
  return (
    <aside className={`drawer ${open ? "open" : ""}`}>
      {/* header */}
      {readOnly ? (
        <div style={{ padding: 16, color: "var(--ink-muted)", fontSize: 14 }}>
          Past days are read-only. Switch back to today to add or complete tasks.
        </div>
      ) : (
        <>
          <TaskForm /* existing */ />
          <TaskList /* existing */ />
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Journal textarea — `readOnly` attribute**

In `MindfulnessPanel.tsx` (or wherever the journal lives):

```tsx
<textarea
  className="notes"
  readOnly={readOnly}
  defaultValue={day.notes}
  onInput={readOnly ? undefined : handleInput}
  /* existing */
/>
```

- [ ] **Step 4: Stat widgets — disable buttons on past days**

In `PersonalPanel.tsx`:

```tsx
<button type="button" disabled={readOnly} onClick={readOnly ? undefined : () => bumpDisconnect(15)}>
  +15
</button>
```

Repeat for +30/+60/-15 and the health toggles.

For text inputs (financial, win-of-the-day):

```tsx
<input type="text" defaultValue={fin.net} readOnly={readOnly} onChange={readOnly ? undefined : ...} />
<textarea className="win-area" defaultValue={day.win} readOnly={readOnly} ... />
```

- [ ] **Step 5: Commit**

```bash
git add src/components/goals/GoalRow.tsx src/components/tasks/TasksDrawer.tsx src/components/panels/MindfulnessPanel.tsx src/components/panels/PersonalPanel.tsx
git commit -m "feat(panels): wire readOnly through goals, tasks, journal, stat widgets"
```

---

## Task 12: Integration test — past-day render shows disabled controls

**Files:**
- Create: `tests/integration/past-day-render.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GoalRow } from "@/components/goals/GoalRow";

// Minimal goal fixture matching whatever Phase 5 settled on
const goal = {
  id: "local-default::g_god",
  userId: "local-default",
  section: "mindfulness" as const,
  title: "Time with God",
  type: "check" as const,
  target: 1,
  isDefault: true,
};

describe("past-day rendering", () => {
  it("renders the goal row checkbox as disabled when readOnly", () => {
    const { getByLabelText } = render(
      <GoalRow goal={goal} iso="2025-01-01" readOnly={true} progress={{ current: 0, target: 1, pct: 0 }} />,
    );
    const btn = getByLabelText(/Toggle Time with God/);
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(btn.closest("[data-readonly]")?.getAttribute("data-readonly")).toBe("true");
  });

  it("renders the goal row checkbox as enabled when not readOnly", () => {
    const { getByLabelText } = render(
      <GoalRow goal={goal} iso="2026-05-02" readOnly={false} progress={{ current: 0, target: 1, pct: 0 }} />,
    );
    const btn = getByLabelText(/Toggle Time with God/);
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
```

> Adjust the `progress` shape to match what Phase 5's `GoalRow` expects. The point of the test is the `disabled` flip on the toggle, not the math.

- [ ] **Step 2: Run, verify pass**

```bash
pnpm test tests/integration/past-day-render.test.tsx
```

Expected: 2 passing.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/past-day-render.test.tsx
git commit -m "test(panels): past-day renders goal row as disabled"
```

---

## Task 13: Spec note + README + verification

**Files:**
- Modify: `mockup/spec.md`
- Modify: `README.md`

- [ ] **Step 1: Append a one-paragraph note to §1 of `mockup/spec.md`**

Find the line `The dashboard is **anchored to today**. There is no date scrubbing` and append to the end of that paragraph (do not delete the original text — keep it as the v1-anchor):

```markdown

> **v1.1 (Phase 11)** — date navigation is now supported via `?d=YYYY-MM-DD` URL parameter, prev/next chevrons, and a calendar popover. Past days remain *read-only*: server actions reject mutations and the UI disables controls. Future days redirect to today. Saturdays and Sundays render in a "weekend" variant (softer accent palette; the Business panel is replaced by a `WeekendPanel` with a curated short reading, a call-a-friend prompt, and a no-screens-hour suggestion). Spec §6's *"Past days are read-only"* line still holds.
```

- [ ] **Step 2: Update README — add a "Date navigation" section**

```markdown
## Date navigation

- The hero shows prev / next chevrons and a calendar popover.
- The active viewing day is in the URL: `?d=2026-04-28`. The home URL `/` is always today.
- Past days are read-only — controls are disabled and server actions throw if a past mutation is attempted.
- History is limited to 1 year backward in the calendar UI.
- Saturdays and Sundays render in a "Slow" weekend variant with a softer palette and a curated reading.
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
pnpm build
```

Expected:
- All previous tests still pass.
- New tests pass: `dates-week.test.ts` (~14 cases), `current-day.test.ts` (6), `weekend-content.test.ts` (3), `readonly-guard.test.ts` (5), `past-day-render.test.tsx` (2).
- `pnpm build` succeeds with no type errors.

- [ ] **Step 4: Manual smoke test**

Run `pnpm dev` and verify:

1. **Today view**: home page renders with no banner, neutral palette, "Business / AI" tab label.
2. **Click prev**: URL becomes `?d=<yesterday>`, banner appears with friendly date + Today link, all controls render disabled.
3. **Click next** from yesterday: returns to today (URL becomes `/`).
4. **Open calendar**: pick a date 3 days ago — page navigates, read-only banner appears.
5. **Pick a weekend day in the calendar**: panel labels update (second tab "Slow"), background warms, WeekendPanel content renders.
6. **Pick a future date manually**: type `?d=2030-01-01` in the URL bar — page redirects to `/`.
7. **Server-side**: open DevTools, attempt a server-action call with a past iso (e.g. via React Query mutation in the console) — see the `"Past days are read-only"` error.
8. **Browser back/forward**: works as expected; theme persists; mood follows date.
9. **Past-day mutation through the UI**: every interactive control on a past day is visually muted and unresponsive to clicks.

- [ ] **Step 5: Commit**

```bash
git add mockup/spec.md README.md
git commit -m "docs: spec v1.1 note + README date-navigation section"
```

---

## Phase 11 Acceptance Criteria

- [ ] Hero renders prev / next chevron buttons + a "Calendar" button + a "Today" snap-back button (only when not on today).
- [ ] Calendar popover shows a month grid with prev/next month chevrons and grays out future + pre-history days.
- [ ] Clicking any past day in the calendar navigates the page (`?d=<iso>`), and the URL is shareable.
- [ ] Clicking "Today" returns to `/` (no query string).
- [ ] Future-date URLs redirect to `/`.
- [ ] Invalid `?d=` values silently fall back to today (no error toast, no 404).
- [ ] Past-day view shows a `ReadOnlyBanner` above the panels.
- [ ] All goal-row checkboxes, count-buttons, and time-buttons render `disabled` on past days.
- [ ] Journal textarea is `readOnly` on past days.
- [ ] Personal panel +15 / +30 / +60 / −15 disconnect buttons are disabled on past days.
- [ ] Personal panel health toggles, financial inputs, and win-of-the-day are read-only on past days.
- [ ] Tasks drawer shows a "Past days are read-only" notice and hides the add form on past days.
- [ ] Server actions `toggleCheckGoal`, `incrementCountGoal`, `setNotes`, `setHealth`, `setWin`, `setFin`, `bumpDisconnect`, `addTask`, `toggleTask`, `deleteTask`, `recordClick` throw `"Past days are read-only"` when called with a past iso.
- [ ] `getCurrentDayISO(searchParams)` returns `{ iso, readOnly, isToday }` and redirects future iso to today.
- [ ] `isWeekend(iso)` returns true for Saturday and Sunday only.
- [ ] On weekend days, `<html data-mood="weekend">` is set and the body palette warms (rose accent, peachier gradient).
- [ ] On weekend days, the second tab is labeled "Slow" / eyebrow "WEEKEND" and renders `<WeekendPanel>` instead of `<BusinessPanel>`.
- [ ] Weekend mode applies regardless of the day being today, past, or future-rejected — it's a property of the *viewing iso*.
- [ ] `<WeekendPanel>` renders a short reading card, a call-a-friend card, a no-screens-hour card, and a closing line.
- [ ] All new code is emoji-free; every visual indicator is inline SVG.
- [ ] All tests pass: `dates-week.test.ts`, `current-day.test.ts`, `weekend-content.test.ts`, `readonly-guard.test.ts`, `past-day-render.test.tsx`.
- [ ] `pnpm build` succeeds with no type errors and no `any`.
- [ ] Spec §1 has a v1.1 addendum noting Phase 11 changes; reference HTML is unchanged.

When all boxes are checked, Phase 11 is done. Move to Phase 12 (themes + Friends & Family stub): write `phase-12-themes-friendsfamily.md` immediately before starting it.

---

## Notes

### How Phase 11 enables Phase 12

Phase 12 introduces additional named themes (`warm`, `forest`, `midnight`) and a Friends & Family panel stub. The Phase 11 design choices set Phase 12 up cleanly:

1. **`data-mood` is orthogonal to `data-theme`.** Phase 12 will add `data-theme="warm"`, `"forest"`, `"midnight"` blocks in `globals.css` exactly the way Phase 1 added `[data-theme="dark"]`. Each theme block can also re-declare its weekend variant via `[data-theme="X"][data-mood="weekend"]`. The matrix is small (4 themes × 2 moods = 8 tuples) and the CSS overrides are tiny (just the accent and gradient tokens).
2. **The `WeekendPanel` content fixture lives in one file (`src/lib/weekend-content.ts`).** Phase 12's customization story is "let the user override these strings via Settings." The data layer is one new table (`UserWeekendContent`) keyed by `userId` with the same shape as `WeekendContent`. The panel reads either the user's row (if present) or the static fixture (fallback). No component changes.
3. **Friends & Family stub** sits on the Personal panel as a card with a section title, an inline SVG, and copy explaining the future state. Phase 11's read-only props already exist on `PersonalPanel`, so the F&F card just needs to respect them (its "remind me" buttons will be disabled on past days when the feature ships).
4. **Date navigation is the right surface for future "favorites."** Phase 12 (or a v2 Phase) can add a "favorite this day" star to the read-only banner — once a user is browsing back over their year, marking a particularly good day is the natural next gesture. The URL is already the source of truth, so a `Favorite` table keyed by `(userId, iso)` is a small extension.

### Why we didn't use `react-day-picker`

Recorded for future readers (or for Phase 12 reconsideration):

- **Bundle size.** `react-day-picker` adds ~80 KB minified to the client bundle. Our hand-built grid is ~3 KB. For a one-off picker that opens occasionally, the heavier dep is hard to justify.
- **Aesthetic fidelity.** The bookish palette uses `--sage`, `--gold`, `--paper`, etc. Theming `react-day-picker` to match is a CSS-overrides exercise that's strictly harder than authoring 50 lines of `<button>`s.
- **Feature scope.** We need: month grid, click-to-pick, prev/next month, history-limit gray-out. We don't need: range selection, recurring events, multi-month view, locale-aware week-starts. `react-day-picker` shines when those features matter.
- **Re-evaluation trigger.** If we ever add (a) range selection for "view week summary", (b) heatmap-on-calendar (lit cells for days with notes), or (c) localization beyond `en-US`, swap to `react-day-picker` then. The replacement surface is small — one component file.

### Why URL-as-truth (not cookie, not Zustand)

- **Sharable.** "Hey, look at the week I had" is a URL paste away.
- **Bookmarkable.** A user can save `?d=2026-01-01` as a New Year's reflection bookmark.
- **Back/forward works for free.** No custom history stack. The browser already does it perfectly.
- **No SSR/CSR mismatch.** The Server Component reads `searchParams`; the Client Components read `useSearchParams`. Both see the same value.
- **No flash.** Cookies require an extra render (read cookie, render with cookie); URL is in the request line.

### Why a 1-year history limit

Arbitrary, but defensible:

- Most users won't have data older than a year (the app is new).
- A 365-day calendar boundary is intuitive (one year ago today).
- The boundary is in *UI*, not in the *data layer* — past data older than a year still exists in the DB and could be exposed by direct URL or a future "history" view.
- Phase 12 or v2 can lift this to 5 years or "forever" with a single constant change.

### Edge cases handled

- **Daylight saving boundary.** `addDays` works in local time via `Date.setDate(Date.getDate() + n)`, which JavaScript handles correctly across DST transitions (a "day" is still a calendar day).
- **Year boundary.** `addDays("2025-12-31", 1)` returns `"2026-01-01"`. Tested.
- **Leap year.** `parseISO("2024-02-29")` returns a Date; `parseISO("2025-02-29")` returns `null` (rejected by overflow check). Tested.
- **Stale tabs at midnight.** A tab open Friday becomes Saturday at midnight. The next render of the page (any client interaction or refresh) recomputes `todayISO()` server-side. The `?d=` value, if set, can become "future" relative to a now-newer today and redirect — not catastrophic.
- **Two browser tabs on different days.** Tab A on `/` (today). Tab B on `/?d=2026-04-28` (past). Each is independent; mutations on tab A still go to today (it's its own server request). Tab B's mutations are blocked by the guard.

### Performance notes

- The calendar popover renders 42 cells × N months. Each click rebuilds one month's grid; trivial.
- The mood hydrator runs once per navigation; no perf concern.
- Server-action guard adds 1–2 string comparisons per call; negligible.
- No new DB indexes needed — all date-keyed reads were already indexed by `(userId, iso)` in Phase 1.

### Accessibility notes

- Calendar grid uses `role="dialog"` with `aria-label="Pick a date"`.
- Prev/next chevron buttons have `aria-label="Previous day"` / `"Next day"` / `"Previous month"` / `"Next month"`.
- Disabled buttons use the native `disabled` attribute (announced as "dimmed" by screen readers).
- Read-only banner uses `role="status"` so SR users hear the read-only context when the page changes.
- Close-on-outside-click is supplemented by an explicit "Close" button inside the popover for keyboard users.
- Future TODO (Phase 12): full keyboard navigation in the calendar grid (arrow keys to walk cells, Enter to pick). Phase 11 ships click + tab navigation only.

### Open follow-ups for later phases

- **Phase 12**: user-customizable weekend content, more themes, F&F panel.
- **v2**: heatmap cells in the calendar (lit by completion ratio).
- **v2**: a "this week" view with a 7-day grid summary.
- **v2**: keyboard arrow-key navigation inside the calendar grid.
- **v2**: shareable read-only public links (e.g. share your year-in-review). Out of scope for v1 because it requires public-route auth handling.
- **v2**: per-user history-limit override (some users may want 5 years of scroll-back).
