# Phase 5 — Goals Overview + Tasks Drawer + Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Goals Overview panel and the slide-up Tasks drawer per spec §3.5, §7.4, §7.5, §7.6, §12, §13. Replaces the placeholder Overview tab from Phase 1 with the real rollup: four progress rings (Today / Last 7 / Best streak / Days journaled), a 60-day sage heatmap, three section progress bars, filter pills, and the master goals list. Adds the bottom-right FAB and the slide-up drawer with two tabs (Tasks default + All-goals), a quick-add task form, an "add goal across any section" form, and a tab-state persistence so reopening the drawer returns to the last-used tab.

**Architecture:**
- **Server Components for reads** — Overview rings, heatmap, section bars, filter pills (rendered with state from Phase 2 `getFilter`), filtered goals list, drawer task list, drawer all-goals list. Pure data render, zero client JS for the rollup itself.
- **Client island for the drawer** — open/close state and tab switching are transient UI state and do not belong in the URL or DB. The drawer shell (`<TasksDrawer>`) is a Client Component, but its **inner content (Tasks list, All-goals list) is SSR'd via Server Component children passed in** so the markup is ready before the user opens the drawer (no skeleton flash, no client fetch waterfall).
- **Heatmap is a pure Server Component** — no interactivity in v1 (spec §12.2 explicitly says decorative). Tooltips use CSS-only `::after` driven by `data-tooltip` attributes.
- **Rings are inline SVG** with `stroke-dasharray = circumference`, `stroke-dashoffset = circumference * (1 - pct/100)`. Sage stroke for Today + Last 7; gold stroke for Best streak + Days journaled (per spec §12.1).
- **Reuse Phase 2 helpers verbatim** — `progressFor`, `streakFor`, `dailyStreak`, `aggregateForSection`, `daysBack`, `isoOffset`. Two new pure helpers added in this phase (`bestStreakAcrossGoals`, `daysJournaled`); each ships with unit tests.
- **Drawer tab persistence** — last-used tab survives close/open via a signed cookie (`mm_drawer_tab=tasks|goals`) read on the server during the parent layout render so the drawer hydrates pre-set to the correct tab. SessionStorage is the v1 fallback if the cookie is missing.
- **Shared `GoalRow`** — Phase 3 inlined goal-row markup inside `MindfulnessGoals.tsx`. This phase extracts a `<GoalRow>` Server Component into `src/components/goals/GoalRow.tsx` and refactors Phase 3's panel to use it. The Overview master list, the Drawer's All-goals list, and Phases 4's Business/Personal goal lists (after a small follow-up) all reuse the same row.

**Tech additions this phase:** none. The drawer animation is plain CSS (`transform: translateY(...)` with `transition`); the rings and heatmap are inline SVG / CSS; the cookie helper uses Next.js's built-in `cookies()` from `next/headers`.

---

## File Structure (created or modified in this phase)

| File | Purpose |
|---|---|
| `src/lib/progress-overview.ts` | New pure helpers: `bestStreakAcrossGoals`, `daysJournaled`, `heatmapLevels`, `ringFraction` |
| `tests/unit/progress-overview.test.ts` | Unit tests for the four helpers above |
| `src/components/primitives/Ring.tsx` | Reusable SVG ring (variant: sage \| gold), accepts `pct`, `label`, `value` |
| `src/components/primitives/SectionBar.tsx` | Section progress bar (icon, name, gradient bar, %) |
| `src/components/primitives/SectionDot.tsx` | Tiny sage/orange/gold/gray colored dot used by goal rows + tab pills |
| `src/components/goals/GoalRow.tsx` | **Shared** goal row — used by Mindfulness/Business/Personal/Overview/Drawer |
| `src/components/goals/GoalList.tsx` | Renders an array of `<GoalRow>`s + optional `<AddGoalForm>` slot |
| `src/components/goals/AddGoalAnyForm.tsx` | Drawer-only client form with section + type + target inputs |
| `src/components/overview/FilterPills.tsx` | Server Component reading `getFilter()`, renders `All / Mindfulness / Business / Personal` pills as forms posting `setFilter` |
| `src/components/overview/RingStats.tsx` | Server Component composing 4 rings |
| `src/components/overview/Heatmap.tsx` | Server Component — 60-cell grid |
| `src/components/overview/SectionBars.tsx` | Server Component — 3 section progress rows |
| `src/components/overview/MasterGoalList.tsx` | Filterable master goals list (uses `GoalRow`) |
| `src/components/panels/OverviewPanel.tsx` | Composes RingStats + Heatmap + SectionBars + FilterPills + MasterGoalList |
| `src/components/tasks/TaskRow.tsx` | Server Component — single task row with toggle + delete |
| `src/components/tasks/AddTaskForm.tsx` | Client Component — title + section selector + Add |
| `src/components/tasks/TaskList.tsx` | Server Component — sorted list of `<TaskRow>` |
| `src/components/tasks/AllGoalsList.tsx` | Server Component — every goal regardless of section, with section dots |
| `src/components/drawer/Fab.tsx` | Client Component — fixed bottom-right button with open count badge |
| `src/components/drawer/TasksDrawer.tsx` | Client Component shell — open/close, scrim, ✕, ESC, tab switch |
| `src/components/drawer/DrawerHost.tsx` | Server Component composer — reads cookie, hydrates `<TasksDrawer>` with SSR'd children |
| `src/server/actions/drawer.ts` | `setDrawerTab(tab: 'tasks' \| 'goals')` — writes the signed cookie |
| `src/server/queries/drawer.ts` | `getLastDrawerTab()` — reads the cookie, default `'tasks'` |
| `src/app/(dash)/layout.tsx` (modified) | Mount `<DrawerHost>` once at the dashboard layout level so FAB + drawer are present on every tab |
| `src/components/mindfulness/MindfulnessGoals.tsx` (modified) | Refactor inline goal row markup to use shared `<GoalRow>` |
| `tests/unit/best-streak.test.ts` | Specifically guards `bestStreakAcrossGoals` correctness |
| `tests/unit/heatmap-levels.test.ts` | Specifically guards spec §12.2 level rule |
| `tests/e2e/overview.spec.ts` | Playwright: rings render, filter pills toggle, heatmap has 60 cells, today's cell has gold ring |
| `tests/e2e/drawer.spec.ts` | Playwright: FAB opens drawer, ESC closes, tab persists across close/open, quick-add task appears in list |

---

## Task 1: New pure helpers — `bestStreakAcrossGoals`, `daysJournaled`, `heatmapLevels`, `ringFraction`

**Files:**
- Create: `src/lib/progress-overview.ts`
- Test: `tests/unit/progress-overview.test.ts`, `tests/unit/best-streak.test.ts`, `tests/unit/heatmap-levels.test.ts`

**Why these are new helpers, not extensions of `progressFor`:** the four ring stats and the heatmap need *aggregated* data across many days/many goals, while `progressFor` (Phase 2) is per-goal-per-day. Combining them would muddy the per-goal API and force the heatmap to call `progressFor` 60 × N times in a render. Instead these helpers receive the already-loaded ranges from the server query layer and operate on them as data.

