# DayBeans — Master Implementation Roadmap

> **Status:** v1 roadmap. Each phase below has (or will have) its own detailed plan file.
> **Source materials:** `mockup/spec.md` (authoritative for v1 dashboard behavior), `mockup/morning-mindfulness-dashboard.html` (reference implementation).
> **Repo:** [dgmiller81/the-daily-mind](https://github.com/dgmiller81/the-daily-mind) (private)
> **Deploy targets:** **Local** (workstation, SQLite) and **Railway** (hosted, Postgres). Same codebase, env-driven.

---

## 1. Vision

**DayBeans** is a single dashboard that collates a person's spiritual, professional, and personal life into one daily snapshot, then helps them stay consistent through tracking. The mockup proves the UX. This roadmap takes it from a self-contained HTML file to a real, persistent, multi-user application with LLM-driven daily content.

The four core panels (Mindfulness, Business/AI, Personal, Goals Overview) and their interactions — Goals & Tasks tracking (spec §7), Journal-driven Scripture (spec §9), heatmap, drawer, modal, breath timer — stay **exactly as specified**. We are rebuilding the same UX on a real foundation, then adding:

| Addition | Purpose |
|---|---|
| Settings gear (unobtrusive) | Profile, LLM provider + API key, theme, job title, business interests |
| Onboarding flow | First-run questionnaire (name, role, content interests, spiritual prefs, goals) |
| Multi-LLM support | OpenAI + Anthropic at v1; LM Studio, Gemini, Cursor later |
| Persistent storage | Database (not localStorage) — surviving restarts and (eventually) device changes |
| Multi-mode auth | App-password / no-password / username+password / OAuth (Google, GitHub, Azure, X, Facebook) |
| Calendar navigation | Forward / back / date-picker — past days become viewable (not just heatmap cells) |
| Weekend mode | Saturday/Sunday emphasizes unplugging + something playful |
| Friends & Family stub | Light feature flag — placeholder for thoughtful gestures (full design later) |
| Additional themes | Beyond light/dark — see Phase 9 |

---

## 2. Tech Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** | Server actions kill REST boilerplate; Auth.js plugs in cleanly; can wrap in Tauri later for desktop |
| Styling | **Tailwind CSS v4** + custom CSS variables (preserve spec §3.3 tokens verbatim) | Keep the exact "warm, calm, bookish" aesthetic without losing tokens to utility class hell |
| Fonts | **Fraunces** + **Inter** (self-hosted via `next/font/google`) | Spec-mandated; self-hosting avoids the file:// font fallback problem |
| Database | **SQLite** via **Prisma** for `local`; **Postgres** (Railway-managed) for `railway` | Same Prisma schema; provider switched by `DATABASE_PROVIDER` build var |
| Auth | **Auth.js v5** (NextAuth) | Built-in providers for Google, GitHub, Azure AD, Twitter/X, Facebook + Credentials provider for username/password; auth mode switched by `AUTH_MODE` |
| LLM SDK | **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) | Unified provider interface; LM Studio works via the OpenAI-compatible adapter pointed at `localhost:1234`; Gemini available as `@ai-sdk/google` when we add it |
| LLM scheduling | **Phase 8 Scheduler** — `node-cron` in dev, Railway cron jobs in prod, cold-start catch-up | Default 04:00 local refresh; user-configurable in onboarding; if app was off at 04:00, refresh runs on next launch |
| Local default LLM | **LM Studio (headless)** — bundled setup script, pulls a small model | Free, offline-capable; spec generation works without an API key. Web-content fetching (articles) still needs network — see §5 fetch policy |
| Web content fetcher | Native `fetch` + lightweight HTML→text via `@mozilla/readability` + `jsdom` | Server-side only. Used by the LLM pipeline to summarize and rank articles for daily refresh |
| Secrets at rest | **AES-256-GCM** with key from `APP_ENCRYPTION_KEY` env var | Per-user API keys stored encrypted in DB; key derivation per-user via HKDF |
| Validation | **Zod** | Runtime validation for forms, API payloads, and `DAILY_CONTENT` shape |
| State (client) | **Zustand** for ephemeral UI state; server state via **TanStack Query** + server actions | Goals/tasks/days are server state and should be queries, not localStorage |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) | Standard for this stack |
| Lint/format | **ESLint** + **Prettier** | Standard |
| Package manager | **pnpm** | Faster, deterministic |

