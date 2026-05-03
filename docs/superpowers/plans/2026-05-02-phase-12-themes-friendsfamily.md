# Phase 12 — Additional Themes + Friends & Family Stub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundle two small, orthogonal features. (A) Extend `light`/`dark` into a five-option palette (`light`, `dark`, `warm`, `forest`, `midnight`) by appending three `[data-theme="…"]` blocks to `globals.css`, replacing the Settings → Theme binary toggle with a 5-option radio, and teaching the cookie + root layout to round-trip any of the five values. (B) Drop a "Friends & Family" stub card on the Personal panel: a Server Component list of the user's last five `FriendsFamilyNote` rows plus a Client Component island for the add-form, backed by three server actions (`add`/`list`/`delete`). No reminders, no scheduling, no notifications — explicitly v1.

**Deploy target this phase:** `local` and `railway`. Both features are pure UI + DB and run identically. No env-var changes; no boot-guard adjustments. The migration runs on both providers without dialect-specific SQL.

**Architecture:**

- **Themes are token packs, nothing else.** Phase 1 established the `:root` (light) and `[data-theme="dark"]` blocks. Phase 12 *appends* three new blocks (`warm`, `forest`, `midnight`) that override the same token names. No component code changes; no Tailwind changes. If a component ever hardcoded a hex value it's a Phase 1/3/4/5 bug, not a Phase 12 concern.
- **Theme × Phase 11 mood are orthogonal axes.** Phase 11 lands `data-mood="weekend"` on `<html>`. Phase 12 layers `data-theme` on the same element so `[data-theme="forest"][data-mood="weekend"]` composes naturally. v1 ships *no* compound rules, only the five base palettes; the composition is the contract.
- **`Pref.theme` is already a string.** Phase 1's schema declared `Pref.theme String @default("light")`. Phase 12 widens the *accepted* value set without a column-shape change. Validation lives in the server action, not at the DB layer.
- **Cookie `mm_theme` is the single source of truth at boot.** The root layout reads `mm_theme` and writes `<html data-theme>`. Phase 12 widens the parser to accept any of five literals and fall back to `"light"` for anything else. The save action updates both `Pref.theme` and the cookie, so unauthenticated boots (`AUTH_MODE=none`) work the same as authenticated.
- **Friends & Family: Server Component for reads, Client island for writes.** `FriendsFamilyCard` is rendered inside the existing server-side `PersonalPanel`; it fetches the last 5 notes inline (no `useEffect` round-trip) and embeds a small `<FriendsFamilyAddForm>` Client Component. The form posts via server action then `revalidatePath("/")` refreshes the list. Delete is an inline `<form action={deleteFriendsFamilyNote}>` per chip — no client JS required.
- **`/friends` is a stub overflow page.** A thin Server Component route that reuses `listFriendsFamilyNotes({ limit: undefined })` and renders the same chip primitive in a vertical list. No pagination yet.
- **Per-user isolation is the spine.** Every server action calls `requireUserId()` first; every query filters by `userId`; every test asserts that user B cannot see or delete user A's notes.

**Tech Stack:** Next.js 15 App Router, React 19 (Server Components, Server Actions, `useFormState`), TypeScript 5, Prisma 5, Zod, Vitest, Testing Library. No new runtime dependencies.

**Dependency contracts assumed from earlier phases:**

| Phase | Symbol | Shape |
|---|---|---|
| 1 | `db` (Prisma client) | `import { db } from '@/server/db'` |
| 1 | `globals.css` `:root` + `[data-theme="dark"]` blocks | Token names: `--bg`, `--surface-solid`, `--ink`, `--ink-soft`, `--ink-muted`, `--line`, `--line-strong`, `--sage`, `--gold`, `--accent`, `--paper`, `--paper-2`, `--paper-ink`, `--paper-line`, `--shadow-sm`, `--shadow-md`, `--radius`, `--radius-sm` |
| 1 | `Pref.theme` column | `String @default("light")`, free-form |
| 4 | `PersonalPanel` Server Component | composes its children top-to-bottom; we slot in between `WinOfDayCard` and `PersonalArticlesList` |
| 7 | `requireUserId()` | `import { requireUserId } from '@/server/auth'` — throws `UnauthorizedError` if no session |
| 8 | Settings page tabs | `/settings` route exists with a tab strip including "Theme"; Phase 8 wired the binary toggle there. We replace the toggle's body, not the tab. |
| 11 | `data-mood` attribute on `<html>` | already set by the root layout based on day-of-week; we coexist on the same element |