- [ ] **Step 1: Write the failing test `tests/unit/progress-overview.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  bestStreakAcrossGoals,
  daysJournaled,
  heatmapLevels,
  ringFraction,
} from "@/lib/progress-overview";
import type { Goal } from "@/types";

const checkGoal = (id: string, section: Goal["section"] = "mindfulness"): Goal => ({
  id,
  section,
  title: id,
  type: "check",
  target: 1,
  isDefault: false,
});

describe("ringFraction", () => {
  it("returns 0 when total is 0", () => {
    expect(ringFraction(0, 0)).toBe(0);
  });
  it("clamps to [0, 1]", () => {
    expect(ringFraction(2, 1)).toBe(1);
    expect(ringFraction(-1, 5)).toBe(0);
  });
  it("returns the simple ratio otherwise", () => {
    expect(ringFraction(3, 4)).toBeCloseTo(0.75);
  });
});

describe("daysJournaled", () => {
  it("counts days with non-empty notes", () => {
    const days = [
      { iso: "2026-05-01", notes: "wrote something", goals: {} },
      { iso: "2026-05-02", notes: "", goals: {} },
      { iso: "2026-05-03", notes: "   ", goals: {} },
      { iso: "2026-05-04", notes: "x", goals: {} },
    ];
    expect(daysJournaled(days)).toBe(2);
  });

  it("also counts days that have any tracked goals (no notes)", () => {
    const days = [
      { iso: "2026-05-01", notes: "", goals: { g_god: true } },
      { iso: "2026-05-02", notes: "", goals: {} },
      { iso: "2026-05-03", notes: "", goals: { g_learn: 0 } }, // 0 still counts as tracked
    ];
    expect(daysJournaled(days)).toBe(2);
  });
});
```

- [ ] **Step 2: Write the failing test `tests/unit/best-streak.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { bestStreakAcrossGoals } from "@/lib/progress-overview";

describe("bestStreakAcrossGoals", () => {
  it("returns 0 when there are no goals", () => {
    expect(bestStreakAcrossGoals([], (_id) => 0)).toBe(0);
  });

  it("returns the longest single-goal streak", () => {
    const goals = [{ id: "a" }, { id: "b" }, { id: "c" }] as const;
    const streaks: Record<string, number> = { a: 4, b: 11, c: 2 };
    expect(bestStreakAcrossGoals(goals as never, (id) => streaks[id])).toBe(11);
  });

  it("does not sum streaks across goals", () => {
    const goals = [{ id: "a" }, { id: "b" }] as const;
    expect(bestStreakAcrossGoals(goals as never, () => 3)).toBe(3);
  });
});
```

- [ ] **Step 3: Write the failing test `tests/unit/heatmap-levels.test.ts`** (guards spec §12.2)

```ts
import { describe, expect, it } from "vitest";
import { heatmapLevels } from "@/lib/progress-overview";

const day = (iso: string, completed: number, total: number, hasNotes = false) => ({
  iso,
  completedToday: completed,
  totalGoals: total,
  hasJournalNotes: hasNotes,
});

describe("heatmapLevels (spec §12.2 level rule)", () => {
  it("level 0 — no goals tracked, no notes", () => {
    expect(heatmapLevels([day("2026-05-01", 0, 5)])[0].level).toBe(0);
  });

  it("level 1 — 0 < ratio < 0.34", () => {
    expect(heatmapLevels([day("2026-05-01", 1, 5)])[0].level).toBe(1); // 0.20
  });

  it("level 2 — 0.34 ≤ ratio < 0.67", () => {
    expect(heatmapLevels([day("2026-05-01", 2, 5)])[0].level).toBe(2); // 0.40
    expect(heatmapLevels([day("2026-05-01", 3, 5)])[0].level).toBe(2); // 0.60
  });

  it("level 3 — 0.67 ≤ ratio < 1", () => {
    expect(heatmapLevels([day("2026-05-01", 4, 5)])[0].level).toBe(3); // 0.80
  });

  it("level 4 — ratio === 1 and any goals completed", () => {
    expect(heatmapLevels([day("2026-05-01", 5, 5)])[0].level).toBe(4);
  });

  it("level 1 — journal notes lift a zero-completion day", () => {
    expect(heatmapLevels([day("2026-05-01", 0, 5, true)])[0].level).toBe(1);
  });

  it("level 0 — total goals = 0 and no notes", () => {
    expect(heatmapLevels([day("2026-05-01", 0, 0, false)])[0].level).toBe(0);
  });

  it("preserves the iso + carries today flag through", () => {
    const out = heatmapLevels([day("2026-05-02", 5, 5)], "2026-05-02");
    expect(out[0].iso).toBe("2026-05-02");
    expect(out[0].isToday).toBe(true);
  });
});
```

- [ ] **Step 4: Create `src/lib/progress-overview.ts`**

```ts
import type { Goal } from "@/types";

/** Ring helper: returns a fraction in [0, 1]. */
export function ringFraction(numer: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(1, numer / denom));
}

export type DayProbe = {
  iso: string;
  notes?: string;
  goals?: Record<string, boolean | number>;
};

/**
 * Count of days with non-empty notes OR any tracked goals.
 * "Any tracked goals" = at least one key in `day.goals`, regardless of value
 * (so a 0-counter still counts — the user engaged with that goal that day).
 */
export function daysJournaled(days: DayProbe[]): number {
  let n = 0;
  for (const d of days) {
    const hasNotes = (d.notes ?? "").trim().length > 0;
    const hasTracked = !!d.goals && Object.keys(d.goals).length > 0;
    if (hasNotes || hasTracked) n += 1;
  }
  return n;
}

/**
 * Longest single-goal streak in days. Caller supplies a `streakOf` function
 * (typically Phase 2's `streakFor(goalId)`) so this stays pure and unit-testable.
 */
export function bestStreakAcrossGoals(
  goals: Pick<Goal, "id">[],
  streakOf: (goalId: string) => number
): number {
  let best = 0;
  for (const g of goals) {
    const s = streakOf(g.id);
    if (s > best) best = s;
  }
  return best;
}

export type HeatmapInput = {
  iso: string;
  completedToday: number;
  totalGoals: number;
  hasJournalNotes: boolean;
};

export type HeatmapCell = {
  iso: string;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  ratio: number;
};

/** Spec §12.2 verbatim. */
export function heatmapLevels(
  inputs: HeatmapInput[],
  todayIso?: string
): HeatmapCell[] {
  return inputs.map((d) => {
    const ratio = d.totalGoals > 0 ? d.completedToday / d.totalGoals : 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (ratio > 0 && ratio < 0.34) level = 1;
    else if (ratio < 0.67) level = 2;
    else if (ratio < 1) level = 3;
    else if (ratio === 1 && d.completedToday > 0) level = 4;
    if (level === 0 && d.hasJournalNotes) level = 1;
    return {
      iso: d.iso,
      level,
      isToday: d.iso === todayIso,
      ratio,
    };
  });
}
```

- [ ] **Step 5: Run the new tests, verify pass**

```bash
pnpm test tests/unit/progress-overview.test.ts tests/unit/best-streak.test.ts tests/unit/heatmap-levels.test.ts
```

Expected: 16 passing across the three files (5 + 3 + 8).

- [ ] **Step 6: Commit**

```bash
git add src/lib/progress-overview.ts tests/unit/progress-overview.test.ts tests/unit/best-streak.test.ts tests/unit/heatmap-levels.test.ts
git commit -m "feat(overview): pure helpers — bestStreakAcrossGoals, daysJournaled, heatmapLevels, ringFraction"
```

---

## Task 2: Shared `<GoalRow>`, `<GoalList>`, primitives (`<Ring>`, `<SectionBar>`, `<SectionDot>`)

The Mindfulness panel from Phase 3 inlined a goal-row's worth of markup. This phase has at least three places that need the same row (Overview master list, Drawer all-goals list, Phases 3/4 panel goal lists). Extract once.

**Files:**
- Create: `src/components/goals/GoalRow.tsx`, `src/components/goals/GoalList.tsx`, `src/components/primitives/SectionDot.tsx`, `src/components/primitives/Ring.tsx`, `src/components/primitives/SectionBar.tsx`
- Modify: `src/components/mindfulness/MindfulnessGoals.tsx` (refactor inline rows to use `<GoalRow>`)

- [ ] **Step 1: Create `src/components/primitives/SectionDot.tsx`**

