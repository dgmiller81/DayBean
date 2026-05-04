# 08 · Tasks & GitHub Issues

Every task below is a self-contained unit of work that can become one GitHub issue
and one PR. Read [07 · Sprint Plan](07-sprint-plan.md) first for the rules of
engagement (file ownership, branch naming, integration cadence).

> **Convention:** when a path is `prefix/*` it covers all files under that prefix
> *that don't appear under another task's OWNS list in the same sprint*. When in
> doubt, list the file explicitly.

---

# Sprint 0 · Foundation & Setup

> **Sprint goal:** Bootstrap the DayBean fork with every schema change, type
> contract, and infra scaffold any later sprint will need. After S0, downstream
> sprints never touch `prisma/schema.prisma` again until S5.
>
> **Sequential.** One agent runs S0 end-to-end. Tasks within S0 should also be
> done in numeric order — S0-T02 depends on S0-T01, etc.

## [S0-T01] Fork the repo to DayBean and bootstrap

**Track:** infra
**OWNS:**
- `package.json`
- `README.md`
- `.github/workflows/*` (if any)

**READS:** entire repo

**DEPENDS ON:** —

**Description:**
Fork the existing `thedailymind` GitHub repo to a new `DayBean` repository under
the same owner. Update `package.json` (`name: "daybean"`, version reset to `0.1.0`).
Update root `README.md` to reflect the DayBean rename and link to `docs/daybeans/`.
Configure GitHub Actions for type-checking + Prisma generate on every PR.

**Acceptance:**
- [ ] `DayBean` repo exists on GitHub with full history of `thedailymind`
- [ ] `package.json#name` is `daybean`
- [ ] Root `README.md` references DayBean and links to `docs/daybeans/`
- [ ] `npm run build` succeeds on a clean clone
- [ ] CI workflow runs `npx tsc --noEmit` and `npx prisma validate` on every PR
- [ ] Branch protection enabled on `main` (require PR review, require CI green)

**Out of scope:** any visible UI changes (S1).

---

## [S0-T02] Consolidated Prisma migration — every column DayBean needs

**Track:** server
**OWNS:**
- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_daybean_foundation/migration.sql` (auto-generated)

**READS:** `docs/daybeans/06-implementation-plan.md` §6.4–§6.7

**DEPENDS ON:** S0-T01

**Description:**
Add every model + column referenced by any sprint to the schema in one migration.
This is the only schema migration until S5. Specifically:

```prisma
model Pref {
  // existing fields…
  hobbies         String?  // JSON array
  livesWith       String?  // JSON array
  financeMode     Boolean  @default(false)
  netWorth        String?
  cashOnHand      String?
  savingsTarget   String?
  prebrewHour     Int      @default(17)
  prebrewEnabled  Boolean  @default(true)
}

model Goal {
  // existing fields…
  category String?  // 'family' | 'finance' | 'hobby' | 'fitness' | 'faith' | 'work'
}

model DailyContent {
  // existing fields…
  backupContentJson  String?
  primarySource      String?
  backupSource       String?
  primaryAt          DateTime?
  backupAt           DateTime?
}

model RefreshLog {
  // existing fields…
  phase String?  // 'morning' | 'evening-prebrew' | 'cold-start' | 'manual'
}

model User {
  // existing fields…
  role String @default("user")  // 'user' | 'admin'
}

model JournalTheme {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme     String
  weight    Float    @default(1)
  muted     Boolean  @default(false)
  lastSeen  DateTime @default(now())
  @@unique([userId, theme])
  @@index([userId, weight])
}

model SuggestedGoal {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String
  cadence         String
  category        String?
  sourceJournalId String?
  status          String   @default("pending")
  createdAt       DateTime @default(now())
  @@index([userId, status])
}

model Partner {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  type         String
  city         String?
  state        String?
  logoUrl      String?
  blurb        String?
  active       Boolean  @default(true)
  weeklyBudget Int      @default(0)
  createdAt    DateTime @default(now())
  vouchers     Voucher[]
}

model Voucher {
  id         String    @id @default(cuid())
  partnerId  String
  partner    Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  code       String    @unique
  issued     Boolean   @default(false)
  redeemedAt DateTime?
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  expiresAt  DateTime
  weekOf     DateTime
  @@index([partnerId, issued, expiresAt])
}

model RewardClaim {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  voucherId    String
  voucher      Voucher  @relation(fields: [voucherId], references: [id])
  streakLength Int
  claimedAt    DateTime @default(now())
  @@index([userId, claimedAt])
}
```

**Acceptance:**
- [ ] Single migration named `daybean_foundation` adds all of the above
- [ ] `npx prisma migrate dev` runs cleanly on the existing `dev.db`
- [ ] `npx prisma generate` produces a typed client with all new models
- [ ] Existing rows are preserved (no destructive changes)
- [ ] All existing tests still pass

**Out of scope:** writing server actions or queries against the new tables (later sprints).

---

## [S0-T03] Type contracts in `src/types/`

**Track:** server
**OWNS:**
- `src/types/journal-theme.ts` (new)
- `src/types/suggested-goal.ts` (new)
- `src/types/partner.ts` (new)
- `src/types/voucher.ts` (new)
- `src/types/refresh.ts` (new)
- `src/types/slow-sip.ts` (new)
- `src/types/onboarding.ts` (new)

**READS:** `prisma/schema.prisma`, `docs/daybeans/04-product-requirements.md`

**DEPENDS ON:** S0-T02

**Description:**
Define every type later sprints will produce/consume, so UI work and server work can
proceed in parallel against shared interfaces. These types are the contract.

Each file exports a small set of types and a `Zod` schema where boundary validation
is needed. No implementation — types only.

Example for `src/types/suggested-goal.ts`:

```ts
import { z } from "zod";