**Out of scope this phase (write down so we don't drift):**

- Reminders, push notifications, calendar integration for F&F — v12 ships *only* the note-jotting surface.
- Weekly digest summarizing F&F notes — future state, see §Notes.
- Per-theme preview thumbnails in the radio — text labels only; round-trip preview is one click.
- Visual regression / screenshot diff for theme variants — deferred to Phase 14 (Playwright). Phase 12 ships token-application tests instead.
- Theme-aware imagery — no logos/illustrations in v1.
- Multi-line F&F notes, formatting, attachments, tags — single-line text, period.

---

## File Structure (created or mutated in this phase)

| File | Status | Purpose |
|---|---|---|
| `prisma/migrations/<ts>_add_friends_family_note/migration.sql` | Create | Adds `FriendsFamilyNote` table |
| `prisma/schema.prisma` | Mutate | Adds `FriendsFamilyNote` model + `User.friendsFamilyNotes` relation |
| `src/styles/globals.css` | Mutate (append only) | Adds `[data-theme="warm"]`, `[data-theme="forest"]`, `[data-theme="midnight"]` blocks |
| `src/lib/themes.ts` | Create | Theme literal type, `THEMES` array, `parseTheme()` Zod-backed parser, `THEME_LABELS` for the radio |
| `src/app/layout.tsx` | Mutate | Widens cookie parser to accept all 5 themes |
| `src/server/actions/theme.ts` | Mutate | Replaces binary toggle action with `setTheme(theme: ThemeName)`; updates `Pref.theme` + cookie |
| `src/components/settings/ThemeRadio.tsx` | Create | Client Component — 5-option radio group; calls `setTheme()` |
| `src/app/(dash)/settings/theme/page.tsx` | Mutate | Replaces binary toggle body with `<ThemeRadio>` |
| `src/server/actions/friends-family.ts` | Create | `addFriendsFamilyNote`, `listFriendsFamilyNotes`, `deleteFriendsFamilyNote` |
| `src/components/panels/personal/FriendsFamilyCard.tsx` | Create | Server Component — renders intro copy + last-5 list + add form |
| `src/components/panels/personal/FriendsFamilyAddForm.tsx` | Create | Client Component — name + note inputs + Save button |
| `src/components/panels/personal/FriendsFamilyChip.tsx` | Create | Server Component — single-row chip with timestamp + inline delete form |
| `src/components/panels/PersonalPanel.tsx` | Mutate | Inserts `<FriendsFamilyCard>` between Win-of-day and articles list |
| `src/app/(dash)/friends/page.tsx` | Create | "Show all" stub page — vertical list of all notes |
| `tests/unit/themes.test.ts` | Create | `parseTheme()` accepts all 5 + falls back on garbage |
| `tests/unit/theme-tokens.test.tsx` | Create | Snapshot — each theme renders correct CSS variable values |
| `tests/integration/friends-family.test.ts` | Create | Server-action integration tests, per-user isolation |
| `tests/unit/friends-family-card.test.tsx` | Create | UI test — card lists last 5, "Show all" link present |

---

## Task 1: Prisma migration — `FriendsFamilyNote` table

**Files:**
- Create: `prisma/migrations/<ts>_add_friends_family_note/migration.sql`
- Mutate: `prisma/schema.prisma`

The table is intentionally minimal: an `id`, `userId` foreign key with cascade-on-delete, `name` (the person being thought about), `note` (free-form text), and `createdAt`. No `UNIQUE` on `(userId, name)` — the spec is explicit that the user may have multiple thoughts about the same person and we honor that.

- [ ] **Step 1: Add the model to `schema.prisma`**

Append to the model section, after the existing models. Add the back-relation field on `User`.

```prisma
model FriendsFamilyNote {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String                              // the person being thought about
  note      String                              // free-form line, single text input
  createdAt DateTime @default(now())

  @@index([userId, createdAt])                  // listing the last N is the dominant query
}
```

And on the existing `User` model add:

```prisma
friendsFamilyNotes FriendsFamilyNote[]
```

The `@@index([userId, createdAt])` is shaped for the dominant query (`WHERE userId = ? ORDER BY createdAt DESC LIMIT 5`). It also supports the `/friends` stub page query (same `WHERE`, no `LIMIT`).

- [ ] **Step 2: Generate the migration**

```bash
pnpm db:migrate -- --name add_friends_family_note
pnpm db:generate
```

Expected: a new directory under `prisma/migrations/` with a `migration.sql` that creates the `FriendsFamilyNote` table and the index. No changes to other tables. `pnpm db:generate` regenerates the Prisma client with the new model.

- [ ] **Step 3: Sanity-check the SQL**

Open the new `migration.sql` and confirm:

- `CREATE TABLE "FriendsFamilyNote"` (or `CREATE TABLE FriendsFamilyNote` on SQLite — case may vary)
- `userId` column has a `REFERENCES "User"` with `ON DELETE CASCADE`
- `CREATE INDEX … ON "FriendsFamilyNote"("userId", "createdAt")`
- No `UNIQUE` constraint on `(userId, name)` — confirm we did not accidentally add one

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(db): add FriendsFamilyNote table for Phase 12 stub"
```

---

## Task 2: Theme literals, parser, and labels

**Files:**
- Create: `src/lib/themes.ts`
- Create: `tests/unit/themes.test.ts`

This task is the *contract* the rest of the phase leans on. Every place that touches theme strings — the cookie parser, the server action, the radio component, the snapshot test — imports the same `THEMES` array and `parseTheme()` function. There is no other place a theme literal is allowed to appear as a hardcoded string.

- [ ] **Step 1: Write the failing test first**

Create `tests/unit/themes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { THEMES, parseTheme, THEME_LABELS } from "@/lib/themes";

describe("themes", () => {
  it("THEMES contains exactly the five known names in display order", () => {
    expect(THEMES).toEqual(["light", "dark", "warm", "forest", "midnight"]);
  });

  it("parseTheme accepts every known theme verbatim", () => {
    for (const t of THEMES) expect(parseTheme(t)).toBe(t);
  });

  it("parseTheme falls back to 'light' for unknown, empty, or undefined input", () => {
    expect(parseTheme("solar-flare")).toBe("light");
    expect(parseTheme("")).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme(null as unknown as string)).toBe("light");
  });

  it("THEME_LABELS has a human label for each theme", () => {
    for (const t of THEMES) expect(THEME_LABELS[t]).toMatch(/\S/);
  });
});
```

Run `pnpm test tests/unit/themes.test.ts` — expect failure (`Cannot find module '@/lib/themes'`).

- [ ] **Step 2: Implement `src/lib/themes.ts`**

```ts
export const THEMES = ["light", "dark", "warm", "forest", "midnight"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  warm: "Warm",
  forest: "Forest",
  midnight: "Midnight",
};

export const THEME_DESCRIPTIONS: Record<ThemeName, string> = {
  light: "Cream paper. The default.",
  dark: "Soft dark for evenings.",
  warm: "Sepia parchment, deeper gold.",
  forest: "Deep dark green, cream serif.",
  midnight: "Pure black for OLED.",
};

const SET = new Set<string>(THEMES);

export function parseTheme(input: string | null | undefined): ThemeName {
  if (typeof input !== "string") return "light";
  return SET.has(input) ? (input as ThemeName) : "light";
}
```

Run the test again — expect it to pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/themes.ts tests/unit/themes.test.ts
git commit -m "feat(themes): add 5-theme literal type, parser, and labels"
```

---

## Task 3: Append the three new theme blocks to `globals.css`

**Files:**
- Mutate (append only): `src/styles/globals.css`

