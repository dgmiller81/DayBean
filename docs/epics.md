# Epics & Sub-Items

Each Phase from the [master roadmap](superpowers/plans/2026-05-02-master-roadmap.md) is an **Epic** with its own GitHub Milestone. This document is the human-readable index of every epic and its sub-items, including non-Task items (security review, threat model updates, doc work) that don't fit cleanly inside a single plan file.

When an epic's Milestone closes, that section gets a ✅ check.

---

## Epic 1 — Project Foundation
**Milestone:** `phase-1-foundation`
**Plan:** [phase-1-foundation.md](superpowers/plans/2026-05-02-phase-1-foundation.md)
**Depends on:** —
**Output:** Working Next.js dev server, Prisma schema, design tokens, theme toggle, 4-tab shell.

Sub-items:
1. Initialize repo and install Next.js (Task 1)
2. Install Tailwind v4 and PostCSS (Task 2)
3. Wire fonts and root layout + dates helper (Task 3)
4. Add Prisma + SQLite schema mirroring spec §6 (Task 4)
5. Build the dashboard shell — topbar, hero, tabs, panels, footer (Task 5)
6. Theme toggle smoke test (Task 6)
7. README and final smoke (Task 7)
8. CI workflow — lint + typecheck + test + build
9. Security workflow — `pnpm audit` (high/critical fail)
10. CodeQL workflow — JS/TS pack on PR + weekly cron

---

## Epic 2 — Data Layer & Server Actions
**Milestone:** `phase-2-data-layer`
**Plan:** `phase-2-data-layer.md` (to be written before Phase 2 starts)
**Depends on:** Epic 1
**Output:** Server actions for goals, tasks, days, clicks, theme, filter — replacing localStorage.

Sub-items (preview, finalized in plan):
- Server action: `getGoals`, `addGoal`, `removeGoal`, `toggleCheckGoal`, `incrementCountGoal`, `addTimeMinutes`
- Server action: `getTasks`, `addTask`, `toggleTask`, `deleteTask`
- Server action: `getDay(iso)`, `setNotes`, `setHealthFlag`, `setWin`, `setFinance`, `setDisconnect`
- Server action: `setFilter`, `setTheme`
- Click tracker server action with auto-credit logic (spec §10)
- Unit tests for `progressFor`, `streakFor`, `dailyStreak`
- Integration tests covering spec §7.6 acceptance

---

## Epic 3 — Mindfulness Panel + Journal + Scripture Engine
**Milestone:** `phase-3-mindfulness`
**Depends on:** Epic 2

Sub-items:
- God card (opening + prayer + carry)
- Reflections rotation (spec §15) — `src/lib/reflections.ts`
- Mindfulness articles list with click tracking
- Journal textarea with debounced save (spec §8)
- `SCRIPTURES` library + `THEME_KEYWORDS` (spec §9.1) — `src/lib/scriptures.ts`
- `pickScripture()` algorithm (spec §9.2) — `src/lib/scripture-engine.ts`
- Scripture preview card (spec §9.3)
- Bible modal (spec §9.4) — verse numbers, commentary, parchment style
- Breath timer 4-7-8 (spec §14.1)
- Acceptance: spec §8.4, §9.5

---

## Epic 4 — Business + Personal Panels
**Milestone:** `phase-4-business-personal`
**Depends on:** Epic 2

Sub-items:
- Business panel: headline, briefing, top stories, scan list, articles, dev quotes, repos, watchlist
- Personal panel: headline, motivation quote, articles, financial widget, health widget, disconnect widget, win-of-day textarea
- Click tracking on all anchor cards (spec §10) wired through Phase 2 action
- Acceptance: spec §11

---

## Epic 5 — Goals Overview + Tasks Drawer + Heatmap
**Milestone:** `phase-5-overview-drawer`
**Depends on:** Epic 2

Sub-items:
- Filter pills (All / Mindfulness / Business / Personal)
- Section progress bars (sage→gold gradient)
- Four ring stats (Today / 7 days / Best streak / Days journaled)
- 60-day heatmap with tooltips (spec §12.2)
- Slide-up drawer with Tasks tab + All-goals tab (spec §13)
- FAB with open-task count badge
- Acceptance: spec §7.6, §12, §13

---

## Epic 6 — Daily Content Refresh + DAILY_CONTENT JSON
**Milestone:** `phase-6-content-refresh`
**Depends on:** Epic 2

Sub-items:
- `DailyContent` table (per user, per iso, JSON blob)
- Server action: `getDailyContent(iso)`, `setDailyContent(iso, json)`
- Hand-edit modal (paste JSON, validate with Zod schema)
- Empty-state UI when no content for today
- "Refresh" button stub (wires to LLM in Epic 8)

---

## Epic 7 — Auth (3 modes)
**Milestone:** `phase-7-auth`
**Depends on:** Epic 6
**Type:** `security`

Sub-items:
- Boot guard (`DEPLOY_TARGET` × `AUTH_MODE` matrix)
- `AUTH_MODE=none` — auto-login as `local-default`
- `AUTH_MODE=simple` — Argon2id hash, single password set during onboarding, sticky session via signed cookie
- `AUTH_MODE=full` — Auth.js v5 + Credentials + Google + GitHub + Azure AD + X (Twitter) + Facebook
- Login attempt rate limiting (spec security §"Rate Limits")
- Migration: `User` gains `passwordHash`, `Account` rows for OAuth
- Session middleware that hydrates `userId` for server actions
- Acceptance: each auth mode tested end-to-end

---

## Epic 8 — Settings, LLM Providers & Content Fetcher
**Milestone:** `phase-8-settings-llm`
**Depends on:** Epic 7
**Type:** `security`