```tsx
import type { Goal, Task } from "@/types";

const COLOR: Record<Goal["section"] | Task["section"], string> = {
  mindfulness: "var(--sage)",
  business: "var(--accent)",
  personal: "var(--gold)",
  general: "var(--ink-muted)",
};

export function SectionDot({
  section,
  size = 8,
}: {
  section: Goal["section"] | Task["section"];
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        marginRight: 8,
        verticalAlign: 1,
        flexShrink: 0,
        background: COLOR[section],
      }}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/goals/GoalRow.tsx`**

```tsx
import type { Goal, DayRecord } from "@/types";
import type { ClicksForDay } from "@/server/queries/clicks";
import { progressFor, streakFor } from "@/lib/progress";
import {
  toggleCheckGoal,
  incrementCountGoal,
  removeGoal,
} from "@/server/actions/goals";
import { SectionDot } from "@/components/primitives/SectionDot";

export type GoalRowProps = {
  userId: string;
  iso: string;
  goal: Goal;
  day: DayRecord;
  clicks: ClicksForDay;
  /** Show a section dot before the goal title. Default true on Overview/Drawer. */
  showSectionDot?: boolean;
  /** Used to compute streak chip; if omitted, no streak chip renders. */
  streak?: number;
};

export function GoalRow({
  userId,
  iso,
  goal: g,
  day,
  clicks,
  showSectionDot = false,
  streak,
}: GoalRowProps) {
  const p = progressFor(g, day, clicks);
  const done = p.pct >= 100;
  const s = streak ?? streakFor(g.id, day, clicks); // server-safe: pure read

  return (
    <li
      className="goal"
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
            aria-label={`Increment ${g.title}`}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid var(--sage)",
              background: done ? "var(--sage)" : "transparent",
              color: done ? "white" : "var(--sage)",
              cursor: "pointer",
              minWidth: 56,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {p.current}/{p.target}
          </button>
        </form>
      )}

      {g.type === "time" && (
        <form action={async () => {
          "use server";
          await incrementCountGoal({ userId, goalId: g.id, iso, by: 15 });
        }}>
          <button
            type="submit"
            aria-label={`Add 15 minutes to ${g.title}`}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid var(--sage)",
              background: done ? "var(--sage)" : "transparent",
              color: done ? "white" : "var(--sage)",
              cursor: "pointer",
              minWidth: 56,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {p.current}/{p.target}m
          </button>
        </form>
      )}

      <span
        style={{
          flex: 1,
          color: done ? "var(--ink-muted)" : "var(--ink)",
          textDecoration: done ? "line-through" : "none",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {showSectionDot && <SectionDot section={g.section} />}
        {g.title}
      </span>

      {s > 0 && (
        <span
          aria-label={`${s}-day streak`}
          style={{
            background: "var(--gold-soft)",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            borderRadius: 999,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em",
          }}
        >
          {s}d
        </span>
      )}

      {!g.isDefault && (
        <form action={async () => {
          "use server";
          await removeGoal({ userId, goalId: g.id });
        }}>
          <button
            type="submit"
            aria-label={`Remove ${g.title}`}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--ink-muted)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </form>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Create `src/components/goals/GoalList.tsx`**

```tsx
import type { ReactNode } from "react";
import type { Goal, DayRecord } from "@/types";
import type { ClicksForDay } from "@/server/queries/clicks";
import { GoalRow } from "./GoalRow";

export function GoalList({
  userId,
  iso,
  goals,
  day,
  clicks,
  showSectionDot = false,
  emptyMessage = "No goals yet.",
  footer,
}: {
  userId: string;
  iso: string;
  goals: Goal[];
  day: DayRecord;
  clicks: ClicksForDay;
  showSectionDot?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
}) {
  if (goals.length === 0 && !footer) {
    return (
      <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: "8px 0" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {goals.map((g) => (
          <GoalRow
            key={g.id}
            userId={userId}
            iso={iso}
            goal={g}
            day={day}
            clicks={clicks}
            showSectionDot={showSectionDot}
          />
        ))}
      </ul>
      {footer}
    </>
  );
}
```

- [ ] **Step 4: Create `src/components/primitives/Ring.tsx`**

```tsx
const SIZE = 96;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function Ring({
  pct,
  variant = "sage",
  big,
  small,
}: {
  /** 0–1, clamped. */
  pct: number;
  variant?: "sage" | "gold";
  /** Center value (e.g. "5/19" or "84%" or "11d"). */
  big: string;
  /** Bottom label (e.g. "Today"). */
  small: string;
}) {
  const fraction = Math.max(0, Math.min(1, pct));
  const dashOffset = C * (1 - fraction);
  const stroke = variant === "gold" ? "var(--gold)" : "var(--sage)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`${small}: ${big}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
          fontFamily="var(--font-fraunces)"
          fontSize={big.length > 4 ? 16 : 20}
          fontWeight={500}
          fill="var(--ink)"
        >
          {big}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", letterSpacing: ".04em" }}>
        {small}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/primitives/SectionBar.tsx`**

```tsx
import type { Goal } from "@/types";
import { SectionDot } from "./SectionDot";

const LABEL: Record<Exclude<Goal["section"], never>, string> = {
  mindfulness: "Mindfulness",
  business: "Business / AI",
  personal: "Personal",
};

export function SectionBar({
  section,
  pct,
}: {
  section: "mindfulness" | "business" | "personal";
  pct: number;
}) {
  const fraction = Math.max(0, Math.min(1, pct / 100));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr 56px",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", color: "var(--ink)" }}>
        <SectionDot section={section} />
        <span style={{ fontSize: 14 }}>{LABEL[section]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--line-strong)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fraction * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--sage), var(--gold))",
            transition: "width .5s ease",
          }}
        />
      </div>
      <div style={{ textAlign: "right", fontSize: 13, color: "var(--ink-soft)" }}>
        {Math.round(fraction * 100)}%
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Refactor `src/components/mindfulness/MindfulnessGoals.tsx`** to use `<GoalList>`. Replaces the inline `<ul>`/`<li>` block from Phase 3.

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
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
      <GoalList
        userId={userId}
        iso={iso}
        goals={goals}
        day={day}
        clicks={clicks}
        emptyMessage="Add your first mindfulness goal to begin."
        footer={<AddGoalForm userId={userId} />}
      />
    </section>
  );
}
```

- [ ] **Step 7: Build + run existing tests**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Expected: all green. The Phase 3 panel still renders identically — the refactor is behavior-preserving.

- [ ] **Step 8: Commit**

```bash
git add src/components/goals src/components/primitives src/components/mindfulness/MindfulnessGoals.tsx
git commit -m "refactor(goals): extract shared GoalRow/GoalList + Ring/SectionBar/SectionDot primitives"
```

---

## Task 3: Filter pills (Server Component, posts to `setFilter`)

**Files:**
- Create: `src/components/overview/FilterPills.tsx`

The filter is server state (Phase 2 wrote `getFilter()`/`setFilter()`). Pills are forms that POST to `setFilter`, then `revalidatePath("/")` re-renders the Overview panel with the new active pill.

- [ ] **Step 1: Create `src/components/overview/FilterPills.tsx`**

```tsx
import { getFilter } from "@/server/queries/filter";
import { setFilter } from "@/server/actions/filter";
import type { Filter } from "@/types";

const PILLS: Array<{ value: Filter; label: string }> = [
  { value: "all",          label: "All" },
  { value: "mindfulness",  label: "Mindfulness" },
  { value: "business",     label: "Business" },
  { value: "personal",     label: "Personal" },
];