The Phase 1 file contract says "spec §3.3 design tokens, verbatim, on `:root` and `[data-theme='dark']`." Phase 12 *appends* three more blocks. Do not restructure existing blocks; do not move or rename any token. The additions go at the end of the file's color-token region, right after the `[data-theme="dark"]` block.

Each new block must define **the same token names** as `:root` (so partial overrides don't fall through to a cream paper background). If a token is unchanged between light and the new theme, redefine it anyway — explicit beats implicit, and a future developer reading the warm block in isolation should not have to mentally diff it against `:root`.

- [ ] **Step 1: Append `[data-theme="warm"]` block**

Open `src/styles/globals.css`. Find the closing `}` of the existing `[data-theme="dark"]` block. Below it (preserve a blank line for separation) add:

```css
[data-theme="warm"] {
  --bg:#efe6d2; --bg-grad-1:#f3ebd6; --bg-grad-2:#e3d6b6;
  --surface:rgba(252,246,232,0.78); --surface-solid:#fbf5e4; --surface-2:#f5edd6;
  --ink:#3a2a14; --ink-soft:#6a4f2c; --ink-muted:#9a8154;
  --line:rgba(58,42,20,0.10); --line-strong:rgba(58,42,20,0.20);

  --sage:#7a6a3a; --sage-deep:#5a4d24; --sage-soft:#e7dcb8;
  --gold:#a3741b; --gold-soft:#f1e3b6; --rose:#b86a4a;
  --accent:#9a4a14; --accent-soft:#f6e1c4;

  --paper:#f4ead8; --paper-2:#ede0c4;
  --paper-ink:#3a2e1c; --paper-line:#c9b48a;

  --shadow-sm:0 1px 2px rgba(58,42,20,.06),0 2px 8px rgba(58,42,20,.06);
  --shadow-md:0 2px 4px rgba(58,42,20,.07),0 12px 32px rgba(58,42,20,.09);
  --radius:18px; --radius-sm:10px;
}
```

Notes on warm: deeper gold (`#a3741b`) replaces `#b08d57`; `--accent` shifts to baked-clay (`#9a4a14`); `--sage` is brown-olive (`#7a6a3a`) since pure green clashes with sepia. Token contract makes any tweak a one-liner.

- [ ] **Step 2: Append `[data-theme="forest"]` block**

```css
[data-theme="forest"] {
  --bg:#0e1a13; --bg-grad-1:#13241a; --bg-grad-2:#0a150e;
  --surface:rgba(22,40,28,0.72); --surface-solid:#142318; --surface-2:#182d1f;
  --ink:#ebe4cf; --ink-soft:#b8c9b2; --ink-muted:#7a8d76;
  --line:rgba(235,228,207,0.10); --line-strong:rgba(235,228,207,0.22);

  --sage:#9bbf9c; --sage-deep:#c0d9b6; --sage-soft:rgba(155,191,156,0.18);
  --gold:#d3b070; --gold-soft:rgba(211,176,112,0.20);
  --rose:#cf8a78;
  --accent:#e07a3a; --accent-soft:rgba(224,122,58,0.16);

  --paper:#1c2a1d; --paper-2:#22341e;
  --paper-ink:#e8dcbf; --paper-line:#5a6e3e;

  --shadow-sm:0 1px 2px rgba(0,0,0,.30),0 2px 8px rgba(0,0,0,.30);
  --shadow-md:0 2px 4px rgba(0,0,0,.35),0 12px 32px rgba(0,0,0,.40);
  --radius:18px; --radius-sm:10px;
}
```

Notes on forest: cream `--ink` on deep green; `--paper-*` shifted to forest-floor brown so the Bible modal still reads as page-on-page. `--sage` brightened (vs. dark theme) for legibility against an even darker ground.

- [ ] **Step 3: Append `[data-theme="midnight"]` block**

```css
[data-theme="midnight"] {
  --bg:#000000; --bg-grad-1:#050505; --bg-grad-2:#000000;
  --surface:rgba(12,12,12,0.78); --surface-solid:#0a0a0a; --surface-2:#101010;
  --ink:#f4f1ea; --ink-soft:#bfb8a8; --ink-muted:#7a7468;
  --line:rgba(244,241,234,0.10); --line-strong:rgba(244,241,234,0.24);

  --sage:#a8c8b6; --sage-deep:#cfe3d3; --sage-soft:rgba(168,200,182,0.18);
  --gold:#e0bc7a; --gold-soft:rgba(224,188,122,0.20);
  --rose:#dc8a78;
  --accent:#fb923c; --accent-soft:rgba(251,146,60,0.16);

  --paper:#0c0c0c; --paper-2:#111111;
  --paper-ink:#ece1c2; --paper-line:#3a3528;

  --shadow-sm:0 1px 2px rgba(0,0,0,.50),0 2px 8px rgba(0,0,0,.50);
  --shadow-md:0 2px 4px rgba(0,0,0,.55),0 12px 32px rgba(0,0,0,.60);
  --radius:18px; --radius-sm:10px;
}
```

Notes on midnight: bg is true `#000` for OLED pixel-off; surface-solid is `#0a0a0a` (not pure black) so cards differentiate from ground at a glance. Accent and gold pushed brighter because everything else is colder.

- [ ] **Step 4: Body gradient sanity check**

Phase 1's `body` rule uses two radial + one linear gradient via `--bg-grad-1/2`. Boot dev and confirm forest/midnight radials still read as atmospheric rather than fighting the dark ground; if they fight, dim via per-theme `body` rules in a follow-up. v1 ships as written; ratify in QA.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(themes): append warm, forest, midnight token packs"
```

---

## Task 4: Snapshot test — every theme applies its tokens

**Files:**
- Create: `tests/unit/theme-tokens.test.tsx`

This is the cheap version of the deferred Phase 14 visual regression test. We do not screenshot pixels; we render an `<html data-theme="…">` shell, read the computed `--bg`, `--ink`, and `--accent` values via `getComputedStyle`, and snapshot the result. If a future change to `globals.css` accidentally drops a token, the snapshot fails loudly.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, beforeEach } from "vitest";
import { THEMES, type ThemeName } from "@/lib/themes";
import "@/styles/globals.css";

const TOKENS = ["--bg", "--ink", "--ink-soft", "--ink-muted", "--accent", "--gold", "--sage"];

function readTokens(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const tok of TOKENS) out[tok] = cs.getPropertyValue(tok).trim();
  return out;
}

describe("theme tokens", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  for (const theme of THEMES) {
    it(`${theme} defines all primary tokens`, () => {
      const map = readTokens(theme);
      for (const tok of TOKENS) {
        expect(map[tok], `${theme} → ${tok}`).toMatch(/\S/);
      }
      expect(map).toMatchSnapshot();
    });
  }

  it("light and dark differ in --bg", () => {
    expect(readTokens("light")["--bg"]).not.toBe(readTokens("dark")["--bg"]);
  });

  it("midnight --bg is solid black", () => {
    expect(readTokens("midnight")["--bg"]).toBe("#000000");
  });
});
```

> **Caveat:** `jsdom` may not resolve CSS variables fully. If `getComputedStyle().getPropertyValue('--bg')` returns empty, fall back to reading `globals.css` as text and extracting blocks with `/--([\w-]+)\s*:\s*([^;]+);/g`. The assertion ("every theme block defines every token") is satisfied either way.

- [ ] **Step 2: Run, expect either a green pass or the jsdom caveat**

```bash
pnpm test tests/unit/theme-tokens.test.tsx -u
```

The `-u` updates snapshots on first run. Subsequent runs without `-u` are the regression guard.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/theme-tokens.test.tsx tests/__snapshots__
git commit -m "test(themes): snapshot all 5 theme token packs"
```

---

## Task 5: `setTheme` server action + cookie + layout parser widening

**Files:**
- Mutate: `src/server/actions/theme.ts` (existing — Phase 8 created it for the binary toggle)
- Mutate: `src/app/layout.tsx` (existing — Phase 1 read the cookie)

The Phase 8 binary toggle action looked something like `toggleTheme()` taking no args and flipping the cookie + `Pref.theme` between two values. Phase 12 replaces it with a parameterized `setTheme(theme)` that accepts any of the five literals. Callers (the new radio component) hand a string in; the action validates with `parseTheme()`, persists to `Pref.theme`, and re-writes `mm_theme`.

- [ ] **Step 1: Replace the action body**

Open `src/server/actions/theme.ts`. Replace the toggle export with:

```ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth";
import { parseTheme, type ThemeName } from "@/lib/themes";

export async function setTheme(input: string) {
  const userId = await requireUserId();
  const theme: ThemeName = parseTheme(input);

  await db.pref.upsert({
    where: { userId },
    update: { theme },
    create: { userId, theme },
  });

  (await cookies()).set("mm_theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/");
  revalidatePath("/settings/theme");
  return { theme };
}
```

> Note: `cookies()` in Next 15 is async; the `await` is required. The `requireUserId()` import points to Phase 7's contract; in `AUTH_MODE=none` it resolves to `local-default`.

- [ ] **Step 2: Widen the layout cookie parser**

Open `src/app/layout.tsx`. Phase 1 had:

```ts
const theme = (await cookies()).get("mm_theme")?.value === "dark" ? "dark" : "light";
```

Replace with:

```ts
import { parseTheme } from "@/lib/themes";
…
const theme = parseTheme((await cookies()).get("mm_theme")?.value);
```

The `<html data-theme={theme}>` element now round-trips any of the five literals.

- [ ] **Step 3: Update any other call sites**

Grep for `toggleTheme` and `mm_theme` across `src/`:

```bash
git grep -n "toggleTheme\|mm_theme" -- src/
```

Replace any `toggleTheme()` invocations with `setTheme(targetTheme)`. The only legitimate writer of `mm_theme` is the server action; if a client component is writing it directly (Phase 1's bootstrap `ThemeToggle.tsx` did), audit and decide whether it's still needed — for the Settings radio, no; the action handles it.

- [ ] **Step 4: Smoke run**

```bash
pnpm dev
# manually: open the app, observe `<html data-theme="…">` reflects whatever cookie value is set
# manually: set cookie to garbage ("mm_theme=foo"), reload, verify it falls back to "light"
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/theme.ts src/app/layout.tsx
git commit -m "feat(themes): setTheme server action accepts all 5 literals; layout uses parseTheme"
```

---

## Task 6: Replace the binary toggle in Settings → Theme with a 5-option radio

**Files:**
- Create: `src/components/settings/ThemeRadio.tsx`
- Mutate: `src/app/(dash)/settings/theme/page.tsx`

The Settings page is already a Server Component with a tab strip (Phase 8). The Theme tab's body had a single toggle; we swap it for a Client Component that wraps a fieldset of five radios. Selecting a radio fires `setTheme()` immediately — no Save button — because the action is fast and idempotent and the live preview is the whole point.

- [ ] **Step 1: Implement the Client Component**

```tsx
"use client";
import { useTransition } from "react";
import { setTheme } from "@/server/actions/theme";
import { THEMES, THEME_LABELS, THEME_DESCRIPTIONS, type ThemeName } from "@/lib/themes";

export function ThemeRadio({ initial }: { initial: ThemeName }) {
  const [isPending, startTransition] = useTransition();

  const choose = (theme: ThemeName) => {
    // Optimistic: repaint immediately, then persist.
    document.documentElement.dataset.theme = theme;
    startTransition(async () => { await setTheme(theme); });
  };

  return (
    <fieldset style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, background: "var(--surface-solid)" }}>
      <legend className="serif" style={{ fontSize: "1.05rem", fontWeight: 500, padding: "0 8px", color: "var(--ink)" }}>Theme</legend>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {THEMES.map((t) => (
          <label key={t} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            border: `1px solid ${initial === t ? "var(--sage)" : "transparent"}`,
            background: initial === t ? "var(--sage-soft)" : "transparent",
          }}>
            <input type="radio" name="mm_theme" value={t}
              defaultChecked={initial === t}
              onChange={() => choose(t)}
              disabled={isPending}
              aria-describedby={`theme-${t}-desc`} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>{THEME_LABELS[t]}</span>
              <span id={`theme-${t}-desc`} style={{ fontSize: 12, color: "var(--ink-muted)" }}>{THEME_DESCRIPTIONS[t]}</span>
            </div>
          </label>
        ))}
      </div>
      {isPending ? <p style={{ marginTop: 12, fontSize: 12, color: "var(--ink-muted)" }}>Saving…</p> : null}
    </fieldset>
  );
}
```

`defaultChecked` (not `checked`) — uncontrolled, sidesteps controlled/uncontrolled flicker when the action returns.

- [ ] **Step 2: Mutate the Settings → Theme page**

Open `src/app/(dash)/settings/theme/page.tsx`. The page is a Server Component; load the user's pref and pass `theme` into the radio.

```tsx
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth";
import { parseTheme } from "@/lib/themes";
import { ThemeRadio } from "@/components/settings/ThemeRadio";