Sub-items:
- Settings gear icon (top-right corner of topbar, never obtrusive)
- Settings modal with 4 tabs: Profile / LLM / Theme / Job & Interests
- `LlmCredential` table with encrypted `apiKey` column (AES-256-GCM)
- Crypto module `src/server/crypto.ts` with HKDF per-user subkey
- Provider adapters: `src/server/llm/openai.ts`, `anthropic.ts`, `lmstudio.ts`
- Unified `generateDailyContent(userId, iso)` orchestrator
- Web fetch utility `src/server/fetch.ts` with SSRF guard, Readability, jsdom
- Per-user manual refresh rate limit (3 / day)
- Settings UI never returns plaintext key; shows last-4 only
- Acceptance: keys stored encrypted, can decrypt in LLM call, refresh writes new DailyContent row

---

## Epic 9 — Onboarding + LMS Bundle Script
**Milestone:** `phase-9-onboarding`
**Depends on:** Epic 8

Sub-items:
- Onboarding wizard (multi-step): Name → Roles → Content interests → Spiritual prefs → Starter goals → LLM choice → Refresh time
- `Pref.onboardedAt` flag controls redirect to wizard on first auth
- `scripts/setup-lms.ts` — detect `lms` binary, print install instructions if missing, run `lms server start --port 1234`, pull a default model with `lms get`
- Onboarding "Test connection" button hits each provider's "list models" or equivalent
- Acceptance: a brand-new user lands on the wizard, completes it, lands on a populated dashboard with seeded goals + valid LLM config

---

## Epic 10 — LLM Scheduler
**Milestone:** `phase-10-scheduler`
**Depends on:** Epic 8
**Type:** `security`

Sub-items:
- `RefreshLog` table (audit + idempotency by `(userId, iso)`)
- Local: `node-cron` ticking every minute, comparing `now` to each user's `Pref.refreshTime`
- Railway: `/api/cron/refresh-all` endpoint, called by Railway cron at the user's local time (or hourly + per-user time-zone math)
- Endpoint guard: `Authorization: Bearer ${CRON_SECRET}` required
- Cold-start catch-up: on app boot, scan users whose last `RefreshLog` for today's `iso` is missing and run inline
- Manual override path documented
- Acceptance: refresh fires at configured time, dedup works, missed refresh fires on next boot

---

## Epic 11 — Calendar Navigation + Weekend Mode
**Milestone:** `phase-11-calendar-weekend`
**Depends on:** Epic 5

Sub-items:
- Hero gains prev / next / date-picker controls
- Past days render read-only (banner on the panel saying "Viewing <date> — read only")
- "Today" button to snap back
- Weekend detection (`getDay()` returns 0 or 6) applies `data-mood="weekend"` to root
- Weekend panel layout: replaces Business with a "Sunday Slow" pane (call-a-friend / read-novel / no-screens prompt). Configurable per user (Phase 12).
- Acceptance: nav works, past read-only enforced, weekend variant cosmetically distinct

---

## Epic 12 — Additional Themes + Friends & Family Stub
**Milestone:** `phase-12-themes-friendsfamily`
**Depends on:** Epic 1 (themes only need tokens) and Epic 11 (weekend hooks into the F&F card)

Sub-items:
- Theme variants: `warm` (sepia), `forest` (deep green), `midnight` (true black) — added to `globals.css`
- Settings → Theme tab swaps between them; `mm_theme` cookie carries the value
- "Friends & Family" card on Personal panel — placeholder copy, "Coming soon" badge, link to a Notion-style note that survives reload (data-only, no LLM)

---

## Epic 13 — Railway Deploy
**Milestone:** `phase-13-railway`
**Depends on:** Epic 7, Epic 10
**Type:** `infra`, `security`

Sub-items:
- Provider switcher: schema generation script that swaps `provider = "sqlite"` ↔ `"postgresql"` based on `DATABASE_PROVIDER`
- `railway.json` (build, start, healthcheck)
- Migration on deploy: `pnpm prisma migrate deploy` in start command
- Railway env wiring (DATABASE_URL injected, APP_ENCRYPTION_KEY, AUTH_SECRET, CRON_SECRET, OAuth secrets per provider)
- Healthcheck endpoint `/api/health` (DB ping + version)
- Boot guard enforced (Railway must be `AUTH_MODE=full`)
- Custom domain notes in `docs/deploy-railway.md`
- Acceptance: deploy from `main` produces a working URL with full login

---

## Epic 14 — Hardening, Security Review, E2E
**Milestone:** `phase-14-hardening`
**Depends on:** Epic 13
**Type:** `security`, `test`

Sub-items:
- CSP, HSTS, secure-cookie defaults
- CSRF tokens on all server actions (Auth.js handles this automatically; verify with test)
- Rate-limit middleware (`@upstash/ratelimit` or in-memory for local)
- `AuditLog` table + writes from goal/task/journal mutations
- PR auto-labeler for security-sensitive paths
- `pino` logger + redaction of sensitive keys
- Playwright E2E covering golden path: login → onboarding → mark goal → journal → see scripture biased → toggle theme → log out
- Threat-model review against `docs/security.md`
- Penetration test checklist (OWASP Top 10) — documented pass/fail per item

---

## How These Become GitHub Issues

For each sub-item above, an Issue is created with:
- Title: `[phase-N] short description`
- Body: link to plan task (when applicable), acceptance checkboxes
- Labels: `phase-N`, `area:<scope>`, optionally `type:security` / `type:test`
- Milestone: `phase-N-<slug>`
- Assignee: repo owner

When a phase's plan file is written (always immediately before that phase begins), every Task in the plan is created as an Issue, replacing or augmenting the preview list above.

Phase 1's Issues are created at repo init alongside the plan and milestones.