export async function FilterPills({ userId }: { userId: string }) {
  const current = await getFilter(userId);
  return (
    <div role="radiogroup" aria-label="Goals filter" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PILLS.map((p) => {
        const active = p.value === current;
        return (
          <form
            key={p.value}
            action={async () => {
              "use server";
              await setFilter({ userId, filter: p.value });
            }}
          >
            <button
              type="submit"
              role="radio"
              aria-checked={active}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? "var(--sage)" : "var(--line-strong)"}`,
                background: active ? "var(--sage)" : "transparent",
                color: active ? "white" : "var(--ink)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                transition: "all .15s ease",
              }}
            >
              {p.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overview/FilterPills.tsx
git commit -m "feat(overview): filter pills wired to setFilter (server action)"
```

---

## Task 4: Ring stats (4 rings, server)

**Files:**
- Create: `src/components/overview/RingStats.tsx`

- [ ] **Step 1: Create `src/components/overview/RingStats.tsx`**

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty, getDaysRange } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor, streakFor } from "@/lib/progress";
import {
  bestStreakAcrossGoals,
  daysJournaled,
  ringFraction,
} from "@/lib/progress-overview";
import { isoOffset } from "@/lib/dates";
import { Ring } from "@/components/primitives/Ring";

export async function RingStats({ userId, iso }: { userId: string; iso: string }) {
  const sevenAgo = isoOffset(iso, -6);
  const sixtyAgo = isoOffset(iso, -59);

  const [allGoals, today, last7, last60, clicksToday] = await Promise.all([
    listGoals(userId), // unfiltered — rings reflect the whole life
    getDayOrEmpty(userId, iso),
    getDaysRange(userId, sevenAgo, iso),
    getDaysRange(userId, sixtyAgo, iso),
    getClicksForDay(userId, iso),
  ]);

  // Today: completed / total
  const completedToday = allGoals.filter((g) =>
    progressFor(g, today, clicksToday).pct >= 100
  ).length;
  const totalGoals = allGoals.length;

  // Last 7 days: aggregate completion %
  const last7Pcts = last7.map((d) => {
    if (allGoals.length === 0) return 0;
    const completed = allGoals.filter((g) =>
      progressFor(g, d, /* clicks not stored per-day on getDaysRange; engine handles missing */ {} as never).pct >= 100
    ).length;
    return completed / allGoals.length;
  });
  const sevenAvg =
    last7Pcts.length > 0 ? last7Pcts.reduce((a, b) => a + b, 0) / last7Pcts.length : 0;

  // Best streak
  const best = bestStreakAcrossGoals(allGoals, (id) => streakFor(id, today, clicksToday));

  // Days journaled (across the last 60 days, matching the heatmap window)
  const journaled = daysJournaled(last60);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 16,
        padding: "8px 0",
      }}
    >
      <Ring
        pct={ringFraction(completedToday, totalGoals)}
        variant="sage"
        big={`${completedToday}/${totalGoals}`}
        small="Today"
      />
      <Ring
        pct={sevenAvg}
        variant="sage"
        big={`${Math.round(sevenAvg * 100)}%`}
        small="Last 7 days"
      />
      <Ring
        pct={Math.min(1, best / 30)}
        variant="gold"
        big={`${best}d`}
        small="Best streak"
      />
      <Ring
        pct={journaled / 60}
        variant="gold"
        big={`${journaled}`}
        small="Days journaled"
      />
    </div>
  );
}
```

> **Note on streaks-without-clicks:** `getDaysRange` returns DayRecords; the historical clicks per day aren't loaded for the ring. `streakFor` (Phase 2) accepts the today probe + today's clicks because today's count goals depend on today's clicks; for *historical* days the clicks have already been folded into `day.goals[g_*_read]` by the click handler (Phase 2 §10). So the rings can be computed without per-day click rows. If Phase 2's `streakFor` signature differs, adapt the call here — the helper-purity tests in Task 1 still cover the math.

- [ ] **Step 2: Commit**

```bash
git add src/components/overview/RingStats.tsx
git commit -m "feat(overview): four progress rings (Today, 7d, Best streak, Days journaled)"
```

---

## Task 5: 60-day heatmap (Server Component)

**Files:**
- Create: `src/components/overview/Heatmap.tsx`
- Modify: `src/styles/globals.css` (add level color tokens + tooltip styles, scoped to `.heatmap`)

- [ ] **Step 1: Add heatmap CSS to `src/styles/globals.css`** (append; do not edit existing tokens)

```css
/* === Phase 5 — Heatmap === */
.heatmap {
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  gap: 4px;
  padding: 4px 0;
}
.heatmap-cell {
  aspect-ratio: 1 / 1;
  border-radius: 3px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  position: relative;
}
.heatmap-cell.l1 { background: color-mix(in oklab, var(--sage) 20%, var(--surface-2)); }
.heatmap-cell.l2 { background: color-mix(in oklab, var(--sage) 40%, var(--surface-2)); }
.heatmap-cell.l3 { background: color-mix(in oklab, var(--sage) 65%, var(--surface-2)); }
.heatmap-cell.l4 { background: var(--sage); }
.heatmap-cell.is-today {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}
.heatmap-cell[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--bg);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}
```

- [ ] **Step 2: Create `src/components/overview/Heatmap.tsx`**

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDaysRange } from "@/server/queries/days";
import { progressFor } from "@/lib/progress";
import { heatmapLevels, type HeatmapInput } from "@/lib/progress-overview";
import { isoOffset } from "@/lib/dates";

const WINDOW_DAYS = 60;

function fmtTooltip(iso: string, completed: number, total: number): string {
  const d = new Date(iso + "T00:00:00");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${wd}, ${mo} ${d.getDate()} · ${completed}/${total} goals`;
}