export default async function ThemeSettingsPage() {
  const userId = await requireUserId();
  const pref = await db.pref.findUnique({ where: { userId } });
  const initial = parseTheme(pref?.theme);
  return (
    <div style={{ maxWidth: 540 }}>
      <p style={{ color: "var(--ink-muted)", marginBottom: 16 }}>
        Pick a palette. Your choice is saved immediately.
      </p>
      <ThemeRadio initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
pnpm dev
```

Steps:
1. Open `/settings/theme`. Observe five radios; the current theme is highlighted with a sage border.
2. Click each in turn — the page repaints to the new palette without a full reload.
3. Reload the page — the highlighted radio matches the new theme.
4. Inspect the `mm_theme` cookie via DevTools → Application — value matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/ThemeRadio.tsx src/app/(dash)/settings/theme/page.tsx
git commit -m "feat(themes): replace binary toggle with 5-option radio in settings"
```

---

## Task 7: Friends & Family server actions (TDD)

**Files:**
- Create: `src/server/actions/friends-family.ts`
- Create: `tests/integration/friends-family.test.ts`

This is the test-driven core of the F&F feature. The integration tests use a per-test SQLite file and call the server actions directly (bypassing the HTTP transport, which Vitest cannot exercise without a Next.js test runner). Per-user isolation is the headline assertion; every test creates two users and proves the second cannot see the first's data.

- [ ] **Step 1: Write the failing tests first**

Create `tests/integration/friends-family.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { db } from "@/server/db";
import {
  addFriendsFamilyNote,
  listFriendsFamilyNotes,
  deleteFriendsFamilyNote,
} from "@/server/actions/friends-family";
import { setRequestUserId } from "@/server/auth"; // Phase 7 test helper that pins the request user

const ALICE = "u_alice";
const BOB   = "u_bob";

beforeEach(async () => {
  await db.friendsFamilyNote.deleteMany({});
  await db.user.deleteMany({ where: { id: { in: [ALICE, BOB] } } });
  await db.user.create({ data: { id: ALICE, name: "Alice" } });
  await db.user.create({ data: { id: BOB, name: "Bob" } });
});

afterAll(async () => {
  await db.$disconnect();
});

describe("friends-family server actions", () => {
  it("adds, lists, and deletes a single user's notes", async () => {
    setRequestUserId(ALICE);
    const a = await addFriendsFamilyNote({ name: "Mom", note: "Send the photo from the garden." });
    expect(a.id).toMatch(/.+/);

    const list = await listFriendsFamilyNotes({ limit: 5 });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Mom", note: "Send the photo from the garden." });

    await deleteFriendsFamilyNote({ id: a.id });
    expect(await listFriendsFamilyNotes({ limit: 5 })).toEqual([]);
  });

  it("orders by createdAt DESC, capped at limit", async () => {
    setRequestUserId(ALICE);
    for (let i = 0; i < 7; i++) {
      await addFriendsFamilyNote({ name: `Person ${i}`, note: `note ${i}` });
    }
    const list = await listFriendsFamilyNotes({ limit: 5 });
    expect(list).toHaveLength(5);
    expect(list[0].name).toBe("Person 6");
    expect(list[4].name).toBe("Person 2");
  });

  it("allows multiple notes about the same person (no UNIQUE)", async () => {
    setRequestUserId(ALICE);
    await addFriendsFamilyNote({ name: "Dad", note: "Birthday in May" });
    await addFriendsFamilyNote({ name: "Dad", note: "Loves blueberry jam" });
    expect(await listFriendsFamilyNotes({ limit: 5 })).toHaveLength(2);
  });

  it("isolates Alice's notes from Bob", async () => {
    setRequestUserId(ALICE);
    const a = await addFriendsFamilyNote({ name: "Mom", note: "Garden photo" });

    setRequestUserId(BOB);
    expect(await listFriendsFamilyNotes({ limit: 5 })).toEqual([]);
    await expect(deleteFriendsFamilyNote({ id: a.id })).rejects.toThrow();

    setRequestUserId(ALICE);
    expect(await listFriendsFamilyNotes({ limit: 5 })).toHaveLength(1);
  });

  it("rejects empty name and empty note", async () => {
    setRequestUserId(ALICE);
    await expect(addFriendsFamilyNote({ name: "", note: "x" })).rejects.toThrow();
    await expect(addFriendsFamilyNote({ name: "x", note: "" })).rejects.toThrow();
    await expect(addFriendsFamilyNote({ name: "   ", note: "x" })).rejects.toThrow();
  });

  it("trims whitespace on save", async () => {
    setRequestUserId(ALICE);
    const note = await addFriendsFamilyNote({ name: "  Mom  ", note: "  hi  " });
    const list = await listFriendsFamilyNotes({ limit: 5 });
    expect(list[0]).toMatchObject({ name: "Mom", note: "hi", id: note.id });
  });

  it("listFriendsFamilyNotes without limit returns all entries", async () => {
    setRequestUserId(ALICE);
    for (let i = 0; i < 12; i++) {
      await addFriendsFamilyNote({ name: `n${i}`, note: "x" });
    }
    const list = await listFriendsFamilyNotes({});
    expect(list).toHaveLength(12);
  });
});
```

> **Note:** `setRequestUserId` is Phase 7's test helper. If absent, add a minimal one in `src/server/auth.ts` gated on `NODE_ENV === 'test'`.

Run `pnpm test tests/integration/friends-family.test.ts` — expect failure (`Cannot find module '@/server/actions/friends-family'`).

- [ ] **Step 2: Implement the actions**

Create `src/server/actions/friends-family.ts`:

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth";

const AddInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  note: z.string().trim().min(1, "Note is required").max(500),
});