### 2.1 Deploy modes

| Mode | `DEPLOY_TARGET` | DB | Auth | LLM default | Notes |
|---|---|---|---|---|---|
| **Local — no password** | `local` | SQLite (`prisma/dev.db`) | `AUTH_MODE=none` | LM Studio at `localhost:1234` | Single-user, no login screen. Onboarded once. **Only available when `DEPLOY_TARGET=local`** — refused at boot otherwise. |
| **Local — simple password** | `local` | SQLite | `AUTH_MODE=simple` | LM Studio | One password set during onboarding, stored as Argon2id hash in DB. Prompted at app launch; session sticks 30 days via signed cookie. |
| **Local — full login** | `local` | SQLite | `AUTH_MODE=full` | LM Studio | Auth.js with Credentials + OAuth providers (whatever client IDs are set in env). |
| **Railway — full login** | `railway` | Postgres (Railway-managed) | `AUTH_MODE=full` (forced) | OpenAI / Anthropic (user-supplied key) | Production hosted. `AUTH_MODE=none` and `simple` are rejected at boot for safety. |

**Local-first first.** The Phase 1 scaffold runs in local-no-password mode out of the box. Railway support and the password / full-login modes are layered on in Phases 7 and 12.

---

## 3. Phase Map

Each phase ends with a working, demonstrable increment. Phases are ordered so each builds on the previous; do not skip ahead without reading the dependency notes.

| # | Phase | Plan File | Output |
|---|---|---|---|
| 1 | **Project foundation** | `2026-05-02-phase-1-foundation.md` (this delivery) | Next.js project compiles, Prisma schema reflects spec §6 storage, design tokens land, theme toggle works, empty 4-tab dashboard renders |
| 2 | **Data layer & ports of localStorage subsystems** | `phase-2-data-layer.md` | Server actions for goals, tasks, days, clicks, theme, filter; in-memory store replaced by DB; spec §6 acceptance criteria pass |
| 3 | **Mindfulness panel + Journal + Scripture engine** | `phase-3-mindfulness.md` | God card, scripture preview, Bible modal, journal autosave, theme-driven recommendation, breath timer, reflections rotation, Mindfulness articles list. Spec §8, §9, §15, §14.1 acceptance criteria pass |
| 4 | **Business + Personal panels** | `phase-4-business-personal.md` | Top stories, scan, articles, repos, quotes, watchlist, financial/health/disconnect/win widgets, motivation, personal articles. §10, §11 acceptance criteria pass |
| 5 | **Goals Overview + Tasks drawer + Heatmap** | `phase-5-overview-drawer.md` | Rings, 60-day heatmap, section bars, filterable goal list, slide-up drawer with Tasks tab + All-goals tab, FAB count. §7.6, §12, §13 acceptance criteria pass |
| 6 | **Daily content refresh + DAILY_CONTENT JSON** | `phase-6-content-refresh.md` | Per-user daily content stored in DB, hand-edit fallback, "regenerate today's content" stub button (LLM call wired in Phase 8) |
| 7 | **Auth (3 modes)** | `phase-7-auth.md` | `none` (local only, auto-login as `local-default`), `simple` (Argon2id password set during onboarding, prompt at launch, sticky session), `full` (Auth.js + Credentials + Google/GitHub/Azure/X/Facebook). Boot guard refuses `none`/`simple` when `DEPLOY_TARGET=railway`. |
| 8 | **Settings, LLM providers & content fetcher** | `phase-8-settings-llm.md` | Settings gear → modal: Profile, LLM Provider + API key (encrypted), Theme, Job + Business interests. OpenAI + Anthropic adapters + LM Studio (OpenAI-compatible) adapter. Article fetcher (Readability + jsdom). "Refresh today's content" button calls configured LLM and writes a new `DailyContent` row. Per-user rate limit (3 manual refreshes/day). |
| 9 | **Onboarding flow + LMS bundle script** | `phase-9-onboarding.md` | First-run wizard: name, role(s), content interests, spiritual prefs, starter goals, **refresh schedule (default 04:00)**, **LLM provider choice (LM Studio / OpenAI / Anthropic)**. If LM Studio chosen, runs `scripts/setup-lms.ts` to detect/start `lms` headless and pull a default model. |
| 10 | **LLM Scheduler** | `phase-10-scheduler.md` | `node-cron` job per user (dev/local) or single Railway cron (`/api/cron/refresh-all`) protected by `CRON_SECRET`. Cold-start catch-up: on boot, any user whose last refresh is older than their scheduled time runs immediately. Backed by `RefreshLog` table (audit + dedup). |
| 11 | **Calendar navigation + Weekend mode** | `phase-11-calendar-weekend.md` | Prev/next/date-picker on hero — past days become read-only views; today stays mutable. Sat/Sun applies `data-mood="weekend"` (softer accent palette) and swaps the Business panel for a "lighter" pane (read-novel / call-a-friend / no-screens). |
| 12 | **Additional themes + Friends & Family stub** | `phase-12-themes-friendsfamily.md` | Adds `data-theme="warm"` (sepia), `"forest"`, `"midnight"`. Stubs a "Friends & Family" entry on the Personal panel that opens a placeholder card explaining future-state (gift ideas, reach-out reminders). |
| 13 | **Railway deploy** | `phase-13-railway.md` | Postgres provisioning, `railway.json`, env wiring (encryption key, OAuth secrets, `CRON_SECRET`), Prisma migrate-on-deploy, healthcheck endpoint, build-time `DEPLOY_TARGET=railway` enforcement, custom domain notes. |
| 14 | **Hardening, security review, E2E** | `phase-14-hardening.md` | Strict CSP + HSTS, secure-cookie defaults, CSRF on all mutations, rate-limit middleware, audit log table, dependency scan (`pnpm audit` + Dependabot), CodeQL, Playwright E2E for golden path, threat-model review (see `docs/security.md`). |