export async function Heatmap({ userId, iso }: { userId: string; iso: string }) {
  const start = isoOffset(iso, -(WINDOW_DAYS - 1));
  const [goals, days] = await Promise.all([
    listGoals(userId),
    getDaysRange(userId, start, iso),
  ]);

  // Index by iso for O(1) lookup; fill missing days as zero.
  const byIso = new Map(days.map((d) => [d.iso, d]));
  const inputs: HeatmapInput[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const cellIso = isoOffset(iso, -(WINDOW_DAYS - 1 - i));
    const day = byIso.get(cellIso);
    const completed = day
      ? goals.filter((g) => progressFor(g, day, {} as never).pct >= 100).length
      : 0;
    inputs.push({
      iso: cellIso,
      completedToday: completed,
      totalGoals: goals.length,
      hasJournalNotes: !!day && (day.notes ?? "").trim().length > 0,
    });
  }

  const cells = heatmapLevels(inputs, iso);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        LAST 60 DAYS
      </div>
      <div className="heatmap" role="img" aria-label="60-day completion heatmap" style={{ marginTop: 12 }}>
        {cells.map((c) => {
          const completed = inputs.find((x) => x.iso === c.iso)?.completedToday ?? 0;
          return (
            <div
              key={c.iso}
              className={[
                "heatmap-cell",
                c.level > 0 ? `l${c.level}` : "",
                c.isToday ? "is-today" : "",
              ].filter(Boolean).join(" ")}
              data-tooltip={fmtTooltip(c.iso, completed, goals.length)}
              aria-label={fmtTooltip(c.iso, completed, goals.length)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overview/Heatmap.tsx src/styles/globals.css
git commit -m "feat(overview): 60-day heatmap (20-col grid, spec §12.2 levels, today gold ring, css tooltips)"
```

---

## Task 6: Section bars + Master goals list + OverviewPanel composition

**Files:**
- Create: `src/components/overview/SectionBars.tsx`, `src/components/overview/MasterGoalList.tsx`, `src/components/panels/OverviewPanel.tsx`

- [ ] **Step 1: Create `src/components/overview/SectionBars.tsx`**

```tsx
import { aggregateForSection } from "@/lib/progress";
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { SectionBar } from "@/components/primitives/SectionBar";

const SECTIONS: Array<"mindfulness" | "business" | "personal"> = [
  "mindfulness",
  "business",
  "personal",
];

export async function SectionBars({ userId, iso }: { userId: string; iso: string }) {
  const [allGoals, day, clicks] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        SECTIONS
      </div>
      <div style={{ marginTop: 12 }}>
        {SECTIONS.map((sec) => {
          const goalsInSection = allGoals.filter((g) => g.section === sec);
          const pct = aggregateForSection(goalsInSection, day, clicks);
          return <SectionBar key={sec} section={sec} pct={pct} />;
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/overview/MasterGoalList.tsx`**

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { getFilter } from "@/server/queries/filter";
import { GoalList } from "@/components/goals/GoalList";

export async function MasterGoalList({ userId, iso }: { userId: string; iso: string }) {
  const [allGoals, day, clicks, filter] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
    getFilter(userId),
  ]);

  const visible = filter === "all" ? allGoals : allGoals.filter((g) => g.section === filter);

  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        ALL GOALS
      </div>
      <GoalList
        userId={userId}
        iso={iso}
        goals={visible}
        day={day}
        clicks={clicks}
        showSectionDot
        emptyMessage={
          filter === "all"
            ? "No goals tracked yet. Add some on each panel."
            : `No ${filter} goals. Add some from the ${filter} panel.`
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/panels/OverviewPanel.tsx`**

```tsx
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";
import { RingStats } from "@/components/overview/RingStats";
import { Heatmap } from "@/components/overview/Heatmap";
import { SectionBars } from "@/components/overview/SectionBars";
import { FilterPills } from "@/components/overview/FilterPills";
import { MasterGoalList } from "@/components/overview/MasterGoalList";

export async function OverviewPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="pulse-hero card">
        <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
          GOALS · OVERVIEW
        </div>
        <h2 className="serif" style={{ fontSize: "1.4rem", margin: "8px 0 16px" }}>
          Where the whole life is, today.
        </h2>
        <RingStats userId={userId} iso={iso} />
      </section>

      <Heatmap userId={userId} iso={iso} />
      <SectionBars userId={userId} iso={iso} />

      <section className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
            FILTER
          </div>
          <FilterPills userId={userId} />
        </div>
        <MasterGoalList userId={userId} iso={iso} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire `OverviewPanel` into the dashboard tabs.** Open `src/app/(dash)/page.tsx` (or wherever Phase 1 wired the four panels) and replace the placeholder Overview content with `<OverviewPanel />`.

- [ ] **Step 5: Run dev server and verify**

```bash
pnpm dev
```

Open http://localhost:3000 → Goals Overview tab. Verify:
- Hero card with 4 rings: numbers populate from current goals/days; first two rings have sage stroke, last two gold
- Heatmap: 60 cells in a 20-column grid; today's cell has a gold outline ring; hovering a cell shows a tooltip like `Tue, May 1 · 5/19 goals`
- Section bars: three rows (Mindfulness, Business, Personal) with gradient bars and `%` text
- Filter pills: clicking a non-`All` pill restricts the goals list below; pill state persists across reload (server-stored)
- Master goals list: goal rows render with section dots, streak chips when applicable, remove-`×` only on custom goals

- [ ] **Step 6: Commit**

```bash
git add src/components/overview src/components/panels/OverviewPanel.tsx src/app/\(dash\)/page.tsx
git commit -m "feat(overview): full Goals Overview panel — rings, heatmap, section bars, filter pills, master list"
```

---

## Task 7: Tasks domain components — `<TaskRow>`, `<TaskList>`, `<AddTaskForm>`, `<AllGoalsList>`

**Files:**
- Create: `src/components/tasks/TaskRow.tsx`, `src/components/tasks/TaskList.tsx`, `src/components/tasks/AddTaskForm.tsx`, `src/components/tasks/AllGoalsList.tsx`

These four components are the *content* of the drawer's two tabs. They're authored as Server Components (with one Client form) so the drawer renders them server-side and ships fully-hydrated markup.

- [ ] **Step 1: Create `src/components/tasks/TaskRow.tsx`**

```tsx
import type { Task } from "@/types";
import { toggleTask, deleteTask } from "@/server/actions/tasks";
import { SectionDot } from "@/components/primitives/SectionDot";

export function TaskRow({ userId, task: t }: { userId: string; task: Task }) {
  return (
    <li
      className="task-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <form action={async () => {
        "use server";
        await toggleTask({ userId, taskId: t.id });
      }}>
        <button
          type="submit"
          aria-label={t.done ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: "1.5px solid var(--sage)",
            background: t.done ? "var(--sage)" : "transparent",
            cursor: "pointer",
          }}
        />
      </form>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          fontSize: 11,
          color: "var(--ink-soft)",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
        }}
      >
        <SectionDot section={t.section} size={6} />
        {t.section}
      </span>

      <span
        style={{
          flex: 1,
          color: t.done ? "var(--ink-muted)" : "var(--ink)",
          textDecoration: t.done ? "line-through" : "none",
          fontSize: 14,
        }}
      >
        {t.title}
      </span>

      <form action={async () => {
        "use server";
        await deleteTask({ userId, taskId: t.id });
      }}>
        <button
          type="submit"
          aria-label={`Delete ${t.title}`}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--ink-muted)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </form>
    </li>
  );
}
```

- [ ] **Step 2: Create `src/components/tasks/TaskList.tsx`**

```tsx
import { listTasks } from "@/server/queries/tasks";
import { TaskRow } from "./TaskRow";
import { AddTaskForm } from "./AddTaskForm";

export async function TaskList({ userId }: { userId: string }) {
  const tasks = await listTasks(userId);

  // Sort: not-done first by createdAt desc; done last by completedOn desc.
  const open = tasks.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt);
  const done = tasks.filter((t) => t.done).sort((a, b) =>
    (b.completedOn ?? "").localeCompare(a.completedOn ?? "")
  );
  const sorted = [...open, ...done];

  return (
    <div>
      <AddTaskForm userId={userId} />
      {sorted.length === 0 ? (
        <p style={{ color: "var(--ink-muted)", fontSize: 13, marginTop: 16 }}>
          No tasks yet. Add the first thing you want to remember today.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {sorted.map((t) => (
            <TaskRow key={t.id} userId={userId} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/tasks/AddTaskForm.tsx`** (Client Component)

```tsx
"use client";
import { useState } from "react";
import { addTask } from "@/server/actions/tasks";
import type { Task } from "@/types";

const SECTIONS: Array<{ value: Task["section"]; label: string }> = [
  { value: "general",     label: "General" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "business",    label: "Business" },
  { value: "personal",    label: "Personal" },
];

export function AddTaskForm({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<Task["section"]>("general");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setPending(true);
        try {
          await addTask({ userId, title: title.trim(), section });
          setTitle("");
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you want to remember?"
        maxLength={200}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
        }}
      />
      <select
        value={section}
        onChange={(e) => setSection(e.target.value as Task["section"])}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
        }}
      >
        {SECTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        style={{
          background: "var(--sage)",
          color: "white",
          border: 0,
          padding: "8px 16px",
          borderRadius: "var(--radius-sm)",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          fontWeight: 600,
        }}
      >
        Add
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/components/tasks/AllGoalsList.tsx`**

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { GoalList } from "@/components/goals/GoalList";
import { AddGoalAnyForm } from "@/components/goals/AddGoalAnyForm";
import { todayISO } from "@/lib/dates";

export async function AllGoalsList({ userId }: { userId: string }) {
  const iso = todayISO();
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId), // every goal, every section
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div>
      <AddGoalAnyForm userId={userId} />
      <div style={{ marginTop: 12 }}>
        <GoalList
          userId={userId}
          iso={iso}
          goals={goals}
          day={day}
          clicks={clicks}
          showSectionDot
          emptyMessage="No goals yet. Use the form above to add the first one."
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks
git commit -m "feat(tasks): TaskRow, TaskList (sorted), AddTaskForm, AllGoalsList"
```

---

## Task 8: AddGoalAnyForm (drawer-only, all sections, all types)

The per-panel `AddGoalForm` from Phase 3 only adds `check`-type goals to a single section. The drawer's add form is broader: it lets the user pick any section + any type + a target.

**Files:**
- Create: `src/components/goals/AddGoalAnyForm.tsx`

- [ ] **Step 1: Create `src/components/goals/AddGoalAnyForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";
import type { Goal } from "@/types";

const SECTIONS: Array<{ value: Goal["section"]; label: string }> = [
  { value: "mindfulness", label: "Mindfulness" },
  { value: "business",    label: "Business" },
  { value: "personal",    label: "Personal" },
];

const TYPES: Array<{ value: Goal["type"]; label: string }> = [
  { value: "check", label: "Check (yes/no)" },
  { value: "count", label: "Count (e.g. 3)" },
  { value: "time",  label: "Time (minutes)" },
];

export function AddGoalAnyForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<Goal["section"]>("mindfulness");
  const [type, setType] = useState<Goal["type"]>("check");
  const [target, setTarget] = useState(1);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px dashed var(--line-strong)",
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        + Add goal across any section
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
          await addGoal({
            userId,
            section,
            title: title.trim(),
            type,
            target: type === "check" ? 1 : Math.max(1, target),
          });
          setTitle("");
          setTarget(1);
          setOpen(false);
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title"
        maxLength={200}
        autoFocus
        style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Goal["section"])}
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
        >
          {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Goal["type"])}
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)" }}
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number"
          min={1}
          max={999}
          value={target}
          onChange={(e) => setTarget(parseInt(e.target.value, 10) || 1)}
          disabled={type === "check"}
          aria-label="Target"
          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface-solid)", color: "var(--ink)", opacity: type === "check" ? 0.5 : 1 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: pending || !title.trim() ? "default" : "pointer",
            opacity: pending || !title.trim() ? 0.6 : 1,
            fontWeight: 600,
            flex: 1,
          }}
        >
          Add goal
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); }}
          style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", padding: "8px 12px" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/goals/AddGoalAnyForm.tsx
git commit -m "feat(goals): AddGoalAnyForm — drawer-side add with section + type + target"
```

---

## Task 9: Drawer + FAB (Client island with SSR'd children) + cookie-backed tab persistence

**Files:**
- Create: `src/server/actions/drawer.ts`, `src/server/queries/drawer.ts`, `src/components/drawer/Fab.tsx`, `src/components/drawer/TasksDrawer.tsx`, `src/components/drawer/DrawerHost.tsx`
- Modify: `src/app/(dash)/layout.tsx` to mount `<DrawerHost>`
- Modify: `src/styles/globals.css` to add `.drawer`, `.drawer-scrim`, `.fab` styles

- [ ] **Step 1: Create `src/server/actions/drawer.ts`**

```ts
"use server";
import { cookies } from "next/headers";
import { z } from "zod";

const TabSchema = z.enum(["tasks", "goals"]);
export type DrawerTab = z.infer<typeof TabSchema>;

const COOKIE_NAME = "mm_drawer_tab";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setDrawerTab({ tab }: { tab: DrawerTab }): Promise<void> {
  const parsed = TabSchema.parse(tab);
  const c = await cookies();
  c.set(COOKIE_NAME, parsed, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false, // readable by client too as a fallback hint
  });
}
```

- [ ] **Step 2: Create `src/server/queries/drawer.ts`**

```ts
import "server-only";
import { cookies } from "next/headers";
import type { DrawerTab } from "@/server/actions/drawer";

export async function getLastDrawerTab(): Promise<DrawerTab> {
  const c = await cookies();
  const v = c.get("mm_drawer_tab")?.value;
  return v === "goals" ? "goals" : "tasks";
}
```

- [ ] **Step 3: Add drawer + FAB CSS to `src/styles/globals.css`** (append)

```css
/* === Phase 5 — FAB + Drawer === */
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--sage);
  color: white;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  z-index: 50;
}
.fab:hover { transform: translateY(-1px); }
.fab .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.drawer-scrim {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 25, 0.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s ease;
  z-index: 60;
}
.drawer-scrim.open {
  opacity: 1;
  pointer-events: auto;
}
.drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 80vh;
  background: var(--surface-solid);
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  border-top: 1px solid var(--line);
  box-shadow: 0 -8px 40px rgba(20, 30, 25, .12);
  transform: translateY(100%);
  transition: transform .35s cubic-bezier(.2, .8, .2, 1);
  z-index: 70;
  display: flex;
  flex-direction: column;
}
.drawer.open { transform: translateY(0); }
.drawer-handle { padding: 14px 18px 8px; display: flex; align-items: center; justify-content: space-between; }
.drawer-tabs { display: flex; gap: 8px; padding: 0 18px 12px; border-bottom: 1px solid var(--line); }
.drawer-tab {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.drawer-tab[aria-selected="true"] {
  background: var(--sage-soft);
  color: var(--sage-deep);
  border-color: var(--sage);
}
.drawer-body { padding: 16px 18px 24px; overflow-y: auto; flex: 1; }
```

- [ ] **Step 4: Create `src/components/drawer/Fab.tsx`** (Client; consumes `openDrawer` from a parent ref/event)

```tsx
"use client";

export function Fab({
  openCount,
  onOpen,
}: {
  openCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="fab"
      onClick={onOpen}
      aria-label={`Open tasks drawer${openCount > 0 ? ` (${openCount} open)` : ""}`}
    >
      {/* Inline check-circle SVG (no emoji) */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      {openCount > 0 && <span className="badge">{openCount}</span>}
    </button>
  );
}
```

- [ ] **Step 5: Create `src/components/drawer/TasksDrawer.tsx`** (Client shell; SSR'd children come in as props)

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Fab } from "./Fab";
import { setDrawerTab, type DrawerTab } from "@/server/actions/drawer";

export function TasksDrawer({
  openCount,
  initialTab,
  tasksContent,
  goalsContent,
}: {
  openCount: number;
  initialTab: DrawerTab;
  tasksContent: ReactNode;
  goalsContent: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const switchTab = async (next: DrawerTab) => {
    setTab(next);
    // Fire-and-forget; don't block tab UI on cookie write.
    void setDrawerTab({ tab: next });
    // SessionStorage fallback (in case cookies are disabled)
    try { sessionStorage.setItem("mm_drawer_tab", next); } catch { /* noop */ }
  };

  return (
    <>
      <Fab openCount={openCount} onOpen={() => setOpen(true)} />

      <div
        className={`drawer-scrim${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        className={`drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tasks and goals drawer"
        aria-hidden={!open}
      >
        <div className="drawer-handle">
          <h2 className="serif" style={{ fontSize: "1.15rem", margin: 0 }}>
            {tab === "tasks" ? "Today's tasks" : "All goals"}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close drawer"
            style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div className="drawer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="drawer-tab"
            aria-selected={tab === "tasks"}
            onClick={() => switchTab("tasks")}
          >
            Tasks{openCount > 0 ? ` · ${openCount}` : ""}
          </button>
          <button
            type="button"
            role="tab"
            className="drawer-tab"
            aria-selected={tab === "goals"}
            onClick={() => switchTab("goals")}
          >
            All goals
          </button>
        </div>

        <div className="drawer-body">
          {/* Both panes are SSR'd as Server Components and passed as ReactNode props. */}
          {/* Render both, hide the inactive one — preserves form state and avoids flash. */}
          <div style={{ display: tab === "tasks" ? "block" : "none" }}>{tasksContent}</div>
          <div style={{ display: tab === "goals" ? "block" : "none" }}>{goalsContent}</div>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 6: Create `src/components/drawer/DrawerHost.tsx`** (Server Component composer)

```tsx
import { TasksDrawer } from "./TasksDrawer";
import { TaskList } from "@/components/tasks/TaskList";
import { AllGoalsList } from "@/components/tasks/AllGoalsList";
import { countOpenTasks } from "@/server/queries/tasks";
import { getLastDrawerTab } from "@/server/queries/drawer";
import { getCurrentUserId } from "@/server/auth-context";

export async function DrawerHost() {
  const userId = await getCurrentUserId();
  const [openCount, lastTab] = await Promise.all([
    countOpenTasks(userId),
    getLastDrawerTab(),
  ]);

  return (
    <TasksDrawer
      openCount={openCount}
      initialTab={lastTab}
      tasksContent={<TaskList userId={userId} />}
      goalsContent={<AllGoalsList userId={userId} />}
    />
  );
}
```

- [ ] **Step 7: Mount `<DrawerHost>` in `src/app/(dash)/layout.tsx`**

```tsx
// existing imports …
import { DrawerHost } from "@/components/drawer/DrawerHost";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* existing topbar / hero / tabs / panels … */}
      {children}
      <DrawerHost />
    </>
  );
}
```

> The drawer is mounted at the layout level so the FAB + drawer are always present, regardless of which tab the user is on. SSR happens once per request, just like the panels.

- [ ] **Step 8: Run dev server and verify the drawer**

```bash
pnpm dev
```

Open http://localhost:3000 and verify:
- FAB visible bottom-right with the check-circle icon; badge shows the number of open tasks (or hidden when zero)
- Click FAB → drawer slides up from bottom; scrim fades in
- Tasks tab is active by default on first visit; quick-add form + list render
- Type a title, pick `business`, click Add → task appears in the list immediately
- Switch to "All goals" tab → every goal across every section, with section dots
- Use the dashed "+ Add goal across any section" form to add a `count`-type goal targeting 5 → appears in the list with a `0/5` chip
- Close the drawer with the ✕, ESC key, and scrim click — all three work
- Close while on "All goals" tab, then reopen → drawer reopens on "All goals"
- Reload the page and reopen the drawer → still on "All goals" (cookie persisted)

- [ ] **Step 9: Run tests + build**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Expected: all green. The drawer mount adds one Client island; bundle should not balloon.

- [ ] **Step 10: Commit**

```bash
git add src/server/actions/drawer.ts src/server/queries/drawer.ts src/components/drawer src/styles/globals.css src/app/\(dash\)/layout.tsx
git commit -m "feat(drawer): slide-up Tasks drawer + FAB with badge, two tabs, ESC/scrim/✕ close, cookie-backed last-tab persistence"
```

---

## Task 10: E2E coverage (Playwright)

The pure helpers are unit-tested; the panels are tied to the DB and need a browser to verify the user-facing behaviors. Two new E2E specs.

**Files:**
- Create: `tests/e2e/overview.spec.ts`, `tests/e2e/drawer.spec.ts`

- [ ] **Step 1: Create `tests/e2e/overview.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("Goals Overview panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /goals overview/i }).click();
  });

  test("renders four progress rings", async ({ page }) => {
    await expect(page.getByLabel(/today:/i)).toBeVisible();
    await expect(page.getByLabel(/last 7 days:/i)).toBeVisible();
    await expect(page.getByLabel(/best streak:/i)).toBeVisible();
    await expect(page.getByLabel(/days journaled:/i)).toBeVisible();
  });

  test("heatmap shows 60 cells in 20-column grid; today has gold ring", async ({ page }) => {
    const cells = page.locator(".heatmap-cell");
    await expect(cells).toHaveCount(60);
    const todayCell = page.locator(".heatmap-cell.is-today");
    await expect(todayCell).toHaveCount(1);
  });

  test("section bars render for all 3 sections with %", async ({ page }) => {
    for (const name of ["Mindfulness", "Business / AI", "Personal"]) {
      await expect(page.getByText(name)).toBeVisible();
    }
    await expect(page.locator('[role="progressbar"]')).toHaveCount(3);
  });

  test("filter pills toggle the master goals list", async ({ page }) => {
    const allPill = page.getByRole("radio", { name: "All" });
    const businessPill = page.getByRole("radio", { name: "Business" });
    await businessPill.click();
    await expect(businessPill).toHaveAttribute("aria-checked", "true");
    await expect(allPill).toHaveAttribute("aria-checked", "false");
    // After reload, filter persists
    await page.reload();
    await page.getByRole("tab", { name: /goals overview/i }).click();
    await expect(page.getByRole("radio", { name: "Business" })).toHaveAttribute("aria-checked", "true");
  });
});
```

- [ ] **Step 2: Create `tests/e2e/drawer.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("Tasks drawer", () => {
  test("FAB opens drawer; ESC closes it", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByLabel(/open tasks drawer/i);
    await expect(fab).toBeVisible();
    await fab.click();
    const drawer = page.getByRole("dialog", { name: /tasks and goals drawer/i });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("aria-hidden", "true");
  });

  test("scrim click closes drawer", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/open tasks drawer/i).click();
    await page.locator(".drawer-scrim.open").click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole("dialog", { name: /tasks and goals drawer/i })).toHaveAttribute("aria-hidden", "true");
  });

  test("quick-add task appears in the list", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/open tasks drawer/i).click();
    await page.getByPlaceholder("What do you want to remember?").fill("Reach out to John");
    await page.getByRole("combobox").selectOption("personal");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Reach out to John")).toBeVisible();
  });

  test("FAB badge updates after adding a task", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByLabel(/open tasks drawer/i);
    const initial = await fab.getByText(/^\d+$/).count();
    await fab.click();
    await page.getByPlaceholder("What do you want to remember?").fill("badge test");
    await page.getByRole("button", { name: "Add" }).click();
    // Close and re-check badge — the parent layout will revalidate.
    await page.keyboard.press("Escape");
    await expect(page.locator(".fab .badge")).toBeVisible();
  });

  test("drawer remembers last-used tab", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/open tasks drawer/i).click();
    await page.getByRole("tab", { name: /all goals/i }).click();
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByLabel(/open tasks drawer/i).click();
    await expect(page.getByRole("tab", { name: /all goals/i })).toHaveAttribute("aria-selected", "true");
  });
});
```

- [ ] **Step 3: Run E2E**

```bash
pnpm exec playwright install --with-deps
pnpm exec playwright test tests/e2e/overview.spec.ts tests/e2e/drawer.spec.ts
```

Expected: 9 passing across the two files (4 + 5).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/overview.spec.ts tests/e2e/drawer.spec.ts
git commit -m "test(e2e): Goals Overview rings/heatmap/filter, drawer FAB/ESC/scrim/tab persistence"
```

---

## Phase 5 Acceptance Criteria

Maps to spec sections §7.6, §12, §13.

### Spec §7.6 (Goals & Tasks)
- [ ] Goals Overview filter pills correctly subset the master list (and the active pill state persists across reload)
- [ ] Tasks added from the drawer survive a page reload
- [ ] FAB count badge updates immediately on add / complete / delete (revalidation triggered by each tasks server action)
- [ ] Closing the drawer does not reset its tab; reopening shows the last tab (cookie + sessionStorage fallback)
- [ ] Custom goals added via the drawer's `<AddGoalAnyForm>` show a remove `×`; default goals do not
- [ ] Per-goal streak chips appear in the master list and the drawer's All-goals list when `streakFor(g.id) > 0`

### Spec §12 (Heatmap & Progress rings)
- [ ] Four ring stats render: Today (`completed/total`), Last 7 days (avg %), Best streak (longest single-goal in days), Days journaled (count)
- [ ] First two rings use sage stroke; latter two use gold stroke (per spec §12.1)
- [ ] Each ring uses `stroke-dasharray = circumference`, `stroke-dashoffset = circumference * (1 - pct/100)` and animates smoothly
- [ ] 60-day heatmap is a 20-column grid with exactly 60 cells
- [ ] Cell levels follow spec §12.2 verbatim — 0 / 1 / 2 / 3 / 4 thresholds, journal-only days lift to level 1
- [ ] Today's cell has the gold ring (`.is-today`)
- [ ] Hover tooltip shows `Wd, Mon D · N/T goals` via `data-tooltip` + CSS `::after`
- [ ] Heatmap is decorative — clicking a cell does nothing in v1 (no navigation)
- [ ] Section progress bars render for Mindfulness / Business / Personal using `aggregateForSection`
- [ ] Bar gradient is sage→gold; right-side `%` matches `aria-valuenow`

### Spec §13 (Slide-up drawer)
- [ ] FAB is fixed at bottom-right with sage background and inline check-circle SVG (no emoji)
- [ ] FAB shows `countOpenTasks` badge when > 0, hidden when 0
- [ ] Drawer is closed by default; opens via FAB click
- [ ] Drawer closes via scrim click, ✕ button, or Escape key
- [ ] Two tabs: Tasks (default) and All goals
- [ ] Tasks tab: quick-add form (text + section selector + Add), then sorted list (not-done first by `createdAt` desc, done last by `completedOn` desc), with delete `×` per row
- [ ] All goals tab: every goal regardless of section (no `state.filter` applied), with section dots and remove buttons (custom only)
- [ ] Drawer's `<AddGoalAnyForm>` lets the user add a goal in any section / any type / any target
- [ ] Last-used tab persists across drawer close/open and across full page reload (signed cookie + sessionStorage fallback)

### Build & test gates
- [ ] All new unit tests pass (`progress-overview`, `best-streak`, `heatmap-levels`)
- [ ] All prior unit tests still pass (Phases 1–3)
- [ ] All new E2E specs pass (`overview.spec.ts`, `drawer.spec.ts`)
- [ ] `pnpm exec tsc --noEmit` clean with strict TS
- [ ] `pnpm build` succeeds
- [ ] No emojis appear in any new file (search confirms inline SVG only)

When all boxes are checked, Phase 5 is done. Move to Phase 6 (Daily content refresh + DAILY_CONTENT JSON): write `phase-6-content-refresh.md` immediately before starting it.

---

## Notes for the agent executing this plan

1. **Why a cookie, not localStorage, for the drawer tab.** The drawer's content is rendered server-side. To hydrate the correct tab without a flash of "Tasks" before swapping to "All goals," the server needs to know the last-used tab during the initial render. Cookies are the only client-state mechanism available to a Server Component during render. SessionStorage is added as a client-only fallback for users who block cookies entirely; in that case the drawer hydrates to `tasks` and corrects after first interaction.

2. **The "SSR'd content as props" pattern.** `<TasksDrawer>` is a Client Component (it owns transient `open`/`tab` state, ESC handler, scrim click). But `<TaskList>` and `<AllGoalsList>` are Server Components that hit the DB. Next.js's RSC composition lets you pass Server Component output as `ReactNode` props into a Client Component — the markup is rendered on the server, embedded in the client island, and never re-rendered on the client. Both panes are mounted at the same time and toggled with `display`, so switching tabs is free (no re-fetch, no skeleton). Cost: slightly larger initial payload — acceptable since both lists are user-scale (dozens of rows, not thousands).

3. **Heatmap performance.** The current implementation calls `progressFor` 60 × N times per render. For N ≤ 50 goals (the realistic ceiling for a personal-growth dashboard), this is < 3,000 pure function calls — sub-millisecond. If a user reaches >100 goals we revisit by precomputing per-day completion counts in a single SQL query (Phase 14 hardening already calls out a query-perf pass).

4. **`getDaysRange` and historical clicks.** Phase 2's `getDaysRange` returns DayRecords without per-day click counts (those live in a separate table). The heatmap and ring stats compute completion using `progressFor(g, day, {})` for historical days — i.e., zero clicks. This is correct because the click-tracking handler (spec §10) writes click-credited count goals into `day.goals[g_*_read]` at the moment of click, so historical days already carry the credited count. If Phase 2's implementation doesn't do this write-through, file a bug and patch Phase 2's `recordClick` before continuing — the heatmap math depends on it.

5. **`streakFor` signature.** Phase 2's plan named the helper `streakFor(goalId)` but the implementation may take `(goalId, today, clicks)` or read via DI. The `<RingStats>` component above uses the latter signature; if Phase 2 settled on a different shape, adjust the call site here. The unit-tested `bestStreakAcrossGoals` helper takes a `streakOf(id) => number` callback, so it's signature-agnostic.

6. **The Phase 4 follow-up.** The shared `<GoalRow>` was extracted in Task 2 and the Mindfulness panel was migrated. Phase 4 should land its Business and Personal panels using `<GoalRow>` directly. If Phase 4 already shipped before Phase 5 is started, an out-of-band migration commit refactors those panels to use the shared row — no behavior change, just deduplication.

7. **No emojis, anywhere.** Spec §3.4 is non-negotiable. The FAB icon is an inline check-circle SVG. Section indicators are colored dots. Close button uses ×. Streak chip uses `Nd`. Filter pills are text. Heatmap cells are colored squares. Verify with: `git diff --stat | xargs -I {} grep -lP '[\x{1F300}-\x{1FAFF}]' {} || true` — should print nothing.

8. **CSS is hand-written, not Tailwind for the drawer/heatmap.** The drawer animation, heatmap grid, and FAB hover transition use class-based CSS in `globals.css` to keep the visual fidelity to spec §3.5/§3.6 verbatim. Tailwind utilities are fine inside leaf components for layout (gap, padding) but the structural classes (`.drawer`, `.heatmap`, `.fab`) live in `globals.css`. This matches the master-roadmap's "CSS variables verbatim, port to Tailwind opportunistically" decision (§5.1 of the roadmap).

9. **Why two new helpers and not one big `getOverviewSnapshot()`.** Each helper does one thing and is easy to unit-test without DB. Combining them into a single "overview snapshot" object would force the unit test to mock the full DayRecord shape and the entire goal list — a brittle test. Keeping them small lets the test exercise each rule (§12.2 thresholds, journal-lift, today flag, streak best-of) in isolation.

10. **Drawer accessibility nuance.** The drawer uses `role="dialog"` + `aria-modal="true"` + `aria-hidden`-toggling on close. Focus trapping inside the drawer is *not* implemented in v1; that's part of Phase 14's accessibility hardening pass alongside the Bible modal's focus trap. Tab key today escapes to the page underneath; ESC always closes. If a user complains, prioritize Phase 14.

11. **One pending Phase 2 contract.** This plan calls `countOpenTasks(userId)`, `listTasks(userId)`, `addTask(...)`, `toggleTask(...)`, `deleteTask(...)`, and reads `getFilter(userId)` / writes `setFilter(...)`. All of these are spec'd in Phase 2. If any are missing when Phase 5 starts, stop and finish them — do not stub out the queries here, that'll break the acceptance criteria silently.

12. **Cookie name + auth interaction.** The `mm_drawer_tab` cookie is per-browser, not per-user. In single-user / local-no-password mode this is fine. When Phase 7 lands multi-user auth, the cookie should be either namespaced (`mm_drawer_tab_${userId}`) or moved into the session payload. Note this in the Phase 7 plan when it's written.