const ListInput = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

const DeleteInput = z.object({
  id: z.string().min(1),
});

export async function addFriendsFamilyNote(input: { name: string; note: string }) {
  const userId = await requireUserId();
  const { name, note } = AddInput.parse(input);
  const row = await db.friendsFamilyNote.create({
    data: { userId, name, note },
    select: { id: true, name: true, note: true, createdAt: true },
  });
  revalidatePath("/");
  revalidatePath("/friends");
  return row;
}

export async function listFriendsFamilyNotes(input: { limit?: number }) {
  const userId = await requireUserId();
  const { limit } = ListInput.parse(input);
  return db.friendsFamilyNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, note: true, createdAt: true },
  });
}

export async function deleteFriendsFamilyNote(input: { id: string }) {
  const userId = await requireUserId();
  const { id } = DeleteInput.parse(input);
  // The where clause includes userId — Prisma will throw P2025 ("not found")
  // if the note belongs to another user. That is the isolation boundary.
  await db.friendsFamilyNote.delete({ where: { id, userId } });
  revalidatePath("/");
  revalidatePath("/friends");
  return { ok: true as const };
}
```

> **Note:** Prisma's `delete` requires a unique selector and would require an `@@unique([id, userId])`. Instead, replace the `delete` body with `deleteMany` and assert the count — cross-user deletes then throw without an extra round-trip:
>
> ```ts
> const result = await db.friendsFamilyNote.deleteMany({ where: { id, userId } });
> if (result.count !== 1) throw new Error("Not found");
> ```

Run the tests — expect green.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/friends-family.ts tests/integration/friends-family.test.ts
git commit -m "feat(friends-family): server actions with per-user isolation"
```

