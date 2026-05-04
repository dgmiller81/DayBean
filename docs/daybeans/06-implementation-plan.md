# 06 · Implementation Plan

## 6.1 Recommendation: extend, don't rebuild

The existing codebase is the right foundation. Concretely:

| What we already have | DayBeans need | Verdict |
|---|---|---|
| Next.js App Router, Prisma, SQLite (dev) / Postgres-ready | Same | ✅ Keep |
| 4 tabs (Mindfulness, Business/AI, Personal, Goals Overview) | 4 tabs (Pour Over, Daily Grind, Slow Sip, Bean Count) | ✅ Rename only |
| LLM content generation with journal-aware prompts | Stronger journal coupling | ✅ Extend prompt + add intent detector |
| `JournalEntry`, `Bookmark`, `Goal`, `Pref`, `DailyContent` tables | Add `Partner`, `Voucher`, `JournalTheme`, `SuggestedGoal` | ✅ Additive migrations |
| 15 themes with bg-image overlay | "Dawn" becomes the brand-canonical default | ✅ Token rename + new defaults |
| Drawer with bookmarks, journal pager, tasks | Same | ✅ Keep |

**Throwing this away costs 6+ months and gains nothing.** Every DayBeans feature is
a delta on the current architecture, not a re-foundation.

The case for a rebuild *would* be valid if:
- We were changing data model fundamentally (we aren't)
- We were changing tech stack (we aren't)
- The current app had a critical scalability ceiling (it doesn't — SQLite → Postgres is a 1-day flip)
- The existing UX/IA was wrong (it isn't — 4 tabs is the right shape)

So: **extend in five phased PRs.** Each PR independently shippable and revertable.

## 6.2 Phasing overview

| Phase | What ships | Branch name | Est. effort |
|-------|-----------|-------------|-------------|
| **A** · Brand pivot (visual + naming) | Rename product to DayBeans, swap default theme to Dawn, add brand color tokens, rename tabs to Pour Over / Daily Grind / Slow Sip / Bean Count, ship marketing landing | `feat/daybeans-brand-pivot` | 1.5 wk |
| **A.5** · Dual-run resilience | 5pm pre-brew, primary/backup `DailyContent` model, read-time fallback, refresh-log phase tagging, admin observability | `feat/dual-run-resilience` | 1 wk |
| **B** · Slow Sip features | Hobbies onboarding, family/finance/hobby cards in Slow Sip, livesWith pref, hobby goal type | `feat/slow-sip-features` | 1.5 wk |
| **C** · Journal-driven curation (the magic) | Theme extractor v2, intent-phrase detector, suggested goals from journal, prompt enrichment | `feat/journal-listens` | 2 wk |
| **D** · Coffee streak rewards & partnerships | `Partner` + `Voucher` schema, streak detection, voucher fulfillment, admin UI, partner-strip on landing | `feat/bean-rewards` | 2 wk |
| **E** · First Pour onboarding | 6-step onboarding flow, persona-aware first-day generation | `feat/first-pour-onboarding` | 1 wk |

**Total: 9 weeks** of focused dev for one engineer; **6.5 weeks** with two engineers running B+C in parallel after A and A.5.

## 6.3 Phase A — Brand pivot

> Goal: Anyone landing on the app sees DayBeans, with the right voice, the
> right palette, and the right tab names. Functionality unchanged.

### Schema changes
None.

### File-level deltas

| File | Change |
|---|---|
| `package.json` | `name: "daybeans"`. Update title in any scripts. |
| `src/app/layout.tsx` | `<title>DayBeans</title>`, meta description rewrite |
| `src/components/Topbar.tsx` | Brand mark + name → DayBeans |
| `src/components/Hero.tsx` | Greeting copy: *"Pour first."* / *"Steady pour."* / *"That's a good cup."* by hour |
| `src/components/Tabs.tsx` | Rename labels: Mindfulness → Pour Over, Business / AI → Daily Grind, Personal → Slow Sip, Goals Overview → Bean Count. Keep eyebrows ("Section 1"/"Section 2"/etc.) optional or replace with "Mindful Soul" / "Professional" / "Personal" / "Goals overview" |
| `src/components/StickyHeader.tsx` | Title text: "DayBeans ~ {date}" |
| `src/components/NextUpFooter.tsx` | Update `TAB_LABEL` import (in `tab-bus.ts`) — already keyed by tab id, just edit labels |
| `src/lib/tab-bus.ts` | Update `TAB_LABEL` mapping |
| `src/components/tab-icons.tsx` | Optional: swap mindfulness/business/personal/overview SVGs for coffee-themed alternatives. Recommended: keep current SVGs for v1 to ship fast; swap in Phase B/C |
| `src/styles/globals.css` | Add brand-color tokens (`--espresso`, `--crema*`) to every theme block. Rename `:root` block default to "Dawn" semantics. Set Dawn (the new default) to the warm-cream palette from `02-visual-identity.md` |
| `src/app/page.tsx` | Update theme cookie name from `mm_theme` to `db_theme` (with a one-time migration path) |
| `src/components/settings/ThemesTab.tsx` | "Dawn" appears as the default theme label (replaces "Light"); other themes unchanged |
| `prisma/schema.prisma` | No changes |
| `mockup/landing-v2.html` | Promote to `mockup/landing.html` (replace v1) — already built |

### Cookie/session migration

Old name: `mm_theme`, `mm_tab`, `mm_drawer_*`. New name: `db_*` for clarity. Implement
a one-time migration in `layout.tsx` that reads either prefix and writes to the new
prefix on the next request. Remove old-name read after 60 days in production.

### Acceptance criteria
- Landing page reads "DayBeans" everywhere.
- App nav reads "Pour Over · Daily Grind · Slow Sip · Bean Count".
- Default theme on first paint is **Dawn** (warm cream + espresso + crema), with all 14 other themes intact.
- All tests + tsc pass.
- No functional regressions: drawer, journal, bookmarks, themes panel all behave as before.

### Out of scope for Phase A
- Logo update (waiting on design hand-off from Phase 0/branding)
- New onboarding (Phase E)
- Coffee partnerships (Phase D)

---

## 6.4 Phase A.5 — Dual-run resilience

> Goal: Users always see fresh content in the morning, even when an LLM
> provider has a bad night. We pay for at most one extra generation per
> user per day, and only for engaged users.

### The model

Two scheduled runs per user, with a clear priority:

```
┌────────── Day N ──────────┐  ┌─────────── Day N+1 ───────────┐
                                                                 
   5:00 PM local                4:00 AM local        6:42 AM
   │                            │                    │
   │ Pre-brew (Day N+1)         │ Morning brew       │ User opens app
   │ → backupContentJson        │ (Day N+1)          │
   │   stored on the Day N+1    │ → contentJson      │ Read-time:
   │   row, NEVER overwrites    │   stored on the    │  prefer primary
   │   today's content          │   Day N+1 row      │  fallback to backup
   │                            │   (success path)   │  fallback to fixture
   │                            │                    │
   │                            │ if morning fails:  │
   │                            │   contentJson      │
   │                            │   stays empty;     │
   │                            │   backup serves    │
```

The user never knows which one they're seeing. Both come from the same prompt machinery,
both go through the same dedupe pass, both render with the same UI. The only place the
distinction is visible is **Settings → Last refresh** and the **admin observability panel**.

### Schema changes

Add two columns to `DailyContent` and a tag column to `RefreshLog`:

```prisma
model DailyContent {
  // existing fields…
  contentJson         String   // primary content (post-morning-brew)
  backupContentJson   String?  // pre-brewed backup (written 5pm previous day)
  primarySource       String?  // 'manual' | 'morning' | 'cold-start' (which run wrote contentJson)
  backupSource        String?  // 'evening-prebrew' | 'manual-prebrew'
  primaryAt           DateTime?
  backupAt            DateTime?
  // existing constraint @@unique([userId, iso]) stays
}

model RefreshLog {
  // existing fields…
  phase  String   // 'morning' | 'evening-prebrew' | 'cold-start' | 'manual'
  // existing index stays
}

model Pref {
  // existing fields…
  refreshHour       Int  @default(4)   // morning brew hour (already present)
  prebrewHour       Int  @default(17)  // 5pm default for the safety-net run
  prebrewEnabled    Boolean @default(true)
}
```

Migration name: `add_dual_run_resilience`.

### File-level deltas

| File | Change |
|---|---|
| `src/server/queries/daily-content.ts` | Read path: prefer `contentJson` if present + parses; else use `backupContentJson`; else use fixture. Apply `dedupeContent` at every level. Set `source` on the returned `DailyContentWithMeta` to one of `'primary' \| 'backup' \| 'fixture'` so the UI can label it in admin views. |
| `src/server/llm/refresh.ts` | New parameter `phase: 'morning' \| 'evening-prebrew' \| 'cold-start' \| 'manual'`. The path `morning \| cold-start \| manual` writes to `contentJson` + `primarySource` + `primaryAt`. The `evening-prebrew` path writes to `backupContentJson` + `backupSource` + `backupAt`, **and never touches contentJson**. RefreshLog gets the `phase` tag. |
| `src/server/llm/refresh.ts` | New `prebrewTomorrow(userId)` helper — convenience wrapper that computes `tomorrow = isoOffset(todayISO(), 1)` and calls `refreshDailyContent(userId, tomorrow, 'evening-prebrew')`. |
| `src/server/queries/refresh-status.ts` | Add `lastPrebrewAt(userId)` and `lastMorningAt(userId)` for the cron's idempotency check and admin display. |
| `src/server/cron/morning-brew.ts` | New: hourly cron entry. For each user where `local-time matches refreshHour AND no successful morning RefreshLog today`, fire `refreshDailyContent(userId, todayISO(), 'morning')`. |
| `src/server/cron/evening-prebrew.ts` | New: hourly cron entry. For each user where `local-time matches prebrewHour AND user opened the app within the last 7 days AND prebrewEnabled AND no successful prebrew for tomorrow`, fire `prebrewTomorrow(userId)`. |
| `src/server/cron/scheduler.ts` | New: a tiny in-process scheduler (or external cron — see Deployment below). |
| `src/app/page.tsx` | Cold-start path stays as is, but pass `phase: 'cold-start'` so logs differentiate. |
| `src/components/settings/RefreshStatus.tsx` | New tiny component in Settings (or inside LLM tab) that surfaces last-refresh metadata: which run, which time, which source served today's content. |
| `src/app/admin/refresh/page.tsx` | New admin route: success rate per phase over last 24h / 7d, list of users whose primary failed and got served from backup, with sortable table. |

### The two cron jobs in detail

#### Morning brew cron

```ts
// runs every hour on :00
async function morningBrewCron() {
  const now = new Date();
  const users = await db.user.findMany({
    where: { /* active in last 30d */ },
    select: { id: true, prefs: { select: { refreshHour: true } }, /* timezone */ },
  });
  for (const u of users) {
    if (localHour(u, now) !== (u.prefs?.refreshHour ?? 4)) continue;
    const today = todayISOFor(u);
    const alreadyDone = await hasSuccessfulRefreshFor(u.id, today, 'morning');
    if (alreadyDone) continue;
    await refreshDailyContent(u.id, today, 'morning'); // writes contentJson on success
  }
}
```

#### Evening pre-brew cron

```ts
// runs every hour on :00
async function eveningPrebrewCron() {
  const now = new Date();
  const users = await db.user.findMany({
    where: { /* opened app within last 7d */ },
    select: { id: true, prefs: { select: { prebrewHour: true, prebrewEnabled: true } } },
  });
  for (const u of users) {
    if (!u.prefs?.prebrewEnabled) continue;
    if (localHour(u, now) !== (u.prefs?.prebrewHour ?? 17)) continue;
    const tomorrow = isoOffset(todayISOFor(u), 1);
    const alreadyDone = await hasSuccessfulRefreshFor(u.id, tomorrow, 'evening-prebrew');
    if (alreadyDone) continue;
    await refreshDailyContent(u.id, tomorrow, 'evening-prebrew'); // writes backupContentJson only
  }
}
```

### Read-time precedence

```ts
// src/server/queries/daily-content.ts (sketch)
export async function getDailyContentWithMeta(userId, iso) {
  const row = await db.dailyContent.findUnique({ where: { userId_iso: { userId, iso } } });
  if (!row) return { content: dedupeContent(fixtureFor(iso)), source: 'fixture' };

  // 1. try primary
  if (row.contentJson) {
    const parsed = safeParse(row.contentJson);
    if (parsed.ok) return { content: dedupeContent(parsed.value), source: 'primary', servedAt: row.primaryAt };
  }
  // 2. fall back to backup (the 5pm pre-brew from yesterday)
  if (row.backupContentJson) {
    const parsed = safeParse(row.backupContentJson);
    if (parsed.ok) return { content: dedupeContent(parsed.value), source: 'backup', servedAt: row.backupAt };
  }
  // 3. last resort: fixture
  return { content: dedupeContent(fixtureFor(iso)), source: 'fixture' };
}
```

### Cost & safety constraints

| Risk | Mitigation |
|---|---|
| Double cost — every active user generates content twice/day | Cap pre-brew to users active in the last 7 days; skip free-tier users over budget; track "tokens used" per user in `RefreshLog` and surface it in admin. Expected steady-state: ~1.4× single-run cost (most users active, but free tier is throttled). |
| Pre-brew runs at 5pm overwrite today's primary | **Cannot happen by construction.** Pre-brew writes only to `backupContentJson` and only with `iso = tomorrow`. Defensive code: function signature requires `phase` and uses different DB columns for each. Unit-tested. |
| Stale backup gets served forever if morning never runs | Backups expire after 36 hours (read-time check on `backupAt`). After expiry, fall through to fixture and surface the topbar badge. |
| Morning cron and pre-brew cron stomp each other on a fresh DailyContent row | Use Prisma `upsert` with unique key `(userId, iso)`. Each cron updates a different column. Postgres row-level locking handles concurrency cleanly. SQLite (dev) is single-writer so the issue can't surface. |
| User changes their refreshHour at 3:55am — both old and new hour fire | RefreshLog idempotency check (`hasSuccessfulRefreshFor`) prevents duplicate runs within the same iso/phase. |

### Deployment notes

- **In-process scheduler** (`node-cron` or `croner`): fine for v1 single-process. Run on the web server.
- **External cron** (Railway scheduled jobs / Render cron / a `pg_cron` task): better for v2 once the service splits. Each job hits a `/api/cron/morning` and `/api/cron/prebrew` endpoint protected by a shared secret.
- **Switch to Postgres** before this phase ships if you haven't already — voucher concurrency in Phase D needs it, and the dual-run cron is a stress test for write throughput.

### Acceptance criteria

- [ ] Morning brew cron and evening pre-brew cron both wire up and run on schedule.
- [ ] When morning succeeds, the user sees primary content; `source: 'primary'` in admin.
- [ ] When morning fails (LLM provider 500s in a fault-injection test), user sees backup content; `source: 'backup'` in admin; user-facing UI is identical.
- [ ] When both fail (mock both providers down), user sees fixture content + topbar badge; previous day's UI stays usable.
- [ ] No code path can write the pre-brew output to `contentJson`. Verified by a test that mocks the prompt to return a sentinel string and checks the column it ends up in.
- [ ] `RefreshLog` rows tagged with the right `phase` for every run, including failures.
- [ ] Admin panel shows: morning success %, evening-prebrew success %, % of users served from backup yesterday, % served from fixture (alarm threshold).

### Voice cues that ship in this phase

- Settings → Refresh status:
  - Healthy primary: *"Morning brewed at 6:42am."*
  - Backup served: *"Backup poured at 6:42am — last night's pre-brew did the work."*
  - Both failed: *"Brew skipped this morning. Yesterday's still warm."*
- Topbar badge (only shown on full failure): *"Today's brew didn't drop."* — clickable, opens the refresh-status block.

### Cost-graduation roadmap (turning the safety net down over time)

Dual-run is the **right starting posture** — it builds trust during a period when LLM
providers are still flaky and we're earning the user's morning. As reliability proves
itself, we can dial the pre-brew cost down without dropping the safety guarantee.
Treat this as a 4-stage knob, not a hard switch.

| Stage | When to switch | What changes | Cost vs. dual-run baseline | Reliability impact |
|---|---|---|---|---|
| **Stage 0 — Always pre-brew** *(launch)* | Day 1 → first 90 days | Every active user gets the 5pm pre-brew | **1.0×** (the baseline) | Belt + suspenders; ~99.9% morning hit rate even if a provider has a bad night |
| **Stage 1 — Tiered pre-brew** | After 90 days, when morning success rate sustains > 99% for 30 days | Pre-brew runs only for: paid tiers, users with a 14+ day streak, users on free tier with a flaky provider in their region | **~0.55×** | Power users still on belt + suspenders; casual free-tier loses the suspenders. Acceptable because their morning hit rate stays > 98%. |
| **Stage 2 — Reactive pre-brew** | After 6 months, when our LLM provider posture is multi-vendor and battle-tested | Pre-brew is **only triggered when an upstream provider's recent error rate exceeds 1%**, scoped to affected users. Otherwise: morning-only. | **~0.15×** (on a normal week) | Same hit rate as Stage 0 *during* outages; back to 1.0× generation cost on calm weeks |
| **Stage 3 — Smart-resume cache** | Year 2+, once we have enough corpus | Skip generation entirely on days where the user's journal themes haven't shifted. Reuse yesterday's content with light freshening. | **~0.10× of Stage 0**, in periods of stable journaling | User-perceptible only if we get freshening wrong; A/B test before turning on |

### How the staging looks in code

The `prebrewEnabled` flag on `Pref` is the per-user knob. The system-wide knob is
a config value `PREBREW_POLICY` with values `'always' | 'tiered' | 'reactive' | 'smart-resume'`.

```ts
// src/server/cron/evening-prebrew.ts (sketch — Stage 1+ aware)
async function shouldPrebrewFor(user, providerHealth) {
  const policy = config.PREBREW_POLICY ?? 'always';
  if (!user.prefs?.prebrewEnabled) return false;        // user opted out

  switch (policy) {
    case 'always':                                       // Stage 0
      return openedRecently(user, 7);

    case 'tiered':                                       // Stage 1
      if (user.tier === 'paid' || user.tier === 'roaster') return true;
      if (await currentStreak(user.id) >= 14) return true;
      return providerHealth.regionalErrorRate(user.region) > 0.005;

    case 'reactive':                                     // Stage 2
      return providerHealth.last24hErrorRate > 0.01;

    case 'smart-resume':                                 // Stage 3
      const themesShifted = await journalThemesChanged(user.id, lastNDays = 2);
      return themesShifted && providerHealth.last24hErrorRate > 0.01;
  }
}
```

Stage transitions are **system-wide config flips** — no schema migrations needed
between stages. That keeps the back-out path safe: if Stage 2 surfaces a regression
(e.g., we under-pre-brew and morning hit rate drops to 97%), we revert the config
in seconds.

### Provider-health signal (the input that makes Stages 2+ work)

`providerHealth` is a 1-day rolling window of `RefreshLog` failure rates per provider:

```ts
// src/server/observability/provider-health.ts
{
  last24hErrorRate(providerId): number,        // 0..1
  regionalErrorRate(region): number,
  last30mErrorRate(providerId): number,        // for the "we're in an outage right now" check
}
```

Surfaced on the admin panel and used as input to the pre-brew policy at Stages 2+.

### The North Star

> **Day 1 ships with Stage 0 and a clear path to Stages 1–3.**
> Don't build the policy machinery before we have data. Build the *config knob* and the
> *health signal*; let the policy itself stay simple ("always") until reality tells us
> otherwise.

What's wired on Day 1: the `prebrewEnabled` per-user flag, the `phase` column on
`RefreshLog`, the `PREBREW_POLICY` config value (defaulting to `'always'`), and the
provider-health observability. Stages 1–3 then flip the config without further code.

---

## 6.5 Phase B — Slow Sip features

> Goal: Make Slow Sip feel custom by letting users tell us what their personal
> growth looks like.

### Schema changes

```prisma
model Pref {
  // existing fields…
  hobbies         String?  // JSON array: ["woodworking", "japanese", "piano"]
  livesWith       String?  // JSON array: ["partner", "kids"]
  financeMode     Boolean  @default(false)
  netWorth        String?  // user-entered display string
  cashOnHand      String?
  savingsTarget   String?
}

model Goal {
  // existing fields…
  category   String?  // 'family' | 'finance' | 'hobby' | 'fitness' | 'faith' | 'work'
}
```

### File-level deltas

| File | Change |
|---|---|
| `src/server/actions/settings.ts` | Add `setHobbies`, `setLivesWith`, `setFinanceMode`, `setFinanceNumbers` actions |
| `src/components/settings/ProfileTab.tsx` | New fields for hobbies (tag picker), livesWith (chips), finance toggle |
| `src/server/llm/prompts.ts` | Extend `personal.articles` prompt: include hobbies + livesWith as bias inputs. Add explicit guidance: rotate among parenting / finance / hobby / fitness / faith |
| `src/components/personal/PersonalPanel.tsx` | Add three rotating section cards (Family, Finance, Hobby) sourced from a new `RotatingSlowSipCards` server component |
| `src/components/personal/SlowSipCards.tsx` | New: server component that picks today's three section types based on journal themes + a fairness rule (no repeats 3 days running). Rendered as `.sip-card` grid (style already in landing-v2.html) |
| `src/types/daily-content.ts` | Extend `personal` schema to include `hobbyArticles?` and `familyArticles?` arrays |

### Acceptance criteria
- Settings → Profile has hobbies tag picker, livesWith multi-select, optional finance toggle.
- Slow Sip tab shows 3 section cards rotated by theme + fairness rule.
- Hobby goals appear as their own category in Bean Count, alongside work/family/etc.
- Tested with at least 3 distinct profiles (CEO+kids, carpenter+spouse, solo college student) to confirm content noticeably differs.

---

## 6.6 Phase C — The Journal Listens (the magic)

> Goal: Ship the killer feature. Make journal entries quietly bend tomorrow's content.

### Schema changes

```prisma
model JournalTheme {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme     String   // "presence", "rest", "anxiety", "marriage" — single tokens
  weight    Float    @default(1)  // recency-weighted; decays over time
  muted     Boolean  @default(false)  // user can mute themes from biasing content
  lastSeen  DateTime @default(now())
  @@unique([userId, theme])
  @@index([userId, weight])
}

model SuggestedGoal {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  cadence     String    // 'daily' | 'weekly'
  category    String?
  sourceJournalId String? // FK back to JournalEntry that triggered it
  status      String    @default("pending")  // 'pending' | 'accepted' | 'dismissed'
  createdAt   DateTime  @default(now())
  @@index([userId, status])
}
```

### File-level deltas

| File | Change |
|---|---|
| `src/server/lib/theme-extraction.ts` | New module. Given last-N journal entries, extract: top tokens (lemmatized), weights (TF-IDF-like, recency-decayed). Pure JS — no external deps. Outputs sorted theme list. |
| `src/server/lib/intent-detection.ts` | New module. Regex + small-LLM helper that scans a journal entry for intent phrases ("I want to…", "I keep…", "I should…"). Returns drafts of `SuggestedGoal` rows. |
| `src/server/actions/journal.ts` | After every `addJournalEntry` / `updateJournalEntry`, enqueue a theme-extraction job (synchronous for v1, queue for v2). Update `JournalTheme` weights. Run intent detection; insert `SuggestedGoal` rows where confidence > threshold. |
| `src/server/llm/prompts.ts` | Inject top 6 themes (with weights) and recent journal excerpts into prompt context. Update prompt: explicit "use themes by name; never quote verbatim" rule. |
| `src/server/queries/journal-themes.ts` | Replace existing prototype with the new schema-backed query. |
| `src/components/overview/SuggestedGoalsCard.tsx` | New component on Bean Count: shows pending suggested goals with one-tap accept/dismiss. |
| `src/components/settings/JournalThemesTab.tsx` | New Settings tab: shows top themes with weights; user can mute any theme. |
| `src/components/mindfulness/Reflections.tsx` | If present, update to render reflection that includes recognized themes (fed from prompt context). |

### Quality bar (acceptance test)
- Generate 100 reflections from realistic journal entries.
- Run a script that scans for >=4-word substrings shared with the source journal.
- **Must be 0 substring matches.** This is the privacy contract from Epic 6.

### Branding cues to enforce in this phase
- New copy in Settings → Journal Themes: *"What we heard"* (heading), *"Themes only. Themes never include your words."* (subhead).
- Suggested goal card copy: *"Picked up from last night's journal."*

---

## 6.7 Phase D — Coffee streak rewards & partnerships

> Goal: Turn the streak into the marketing engine. Ship the rewards loop end-to-end.

### Schema changes

```prisma
model Partner {
  id          String   @id @default(cuid())
  name        String   // "Caribou Coffee", "Roast Co. Omaha"
  slug        String   @unique  // "caribou", "roast-co-omaha"
  type        String   // 'chain' | 'indie'
  city        String?  // for indie roasters; null for chains (national)
  state       String?
  logoUrl     String?
  blurb       String?  // editorial copy for the partner card
  active      Boolean  @default(true)
  weeklyBudget Int     @default(0)  // # of vouchers per week
  createdAt   DateTime @default(now())
  vouchers    Voucher[]
}

model Voucher {
  id          String   @id @default(cuid())
  partnerId   String
  partner     Partner  @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  code        String   @unique  // single-use redeem code
  issued      Boolean  @default(false)  // false = available in pool; true = assigned to user
  redeemedAt  DateTime?
  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  expiresAt   DateTime
  weekOf      DateTime  // start of the calendar week this voucher belongs to
  @@index([partnerId, issued, expiresAt])
}

model User {
  // existing fields…
  vouchers   Voucher[]
}

model RewardClaim {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  voucherId    String
  voucher      Voucher  @relation(fields: [voucherId], references: [id])
  streakLength Int      // 7, 14, 21, etc.
  claimedAt    DateTime @default(now())
  @@index([userId, claimedAt])
}
```

### File-level deltas

| File | Change |
|---|---|
| `src/server/lib/streak.ts` | New module. Computes current streak length given user + iso date range. Uses existing `Day` + `Goal` records. |
| `src/server/actions/rewards.ts` | New: `claimReward({userId, partnerId})`, `dismissReward(...)`, with idempotency. Picks an available voucher from the partner's pool, marks it issued, sends email. |
| `src/server/queries/rewards.ts` | New: `availablePartners(userId)`, `pendingRewards(userId)`. |
| `src/components/rewards/StreakRewardBadge.tsx` | New topbar badge that appears at 7-day milestone. Click → modal. |
| `src/components/rewards/RewardModal.tsx` | New: lists 3–5 partners with the on-offer cards; user picks one; success state shows "Code in your inbox." |
| `src/server/email/voucher.ts` | New: outbound email with the voucher code. Template uses brand voice ("Cup on the counter."). |
| `src/app/admin/partners/page.tsx` | New: admin route, simple CRUD for partners + voucher pools. Gated by `User.role` (add `role` field). |
| `mockup/landing-v2.html` | Already has the giveaway block — no changes. |

### Email infrastructure
- Use Resend (preferred — clean API, generous free tier) or Postmark.
- Template stored in `src/server/email/templates/voucher.tsx` as a JSX-only template rendered on send.

### Acceptance criteria
- 7-day streak triggers in-app badge and (if opted in) one email.
- Voucher email arrives within 60 seconds.
- Single-use code is genuinely single-use (DB-level constraint).
- Admin can add a partner, set the weekly budget, and watch the available count drain.
- Voucher expires 14 days after claim.

### Anti-patterns to avoid
- Never push-notify users about streaks. Email-only, opt-in only.
- Never gamify with points or badges beyond the streak counter.
- Never sell user data to partners. Reporting is anonymous count + city.

---

## 6.8 Phase E — First Pour onboarding

> Goal: New users finish a 90-second onboarding and see a Day-1 dashboard that
> already feels custom.

### Schema changes
None — all 6 onboarding answers map to existing `User.name` + `Pref.*` fields.

### File-level deltas

| File | Change |
|---|---|
| `src/app/welcome/page.tsx` | New route. Checks if user is fresh (no `Pref` row). If yes, runs onboarding. If no, redirects to `/`. |
| `src/components/onboarding/FirstPour.tsx` | Client component with 6 steps; persists each step on next-button click. |
| `src/components/onboarding/StepName.tsx` | Step 1 |
| `src/components/onboarding/StepWork.tsx` | Step 2 |
| `src/components/onboarding/StepGrowing.tsx` | Step 3 |
| `src/components/onboarding/StepCompany.tsx` | Step 4 (livesWith) |
| `src/components/onboarding/StepBean.tsx` | Step 5 (faith) |
| `src/components/onboarding/StepMorning.tsx` | Step 6 (theme + refreshHour) |
| `src/server/actions/onboarding.ts` | `completeOnboarding(...)` writes everything in one transaction; triggers a one-time LLM warm-up generation so Day 1 isn't generic. |
| `src/middleware.ts` | If signed-in but no `Pref`, redirect to `/welcome` (with a "skip for now" affordance). |

### Acceptance criteria
- 6 steps, none required except name.
- Median completion time under 90s (instrumented).
- Day-1 dashboard for a "Marcus the carpenter" persona genuinely differs from a "Sarah the founder" persona — visible in side-by-side QA.

---

## 6.9 Cross-cutting concerns

### Performance budget
- Time-to-interactive: < 1.5s on a 4G network on a midrange phone.
- Hero animations: total bundle increase under 8 KB.
- LLM refresh: targets < 4 seconds on cold-start refresh.

### Accessibility
- All interactive elements reachable by keyboard.
- Focus rings visible.
- All icon-only buttons get `aria-label`.
- `prefers-reduced-motion` honored throughout.
- Color contrast: every text/bg pair tested against WCAG AA. Crema-on-cream is the riskiest pair — use it only for accents, never body text.

### Privacy & security
- LLM keys encrypted at rest (already implemented, `src/server/crypto.ts`).
- Journal text never sent to any third party. Only theme tokens go to LLM provider.
- Partner reporting: anonymous counts only (date, partner, city — no names, no journals).
- Account deletion: cascade delete via Prisma `onDelete: Cascade`. Already wired.

### Testing
- Unit tests for theme extraction and intent detection.
- Integration test for streak detection.
- Visual regression via Playwright + Percy on the landing page hero, the four tab panels, the drawer, and the Settings → Themes panel.
- "Privacy contract" test (Phase C): generate 100 reflections, scan for verbatim leakage, fail if any.

### Observability
- Add minimal telemetry: tab opens, journal entry counts, streak milestones, voucher claims. Anonymous, opt-in.
- Send to Plausible (privacy-respecting analytics). No GA, no Mixpanel.

### Deployment
- Existing setup (Railway / similar) is fine for v1.
- When Phase D ships, add a daily cron job (already prefigured in code) to seed weekly voucher pools.
- Postgres migration (from SQLite) before Phase D — voucher inventory needs better concurrency handling than SQLite gives us.

## 6.10 What we are NOT building (yet)

These tempted us. We're saving them for v2 to keep launch simple.

- **Mobile native app.** PWA-only at launch. Native app comes after we're sure the loop works.
- **Team / org accounts.** Single-user only.
- **Bank/financial integration.** Slow Sip finance is BYO numbers; Plaid integration is post-launch.
- **Bean-by-mail subscription.** Phase 3 of the partnership strategy; not v1.
- **Custom LLM models.** Stick to OpenAI / Anthropic / LM Studio bring-your-own-key.

## 6.11 Definition of "Launchable"

Phases A + B + C + E are required for launch. Phase D (rewards) is required for the
**marketing-launch event** ("first 100 streaks earn coffee") but the app itself is
launchable without it.

**Pre-launch checklist:**
- [ ] All five phases tested in Dawn + Dusk + Aurora themes
- [ ] Privacy page lives at `/privacy`, exports work, account deletion works end-to-end
- [ ] Landing page (current `mockup/landing-v2.html`) ported to a real Next.js route
- [ ] At least 3 indie roasters signed for Phase D
- [ ] Email infra (Resend) wired with at least transactional + voucher templates
- [ ] Postgres in production
- [ ] Trademark search + domain confirmed clean
- [ ] At least 25 beta testers across the four personas have used the app for 14 days
