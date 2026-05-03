# Phase 4 — Business + Personal Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Business and Personal panels per spec §3, §10, §11. Replaces the Phase 2 smoke tests for both panels with the real UI: headline, briefing, top stories with badges, scan list, articles list (click-tracked), dev quotes (gold left border), GitHub repos, watchlist on Business; headline, motivation quote, articles (click-tracked), and the four stat widgets (Financial / Health / Disconnect / Win-of-the-day) on Personal.

**Architecture:**
- Server Components for all read-side UI (every list, every card that doesn't need an event handler).
- Client islands for the four interactive Personal widgets (Health toggles, Disconnect buttons, Financial inputs, Win textarea) — narrowly scoped, each component owns one server-action call.
- All article-style anchors (Business top stories, Business articles, Business repos, Business dev quotes, Personal articles) get a `data-track-cat` attribute and route through a shared `TrackedAnchor` component. Section maps to `business` or `personal`. Click-tracking auto-credits `g_learn` (business) and `g_per_read` (personal) via the Phase 2 `recordClick` server action.
- Reuses `getDailyContent(userId, iso)` from Phase 3's data layer. Phase 6 swaps the source from fixture to DB; consumers in this phase do not change.
- All four widgets read from `getDayOrEmpty(userId, iso)` (Phase 2) and write through Phase 2 server actions: `setHealthFlag`, `addTimeMinutes` / `setDisconnect`, `setFinance`, `setWin`. **No new server actions are introduced in Phase 4.**
- Briefing HTML allowed via React's raw-HTML escape hatch — `briefing` is authored by the user (or by the trusted LLM pipeline in Phase 8); Phase 14's hardening pass adds DOMPurify if/when an untrusted source is introduced. Documented in Notes.
- Disconnect "−15" button: `addTimeMinutes` only handles positive deltas (per its Phase 2 contract: "increments `g_disconnect` minutes"), so the −15 button reads the current value, computes `max(0, current - 15)`, and writes it back via `setDisconnect`. Documented in Notes.

**Tech additions this phase:** `use-debounce` (already added in Phase 3) for the Win textarea and Financial inputs. No new deps.

---

## File Structure (created or modified in this phase)

| File | Purpose |
|---|---|
| `src/components/business/BusinessHeadline.tsx` | Server component — pulse-hero with one-line edge-of-day |
| `src/components/business/BusinessBriefing.tsx` | Server component — HTML-rendered briefing (lead phrase bold) |
| `src/components/business/TopStories.tsx` | Server component — 1–3 top stories, lead variant gets `top-card`, badges row |
| `src/components/business/ScanList.tsx` | Server component — vertical bullet list of headlines |
| `src/components/business/BusinessArticles.tsx` | Server component — article cards w/ badges + click tracking |
| `src/components/business/DevQuotes.tsx` | Server component — blockquote cards, gold left border, optional source link tracked |
| `src/components/business/Repos.tsx` | Server component — GitHub repo rows w/ stars/license/lang/pitch + tracked link |
| `src/components/business/Watchlist.tsx` | Server component — watchlist bullets |
| `src/components/business/Badge.tsx` | Tiny pure component — renders `[className, label]` badge tuple |
| `src/components/business/TrackedAnchor.tsx` | Client component — wraps `<a>` and fires the `recordClick` server action onClick |
| `src/components/business/RawHtml.tsx` | Tiny client component — renders pre-trusted HTML for the briefing block |
| `src/components/personal/PersonalHeadline.tsx` | Server component |
| `src/components/personal/Motivation.tsx` | Server component — pulled quote w/ author |
| `src/components/personal/PersonalArticles.tsx` | Server component — article cards + click tracking (`personal`) |
| `src/components/personal/StatGrid.tsx` | Server component — 2x2 grid wrapper composing the four widgets |
| `src/components/personal/FinancialWidget.tsx` | Client component — three text inputs, debounced `setFinance` |
| `src/components/personal/HealthWidget.tsx` | Client component — three toggle buttons, optimistic + `setHealthFlag` |
| `src/components/personal/DisconnectWidget.tsx` | Client component — counter + `+15 / +30 / +60 / -15` buttons |
| `src/components/personal/WinWidget.tsx` | Client component — debounced textarea, `setWin` |
| `src/components/business/BusinessGoals.tsx` | Server component — full goals list for `business` (mirrors `MindfulnessGoals`) |
| `src/components/personal/PersonalGoals.tsx` | Server component — full goals list for `personal` (mirrors `MindfulnessGoals`) |
| `src/components/personal/AddPersonalGoalForm.tsx` | Client component — copy of `AddGoalForm` parameterised for `personal` |
| `src/components/business/AddBusinessGoalForm.tsx` | Client component — copy of `AddGoalForm` parameterised for `business` |
| `src/components/panels/BusinessPanel.tsx` | **Modify** — replaces Phase 2 smoke; composes all Business pieces |
| `src/components/panels/PersonalPanel.tsx` | **Modify** — replaces Phase 2 smoke; composes all Personal pieces |
| `tests/unit/badge.test.tsx` | Unit test for `Badge` rendering |
| `tests/unit/disconnect-clamp.test.ts` | Unit test for the `-15` clamp helper |
| `tests/unit/tracked-anchor.test.tsx` | Snapshot/DOM test that anchor carries `data-track-cat` and `target=_blank` |

---

## Task 1: Shared primitives — Badge + TrackedAnchor + RawHtml + clamp helper

**Files:**
- Create: `src/components/business/Badge.tsx`, `src/components/business/TrackedAnchor.tsx`, `src/components/business/RawHtml.tsx`, `src/lib/clamp.ts`
- Test: `tests/unit/badge.test.tsx`, `tests/unit/tracked-anchor.test.tsx`, `tests/unit/disconnect-clamp.test.ts`

- [ ] **Step 1: Create `src/lib/clamp.ts`**

```ts
/** Clamp a number to a non-negative integer floor of 0 (used for Disconnect -15). */
export function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

/** Subtract `delta` from `current` but never go below 0. */
export function subtractFloor(current: number, delta: number): number {
  return clampNonNegative(current - delta);
}
```

- [ ] **Step 2: Write `tests/unit/disconnect-clamp.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { subtractFloor, clampNonNegative } from "@/lib/clamp";

describe("subtractFloor", () => {
  it("subtracts when result is positive", () => {
    expect(subtractFloor(60, 15)).toBe(45);
  });
  it("returns 0 when subtracting more than current", () => {
    expect(subtractFloor(10, 15)).toBe(0);
  });
  it("returns 0 when current is 0", () => {
    expect(subtractFloor(0, 15)).toBe(0);
  });
});

describe("clampNonNegative", () => {
  it("returns 0 for negatives", () => {
    expect(clampNonNegative(-5)).toBe(0);
  });
  it("returns the value for non-negatives", () => {
    expect(clampNonNegative(7)).toBe(7);
  });
});
```

- [ ] **Step 3: Create `src/components/business/Badge.tsx`**

Renders the `[className, label]` tuples from `DAILY_CONTENT.business.topStories[].badges` and `DAILY_CONTENT.business.articles[].badges`. The class names (e.g. `b-product`, `b-model`, `b-research`, `tag`) must match the colored chip styles already in `globals.css` from Phase 1 (mockup §3 / lines 247–257 of the reference HTML).

```tsx
export type BadgeTuple = [string, string];

export function Badge({ tuple }: { tuple: BadgeTuple }) {
  const [cls, label] = tuple;
  return (
    <span
      className={`badge ${cls}`}
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".04em",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        marginRight: 6,
      }}
    >
      {label}
    </span>
  );
}

export function BadgeRow({ badges }: { badges: BadgeTuple[] }) {
  if (!badges?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
      {badges.map((b, i) => (
        <Badge key={`${b[0]}-${b[1]}-${i}`} tuple={b} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write `tests/unit/badge.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Badge, BadgeRow } from "@/components/business/Badge";