---

## Task 8: Friends & Family card UI on Personal panel

**Files:**
- Create: `src/components/panels/personal/FriendsFamilyCard.tsx`
- Create: `src/components/panels/personal/FriendsFamilyAddForm.tsx`
- Create: `src/components/panels/personal/FriendsFamilyChip.tsx`
- Mutate: `src/components/panels/PersonalPanel.tsx`
- Create: `tests/unit/friends-family-card.test.tsx`

Three regions: (1) header with serif title + the spec's stub paragraph, plus a "Show all" link to `/friends` on the right; (2) last-5 chips, each `Name · note · 3d ago` with inline ✕ delete; empty state "Nothing saved yet — jot a thought below"; (3) add form — small name input, wide note input, Save button; resets on submit, revalidate refreshes the list.

- [ ] **Step 1: `FriendsFamilyChip.tsx` (Server Component)**

```tsx
import { deleteFriendsFamilyNote } from "@/server/actions/friends-family";

function ago(d: Date): string {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function FriendsFamilyChip({
  id,
  name,
  note,
  createdAt,
}: {
  id: string;
  name: string;
  note: string;
  createdAt: Date;
}) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 12px",
      background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 999,
      fontSize: 13, color: "var(--ink-soft)", maxWidth: 320,
    }} title={note}>
      <strong style={{ color: "var(--ink)" }}>{name}</strong>
      <span style={{ color: "var(--ink-muted)" }}>·</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</span>
      <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>{ago(createdAt)}</span>
      <form action={async () => { "use server"; await deleteFriendsFamilyNote({ id }); }}>
        <button type="submit" aria-label={`Delete note about ${name}`}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-muted)", padding: 0, marginLeft: 2, display: "inline-flex" }}>
          <svg className="ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `FriendsFamilyAddForm.tsx` (Client Component)**

```tsx
"use client";
import { useRef, useTransition } from "react";
import { addFriendsFamilyNote } from "@/server/actions/friends-family";