export const SuggestedGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  cadence: z.enum(["daily", "weekly"]),
  category: z.string().nullable(),
  sourceJournalId: z.string().nullable(),
  status: z.enum(["pending", "accepted", "dismissed"]),
  createdAt: z.string(), // ISO
});

export type SuggestedGoal = z.infer<typeof SuggestedGoalSchema>;
```

**Acceptance:**
- [ ] Each new file exports clear types + Zod schemas
- [ ] No implementation in `src/types/*` files (types only)
- [ ] `npx tsc --noEmit` clean
- [ ] At least one type per future server action is defined

**Out of scope:** server actions, queries, UI.

---

## [S0-T04] Brand color tokens added to globals.css (foundation only)

**Track:** ui
**OWNS:**
- `src/styles/globals.css` (only the `:root` and theme blocks; do not touch component-level rules)

**READS:** `docs/daybeans/02-visual-identity.md` §2.1

**DEPENDS ON:** S0-T01

**Description:**
Add the new brand-color tokens (`--espresso`, `--espresso-deep`, `--crema`, `--crema-deep`,
`--crema-soft`) to the `:root` block and to every existing `[data-theme="..."]` block.
Do **not** apply them anywhere yet — that's S1's job. This task only registers the
tokens so S1 tasks can use them without conflict.

**Acceptance:**
- [ ] All 16 theme blocks (default + 15) define the new tokens
- [ ] Token values match the table in `docs/daybeans/02-visual-identity.md` §2.1.1–§2.1.2
- [ ] No visible change to any existing surface
- [ ] `npx tsc --noEmit` clean (CSS doesn't typecheck, but the build should still succeed)

**Out of scope:** using the tokens; the `Dawn` theme rename (S1).

---

## [S0-T05] Server-action stubs for every new feature

**Track:** server
**OWNS:**
- `src/server/actions/journal-themes.ts` (new — stubs only)
- `src/server/actions/suggested-goals.ts` (new — stubs only)
- `src/server/actions/rewards.ts` (new — stubs only)
- `src/server/actions/onboarding.ts` (new — stubs only)
- `src/server/actions/slow-sip.ts` (new — stubs only)

**READS:** `src/types/*` from S0-T03

**DEPENDS ON:** S0-T03

**Description:**
Create stub server-action files with the function signatures that future tasks will
fill in. Each stub returns either a typed mock value or throws `Error("not implemented")`.

Example:

```ts
// src/server/actions/suggested-goals.ts
"use server";
import type { SuggestedGoal } from "@/types/suggested-goal";

export async function listSuggestedGoals(_userId: string): Promise<SuggestedGoal[]> {
  throw new Error("not implemented");
}

export async function acceptSuggestedGoal(_input: { userId: string; id: string }): Promise<void> {
  throw new Error("not implemented");
}

export async function dismissSuggestedGoal(_input: { userId: string; id: string }): Promise<void> {
  throw new Error("not implemented");
}
```

**Acceptance:**
- [ ] Each stub file imports from `src/types/*` correctly
- [ ] Function signatures match what's in the implementation plan
- [ ] `npx tsc --noEmit` clean
- [ ] No file touches the database yet

**Out of scope:** any actual implementation.

---

## [S0-T06] Cron infrastructure scaffold

**Track:** infra
**OWNS:**
- `src/server/cron/scheduler.ts` (new)
- `src/server/cron/morning-brew.ts` (new — stub)
- `src/server/cron/evening-prebrew.ts` (new — stub)
- `src/server/cron/types.ts` (new)
- `src/app/api/cron/[job]/route.ts` (new — endpoint that dispatches by name)

**READS:** `package.json`

**DEPENDS ON:** S0-T01

**Description:**
Add a tiny cron framework and the endpoint shape that S2 will fill in. Use `croner`
or hand-rolled `setInterval` for v1. Each cron job is a named function in `src/server/cron/`.
Endpoint at `/api/cron/[job]` invokes the named job (gated by a shared-secret header).

**Acceptance:**
- [ ] `src/server/cron/scheduler.ts` exports `registerJob(name, fn)` and `runJob(name)`
- [ ] Stub jobs `morning-brew` and `evening-prebrew` registered (they log "not implemented" and return)
- [ ] `/api/cron/morning-brew` endpoint exists, returns 401 without `X-Cron-Secret` header, returns 200 (`{ ok: true, ranJob: "morning-brew" }`) with the secret
- [ ] `CRON_SECRET` documented in `.env.example`
- [ ] `npx tsc --noEmit` clean

**Out of scope:** the actual brew/prebrew logic (S2).

---

## [S0-T07] Constants + brand mark for DayBean

**Track:** ui
**OWNS:**
- `src/lib/constants.ts` (new — or add to existing if present)
- `src/components/primitives/BrandMark.tsx` (new)

**READS:** `docs/daybeans/02-visual-identity.md`, `docs/daybeans/03-logo-brief.md`

**DEPENDS ON:** S0-T01

**Description:**
Add `APP_NAME = "DayBeans"`, `APP_TAGLINE = "Different beans. Same morning."`, and a
new `BrandMark` component that renders the inline SVG monogram (espresso square with
the "DB" wordmark — temporary placeholder until the AI-generated logo lands).

**Acceptance:**
- [ ] `BrandMark` exports a single React component, accepts `size` prop (default 36)
- [ ] Renders the espresso/cream "DB" placeholder inline as SVG
- [ ] Constants live in one file, no duplication
- [ ] Visible only when imported (no side effect on existing UI)

**Out of scope:** swapping the existing brand mark in `Topbar.tsx` (S1-T01).

---

## [S0-T08] Provider-health observability stub

**Track:** infra
**OWNS:**
- `src/server/observability/provider-health.ts` (new)

**READS:** `prisma/schema.prisma` (RefreshLog)

**DEPENDS ON:** S0-T02

**Description:**
Add the `providerHealth` module with stub implementations of `last24hErrorRate`,
`regionalErrorRate`, `last30mErrorRate`. Each reads `RefreshLog` for the requested
window and returns a fraction. Used in S2 by the cost-graduation policy machinery.

**Acceptance:**
- [ ] All three functions implemented with simple SQL (group by status)
- [ ] Returns `0` if no rows in the window
- [ ] Unit-tested with a fake DB (or simple integration test)
- [ ] `npx tsc --noEmit` clean

**Out of scope:** the cost-graduation policy itself (lives in S2).

---

## [S0-T09] PREBREW_POLICY config + read paths

**Track:** infra
**OWNS:**
- `src/server/config.ts` (new — or extend if present)
- `.env.example` (already exists; add var)

**DEPENDS ON:** S0-T01

**Description:**
Add a typed `config.PREBREW_POLICY` reader with values `'always' | 'tiered' | 'reactive' | 'smart-resume'`
defaulting to `'always'`. This is the system-wide knob that S2 + future stages flip.

**Acceptance:**
- [ ] `src/server/config.ts` exports `config.PREBREW_POLICY: PrebrewPolicy`
- [ ] Reads from `process.env.PREBREW_POLICY` if set; otherwise `'always'`
- [ ] Validates with Zod; throws on invalid value at startup
- [ ] `.env.example` documents the variable

**Out of scope:** using the value (S2-T05).

---

# Sprint 1 · Brand Pivot

> **Sprint goal:** Anyone landing on the DayBean app sees the new name, voice, tab
> labels, and Dawn theme. Functionality unchanged.
>
> **Tracks parallel-safe:** T01 (UI rename), T02 (theme defaults), T03 (cookie migration),
> T04 (landing port), T05 (voice rewrite), T06 (tab icons).

## [S1-T01] Rename product to DayBeans across UI

**Track:** ui
**OWNS:**
- `src/components/Topbar.tsx`
- `src/components/Hero.tsx`
- `src/app/layout.tsx` (only the `<title>` and `<meta>` lines)

**READS:** `src/lib/constants.ts`, `src/components/primitives/BrandMark.tsx`

**DEPENDS ON:** S0-T07

**Description:**
Replace "The Daily Mind" everywhere it appears in user-visible UI with "DayBeans".
Use the new `BrandMark` from S0-T07 in `Topbar`. Update `<title>` and meta description.

**Acceptance:**
- [ ] No surface still says "The Daily Mind" or "Daily Mind"
- [ ] `Topbar` uses `BrandMark` component, not the old inline SVG
- [ ] `<title>` is "DayBeans — Different beans. Same morning."
- [ ] `npx tsc --noEmit` clean
- [ ] Visual diff at 1280px shows only the brand-name change, not layout shifts

**Out of scope:** `StickyHeader` (covered by T02 since it owns the date format too).

---

## [S1-T02] Tab labels → Pour Over / Daily Grind / Slow Sip / Bean Count

**Track:** ui
**OWNS:**
- `src/lib/tab-bus.ts`
- `src/components/Tabs.tsx` (only the `TAB_DEFS` array)
- `src/components/StickyHeader.tsx`

**READS:** `docs/daybeans/01-brand-strategy.md` §1.5

**DEPENDS ON:** —

**Description:**
Update the `TAB_LABEL` mapping and the `TAB_DEFS` eyebrow text. Mindfulness → Pour Over
(eyebrow "Mindful Soul"), Business / AI → Daily Grind (eyebrow "Professional"),
Personal → Slow Sip (eyebrow "Personal"), Goals Overview → Bean Count (eyebrow "Goals overview").
Tab IDs (`mindfulness`, `business`, `personal`, `overview`) stay the same to preserve
existing routes/cookies.

`StickyHeader` uses these labels via the bus — should automatically pick up. Verify
the date format reads "DayBeans ~ <Long Date>".

**Acceptance:**
- [ ] All four tab labels updated
- [ ] Eyebrows show "Mindful Soul", "Professional", "Personal", "Goals overview"
- [ ] Tab `id` enums unchanged (no cookie/data migration)
- [ ] StickyHeader title reads "DayBeans ~ Sunday, May 3, 2026"
- [ ] NextUpFooter labels reflect new names

---

## [S1-T03] Default theme = Dawn (apply brand tokens to existing `:root`)

**Track:** ui
**OWNS:**
- `src/styles/globals.css` (only `:root` block + the comment header)

**READS:** `docs/daybeans/02-visual-identity.md` §2.1

**DEPENDS ON:** S0-T04

**Description:**
Promote the warm-cream palette from the landing v2 mockup as the new `:root`
default values. Apply `--bg`, `--surface`, `--ink`, etc. to match Dawn. Existing
`[data-theme="*"]` blocks unchanged. Anyone whose cookie was unset (or "light")
now sees Dawn.

**Acceptance:**
- [ ] `:root` block matches `docs/daybeans/02-visual-identity.md` §2.1.1
- [ ] All 15 alternate themes still work
- [ ] `body { background: linear-gradient(...) }` looks warm-cream by default
- [ ] No regression on dark/forest/etc themes (visual diff)

---

## [S1-T04] Voice rewrite — copy across the app

**Track:** ui
**OWNS:**
- `src/components/Hero.tsx` (only the greeting strings)
- `src/components/TopbarRefreshButton.tsx` (status text)
- `src/components/Tabs.tsx` (eyebrow text only — but T02 already touches this; coordinate)

> **Conflict note:** T02 owns `TAB_DEFS` array. T04 owns greeting/status strings.
> Both touch `src/components/Tabs.tsx` if eyebrows are changed there. **Resolution:**
> T02 lands first; T04 rebases.

**READS:** `docs/daybeans/01-brand-strategy.md` §1.5–§1.7

**DEPENDS ON:** S1-T02

**Description:**
Replace the existing copy with brand voice phrasing:

- Greeting (Hero): "Pour first." / "Steady pour." / "That's a good cup." by hour bucket
- Refresh status badge: "Today's brew didn't drop." / "Yesterday's still warm."
- Empty states elsewhere: any "loading…" → "Brewing…" with steam wisp animation

**Acceptance:**
- [ ] Hero greeting cycles by hour
- [ ] Refresh badge copy uses brand voice
- [ ] No "Daily Mind" copy strings anywhere

---

## [S1-T05] Cookie/session prefix migration `mm_*` → `db_*`

**Track:** server
**OWNS:**
- `src/app/layout.tsx` (only the cookies-read block)
- `src/app/page.tsx` (only the cookies-read block)
- `src/lib/tab-bus.ts` (only the `setActiveTab` cookie write)
- `src/components/primitives/ThemeToggle.tsx` (only the cookie write)

**READS:** —

**DEPENDS ON:** —

**Description:**
Rename the cookie prefix from `mm_*` (mm = mindful mind) to `db_*`. Implement a
one-time migration: layout reads `db_theme || mm_theme`, then writes `db_theme`
on the next response. After 60 days remove the `mm_*` fallback (open a tracking
issue).

**Acceptance:**
- [ ] All cookie reads accept either prefix; all writes use `db_*`
- [ ] Existing users with `mm_theme` keep their theme on first load
- [ ] Open follow-up issue: "Remove `mm_*` cookie compat (Q3 2026)"

---

## [S1-T06] Tab icons — espresso flavor

**Track:** ui
**OWNS:**
- `src/components/tab-icons.tsx`

**READS:** `docs/daybeans/02-visual-identity.md` §2.4

**DEPENDS ON:** —

**Description:**
Optional polish: swap the existing geometric tab icons for coffee-flavored ones —
specifically the Bean Count icon could become a small bean cluster, Daily Grind
could keep the lightning bolt or get a coffee-grinder glyph. Keep the same
`width="16"` size and stroke style as today's StickyHeader uses them.

**Acceptance:**
- [ ] All four icons render at 16px and 26px
- [ ] Stroke / fill match the rest of the icon system
- [ ] Bean Count icon is recognizably coffee-themed
- [ ] Optional: include the original mindfulness/business icons as named exports for backward compat

---

## [S1-T07] Marketing landing — port `landing-v2.html` to a Next.js route

**Track:** ui
**OWNS:**
- `src/app/welcome-landing/page.tsx` (or wherever the marketing site lives — could be `/` if they're separate domains)
- `src/components/landing/*` (new dir; one file per section)
- `src/styles/landing.css` (or scoped Tailwind)

**READS:** `mockup/landing-v2.html`

**DEPENDS ON:** S1-T03 (needs Dawn theme tokens applied)

**Description:**
Port each section of `mockup/landing-v2.html` to a Next.js route as React
components. One file per section: Nav, Hero, FourTabsShowcase, CuratedProfiles,
JournalMagic, Pullquote, GiveawayBanner, LoginCard, Footer.

**Acceptance:**
- [ ] Visual parity with `mockup/landing-v2.html` at 1280px in Dawn theme
- [ ] All animations work (steam, ring draw, drift orbs)
- [ ] Theme picker (Dawn / Dusk) works
- [ ] Login form posts to the existing auth route
- [ ] `npx tsc --noEmit` clean

---

## [S1-T08] Logo file integration (placeholder until AI logo lands)

**Track:** design / ui
**OWNS:**
- `public/logo/wordmark.svg`
- `public/logo/monogram.svg`
- `public/logo/app-icon.png` (multi-size)
- `public/favicon.ico`
- `src/app/layout.tsx` (only `<link rel="icon">`)

**READS:** `docs/daybeans/03-logo-brief.md`

**DEPENDS ON:** —

**Description:**
Drop placeholder SVG logos (the "DB monogram" + simple wordmark) into `public/logo/`.
Hook up favicon. When the real AI-generated logos land later, swap files in place —
no code changes needed.

**Acceptance:**
- [ ] Browser tab shows the new favicon
- [ ] Email signature template (if any) uses the wordmark
- [ ] OG image at `public/logo/og.png` for social cards

---

# Sprint 2 · Dual-Run Resilience

> **Sprint goal:** Morning brew + 5pm pre-brew running, primary/backup fallback at
> read time, admin observability, voice cues for the three states.

## [S2-T01] `refreshDailyContent` accepts `phase` parameter

**Track:** server
**OWNS:**
- `src/server/llm/refresh.ts`

**READS:** `prisma/schema.prisma`, `src/types/refresh.ts`

**DEPENDS ON:** S0-T02

**Description:**
Add a required `phase: 'morning' | 'evening-prebrew' | 'cold-start' | 'manual'`
parameter. Branch on it:
- `morning | cold-start | manual` → write `contentJson`, `primarySource`, `primaryAt`
- `evening-prebrew` → write `backupContentJson`, `backupSource`, `backupAt`; **never** touch `contentJson`

Tag the `RefreshLog` row with the same `phase`.

**Acceptance:**
- [ ] Function signature now `refreshDailyContent(userId, iso, phase)`
- [ ] `evening-prebrew` writes only backup columns (unit-tested with a sentinel)
- [ ] Other phases write only primary columns
- [ ] `RefreshLog.phase` populated for every run
- [ ] All existing callers updated (page.tsx cold-start passes `'cold-start'`)

---

## [S2-T02] `prebrewTomorrow(userId)` helper

**Track:** server
**OWNS:**
- `src/server/llm/prebrew.ts` (new)

**READS:** `src/server/llm/refresh.ts`, `src/lib/dates.ts`

**DEPENDS ON:** S2-T01

**Description:**
Convenience wrapper that calls `refreshDailyContent(userId, isoOffset(today, 1), 'evening-prebrew')`.
This is what the evening cron calls.

**Acceptance:**
- [ ] One exported function `prebrewTomorrow`
- [ ] Idempotent: if already pre-brewed today for tomorrow, returns early without LLM call
- [ ] Unit-tested

---

## [S2-T03] Read-path precedence in `daily-content.ts`

**Track:** server
**OWNS:**
- `src/server/queries/daily-content.ts`

**READS:** `src/types/daily-content.ts`

**DEPENDS ON:** S0-T02

**Description:**
Update `getDailyContentWithMeta` to:
1. Try `contentJson` (primary). If valid → return with `source: 'primary'`.
2. Else try `backupContentJson`. If valid → return with `source: 'backup'`.
3. Else fall through to fixture with `source: 'fixture'`.

Apply `dedupeContent` at every level.

Add a new field on the returned shape: `servedAt: Date | null` (the `primaryAt` or `backupAt` of whichever served).

**Acceptance:**
- [ ] Three-level fallback works
- [ ] Backup expiry: if `backupAt > 36h ago`, treat as missing (fall through to fixture)
- [ ] Existing callers continue to work (the new fields are optional/additive)
- [ ] Unit-tested with a fake row in each state

---

## [S2-T04] Morning brew cron job

**Track:** server
**OWNS:**
- `src/server/cron/morning-brew.ts`

**READS:** `src/server/llm/refresh.ts`, `src/server/queries/refresh-status.ts`

**DEPENDS ON:** S0-T06, S2-T01

**Description:**
Implement the cron logic from §6.4. For each user whose local hour matches `refreshHour`
and who has not had a successful morning RefreshLog today, call `refreshDailyContent(userId, today, 'morning')`.

**Acceptance:**
- [ ] Skips users who already have a successful morning run today
- [ ] Computes user-local time correctly (handles user `timezone` field — add to Pref if missing)
- [ ] Logs every decision (skip / run / fail) with structured fields
- [ ] Acceptance test: trigger the endpoint with the secret, observe RefreshLog rows

---

## [S2-T05] Evening pre-brew cron job + policy gate

**Track:** server
**OWNS:**
- `src/server/cron/evening-prebrew.ts`
- `src/server/lib/prebrew-policy.ts` (new)

**READS:** `src/server/observability/provider-health.ts`, `src/server/config.ts`

**DEPENDS ON:** S0-T06, S0-T08, S0-T09, S2-T02

**Description:**
Implement the policy gate `shouldPrebrewFor(user, providerHealth)` from §6.4.
Wire it into the cron. Include the four cases (`always | tiered | reactive | smart-resume`)
as documented; default behavior is `'always'` (Stage 0).

**Acceptance:**
- [ ] Pre-brew runs for users active in last 7 days
- [ ] Pre-brew skips opted-out users (`prebrewEnabled = false`)
- [ ] Policy reads `config.PREBREW_POLICY`; default is `always`
- [ ] Acceptance test: with `tiered` policy, only paid/streak users run

---

## [S2-T06] Refresh status UI in Settings

**Track:** ui
**OWNS:**
- `src/components/settings/RefreshStatus.tsx` (new)
- `src/components/settings/LlmTab.tsx` (only the addition of `<RefreshStatus />`)

**READS:** `src/server/queries/refresh-status.ts`

**DEPENDS ON:** S2-T01

**Description:**
A small section in Settings showing: last morning run time, last pre-brew time,
which `source` served today's content. Three states:
- Healthy primary: "Morning brewed at 6:42am."
- Backup served: "Backup poured at 6:42am — last night's pre-brew did the work."
- Both failed: "Brew skipped this morning. Yesterday's still warm."

**Acceptance:**
- [ ] Renders three distinct states with copy from §6.4 voice cues
- [ ] No-op if user has no `Pref` row yet

---

# Sprint 3 · Slow Sip Features (parallel with S4)

> **Sprint goal:** Slow Sip becomes recognizably custom — it knows your hobbies,
> your living situation, and (optionally) your finance check-in.

## [S3-T01] Settings — Hobbies tag picker

**OWNS:**
- `src/components/settings/HobbiesTab.tsx` (new)
- `src/server/actions/slow-sip.ts` (the `setHobbies` function — fill in stub from S0-T05)

**DEPENDS ON:** S0-T03, S0-T05

**Description:** Tag picker UI with suggestion chips (photography, woodworking, gardening, languages, music, baking, hiking, …) and free-text add. Persists to `Pref.hobbies` as JSON array.

**Acceptance:** see [04 §US-3.3 / §US-4.3].

---

## [S3-T02] Settings — Lives-with multi-select

**OWNS:**
- `src/components/settings/HouseholdTab.tsx` (new)
- `src/server/actions/slow-sip.ts` (the `setLivesWith` function)

**DEPENDS ON:** S0-T03, S0-T05

**Description:** Multi-select chips: partner, kids, parents, roommates, alone. Persists to `Pref.livesWith`.

---

## [S3-T03] Settings — Finance check-in toggle + numbers

**OWNS:**
- `src/components/settings/FinanceTab.tsx` (new)
- `src/server/actions/slow-sip.ts` (`setFinanceMode`, `setFinanceNumbers`)

**DEPENDS ON:** S0-T03, S0-T05

**Description:** Optional toggle + three text inputs (net worth, cash, savings target). Display strings only, no integration with banks.

---

## [S3-T04] Slow Sip rotating cards component

**OWNS:**
- `src/components/personal/SlowSipCards.tsx` (new)
- `src/components/panels/PersonalPanel.tsx` (only the area where the new component renders)

**DEPENDS ON:** S3-T01, S3-T02, S3-T03

**Description:** Server component that picks 3 cards based on user's hobbies, livesWith, finance settings, and journal themes. Fairness rule: no section repeats 3 days running.

**Acceptance:** see [04 §US-4.5].

---

## [S3-T05] Goal categories (UI + persistence)

**OWNS:**
- `src/components/goals/GoalCategoryPicker.tsx` (new)
- `src/server/actions/goals.ts` (extend the existing — no new actions, only update existing to accept `category`)

**DEPENDS ON:** S0-T02

**Description:** When creating or editing a goal, picker for `category: 'family' | 'finance' | 'hobby' | 'fitness' | 'faith' | 'work' | null`. Persists to `Goal.category`. Optional UI display of category in goal lists.

---

## [S3-T06] Personal LLM prompt extension

**OWNS:**
- `src/server/llm/prompts.ts` (only the `personal.*` block)

**DEPENDS ON:** S3-T01, S3-T02

**Description:** Extend the prompt for `personal.articles` to bias on `hobbies` + `livesWith`. Add explicit rotation rules.

> **Conflict note:** S4-T05 also writes to `prompts.ts`. Resolution: S3-T06 lands first; S4-T05 rebases.

---

## [S3-T07] Bean Count category-aware roll-up

**OWNS:**
- `src/components/overview/CategoryRollup.tsx` (new)
- `src/components/overview/MasterGoalList.tsx` (only the area showing category badges)

**DEPENDS ON:** S3-T05

**Description:** In Bean Count, group goals by category and show a small count badge per category alongside the existing rings.

---

# Sprint 4 · The Journal Listens (parallel with S3)

> **Sprint goal:** The killer feature. Tomorrow's content bends to last night's
> journal, with a strict no-quote contract.

## [S4-T01] Theme extraction module

**OWNS:**
- `src/server/lib/theme-extraction.ts` (new)
- `src/server/lib/theme-extraction.test.ts` (new)

**DEPENDS ON:** S0-T02

**Description:** Pure-JS lemmatizer + TF-IDF-ish weighting + recency decay. Given last-N journal entries, returns top theme tokens with weights. No external deps.

**Acceptance:**
- [ ] Unit tests covering: empty input, single entry, recurring theme, recency weighting
- [ ] Returns at most 12 themes
- [ ] Lemmatization handles English plural/verb forms (presence/present, rest/rests, etc.)

---

## [S4-T02] Intent detection module

**OWNS:**
- `src/server/lib/intent-detection.ts` (new)
- `src/server/lib/intent-detection.test.ts` (new)

**DEPENDS ON:** S0-T02

**Description:** Regex-first detection of intent phrases ("I want to…", "I keep…", "I should…"). For matched phrases, generate a draft `SuggestedGoal`. Optional small-LLM call for ambiguous cases (off by default in v1).

---

## [S4-T03] Journal-themes persistence + scheduler hook

**OWNS:**
- `src/server/actions/journal-themes.ts` (fill in stubs from S0-T05)
- `src/server/actions/journal.ts` (only the call-site after `addJournalEntry` / `updateJournalEntry`)

**DEPENDS ON:** S4-T01, S4-T02

**Description:** After every journal write, run theme extraction; upsert `JournalTheme` rows with weights and `lastSeen`. Run intent detection; insert `SuggestedGoal` rows with status `pending`.

---

## [S4-T04] Settings → Journal Themes panel

**OWNS:**
- `src/components/settings/JournalThemesTab.tsx` (new)

**DEPENDS ON:** S4-T03

**Description:** New Settings tab "What we heard" — shows top themes with weights and a mute toggle per theme. Voice cue: *"Themes only. Themes never include your words."*

---

## [S4-T05] Prompt enrichment with themes + excerpts

**OWNS:**
- `src/server/llm/prompts.ts` (only the user-prompt builder + the relevant section guidance)

**DEPENDS ON:** S4-T01

> **Conflict note:** S3-T06 also writes here. **S3-T06 lands first.**

**Description:** Inject top 6 unmuted themes (with weights) and 3–5 abstracted journal excerpts into the user prompt. Strengthen the no-verbatim-quote rule. Add explicit instruction for reflection block to *name* one theme.

---

## [S4-T06] Suggested-goals UI on Bean Count

**OWNS:**
- `src/components/overview/SuggestedGoalsCard.tsx` (new)
- `src/components/overview/OverviewHero.tsx` (only insert the new component)

**DEPENDS ON:** S4-T03

**Description:** A small card on Bean Count listing pending suggested goals; one-tap accept / dismiss. Voice cue per row: *"Picked up from last night's journal."*

---

## [S4-T07] Privacy-contract acceptance test

**OWNS:**
- `tests/journal-privacy.test.ts` (new)
- `tests/fixtures/synthetic-journal-entries.json` (new)

**DEPENDS ON:** S4-T05

**Description:** Generate 100 reflections from synthetic journal entries; assert no >=4-word substring shared with the source. **This test must always pass.**

---

## [S4-T08] Journal-themes admin observability

**OWNS:**
- `src/app/admin/journal-themes/page.tsx` (new)

**DEPENDS ON:** S4-T03

**Description:** Admin route showing aggregate theme distribution across all users (anonymized counts). Useful for content tuning.

---

## [S4-T09] Voice cue copy on the magic surfaces

**OWNS:**
- copy strings in S4-T04, S4-T06, S4-T08

> Lands as part of those tasks; called out separately so brand owner can sign off in one shot.

---

# Sprint 5 · Coffee Rewards (parallel with S6)

> **Sprint goal:** The streak-to-coffee loop end-to-end. 7 mornings → choose a roaster
> → email voucher. Plus admin partner CRUD.

## [S5-T01] Streak detection module

**OWNS:** `src/server/lib/streak.ts` (new) + tests

**DEPENDS ON:** S0-T02

**Description:** Given `userId`, returns current streak length and the days that contribute. Uses existing `Day` + `Goal` records.

---

## [S5-T02] Voucher pool + claim server actions

**OWNS:** `src/server/actions/rewards.ts` (fill in stubs from S0-T05)

**DEPENDS ON:** S0-T02, S5-T01

**Description:** `claimReward({userId, partnerId})` (idempotent), `dismissReward(...)`, `availablePartners(userId)`. Atomic voucher assignment with row-level locking.

---

## [S5-T03] Streak reward badge in topbar

**OWNS:** `src/components/rewards/StreakRewardBadge.tsx` + `src/components/Topbar.tsx` (only the badge insertion)

**DEPENDS ON:** S5-T01

**Description:** Tiny badge that appears once a user crosses a 7-day milestone. Click → opens reward modal.

---

## [S5-T04] Reward claim modal

**OWNS:** `src/components/rewards/RewardModal.tsx` (new)

**DEPENDS ON:** S5-T02

**Description:** Lists 3–5 partners with on-offer cards; user picks one; success state shows "Code in your inbox."

---

## [S5-T05] Voucher email template + send

**OWNS:**
- `src/server/email/voucher.ts` (new)
- `src/server/email/templates/voucher.tsx` (new)
- `src/server/email/client.ts` (new — Resend wrapper)

**DEPENDS ON:** S5-T02

**Description:** JSX-based email template; brand voice ("Cup on the counter."). Uses Resend (or Postmark fallback). `RESEND_API_KEY` documented in `.env.example`.

---

## [S5-T06] Admin — Partner CRUD

**OWNS:** `src/app/admin/partners/page.tsx` + `src/app/admin/partners/[id]/page.tsx` + `src/server/actions/admin-partners.ts` (new)

**DEPENDS ON:** S0-T02

**Description:** List, add, edit, delete partners. Set weekly voucher budget. View redemption stats. Gated by `User.role === 'admin'`.

---

## [S5-T07] Admin — Voucher inventory

**OWNS:** `src/app/admin/partners/[id]/vouchers/page.tsx`

**DEPENDS ON:** S5-T06

**Description:** Per-partner voucher pool view; bulk-add codes; mark redeemed; view assignment history.

---

## [S5-T08] Reward analytics

**OWNS:** `src/app/admin/rewards/page.tsx` (new)

**DEPENDS ON:** S5-T02, S5-T05

**Description:** Aggregate metrics: vouchers issued, redemption rate, geographic distribution, partner breakdown. Anonymous — never user names or journals.

---

## [S5-T09] Marketing — partner strip + giveaway block on landing

**OWNS:** `src/components/landing/PartnerStrip.tsx` + `src/components/landing/GiveawayBlock.tsx`

**DEPENDS ON:** S1-T07

**Description:** Live data from `Partner` table — featured roaster of the week + offer. Used in the landing page sections that v2 mockup defined.

---

# Sprint 6 · First Pour Onboarding (parallel with S5)

> **Sprint goal:** New users complete a 90-second onboarding and see a Day-1 dashboard
> that already feels custom.

## [S6-T01] Onboarding route shell + state machine

**OWNS:**
- `src/app/welcome/page.tsx` (new)
- `src/app/welcome/layout.tsx` (new)
- `src/components/onboarding/FirstPour.tsx` (new — the multi-step controller)

**DEPENDS ON:** S0-T02

**Description:** `/welcome` route that hosts the 6-step flow. Each step persists on next-click. Skip-able. Progress indicator.

---

## [S6-T02] Onboarding steps 1–3 (Name, Work, Growing)

**OWNS:**
- `src/components/onboarding/StepName.tsx`
- `src/components/onboarding/StepWork.tsx`
- `src/components/onboarding/StepGrowing.tsx`

**DEPENDS ON:** S6-T01

**Description:** Three step components matching the layout in [04 §EPIC 9](04-product-requirements.md#epic-9--the-first-pour-onboarding) and the brand voice cues from [05 §5.1](05-journey-maps.md#51-journey-1--first-pour-new-user-signup--first-morning).

---

## [S6-T03] Onboarding steps 4–6 (Company, Bean, Morning)

**OWNS:**
- `src/components/onboarding/StepCompany.tsx`
- `src/components/onboarding/StepBean.tsx`
- `src/components/onboarding/StepMorning.tsx`

**DEPENDS ON:** S6-T01

**Description:** Faith picker, lives-with multi-select, and theme/refresh-hour live preview. Brand voice on step 5: *"We won't preach. We won't argue. We carry it for those who carry it."*

---

## [S6-T04] `completeOnboarding` action + warm-up generation

**OWNS:** `src/server/actions/onboarding.ts` (fill in stubs from S0-T05)

**DEPENDS ON:** S6-T01

**Description:** Single transaction writes all 6 fields. Triggers a one-shot LLM warm-up so Day 1 isn't generic. If the warm-up fails, fallback fixture is used and user sees the standard "first brew" state.

---

## [S6-T05] Middleware redirect for new users

**OWNS:** `src/middleware.ts` (or extend if exists)

**DEPENDS ON:** S6-T04

**Description:** If signed-in but no `Pref` row, redirect to `/welcome`. Skip middleware on `/welcome/*` and `/api/*`.

---

## [S6-T06] First-Pour acceptance test

**OWNS:** `tests/onboarding.test.ts` (new)

**DEPENDS ON:** S6-T01..05

**Description:** Headless test that creates a fresh user, completes all 6 steps in <30s of test time, asserts `Pref` row populated correctly, asserts dashboard renders.

---

# Sprint 7 · Launch Readiness

> **Sprint goal:** Privacy + export + final QA + production deploy.

## [S7-T01] Privacy page + content

**OWNS:** `src/app/privacy/page.tsx` (new)

**Description:** Plain-language privacy page covering what's stored, what goes to the LLM (themes only), what goes to partners (anonymous counts), and how to export/delete.

---

## [S7-T02] Data export

**OWNS:** `src/server/actions/export.ts` + `src/app/api/export/[token]/route.ts`

**Description:** User clicks "Export" → emailed link valid 24h → JSON dump of their data. Background job, not synchronous.

---

## [S7-T03] Account deletion

**OWNS:** `src/server/actions/account.ts` (only `deleteAccount`) + UI in Settings

**Description:** Two-step confirmation. 24h grace period. Cascade delete after grace.

---

## [S7-T04] Postgres migration (prod)

**OWNS:** infra (no source files)

**Description:** Migrate prod database from SQLite to Postgres. Dev stays SQLite. Test backup/restore.

---

## [S7-T05] Production deploy + monitoring

**OWNS:** `.github/workflows/deploy.yml`, `Dockerfile` (or Railway config)

**Description:** Set up production deploy pipeline. Hook up Plausible analytics (opt-in). Sentry or equivalent for errors.

---

## [S7-T06] Launch QA matrix

**OWNS:** `tests/e2e/*` (new)

**Description:** Playwright tests covering: signup→onboarding→day 1, journal→suggested goal, streak→reward claim, theme switching, account delete. Run on CI.

---

## [S7-T07] Beta tester onboarding

**OWNS:** ops (no source files)

**Description:** Recruit 25 beta testers across 4 personas. Onboard them with a unique invite code. Collect 14-day feedback before public launch.

---

## [S7-T08] Launch checklist sign-off

**OWNS:** PM (no source files)

**Description:** Walk the [§6.11 Launch Checklist](06-implementation-plan.md#611-definition-of-launchable). Every box ticked. Founder approval. Ship.

---

## A.1 Quick task lookup

| ID | Title | Sprint | Track |
|---|---|---|---|
| S0-T01 | Fork the repo to DayBean and bootstrap | S0 | infra |
| S0-T02 | Consolidated Prisma migration | S0 | server |
| S0-T03 | Type contracts | S0 | server |
| S0-T04 | Brand color tokens | S0 | ui |
| S0-T05 | Server-action stubs | S0 | server |
| S0-T06 | Cron infra scaffold | S0 | infra |
| S0-T07 | Brand mark + constants | S0 | ui |
| S0-T08 | Provider-health observability | S0 | infra |
| S0-T09 | PREBREW_POLICY config | S0 | infra |
| S1-T01 | Rename product across UI | S1 | ui |
| S1-T02 | Tab labels | S1 | ui |
| S1-T03 | Default theme = Dawn | S1 | ui |
| S1-T04 | Voice rewrite | S1 | ui |
| S1-T05 | Cookie prefix migration | S1 | server |
| S1-T06 | Coffee tab icons | S1 | ui |
| S1-T07 | Marketing landing port | S1 | ui |
| S1-T08 | Logo file integration | S1 | design |
| S2-T01 | refreshDailyContent phase param | S2 | server |
| S2-T02 | prebrewTomorrow helper | S2 | server |
| S2-T03 | Read-path precedence | S2 | server |
| S2-T04 | Morning brew cron | S2 | server |
| S2-T05 | Evening pre-brew + policy | S2 | server |
| S2-T06 | Refresh status UI | S2 | ui |
| S3-T01..07 | Slow Sip features | S3 | mixed |
| S4-T01..09 | Journal Listens | S4 | mixed |
| S5-T01..09 | Coffee Rewards | S5 | mixed |
| S6-T01..06 | First Pour Onboarding | S6 | mixed |
| S7-T01..08 | Launch Readiness | S7 | mixed |

**62 tasks total.** Ready to land in DayBean as 62 GitHub issues.