describe("Badge", () => {
  it("renders the label and the className", () => {
    const { container } = render(<Badge tuple={["b-model", "Model"]} />);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("b-model");
    expect(span.textContent).toBe("Model");
  });
});

describe("BadgeRow", () => {
  it("returns null for empty badges", () => {
    const { container } = render(<BadgeRow badges={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it("renders each badge", () => {
    const { container } = render(
      <BadgeRow badges={[["b-product", "Product"], ["tag", "Microsoft"]]} />
    );
    expect(container.querySelectorAll(".badge")).toHaveLength(2);
  });
});
```

- [ ] **Step 5: Create `src/components/business/TrackedAnchor.tsx`**

Single shared anchor wrapper. Used by every Business / Personal article-style link. Renders an `<a target="_blank">` with `data-track-cat` and fires a server-action prop on click. Trade-off documented in Notes.

```tsx
"use client";
import type { ReactNode, CSSProperties } from "react";

export type TrackCat = "business" | "personal";

export function TrackedAnchor({
  href,
  cat,
  onTrack,
  children,
  className,
  style,
}: {
  href: string;
  cat: TrackCat;
  onTrack: () => Promise<void>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-track-cat={cat}
      className={className}
      style={style}
      onClick={() => {
        // Fire-and-forget; the anchor still navigates in the new tab.
        void onTrack();
      }}
    >
      {children}
    </a>
  );
}
```

- [ ] **Step 6: Write `tests/unit/tracked-anchor.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";

describe("TrackedAnchor", () => {
  it("carries data-track-cat and target=_blank", () => {
    const { container } = render(
      <TrackedAnchor href="https://x.test" cat="business" onTrack={async () => {}}>
        hi
      </TrackedAnchor>
    );
    const a = container.querySelector("a")!;
    expect(a.getAttribute("data-track-cat")).toBe("business");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });

  it("calls onTrack on click", () => {
    const spy = vi.fn(async () => {});
    const { container } = render(
      <TrackedAnchor href="https://x.test" cat="personal" onTrack={spy}>
        hi
      </TrackedAnchor>
    );
    fireEvent.click(container.querySelector("a")!);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 7: Create `src/components/business/RawHtml.tsx`**

Tiny isolation wrapper that renders pre-trusted HTML for the Business briefing. Centralising it makes the Phase 14 swap-to-DOMPurify a one-file change.

```tsx
import type { CSSProperties } from "react";

/**
 * Renders a pre-trusted HTML string (currently from the daily-content fixture
 * or, in Phase 6+, the per-user DailyContent table — both authored by the user
 * or the Phase 8 LLM pipeline).
 *
 * Phase 14 hardening swaps the body of this component for DOMPurify-sanitised
 * output once an untrusted source is wired in. Until then, every consumer goes
 * through this single component so the swap is mechanical.
 */
export function RawHtml({ html, style }: { html: string; style?: CSSProperties }) {
  // eslint-disable-next-line react/no-danger
  return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 8: Run, verify pass**

```bash
pnpm test tests/unit/disconnect-clamp.test.ts tests/unit/badge.test.tsx tests/unit/tracked-anchor.test.tsx
```

Expected: 8 passing.

- [ ] **Step 9: Commit**

```bash
git add src/lib/clamp.ts src/components/business/Badge.tsx src/components/business/TrackedAnchor.tsx src/components/business/RawHtml.tsx tests/unit/disconnect-clamp.test.ts tests/unit/badge.test.tsx tests/unit/tracked-anchor.test.tsx
git commit -m "feat(b/p): shared primitives — Badge, TrackedAnchor, RawHtml, subtractFloor clamp"
```

---

## Task 2: Business headline + briefing + top stories

**Files:**
- Create: `src/components/business/BusinessHeadline.tsx`, `src/components/business/BusinessBriefing.tsx`, `src/components/business/TopStories.tsx`

- [ ] **Step 1: Create `src/components/business/BusinessHeadline.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function BusinessHeadline({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const headline = content.business.headline;
  if (!headline) return null;

  return (
    <article
      className="card pulse-hero"
      style={{
        background:
          "radial-gradient(120% 80% at 100% 0%, var(--accent-soft), transparent 60%), var(--surface-solid)",
      }}
    >
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BUSINESS · TODAY
      </div>
      <h2 className="serif" style={{ fontSize: "1.5rem", margin: "8px 0 0", lineHeight: 1.3, color: "var(--ink)" }}>
        {headline}
      </h2>
    </article>
  );
}
```

- [ ] **Step 2: Create `src/components/business/BusinessBriefing.tsx`**

Briefing allows HTML (e.g. `<strong>` for the lead phrase). The `briefing` field is authored by the user or the (trusted) Phase 8 LLM pipeline; we pass it through `RawHtml`.

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { RawHtml } from "./RawHtml";

export async function BusinessBriefing({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const briefing = content.business.briefing;
  if (!briefing) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BRIEFING
      </div>
      <RawHtml
        html={briefing}
        style={{
          marginTop: 10,
          fontSize: "1rem",
          lineHeight: 1.65,
          color: "var(--ink)",
        }}
      />
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/business/TopStories.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";

export async function TopStories({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const stories = content.business.topStories;
  if (!stories.length) return null;

  async function track() {
    "use server";
    await recordClick({ userId, iso, section: "business" });
  }

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TOP STORIES
      </div>
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        {stories.map((s, i) => {
          const isLead = s.kind === "lead";
          return (
            <TrackedAnchor
              key={s.url + i}
              href={s.url}
              cat="business"
              onTrack={track}
              className={isLead ? "top-card" : "article-card"}
              style={{
                display: "block",
                padding: isLead ? 18 : 14,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                background: isLead
                  ? "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface-2) 60%)"
                  : "var(--surface-2)",
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".14em",
                  color: "var(--accent)",
                  marginBottom: 6,
                }}
              >
                {s.eyebrow}
              </div>
              <BadgeRow badges={s.badges ?? []} />
              <div
                className="serif"
                style={{
                  fontSize: isLead ? "1.25rem" : "1.05rem",
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {s.title}
              </div>
              <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
                {s.body}
              </p>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{s.src}</div>
            </TrackedAnchor>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/business/BusinessHeadline.tsx src/components/business/BusinessBriefing.tsx src/components/business/TopStories.tsx
git commit -m "feat(business): headline, briefing, top stories with badges + click tracking"
```

---

## Task 3: Scan list + Business articles + Watchlist

**Files:**
- Create: `src/components/business/ScanList.tsx`, `src/components/business/BusinessArticles.tsx`, `src/components/business/Watchlist.tsx`

- [ ] **Step 1: Create `src/components/business/ScanList.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function ScanList({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.scan;
  if (!items.length) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TODAY'S SCAN
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 6 }}>
        {items.map((line, i) => (
          <li
            key={i}
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--ink)",
              padding: "6px 0",
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
              display: "flex",
              gap: 10,
            }}
          >
            <span aria-hidden style={{ color: "var(--accent)", fontWeight: 700 }}>·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/business/BusinessArticles.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";

export async function BusinessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.business.articles;
  if (!articles.length) return null;

  async function track() {
    "use server";
    await recordClick({ userId, iso, section: "business" });
  }

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        ARTICLES
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {articles.map((a) => (
          <TrackedAnchor
            key={a.url}
            href={a.url}
            cat="business"
            onTrack={track}
            className="article-card"
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
            <BadgeRow badges={a.badges ?? []} />
            <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.35 }}>
              {a.title}
            </div>
            <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              {a.summary}
            </p>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{a.src}</div>
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/business/Watchlist.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function Watchlist({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.watchlist;
  if (!items.length) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        WATCHLIST
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 6 }}>
        {items.map((line, i) => (
          <li
            key={i}
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              padding: "6px 0",
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
              display: "flex",
              gap: 10,
            }}
          >
            <span aria-hidden style={{ color: "var(--ink-muted)" }}>›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/business/ScanList.tsx src/components/business/BusinessArticles.tsx src/components/business/Watchlist.tsx
git commit -m "feat(business): scan list, articles list (tracked), watchlist"
```

---

## Task 4: Dev quotes + Repos

**Files:**
- Create: `src/components/business/DevQuotes.tsx`, `src/components/business/Repos.tsx`

- [ ] **Step 1: Create `src/components/business/DevQuotes.tsx`**

Quote cards are blockquotes with a gold left border (spec §3.5 `.quote-card`). If the quote provides a `url`, the source line is wrapped in a `TrackedAnchor` (cat = `business`).

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "./TrackedAnchor";

export async function DevQuotes({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const quotes = content.business.quotes;
  if (!quotes.length) return null;

  async function track() {
    "use server";
    await recordClick({ userId, iso, section: "business" });
  }

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DEV QUOTES
      </div>
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        {quotes.map((q, i) => (
          <blockquote
            key={i}
            className="quote-card"
            style={{
              margin: 0,
              padding: "12px 16px",
              borderLeft: "3px solid var(--gold)",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <p
              className="serif"
              style={{ fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic", margin: 0, color: "var(--ink)" }}
            >
              “{q.text}”
            </p>
            <footer style={{ marginTop: 6, fontSize: 12, color: "var(--ink-muted)" }}>
              — {q.url ? (
                <TrackedAnchor href={q.url} cat="business" onTrack={track}
                  style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>
                  {q.source}
                </TrackedAnchor>
              ) : (
                <span>{q.source}</span>
              )}
              {q.target ? <span style={{ marginLeft: 6, color: "var(--ink-muted)" }}>· {q.target}</span> : null}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/business/Repos.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "./TrackedAnchor";

export async function Repos({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const repos = content.business.repos;
  if (!repos.length) return null;

  async function track() {
    "use server";
    await recordClick({ userId, iso, section: "business" });
  }

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        GITHUB BUZZ
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {repos.map((r) => (
          <TrackedAnchor
            key={r.url}
            href={r.url}
            cat="business"
            onTrack={track}
            className="repo"
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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500 }}>
                  {r.org}/<span style={{ fontWeight: 600 }}>{r.name}</span>
                </div>
                <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  {r.pitch}
                </p>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                <div style={{ color: "var(--gold)", fontWeight: 600 }}>★ {r.stars}</div>
                <div>{r.weekly}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, color: "var(--ink-muted)" }}>
              <span>{r.lang}</span>
              <span>·</span>
              <span>{r.license}</span>
            </div>
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/business/DevQuotes.tsx src/components/business/Repos.tsx
git commit -m "feat(business): dev quotes (gold left border) and GitHub repos (tracked)"
```

---

## Task 5: Business goals + Business panel composition

**Files:**
- Create: `src/components/business/AddBusinessGoalForm.tsx`, `src/components/business/BusinessGoals.tsx`
- Modify: `src/components/panels/BusinessPanel.tsx`

- [ ] **Step 1: Create `src/components/business/AddBusinessGoalForm.tsx`**

Same shape as Phase 3's `AddGoalForm` but parameterised for the `business` section.

```tsx
"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";

export function AddBusinessGoalForm({ userId }: { userId: string }) {
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
        + Add a business goal
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
          await addGoal({ userId, section: "business", title: title.trim(), type: "check", target: 1 });
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
      <button type="submit" disabled={pending}
        style={{ background: "var(--accent)", color: "white", border: 0, padding: "8px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)}
        style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}>
        Cancel
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/business/BusinessGoals.tsx`**

Mirror of `MindfulnessGoals.tsx` from Phase 3 but filters by `section = 'business'`.

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor } from "@/lib/progress";
import { toggleCheckGoal, incrementCountGoal, removeGoal } from "@/server/actions/goals";
import { AddBusinessGoalForm } from "./AddBusinessGoalForm";

export async function BusinessGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "business"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BUSINESS GOALS
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {goals.map((g) => {
          const p = progressFor(g, day, clicks);
          const done = p.pct >= 100;
          return (
            <li key={g.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              {g.type === "check" && (
                <form action={async () => { "use server"; await toggleCheckGoal({ userId, goalId: g.id, iso }); }}>
                  <button type="submit" aria-label={done ? "Mark incomplete" : "Mark complete"}
                    style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid var(--accent)",
                      background: done ? "var(--accent)" : "transparent", cursor: "pointer" }} />
                </form>
              )}
              {g.type === "count" && (
                <form action={async () => { "use server"; await incrementCountGoal({ userId, goalId: g.id, iso }); }}>
                  <button type="submit"
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid var(--accent)",
                      background: done ? "var(--accent)" : "transparent",
                      color: done ? "white" : "var(--accent)", cursor: "pointer", minWidth: 56 }}>
                    {p.current}/{p.target}
                  </button>
                </form>
              )}
              <span style={{ flex: 1, color: done ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: done ? "line-through" : "none" }}>
                {g.title}
              </span>
              {!g.isDefault && (
                <form action={async () => { "use server"; await removeGoal({ userId, goalId: g.id }); }}>
                  <button type="submit" aria-label={`Remove ${g.title}`}
                    style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 16 }}>
                    ×
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      <AddBusinessGoalForm userId={userId} />
    </section>
  );
}
```

- [ ] **Step 3: Replace `src/components/panels/BusinessPanel.tsx`**

```tsx
import { BusinessHeadline } from "@/components/business/BusinessHeadline";
import { BusinessBriefing } from "@/components/business/BusinessBriefing";
import { TopStories } from "@/components/business/TopStories";
import { ScanList } from "@/components/business/ScanList";
import { BusinessArticles } from "@/components/business/BusinessArticles";
import { DevQuotes } from "@/components/business/DevQuotes";
import { Repos } from "@/components/business/Repos";
import { Watchlist } from "@/components/business/Watchlist";
import { BusinessGoals } from "@/components/business/BusinessGoals";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function BusinessPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <BusinessHeadline userId={userId} iso={iso} />
      <BusinessBriefing userId={userId} iso={iso} />
      <TopStories userId={userId} iso={iso} />
      <ScanList userId={userId} iso={iso} />
      <BusinessArticles userId={userId} iso={iso} />
      <DevQuotes userId={userId} iso={iso} />
      <Repos userId={userId} iso={iso} />
      <Watchlist userId={userId} iso={iso} />
      <BusinessGoals userId={userId} iso={iso} />
    </div>
  );
}
```

- [ ] **Step 4: Run dev server and smoke-test the Business panel**

```bash
pnpm dev
```

Open http://localhost:3000 → Business tab. With the Phase 3 fixture today's content has `topStories: []` etc., so most cards will be hidden by the early-return guards. Add a temporary one-line top story to `src/lib/daily-content-fixture.ts` to verify the rendering of badges + tracked anchor (revert before committing). Verify:
- Headline + briefing render
- Adding a `topStories` entry: badges row appears, click opens new tab, refresh shows `g_learn` count incremented
- Goals list renders Business defaults (`g_learn`, `g_strategy`, `g_customer`, `g_product`, `g_team`, `g_demos`) and the count goal `g_learn` increments after article clicks

- [ ] **Step 5: Commit**

```bash
git add src/components/business/AddBusinessGoalForm.tsx src/components/business/BusinessGoals.tsx src/components/panels/BusinessPanel.tsx
git commit -m "feat(business): goals list + full panel composition (replaces Phase 2 smoke)"
```

---

## Task 6: Personal headline + motivation + articles

**Files:**
- Create: `src/components/personal/PersonalHeadline.tsx`, `src/components/personal/Motivation.tsx`, `src/components/personal/PersonalArticles.tsx`

- [ ] **Step 1: Create `src/components/personal/PersonalHeadline.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function PersonalHeadline({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const headline = content.personal.headline;
  if (!headline) return null;

  return (
    <article
      className="card pulse-hero"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, var(--gold-soft), transparent 60%), var(--surface-solid)",
      }}
    >
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        PERSONAL · TODAY
      </div>
      <h2 className="serif" style={{ fontSize: "1.5rem", margin: "8px 0 0", lineHeight: 1.3, color: "var(--ink)" }}>
        {headline}
      </h2>
    </article>
  );
}
```

- [ ] **Step 2: Create `src/components/personal/Motivation.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";

export async function Motivation({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const m = content.personal.motivation;
  if (!m?.text) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MOTIVATION
      </div>
      <blockquote
        className="serif"
        style={{
          margin: "12px 0 0",
          padding: "12px 16px",
          borderLeft: "3px solid var(--gold)",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          fontStyle: "italic",
          fontSize: "1.05rem",
          lineHeight: 1.6,
          color: "var(--ink)",
        }}
      >
        “{m.text}”
        <footer style={{ marginTop: 8, fontSize: 12, color: "var(--ink-muted)", fontStyle: "normal" }}>
          — {m.author}
        </footer>
      </blockquote>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/personal/PersonalArticles.tsx`**

```tsx
import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";

export async function PersonalArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.personal.articles;
  if (!articles.length) return null;

  async function track() {
    "use server";
    await recordClick({ userId, iso, section: "personal" });
  }

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        SELF-HELP READING
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {articles.map((a) => (
          <TrackedAnchor
            key={a.url}
            href={a.url}
            cat="personal"
            onTrack={track}
            className="article-card"
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
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/personal/PersonalHeadline.tsx src/components/personal/Motivation.tsx src/components/personal/PersonalArticles.tsx
git commit -m "feat(personal): headline, motivation quote, articles (tracked, cat=personal)"
```

---

## Task 7: Personal stat widgets — Health + Disconnect

**Files:**
- Create: `src/components/personal/HealthWidget.tsx`, `src/components/personal/DisconnectWidget.tsx`

- [ ] **Step 1: Create `src/components/personal/HealthWidget.tsx`**

Three toggle buttons: `Slept 7h+`, `Moved 30m`, `Ate well`. Each toggle calls `setHealthFlag({ userId, iso, key, value })`. Optimistic UI via `useState` + `useTransition`; the icon swaps between an empty circle and a check-circle (inline SVG, no emoji).

```tsx
"use client";
import { useState, useTransition } from "react";
import { setHealthFlag } from "@/server/actions/days";

type FlagKey = "slept" | "moved" | "ate";
const LABELS: Record<FlagKey, string> = {
  slept: "Slept 7h+",
  moved: "Moved 30m",
  ate:   "Ate well",
};

export function HealthWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: { slept?: boolean; moved?: boolean; ate?: boolean };
}) {
  const [state, setState] = useState({
    slept: !!initial.slept,
    moved: !!initial.moved,
    ate:   !!initial.ate,
  });
  const [, startTransition] = useTransition();

  function toggle(key: FlagKey) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    startTransition(async () => {
      try {
        await setHealthFlag({ userId, iso, key, value: next });
      } catch {
        // revert on failure
        setState((s) => ({ ...s, [key]: !next }));
      }
    });
  }

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        HEALTH
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {(Object.keys(LABELS) as FlagKey[]).map((k) => {
          const on = state[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`health-toggle${on ? " on" : ""}`}
              aria-pressed={on}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: on ? "var(--sage-soft)" : "var(--surface-2)",
                color: "var(--ink)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13.5,
              }}
            >
              {on ? <CheckCircleSvg /> : <EmptyCircleSvg />}
              <span>{LABELS[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyCircleSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function CheckCircleSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Create `src/components/personal/DisconnectWidget.tsx`**

Big serif counter showing minutes. Buttons `+15 / +30 / +60 / -15`. Positive deltas use `addTimeMinutes` (the Phase 2 increment-only action that targets `g_disconnect` via `day.disconnect`). The `-15` button computes `subtractFloor(current, 15)` and writes via `setDisconnect`.

```tsx
"use client";
import { useState, useTransition } from "react";
import { addTimeMinutes, setDisconnect } from "@/server/actions/days";
import { subtractFloor } from "@/lib/clamp";

export function DisconnectWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: number;
}) {
  const [minutes, setMinutes] = useState<number>(initial ?? 0);
  const [, startTransition] = useTransition();

  function add(delta: number) {
    const prev = minutes;
    const next = prev + delta;
    setMinutes(next);
    startTransition(async () => {
      try {
        await addTimeMinutes({ userId, iso, minutes: delta });
      } catch {
        setMinutes(prev);
      }
    });
  }

  function subtractFifteen() {
    const prev = minutes;
    const next = subtractFloor(prev, 15);
    if (next === prev) return;
    setMinutes(next);
    startTransition(async () => {
      try {
        await setDisconnect({ userId, iso, minutes: next });
      } catch {
        setMinutes(prev);
      }
    });
  }

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DISCONNECT
      </div>
      <div className="serif" style={{ fontSize: "2.4rem", fontWeight: 500, color: "var(--ink)", marginTop: 6 }}>
        {minutes}
        <span style={{ fontSize: "0.95rem", color: "var(--ink-soft)", marginLeft: 6 }}>min</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {[15, 30, 60].map((m) => (
          <button key={m} type="button" onClick={() => add(m)}
            style={{
              padding: "6px 10px", borderRadius: 999,
              border: "1px solid var(--sage)", background: "transparent",
              color: "var(--sage-deep)", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
            +{m}
          </button>
        ))}
        <button type="button" onClick={subtractFifteen}
          aria-label="Subtract 15 minutes"
          style={{
            padding: "6px 10px", borderRadius: 999,
            border: "1px solid var(--line-strong)", background: "transparent",
            color: "var(--ink-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>
          −15
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/personal/HealthWidget.tsx src/components/personal/DisconnectWidget.tsx
git commit -m "feat(personal): Health toggles + Disconnect counter (+15/+30/+60/-15)"
```

---

## Task 8: Personal stat widgets — Financial + Win

**Files:**
- Create: `src/components/personal/FinancialWidget.tsx`, `src/components/personal/WinWidget.tsx`

- [ ] **Step 1: Create `src/components/personal/FinancialWidget.tsx`**

Three text inputs (`Net`, `Cash`, `Invest`). Currency strings, no math (per spec §11: "Manual until connectors are wired"). Debounced 500ms autosave via `setFinance`.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setFinance } from "@/server/actions/days";

export function FinancialWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: { net: string; cash: string; invest: string };
}) {
  const [fin, setFin] = useState({
    net:    initial.net    ?? "",
    cash:   initial.cash   ?? "",
    invest: initial.invest ?? "",
  });
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const lastSavedAt = useRef<string>("");

  const persist = useDebouncedCallback(async (next: typeof fin) => {
    setStatus("saving");
    try {
      await setFinance({ userId, iso, fin: next });
      lastSavedAt.current = new Date().toLocaleTimeString();
      setStatus("saved");
    } catch {
      setStatus("");
    }
  }, 500);

  function update(k: keyof typeof fin, v: string) {
    const next = { ...fin, [k]: v };
    setFin(next);
    setStatus("saving");
    persist(next);
  }

  // Cancel pending save on unmount
  useEffect(() => () => persist.cancel(), [persist]);

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        FINANCIAL
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "4px 0 10px" }}>
        Manual until connectors are wired.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {(["net", "cash", "invest"] as const).map((k) => (
          <label key={k} style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "capitalize" }}>{k}</span>
            <input
              type="text"
              inputMode="decimal"
              value={fin[k]}
              onChange={(e) => update(k, e.target.value)}
              placeholder="$0"
              maxLength={32}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            />
          </label>
        ))}
      </div>
      <div className="save-status" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 8, minHeight: 14 }}>
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/personal/WinWidget.tsx`**

Single textarea, italic serif, 500ms debounced autosave via `setWin`.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { setWin } from "@/server/actions/days";

export function WinWidget({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: string;
}) {
  const [text, setText] = useState(initial ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const lastSavedAt = useRef<string>("");

  const persist = useDebouncedCallback(async (val: string) => {
    setStatus("saving");
    try {
      await setWin({ userId, iso, win: val });
      lastSavedAt.current = new Date().toLocaleTimeString();
      setStatus("saved");
    } catch {
      setStatus("");
    }
  }, 500);

  useEffect(() => () => persist.cancel(), [persist]);

  return (
    <div className="stat-card card" style={{ padding: 14 }}>
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        WIN OF THE DAY
      </div>
      <textarea
        className="win-area serif"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setStatus("saving");
          persist(v);
        }}
        placeholder="What worked today?"
        rows={4}
        maxLength={1000}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 12,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          color: "var(--ink)",
          fontFamily: "Fraunces, Georgia, serif",
          fontStyle: "italic",
          fontSize: "1rem",
          lineHeight: 1.55,
          resize: "vertical",
        }}
      />
      <div className="save-status" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6, minHeight: 14 }}>
        {status === "saving" ? "saving…" : status === "saved" ? `saved · ${lastSavedAt.current}` : ""}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/personal/FinancialWidget.tsx src/components/personal/WinWidget.tsx
git commit -m "feat(personal): Financial inputs (debounced setFinance) + Win-of-the-day textarea"
```

---

## Task 9: Personal goals + StatGrid + Personal panel composition

**Files:**
- Create: `src/components/personal/AddPersonalGoalForm.tsx`, `src/components/personal/PersonalGoals.tsx`, `src/components/personal/StatGrid.tsx`
- Modify: `src/components/panels/PersonalPanel.tsx`

- [ ] **Step 1: Create `src/components/personal/AddPersonalGoalForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { addGoal } from "@/server/actions/goals";

export function AddPersonalGoalForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{ background: "transparent", border: "1px dashed var(--line-strong)",
          padding: "8px 14px", borderRadius: "var(--radius-sm)",
          color: "var(--ink-soft)", cursor: "pointer", marginTop: 12, fontSize: 13 }}>
        + Add a personal goal
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
          await addGoal({ userId, section: "personal", title: title.trim(), type: "check", target: 1 });
          setTitle("");
          setOpen(false);
        } finally {
          setPending(false);
        }
      }}
      style={{ display: "flex", gap: 8, marginTop: 12 }}
    >
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="A new daily check…" maxLength={200}
        style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }} />
      <button type="submit" disabled={pending}
        style={{ background: "var(--gold)", color: "white", border: 0,
          padding: "8px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)}
        style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}>
        Cancel
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/personal/PersonalGoals.tsx`**

Mirror of `BusinessGoals.tsx` filtered to `personal`.

```tsx
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor } from "@/lib/progress";
import { toggleCheckGoal, incrementCountGoal, removeGoal } from "@/server/actions/goals";
import { AddPersonalGoalForm } from "./AddPersonalGoalForm";

export async function PersonalGoals({ userId, iso }: { userId: string; iso: string }) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId, "personal"),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        PERSONAL GOALS
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {goals.map((g) => {
          const p = progressFor(g, day, clicks);
          const done = p.pct >= 100;
          return (
            <li key={g.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              {g.type === "check" && (
                <form action={async () => { "use server"; await toggleCheckGoal({ userId, goalId: g.id, iso }); }}>
                  <button type="submit"
                    style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid var(--gold)",
                      background: done ? "var(--gold)" : "transparent", cursor: "pointer" }}
                    aria-label={done ? "Mark incomplete" : "Mark complete"} />
                </form>
              )}
              {g.type === "count" && (
                <form action={async () => { "use server"; await incrementCountGoal({ userId, goalId: g.id, iso }); }}>
                  <button type="submit"
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid var(--gold)",
                      background: done ? "var(--gold)" : "transparent",
                      color: done ? "white" : "var(--gold)", cursor: "pointer", minWidth: 56 }}>
                    {p.current}/{p.target}
                  </button>
                </form>
              )}
              {g.type === "time" && (
                <span style={{ padding: "4px 10px", borderRadius: 6,
                  border: "1.5px solid var(--gold)",
                  background: done ? "var(--gold)" : "transparent",
                  color: done ? "white" : "var(--gold)", minWidth: 64, textAlign: "center", fontSize: 12 }}>
                  {p.current}/{p.target}m
                </span>
              )}
              <span style={{ flex: 1, color: done ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: done ? "line-through" : "none" }}>
                {g.title}
              </span>
              {!g.isDefault && (
                <form action={async () => { "use server"; await removeGoal({ userId, goalId: g.id }); }}>
                  <button type="submit" aria-label={`Remove ${g.title}`}
                    style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 16 }}>
                    ×
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      <AddPersonalGoalForm userId={userId} />
    </section>
  );
}
```

> Note: `g_disconnect` is a `time`-type goal. Per spec §7.2 it is fed *only* by the Disconnect widget, so the goals row renders progress as a static span (not an interactive button). The widget mutates `day.disconnect`, and `progressFor` reads from it.

- [ ] **Step 3: Create `src/components/personal/StatGrid.tsx`**

Composes the four widgets into a 2-column grid (collapses to 1 column at narrow widths). Pulls today's `DayRecord` once and threads slices into each widget.

```tsx
import { getDayOrEmpty } from "@/server/queries/days";
import { FinancialWidget } from "./FinancialWidget";
import { HealthWidget } from "./HealthWidget";
import { DisconnectWidget } from "./DisconnectWidget";
import { WinWidget } from "./WinWidget";

export async function StatGrid({ userId, iso }: { userId: string; iso: string }) {
  const day = await getDayOrEmpty(userId, iso);

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      <FinancialWidget userId={userId} iso={iso} initial={day.fin ?? { net: "", cash: "", invest: "" }} />
      <HealthWidget    userId={userId} iso={iso} initial={day.health ?? {}} />
      <DisconnectWidget userId={userId} iso={iso} initial={day.disconnect ?? 0} />
      <WinWidget       userId={userId} iso={iso} initial={day.win ?? ""} />
    </section>
  );
}
```

- [ ] **Step 4: Replace `src/components/panels/PersonalPanel.tsx`**

```tsx
import { PersonalHeadline } from "@/components/personal/PersonalHeadline";
import { Motivation } from "@/components/personal/Motivation";
import { PersonalArticles } from "@/components/personal/PersonalArticles";
import { StatGrid } from "@/components/personal/StatGrid";
import { PersonalGoals } from "@/components/personal/PersonalGoals";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function PersonalPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PersonalHeadline userId={userId} iso={iso} />
      <Motivation userId={userId} iso={iso} />
      <StatGrid userId={userId} iso={iso} />
      <PersonalArticles userId={userId} iso={iso} />
      <PersonalGoals userId={userId} iso={iso} />
    </div>
  );
}
```

- [ ] **Step 5: Run dev server, smoke test**

```bash
pnpm dev
```

Open http://localhost:3000 → Personal tab. Verify:
- Headline + motivation render from the fixture
- StatGrid shows four widgets in a row (or stack on narrow)
- **Health:** click "Slept 7h+" → icon swaps to check-circle, button background turns sage. Refresh — state persists.
- **Disconnect:** click `+15` three times → counter shows `45 min`. The Personal goals row for `g_disconnect` reflects `45/60m`. Click `+30` → counter `75 min`, goal row hits 100% (`75/60m` clamped visually). Click `-15` from `75` → `60`. From `0`, `-15` is a no-op (no transition fires).
- **Financial:** type into `Net` → "saving…" appears, then "saved · HH:MM:SS" after 500ms. Refresh — value persists.
- **Win:** type into the textarea → debounced save status appears. Refresh — text persists.
- **Articles:** add a temporary `personal.articles` entry to the fixture; click it; new tab opens; refresh; `g_per_read` count incremented. Revert the fixture change before committing.
- **Goals:** Personal defaults render (`g_money`, `g_move`, `g_disconnect`, `g_writing`, `g_per_read`). `g_disconnect` shows the time progress non-interactively; only the Disconnect widget mutates it.

- [ ] **Step 6: Run tests + typecheck + build**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/personal/AddPersonalGoalForm.tsx src/components/personal/PersonalGoals.tsx src/components/personal/StatGrid.tsx src/components/panels/PersonalPanel.tsx
git commit -m "feat(personal): goals list + stat-grid + full panel composition (replaces Phase 2 smoke)"
```

---

## Phase 4 Acceptance Criteria

Maps to spec §10 (article click tracking) and §11 (Personal stat widgets).

**Click tracking — spec §10:**
- [ ] Every article-style anchor on Business and Personal carries `data-track-cat="business"` or `data-track-cat="personal"` exactly
- [ ] Clicking a Business article-card / top-story / repo / dev-quote-source increments `state.clicks[today].business` and auto-credits `g_learn`
- [ ] Clicking a Personal article-card increments `state.clicks[today].personal` and auto-credits `g_per_read`
- [ ] Anchors all open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`); the click handler fires before navigation so the count records reliably
- [ ] No anchor uses `e.preventDefault()` — link still opens normally

**Business panel — spec §3.5 + reference HTML:**
- [ ] Headline renders in `pulse-hero` style with the orange `--accent` gradient
- [ ] Briefing renders as HTML, with `<strong>` lead phrase from the fixture
- [ ] Top stories: lead variant uses `top-card` styling (larger title, accent gradient bg); non-lead uses `article-card`; both show their badges row
- [ ] Badge classes match `b-product`, `b-model`, `b-research`, `b-policy`, `b-open`, `b-security`, `tag` etc. from the reference HTML's CSS
- [ ] Scan list renders bullets in `--accent` color
- [ ] Articles list shows badges + title + summary + source
- [ ] Dev quotes use blockquote w/ gold left border (`.quote-card`); source line is a tracked anchor when `url` is present
- [ ] Repos show `org/name`, stars (gold), weekly, lang, license, pitch
- [ ] Watchlist renders bullets

**Personal panel — spec §11:**
- [ ] Headline renders in `pulse-hero` style with gold gradient
- [ ] Motivation renders as italic serif blockquote with gold left border + author footer
- [ ] Articles list shows title + summary + source, click-tracked with `data-track-cat="personal"`
- [ ] Stat grid contains exactly four `.stat-card` widgets: Financial, Health, Disconnect, Win

**Financial widget:**
- [ ] Three text inputs: Net, Cash, Invest
- [ ] Currency strings, no math (note "Manual until connectors are wired" visible)
- [ ] 500ms debounced save via `setFinance`; "saving…" → "saved · HH:MM:SS" status line
- [ ] Reload restores all three values

**Health widget:**
- [ ] Three buttons: `Slept 7h+`, `Moved 30m`, `Ate well`
- [ ] Each toggles `day.health[k]` via `setHealthFlag`
- [ ] Inline SVG swaps between empty circle and check-circle (no emojis)
- [ ] Toggled buttons get `.on` class + sage background
- [ ] Reload restores state

**Disconnect widget:**
- [ ] Big serif counter shows `day.disconnect` minutes
- [ ] Buttons `+15 / +30 / +60` call `addTimeMinutes` with positive deltas
- [ ] Button `−15` calls `setDisconnect` with `subtractFloor(current, 15)`; clamps at 0
- [ ] `g_disconnect` goal progress (in Personal Goals list) reads directly from `day.disconnect`
- [ ] Reload restores counter

**Win widget:**
- [ ] Single textarea, italic serif (`.win-area`)
- [ ] 500ms debounced save via `setWin`
- [ ] Reload restores text

**Cross-cutting:**
- [ ] No emojis anywhere — all icons inline SVG (spec §3.4)
- [ ] No new server actions added in Phase 4 (only Phase 2's actions called)
- [ ] All unit tests pass (badge, tracked-anchor, disconnect-clamp, plus prior phases)
- [ ] `pnpm exec tsc --noEmit` succeeds
- [ ] `pnpm build` succeeds with strict TS

When all boxes are checked, Phase 4 is done. Move to Phase 5 (Goals Overview + Tasks drawer + Heatmap): write `phase-5-overview-drawer.md` immediately before starting it.

---

## Notes for the agent executing this plan

1. **No new server actions.** Phase 2 already provides every mutation we need: `setHealthFlag`, `setDisconnect`, `addTimeMinutes`, `setFinance`, `setWin`, `recordClick`, `toggleCheckGoal`, `incrementCountGoal`, `addGoal`, `removeGoal`. If at any step a mutation seems to require a new action, stop and re-read the relevant Phase 2 section — almost certainly the existing action covers it (e.g. `setDisconnect` is the absolute-write companion to `addTimeMinutes`).

2. **Disconnect's `-15` is the only place we use `setDisconnect`.** `addTimeMinutes` is increment-only by Phase 2's contract — calling it with a negative delta is undefined behavior. The clamp helper `subtractFloor` lives in `src/lib/clamp.ts` precisely so the widget's "current minus 15, floored at 0" logic is unit-tested independently of React.

3. **Briefing HTML — trust boundary.** The spec allows `<strong>` and similar inline tags. Phase 4 trusts the fixture / Phase 6 trusts the DB row. The `RawHtml` component is the single point where the raw HTML is rendered; Phase 14's hardening pass swaps its body for a DOMPurify-sanitised version when an untrusted source is added (e.g. when an LLM with web access writes the briefing). Until then, this isolated wrapper is fine — every consumer routes through it, so the swap is mechanical.

4. **TrackedAnchor is a Client Component.** It calls a Server Action prop on click. The same form-action / requestSubmit dance Phase 3 used works equally well; this approach is just simpler. The trade-off: tracking is fire-and-forget, so a slow server action could lose its credit if the user closes the tab in milliseconds. The mockup's behavior is the same (best-effort, not guaranteed).

5. **`g_disconnect` is the only `time`-type default goal.** The Personal goals list renders `time` goals as a static span — they're not interactive. Spec §7.2 says custom `time` goals get +15 min per checkbox tap; Phase 4 does not implement that path because none of the Phase 4 default goals are custom-time. Phase 5 (goals drawer with the goal-creation form including type selector) is where that interactive bump is added.

6. **Optimistic UI.** Health and Disconnect widgets update local state synchronously then call the server action inside `useTransition`. On error they revert. The Financial and Win widgets debounce instead of optimistic — there's no visible state to optimistically update, just save-status feedback. Both patterns are acceptable; pick the one that matches the user's mental model.

7. **`stat-card` styling.** Spec §3.5 specifies "small fixed-height card." Phase 4 keeps the height fluid (auto-fits content) — the reference HTML uses a fixed height that pushes content awkwardly when the value is long. If a future visual review insists on the fixed height, add `min-height: 180px` to `.stat-card` in `globals.css` and let the textarea/inputs scroll inside.

8. **Spec ambiguity — repos as a tracked card.** Spec §10 says "every article-style anchor" tracks; the spec example list explicitly includes "repos." Phase 4 wraps each repo row in a `TrackedAnchor` linking to `repo.url` with `cat="business"`. If product later wants repos to credit a different counter, that lives in Phase 8 (LLM-driven content) where richer source semantics arrive.

9. **Spec ambiguity — dev-quote source link tracking.** The reference HTML quotes have an optional `url` on the source line. Phase 4 tracks the click as `business`. If the quote has no `url`, the source is rendered as a plain `<span>` with no tracking attribute. This is consistent with the spec's "every article-style anchor" rule (only anchors track).

10. **Spec gap — Personal panel doesn't define a "headline" or "motivation" field shape in spec §11.** Spec §5 (Daily content model) does specify `personal.headline` and `personal.motivation: { text, author }`, so we follow §5. If at some point §11 is rewritten to drop them, remove the two render components — no other code depends on them.

11. **No section dot on the panel-level eyebrows.** Spec §3.4 reserves the `.sec-dot` for goal rows in the Goals Overview; the per-panel eyebrow text uses the section's accent color directly (orange for business, gold for personal). If Phase 5 wants a sec-dot here for consistency, add `.sec-dot.sec-business` / `.sec-dot.sec-personal` next to the eyebrow letters.

12. **Build order matters.** Within a task, do steps in order — the test-first steps catch typos and import drift before the larger render components compile. If a step fails, fix the underlying issue and re-run that single test/build before moving on; don't accumulate breakage.

13. **Verification matters more than speed.** Each task ends with a commit. Before committing, the test suite for that task's files should pass green. Phase 4's final task also runs the full `pnpm build` — any TypeScript error there blocks the phase, full stop.