export function FriendsFamilyAddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form ref={formRef}
      action={(fd) => {
        const name = String(fd.get("name") ?? "");
        const note = String(fd.get("note") ?? "");
        if (!name.trim() || !note.trim()) return;
        startTransition(async () => {
          await addFriendsFamilyNote({ name, note });
          formRef.current?.reset();
        });
      }}
      style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8, marginTop: 12 }}>
      <input name="name" placeholder="Name" required maxLength={120}
        style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-strong)", background: "var(--surface-solid)", color: "var(--ink)" }} />
      <input name="note" placeholder="A thought worth keeping" required maxLength={500}
        style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-strong)", background: "var(--surface-solid)", color: "var(--ink)" }} />
      <button type="submit" disabled={isPending}
        style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", background: "var(--sage)", color: "var(--surface-solid)", border: "none", fontWeight: 500, cursor: "pointer" }}>
        {isPending ? "Saving…" : "Save a thought"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create `FriendsFamilyCard.tsx` (Server Component)**

```tsx
import Link from "next/link";
import { listFriendsFamilyNotes } from "@/server/actions/friends-family";
import { FriendsFamilyChip } from "./FriendsFamilyChip";
import { FriendsFamilyAddForm } from "./FriendsFamilyAddForm";

const STUB_COPY =
  "Coming soon — gentle reminders to reach out to people who matter, gift ideas, " +
  "anniversaries you want to remember without spending the day on it.";

export async function FriendsFamilyCard() {
  const notes = await listFriendsFamilyNotes({ limit: 5 });

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>FRIENDS & FAMILY</div>
          <h3 className="serif" style={{ fontSize: "1.25rem", fontWeight: 500, margin: "4px 0 0" }}>People worth thinking about</h3>
        </div>
        <Link href="/friends" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>Show all →</Link>
      </header>
      <p style={{ color: "var(--ink-muted)", marginTop: 8, lineHeight: 1.6 }}>{STUB_COPY}</p>
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {notes.length === 0 ? (
          <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>Nothing saved yet — jot a thought below.</span>
        ) : (
          notes.map((n) => <FriendsFamilyChip key={n.id} id={n.id} name={n.name} note={n.note} createdAt={n.createdAt} />)
        )}
      </div>
      <FriendsFamilyAddForm />
    </section>
  );
}
```

- [ ] **Step 4: Slot the card into `PersonalPanel.tsx`**

Open `src/components/panels/PersonalPanel.tsx`. The Phase 4 layout is roughly:

```
<section>
  <PersonalHeadline />
  <MotivationCard />
  <StatGrid /> { Financial, Health, Disconnect, Win }
  <PersonalArticles />
</section>
```

Insert `<FriendsFamilyCard />` between the `Win` card and `PersonalArticles`. The exact split depends on Phase 4's component decomposition; the spec says "between Win-of-day and the Personal articles list" — match that placement. If `WinOfDayCard` is part of the `StatGrid` rather than a sibling, render `<FriendsFamilyCard />` immediately after `<StatGrid />` and before `<PersonalArticles />`.

```tsx
import { FriendsFamilyCard } from "./personal/FriendsFamilyCard";
…
<StatGrid />
<FriendsFamilyCard />
<PersonalArticles />
```

`FriendsFamilyCard` is `async`, so the parent `PersonalPanel` must already be a Server Component (it is, per Phase 4's contract). No suspense boundary is required for a small SQL select.

- [ ] **Step 5: UI test — last 5 + Show all link**

Create `tests/unit/friends-family-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import * as actions from "@/server/actions/friends-family";

// Mock the server action; we only need the list shape for this UI test.
vi.mock("@/server/actions/friends-family", () => ({
  listFriendsFamilyNotes: vi.fn(),
  addFriendsFamilyNote: vi.fn(),
  deleteFriendsFamilyNote: vi.fn(),
}));

import { FriendsFamilyCard } from "@/components/panels/personal/FriendsFamilyCard";

function fakeNote(name: string, daysAgo = 0) {
  return {
    id: `id_${name}`,
    name,
    note: `note about ${name}`,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000),
  };
}

describe("FriendsFamilyCard", () => {
  it("renders the last 5 notes when 7 are returned", async () => {
    (actions.listFriendsFamilyNotes as ReturnType<typeof vi.fn>).mockResolvedValue([
      fakeNote("Mom", 0),
      fakeNote("Dad", 1),
      fakeNote("Sis", 2),
      fakeNote("Bro", 3),
      fakeNote("Friend", 4),
    ]);
    const ui = await FriendsFamilyCard();
    const { getByText, getByRole } = render(ui);
    for (const n of ["Mom", "Dad", "Sis", "Bro", "Friend"]) {
      expect(getByText(n)).toBeInTheDocument();
    }
    const link = getByRole("link", { name: /show all/i });
    expect(link.getAttribute("href")).toBe("/friends");
  });

  it("shows empty-state copy when there are no notes", async () => {
    (actions.listFriendsFamilyNotes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ui = await FriendsFamilyCard();
    const { getByText } = render(ui);
    expect(getByText(/nothing saved yet/i)).toBeInTheDocument();
  });
});
```

> **Caveat:** rendering an `async` Server Component from Vitest can be brittle. If `render(await Cmp())` fails in this repo's setup, extract a synchronous `<FriendsFamilyCardView notes={…} />` presentation component and unit-test that; the data-fetching wrapper stays untested at this level.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/personal/ src/components/panels/PersonalPanel.tsx tests/unit/friends-family-card.test.tsx
git commit -m "feat(friends-family): card on Personal panel with last-5 chips + add form"
```

---

## Task 9: `/friends` overflow page

**Files:**
- Create: `src/app/(dash)/friends/page.tsx`

The "Show all" link points here. The page reuses `listFriendsFamilyNotes()` with no limit and renders the same chip primitive in a vertical list. Plain Server Component, no client islands.

- [ ] **Step 1: Implement the route**

```tsx
import Link from "next/link";
import { listFriendsFamilyNotes } from "@/server/actions/friends-family";
import { FriendsFamilyChip } from "@/components/panels/personal/FriendsFamilyChip";

export default async function FriendsPage() {
  const notes = await listFriendsFamilyNotes({});
  return (
    <main className="app">
      <header style={{ marginBottom: 24 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>← Back to dashboard</Link>
        <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, marginTop: 8 }}>Friends & Family</h1>
        <p style={{ color: "var(--ink-muted)", marginTop: 6 }}>Everything you've jotted, newest first.</p>
      </header>
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.length === 0 ? (
          <p style={{ color: "var(--ink-muted)" }}>You haven't saved any notes yet.</p>
        ) : (
          notes.map((n) => <FriendsFamilyChip key={n.id} id={n.id} name={n.name} note={n.note} createdAt={n.createdAt} />)
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Manual verification**

```bash
pnpm dev
```

1. Add three notes from the Personal panel.
2. Click "Show all". Verify all three render in newest-first order.
3. Delete one from the overflow page. Verify the chip disappears (revalidate hits the path).
4. Click "Back to dashboard" — returns to `/` with the card's chip count one less.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dash\)/friends/
git commit -m "feat(friends-family): /friends overflow page lists every note"
```

---

## Task 10: Final verification + commit

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: every test from Phases 1 through 11 still passes, plus the four new test files (`themes.test.ts`, `theme-tokens.test.tsx`, `friends-family.test.ts`, `friends-family-card.test.tsx`).

- [ ] **Step 2: Production build**

```bash
pnpm build
```

Expected: clean build, no type errors, no unused-variable warnings on the new files.

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
```

1. Open `/settings/theme`. Cycle through all five themes; observe each repaints the dashboard correctly.
2. Set theme to `forest`. Reload. Theme persists.
3. Open the Personal panel. Add two notes. Refresh — both still listed (newest first).
4. Click "Show all" → `/friends`. Delete one note. Return to `/`. Card shows the remaining note.
5. Open DevTools. Confirm `<html data-theme="forest">` and (if Phase 11 landed) `<html data-theme="forest" data-mood="weekend">` on Saturday.

- [ ] **Step 4: Commit nothing further; just close the loop**

```bash
git status
```

Expected: clean working tree.

---

## Phase 12 Acceptance Criteria

### Theme variants

- [ ] `globals.css` contains, in order: `:root`, `[data-theme="dark"]`, `[data-theme="warm"]`, `[data-theme="forest"]`, `[data-theme="midnight"]` blocks
- [ ] Each new block defines every token name that `:root` defines (no token is allowed to fall through)
- [ ] `parseTheme()` accepts the five literals and falls back to `"light"` for anything else
- [ ] Setting theme to any of the five from `/settings/theme` persists to `Pref.theme`, writes the `mm_theme` cookie, and repaints the dashboard without a full reload
- [ ] Reloading the page reflects the saved theme
- [ ] An invalid `mm_theme` cookie value (e.g. `mm_theme=garbage`) does not crash the layout — it falls back to `"light"`
- [ ] `data-theme` and `data-mood` (Phase 11) coexist on the same `<html>` element without one clobbering the other
- [ ] `tests/unit/themes.test.ts` and `tests/unit/theme-tokens.test.tsx` pass
- [ ] No emoji in any of the new files; all icons are inline SVG

### Friends & Family stub

- [ ] `FriendsFamilyNote` table exists with columns `id`, `userId`, `name`, `note`, `createdAt`
- [ ] No `UNIQUE` constraint on `(userId, name)` — the user may have multiple notes about the same person
- [ ] `(userId, createdAt)` index exists
- [ ] `addFriendsFamilyNote` validates with Zod, trims whitespace, rejects empty inputs after trim
- [ ] `listFriendsFamilyNotes` returns rows in `createdAt DESC` order, capped at `limit` when provided
- [ ] `deleteFriendsFamilyNote` only succeeds for notes owned by the calling user; cross-user delete throws
- [ ] All three actions resolve user via `requireUserId()` (no `userId` parameter accepted from client)
- [ ] Personal panel renders the `FriendsFamilyCard` between Win-of-day and the articles list
- [ ] Card displays the spec's exact stub copy paragraph
- [ ] Card lists the last 5 notes as chips with timestamp; empty state shows "Nothing saved yet" copy
- [ ] "Show all" link points to `/friends`
- [ ] `/friends` page lists every note the user has ever saved, newest first
- [ ] Add form posts via server action; on success the input clears and the chip list refreshes via `revalidatePath`
- [ ] Each chip has an inline delete button (✕) that fires `deleteFriendsFamilyNote` via a server-side form action
- [ ] No emoji; the ✕ is an inline SVG path
- [ ] Integration tests prove per-user isolation (Bob cannot see or delete Alice's notes)
- [ ] UI test verifies the last-5 and Show-all link rendering

### Build & global

- [ ] `pnpm test` passes (all phases)
- [ ] `pnpm build` succeeds with strict TS, no `any`
- [ ] No new runtime dependencies added to `package.json`
- [ ] `pnpm db:migrate` applies cleanly on a fresh DB; `pnpm db:reset` recreates the schema including `FriendsFamilyNote`

When all boxes are checked, Phase 12 is done. Move to Phase 13 (Railway deploy): write `phase-13-railway.md` immediately before starting it.

---

## Notes

### Future state for Friends & Family v2

Phase 12 is deliberately a stub. The `(name, note, createdAt)` shape is intentionally minimal so v2 can extend without migration pain. Concrete hooks:

- **Weekly digest.** A server action that calls the LLM (Phase 8 adapters) with the last 7 days of notes plus the user's `Pref.faith`/`Pref.interests`, returning a "this week's people" summary on the Mindfulness panel as a Sunday module. New table `FriendsFamilyDigest(id, userId, isoWeekStart, body, createdAt)` — one row per user per week.
- **Calendar integration for birthdays/anniversaries.** Add `kind` (`thought | birthday | anniversary`) and `dateHint` (`MM-DD` for recurring, optional) columns. Phase 10's scheduler picks up rows whose `dateHint` matches today's `MM-DD` and writes a "Today: it's Mom's birthday" line into `DailyContent`.
- **Reach-out reminders.** A `lastContactedAt` timestamp plus a soft Sunday digest line: "You mentioned Lenny three weeks ago. Thinking of him?" Prompt only, no automated message.
- **Gift-idea threads.** Multiple notes about the same person already work in v1. v2 groups them by name (toggle: "by person" / "by recency") and surfaces clusters in the digest.
- **Privacy escape hatch.** A per-row `private: boolean`; private notes are excluded from any LLM prompt. Default `true` once any LLM call touches F&F data; v1 ships no such call, so the column doesn't exist yet.

None of the above touch Phase 12's surface. v1 ships the smallest thing that lets the user start jotting now, so the data is ready when v2 lands.

### On the warm theme's color choices

`[data-theme="warm"]` remaps `--sage` to a brown-olive (`#7a6a3a`) — a Mindfulness section dot will read more "olive" than "green" on parchment. Sepia paper makes saturated greens look digital; we accept the drift and ship. If a complaint surfaces, a Phase 12.1 follow-up adds a `--sage-on-paper` token and binds the dot to it conditionally.

### Composition with Phase 11 weekend mode

Phase 11 owns `data-mood`; Phase 12 owns `data-theme`. They coexist on `<html>` and compose orthogonally. The Personal panel (and therefore F&F) is unaffected by weekend mode. If a future weekend variant wants to *promote* F&F (e.g. show 8 chips instead of 5 to encourage reach-out), the card's `limit` prop is already shaped for that — do it in Phase 11's render-variant logic, not here. Both phases mutate `src/app/layout.tsx` (one cookie read each); merge conflict resolves in five minutes.

### On v2's voice

The user's original framing — "opportunities to do something nice for friends and family they are wanting to think about but not right away" — is gentle, low-pressure, ambient. Whatever v2 builds on this stub *must* preserve that voice. No streaks for F&F. No "you haven't reached out in N days" guilt counters. No badges. The spec's tone (§3.1: warm, calm, bookish) governs this feature more than any other because it's the one most prone to being weaponized into a productivity guilt machine. The stub copy ("without spending the day on it") is the constraint — every v2 feature checks against it.