**Critical path:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14.

**Parallelizable:** Phases 3 and 4 after Phase 2 (separate panels, shared data layer). Phase 9 can start in parallel with Phase 8 once the User+Pref schema lands. Phase 12 (themes/F&F stub) can run in parallel with Phase 11 (calendar/weekend).

**De-scoped from v1 (write down so we don't drift):**
- Multi-device sync (no cloud sync — DB is per-deployment; same Railway deployment can serve multiple devices for the same user, but local DB is local-only)
- Notifications / push
- Mobile native apps
- "Cursor" as an LLM provider (no public API; revisit if/when they ship one)
- RSS / live data feeds — articles are LLM-generated from web fetches, not subscribed feeds
- Multi-tenant team mode — Railway deployment is single-tenant per instance for v1

---

## 4. Repository Layout (target)

```
thedailymind/
├── docs/
│   └── superpowers/plans/        # all plan files live here
├── mockup/                       # original HTML + spec, untouched
├── prisma/
│   └── schema.prisma             # DB schema
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # auth-mode aware login/signup routes
│   │   ├── (dash)/               # main dashboard (tabs, panels)
│   │   ├── (onboarding)/         # first-run wizard
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   └── layout.tsx
│   ├── components/               # React components — one file per concern
│   │   ├── panels/               # Mindfulness, Business, Personal, Overview
│   │   ├── primitives/           # card, fab, drawer, modal, toast, ring, heatmap
│   │   ├── goals/                # GoalRow, GoalForm, GoalList
│   │   └── tasks/                # TaskRow, TaskForm, TasksDrawer
│   ├── server/                   # server-only code
│   │   ├── actions/              # server actions (mutate state)
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # Auth.js config
│   │   ├── crypto.ts             # AES-GCM helpers for API keys
│   │   └── llm/                  # provider adapters
│   │       ├── index.ts          # unified interface
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── prompts.ts        # daily-content generation prompts
│   ├── lib/                      # shared client+server pure code
│   │   ├── scriptures.ts         # SCRIPTURES[] + THEME_KEYWORDS
│   │   ├── reflections.ts        # 15 reflections
│   │   ├── default-goals.ts      # DEFAULT_GOALS list
│   │   ├── progress.ts           # progressFor / streakFor / dailyStreak
│   │   └── dates.ts              # todayISO, weekendOf, range helpers
│   ├── styles/
│   │   └── globals.css           # CSS variables (spec §3.3) + base rules
│   └── types/
│       └── index.ts              # Goal, Task, DayRecord, Scripture, etc.
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 5. Key Design Calls (decide once, lock in)

These will be re-stated in the relevant phase plans, but recording them here so they're not re-litigated:

1. **Per-user data isolation** — every `Goal`, `Task`, `DayRecord`, `Click`, `JournalEntry`, and `LlmCredential` row carries `userId`. Even single-user / local mode creates a User row (`local-default`) on first boot.
2. **`DayRecord` is the unit of mutation for "today"** — health toggles, win text, finance text, journal notes, per-goal counters all live on one row keyed by `(userId, isoDate)`.
3. **Scripture is computed, never stored per day** — `SCRIPTURES` and `THEME_KEYWORDS` are versioned with code; the daily pick is deterministic from `(date, recent journal)`. (Spec §9.2.)
4. **`DAILY_CONTENT` becomes a per-user, per-day DB row** — instead of an in-page `<script>` block. Auth'd users see their own; refresh writes a new row. Hand-edit path (Phase 6) lets you paste raw JSON; LLM path (Phase 8) generates it.
5. **Past-day editing is forbidden in v1** — calendar navigation (Phase 10) shows past days read-only. Today is still the only mutable cell. (Spec §6 last line.)
6. **Encrypted API keys never leave the server** — client posts plaintext key once during settings save; server encrypts and stores; server decrypts only inside an LLM call. `GET` of the credential row returns last-four + provider only.
7. **Weekend mode is a render variant, not a separate route** — Sat/Sun changes which panel is default and applies a `data-mood="weekend"` attribute that toggles a softer accent palette. Same data layer.
8. **No emojis anywhere in the UI** — spec §3.4. Inline SVG only.
9. **Refresh scheduler is per-user, idempotent, and audited** — every refresh attempt writes a `RefreshLog` row (`userId`, `iso`, `triggeredBy: 'cron'|'cold-start'|'manual'`, `status`, `tokensUsed`, `error?`). A second cron tick for the same `(userId, iso)` is a no-op.
10. **Boot-time guards refuse unsafe configs** — `DEPLOY_TARGET=railway` + `AUTH_MODE=none` aborts boot with a clear error. Missing `APP_ENCRYPTION_KEY` aborts boot. Missing `CRON_SECRET` on Railway aborts boot.
11. **Web fetch is server-side only and content-typed** — articles are fetched via server actions; user agent is `DayBeans/<version>`; only `text/html` responses are accepted; size cap 1 MB; timeout 8s. SSRF guard rejects private IPs and `file://`, `gopher://`, etc.
12. **LM Studio is detected, never auto-installed** — `scripts/setup-lms.ts` checks for `lms` on PATH and prints install instructions if missing. It only runs `lms server start --port 1234` if the binary is present and the user opts in during onboarding.

---

## 6. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Aesthetic drift when porting to React + Tailwind | Phase 1 lands the CSS variables verbatim from spec §3.3 and ports the existing styles as plain CSS in `globals.css` first; component-by-component conversion to Tailwind happens later only where it doesn't lose visual fidelity. |
| LLM cost / rate spike if users hit "refresh" repeatedly | Phase 8 caps refresh at 3 calls/day per user, with a manual override behind the settings gear. |
| OAuth complexity blowing up Phase 7 | Phase 7 ships Credentials provider first; OAuth providers go behind feature flags one at a time, each guarded by env-var presence. |
| Prisma migration ordering with later phases | Each phase's plan starts with its migration; the migration is the first step before any code that depends on it. |

**Open questions for the user — resolved 2026-05-02:**
1. ~~Hosting target~~ → **Local + Railway**, both first-class. Phase 13 covers Railway specifics.
2. ~~Single password unlock model~~ → **One password set during onboarding** (`AUTH_MODE=simple`), prompted at app launch, sticky session.
3. ~~Default LLM if no key~~ → **Bundle LM Studio headless** + setup script that detects the `lms` binary and pulls a default model. Web content fetcher (Readability + jsdom) handles articles regardless of LLM.

---

## 7. Execution Notes

- Each phase plan ends with a `git commit` and a verification step. Do not start the next phase until verification passes.
- Plans use checkbox (`- [ ]`) syntax — execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
- Phase 1 is delivered alongside this roadmap. Subsequent phase plans are written **on demand**, immediately before that phase begins, so they reflect the actual state of the repo at that point (not what we projected from here).
