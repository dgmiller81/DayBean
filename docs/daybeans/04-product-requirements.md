# 04 · Product Requirements

> Brand voice is woven into copy, not just colors. Every story below has a
> "Voice cue" line — the one place a writer should hold the line.

## 4.1 Epic map (10 epics, 4 priorities)

| Pri | Epic | One-line goal | Branding hook |
|-----|------|---------------|---------------|
| **P0** | [E1 · Morning Brew](#epic-1--morning-brew) | One curated page generated for the user every morning | "We're brewing your morning." |
| **P0** | [E2 · Pour Over](#epic-2--pour-over-mindful-soul) | Mindful Soul tab — verse, reflection, breath, custom-content for non-religious users | "Pour Over" |
| **P0** | [E3 · Daily Grind](#epic-3--daily-grind-professional) | Professional tab — curated to job, role, industry | "Daily Grind" |
| **P0** | [E4 · Slow Sip](#epic-4--slow-sip-personal) | Personal tab — family, finance, hobbies, work-life | "Slow Sip" |
| **P0** | [E5 · Bean Count](#epic-5--bean-count-goals-overview) | Goals overview tab with rings + heatmap | "Bean Count" |
| **P0** | [E6 · The Journal Listens](#epic-6--the-journal-listens) | Journal entries quietly bend tomorrow's content | The killer feature |
| **P1** | [E7 · Bean Streaks & Coffee Rewards](#epic-7--bean-streaks--coffee-rewards) | Streak system tied to real coffee partner rewards | Marketing engine |
| **P1** | [E8 · Themes & Custom Mornings](#epic-8--themes--custom-mornings) | 15 themes + custom wallpaper + overlay slider | Visual delight |
| **P1** | [E9 · The First Pour](#epic-9--the-first-pour-onboarding) | Onboarding that captures persona, hobbies, faith, role | Welcome ritual |
| **P2** | [E10 · Account, Privacy & Export](#epic-10--account-privacy--export) | LLM-key BYO, JSON export, account deletion | Trust contract |

---

## EPIC 1 · Morning Brew

> **Goal**: Each morning, the user opens DayBeans and finds a single page already
> brewed for them — date, subhead, scripture/opening, today's article picks,
> goal status. Generation is automatic, scheduled, and reasoning is journal-aware.

### Branding integration
- Loading state: a single steam-wisp animation with copy *"Brewing your morning…"* (max 3 seconds; never show a spinner).
- The hero subhead changes per session phase: *"Pour first."* / *"Steady pour."* / *"That's a good cup."* depending on time-of-day.

### User stories

#### US-1.1 — As any user, I want my morning page to be generated automatically before I open it.
- **Acceptance**:
  - Refresh runs at user's chosen `refreshHour` (default 4am local).
  - On cold start past `refreshHour`, if no successful refresh today, generation runs synchronously and the user sees fresh content within 4s.
  - Failure leaves yesterday's content visible with a quiet "couldn't refresh" badge in the topbar.
- **Voice cue**: error states never apologize. *"We couldn't brew this morning's batch — yesterday's still warm."*

#### US-1.2 — As a user with a custom LLM key, I want my key to be the source of all generation.
- **Acceptance**: BYO key in settings (OpenAI, Anthropic, LM Studio, OpenRouter); env override available for self-hosters.
- **Voice cue**: helper copy *"Your key. Your beans. Your bill."*

#### US-1.3 — As a user, I want today's content to never duplicate stories across sections.
- **Acceptance**: Cross-section URL deduplication runs at refresh and at read time. Priority order: topStories > Pour Over articles > Daily Grind articles > Slow Sip > scan > quotes.

#### US-1.4 — As a user, I want fresh content every morning *even when the LLM call fails*.
- **The mechanism — dual-run resilience**:
  - **5pm pre-brew (yesterday):** at 5pm local time, DayBeans pre-generates *tomorrow's* content and stores it as the **backup** for tomorrow's date. This run never overwrites the day the user is currently looking at.
  - **Morning brew (today, at user's `refreshHour`):** the regular generation runs. If it succeeds, its output becomes the **primary** content for today and is what the user sees.
  - **Read time (when user opens the app):** prefer primary; if missing or invalid, fall back silently to the backup; if both are missing, fall back to the static fixture and surface a quiet topbar badge.
- **Acceptance**:
  - At any wall-clock minute, at most ONE of (primary, backup, fixture) renders for a given (user, day).
  - Switch between them is invisible — no flash, no different layout, no apology copy.
  - When primary fails AND backup is used, the user sees the same UI; only Settings → Last refresh shows that today is backup-served.
  - When *both* fail, the topbar badge shows *"Today's brew didn't drop. Yesterday's still warm."* and previous day's content stays visible.
- **Voice cue**: We never tell the user *which* run they're seeing in the main UI. The two are interchangeable from a user's perspective. Status info lives in Settings only.

#### US-1.5 — As a user, the 5pm pre-brew should never overwrite the content I'm looking at right now.
- **Acceptance**:
  - The 5pm cron writes to `DailyContent.backupContentJson` for `iso = tomorrow`. It never touches `iso = today`.
  - If the user opens the app at 5:01pm and triggers a manual refresh, that's a *primary* refresh for today; it doesn't collide with the backup-write for tomorrow.
  - Concurrency: backup-write uses `upsert`-by-(`userId`, `iso`) so multiple safety-net runs (e.g. retries) are idempotent.

#### US-1.6 — As an admin/operator, I want to see which run produced today's content for any user.
- **Acceptance**:
  - `RefreshLog` rows tagged with `phase: 'morning' | 'evening-prebrew' | 'cold-start' | 'manual'`.
  - Admin panel surfaces success rate per phase; alerting at >5% morning-failure rate over a 24h window.
  - User-facing settings show "Last refresh: 6:42am · primary" or "Last refresh: 4:00am · primary failed; backup served from 5:02pm yesterday."

#### US-1.7 — As a user, I want the system to never burn money pre-brewing for me when I'm not engaged.
- **Acceptance**:
  - Pre-brew skips users who haven't opened the app in 7 days.
  - Pre-brew skips users on the free tier whose monthly LLM budget is exhausted.
  - On reactivation (user opens app after a quiet period), a manual refresh kicks in immediately — they get fresh content within 4s.

---

## EPIC 2 · Pour Over (Mindful Soul)

> **Goal**: A quiet, slow, intentional opening — verse, reflection, prayer/affirmation,
> breath timer, and an article-or-three picked from the user's faith preference (or none).

### Branding integration
- Tab name is **Pour Over**; eyebrow under it says *"Mindful Soul."*
- Atheist/agnostic users see *"Or, just breathe"* card instead of the verse — same UX, different content.
- Faith users see scripture in their preferred translation; the prompt biases toward themes the user has journaled about.

### User stories

#### US-2.1 — As a Christian user, I want to read scripture that matches my week's themes, not random verses.
- **Acceptance**: prompt biases scripture choice toward `recentJournalThemes`; never repeats a verse within a 30-day window.

#### US-2.2 — As a non-religious user, I want to skip scripture entirely.
- **Acceptance**: When `pref.faith === "none"`, scripture card hides; affirmation/breath card replaces it. Prompt drops scripture generation.

#### US-2.3 — As a user, I want a breath timer with options (box, 4-7-8, equal).
- **Acceptance**: Timer with selectable patterns; visual breath ring expands/contracts; mute toggle for audio cues.

#### US-2.4 — As a journaler, I want to type a thought into Pour Over and have it count toward today's reflection.
- **Acceptance**: Journal entry on Pour Over is mirrored as a `JournalEntry` row; counts in Bean Count's heatmap; surfaces in tomorrow's content (see Epic 6).

#### US-2.5 — As a user, I want the prayer/reflection block to be a real reflection, not generic.
- **Acceptance**: Prompt includes recent journal excerpts (themes only, not quotes); generates a 3–6 sentence reflection that names the feeling, never the verbatim journal text.
- **Voice cue**: *"Naming the feeling is good. Quoting the diary is creepy."* (For prompt + ENG.)

---

## EPIC 3 · Daily Grind (Professional)

> **Goal**: Curated professional content for the user's actual job and interests —
> not generic "tech news." Sarah-the-CEO sees one set; Marcus-the-carpenter sees
> a wildly different one.

### Branding integration
- Tab name: **Daily Grind** (deliberate double meaning — professional grind + coffee grind).
- Loading state for content refresh: *"Grinding fresh…"* with a coffee-grinder steam motif.

### User stories

#### US-3.1 — As a CEO, I want stories about my industry, my role, and my company stage — not generic Hacker News.
- **Acceptance**: Onboarding captures `jobTitle`, `industry`, `companyStage`, `interests[]`. Prompt uses all four.
  - Example: jobTitle="founder/CEO", companyStage="series-b", industry="b2b saas" → stories about pricing pressure, board prep, founder finance, etc.

#### US-3.2 — As a master carpenter, I want craft-trade content, not Series-B hot takes.
- **Acceptance**: Same prompt machinery, jobTitle="carpenter", interests=["japanese joinery","custom furniture","trade tools"] → curates Festool releases, hardwood pricing, technique tutorials.

#### US-3.3 — As any user, I want a "Quick Scan" of 6–8 source-linked headlines I can read in 90 seconds.
- **Acceptance**: scan items rendered as click-through links with bookmark/share affordance; deduplicated against topStories.

#### US-3.4 — As a user, I want the tab to remember what I've already clicked.
- **Acceptance**: Click-tracking already exists (`Click` table). Use it to suppress repeat URLs in next 30 days unless the topic resurfaces in the user's journal.

#### US-3.5 — As a developer/engineer user, I want trending repos and dev quotes.
- **Acceptance**: Optional "developer mode" toggle in settings; when on, repos + dev quotes section appears at the bottom of Daily Grind.

---

## EPIC 4 · Slow Sip (Personal)

> **Goal**: Personal-growth content that meets the user where they are — family,
> finance, partner, friendships, fitness, hobbies, faith. Three small reads per
> day, plus rotating section cards.

### Branding integration
- Tab name: **Slow Sip**, eyebrow *"Personal."*
- Section copy uses the family of words: *steep, sip, savor, linger.* Never *crush, hustle, dominate.*

### User stories

#### US-4.1 — As a parent, I want content that helps me show up better at home.
- **Acceptance**: Onboarding asks "Anyone you live with?" with options (partner, kids, parents, roommates, alone). Prompt biases personal articles toward the answer.
  - "Kids" → parenting research, screen-free dinner ideas, presence-focused habits.
  - "Alone" → friendship building, solo-living finance, hobby development.

#### US-4.2 — As any user, I want to track personal goals tied to growth, not gym selfies.
- **Acceptance**: Goal types: `count` (e.g. "phone-free dinners"), `time` (e.g. "shop time / week"), `check` (e.g. "called mom"). Goals roll up to Bean Count.

#### US-4.3 — As a hobbyist, I want hobby-specific curation, not Pinterest-generic.
- **Acceptance**: Onboarding captures `hobbies[]` from a free-text + suggested-tags input. Prompt produces hobby-tier articles in the Slow Sip rotation.

#### US-4.4 — As a user, I want a finance check-in that's encouraging, not scoldy.
- **Acceptance**: Optional finance-mode in settings (BYO numbers — no bank integration ever). User enters: net worth, cash, savings rate. We surface progress vs. their own targets, never benchmarks.
- **Voice cue**: *"Quietly, you're 62% there."* Never *"You're behind."*

#### US-4.5 — As a user, the personal section rotates so I don't see the same thing every day.
- **Acceptance**: Section card rotation among parenting / partner / finance / friendships / hobbies / faith / fitness — daily seeded from the user's journal themes + a fairness rule (no section repeats 3 days running).

---

## EPIC 5 · Bean Count (Goals Overview)

> **Goal**: A whole-life view that shows how the user is showing up — across all
> tabs — without ever being a guilt machine.

### Branding integration
- Tab name: **Bean Count.** *"Each cell = a day's brew."*
- Color: crema gold for filled cells (not sage), reinforcing the brand identity.
- Streak visualization uses literal coffee bean shapes for streak >= 7 days.

### User stories

#### US-5.1 — As a user, I want to see my goal completion across all sections in one place.
- **Acceptance**: Rings show: today, last 7 days, last 30 days, best streak. Heatmap shows last 60 days, with cell intensity = % of day's goals met.

#### US-5.2 — As a user, I want each heatmap cell to also show how many journal entries I made that day.
- **Acceptance**: Per-cell journal-count overlay (already implemented). Number color contrasts against cell shade.

#### US-5.3 — As a user, I want to drag-reorder my goals.
- **Acceptance**: All goals list supports HTML5 drag-reorder; `sortOrder` persists.

#### US-5.4 — As a user, I want to see my hobby progress alongside my professional goals.
- **Acceptance**: Goals from any section roll up here. Visual treatment is the same regardless of source — no professional/personal hierarchy.

---

## EPIC 6 · The Journal Listens

> **The killer feature.** This is what no competitor does. Document it like the
> crown jewel it is.

### The premise

The user types into the journal: *"I want to be present in my kid's life and not on my phone."*

Tomorrow, the user sees:
- **Pour Over**: Psalm 46:10 ("Be still…") and a reflection that names *presence*.
- **Slow Sip**: An article on "the case for boring evenings with your kids" pinned to the top.
- **Bean Count**: An auto-suggested goal *"phone-free dinner table · 30 days"* with one tap to accept.

This requires:
1. Theme extraction from journal entries (already prototyped in `journal-themes.ts`).
2. Theme weighting that emphasizes recent, repeated phrasings.
3. Prompt enrichment so every section knows the active themes.
4. Auto-goal suggestions based on journal phrases of intent ("I want to…", "I should…", "I keep…").

### Branding integration
- Marketing positions this as *"You journal it. DayBeans listens."*
- In-product, when a suggestion appears: *"Picked up from last night's journal."* — gentle attribution that proves we read it.

### User stories

#### US-6.1 — As a user, when I journal a struggle, tomorrow's Pour Over reflection should gently acknowledge it.
- **Acceptance**: Theme extractor identifies recurring nouns/verbs across last 14 days. Prompt receives top 6 themes with weights. Reflection includes 1+ theme by name.

#### US-6.2 — As a user, the system should never quote my journal verbatim back at me.
- **Acceptance**: Prompt explicitly forbids verbatim quotes. Acceptance test: 100 generated reflections, scan for >=4-word substrings present in source journal — must be 0.

#### US-6.3 — As a user, when I journal an intention ("I want to do X"), the system should suggest a goal for me.
- **Acceptance**: Phrase classifier (regex / small-LLM call) detects intent phrases. Generates a draft goal with title + cadence. User accepts/rejects/edits.

#### US-6.4 — As a user, I want to see what the system "heard" from my journal.
- **Acceptance**: Settings → Journal Themes shows the current top 8 themes with weights, and the option to mute any theme so it stops biasing content.

#### US-6.5 — As a privacy-conscious user, I need to know my journal stays mine.
- **Acceptance**: Journal text never leaves the database. Only abstracted theme tokens (e.g., `["presence", "rest", "anxiety"]`) are passed to the LLM. Settings page surfaces this clearly.
- **Voice cue**: *"Themes only. Themes never include your words."*

---

## EPIC 7 · Bean Streaks & Coffee Rewards

> **Goal**: Turn the streak into the marketing engine — actual coffee for actual
> consistency, via partnerships with chain and indie roasters.

### Branding integration
- Streak indicators are **literal beans** in the UI, not numbers in a circle.
- Partner names appear in the giveaway block; never as banner ads.

### User stories

#### US-7.1 — As a user, I want a 7-morning streak to earn me a real coffee voucher.
- **Acceptance**:
  - Streak counter accumulates each day a user completes at least 3 of their goals.
  - At 7 days, voucher offer appears in the topbar: *"7 mornings. Pick a roaster on us."*
  - User picks from this week's available partners (3–5 cities at launch).
  - Voucher is a single-use code emailed to the user, redeemable in-store or in-app at the partner.

#### US-7.2 — As a user, I want to see who's brewing this week.
- **Acceptance**: A small "Roaster of the Week" footer block on the landing page and in the app footer, pulled from a `Partner` table.

#### US-7.3 — As an admin, I want to manage roaster partners and voucher inventory.
- **Acceptance**: Admin UI (basic): add partner, set voucher count for the week, mark voucher as redeemed.

#### US-7.4 — As a user nearing a streak break, I want a quiet warning.
- **Acceptance**: When today's goal-completion is 0 and it's past 6pm local, the topbar shows a small *"Don't lose your beans."* nudge. **Never push notification.** Optional once-a-day email.

#### US-7.5 — As a corporate partner (Caribou), I want clean reporting.
- **Acceptance**: Weekly export: voucher counts redeemed, redemption rate, geographic distribution. Stays anonymous — never user names or journal data.

---

## EPIC 8 · Themes & Custom Mornings

> **Goal**: 15 themes + user-uploaded background images + theme-overlay opacity
> slider, all consolidated in Settings → Themes.

### Branding integration
- Theme picker live-previews the brand voice via swatch tones.
- "Dawn" is the canonical brand theme — used in marketing, presentations, app icon.

### User stories

#### US-8.1 — As a user, I want to choose a theme without committing to it permanently.
- **Acceptance**: Themes panel in Settings; click a card to preview live; persists on next interaction.

#### US-8.2 — As a user, I want to add my own background wallpaper.
- **Acceptance**: URL input for image; opacity slider blends theme color over the image; persisted in `Pref.bgImageUrl` and `Pref.bgOverlay`.

#### US-8.3 — As a user, I want the toggle in the topbar to be Light/Dark only.
- **Acceptance**: ThemeToggle is binary; full picker lives in Settings → Themes.

#### US-8.4 — As a user, I want my chosen theme to persist across sessions.
- **Acceptance**: Theme cookie + local read on mount. ThemesTab reads live theme from `documentElement.dataset.theme` so reopening Settings always shows the active theme highlighted.

---

## EPIC 9 · The First Pour (Onboarding)

> **Goal**: First-run experience that captures enough to make Daily Grind and
> Slow Sip feel custom on Day 1 — without feeling like a survey.

### Branding integration
- Onboarding is called *"Your First Pour."*
- Six steps, each titled with a brand voice cue.

### Onboarding flow

| Step | Title | Captures | UI |
|---|---|---|---|
| 1 | *"What should we call you?"* | name | Single field |
| 2 | *"What kind of work do you do?"* | jobTitle, industry, companyStage (if applies) | Dropdowns + free-text |
| 3 | *"What are you growing into?"* | hobbies[] | Tag picker (with suggestions: photography, woodworking, gardening, languages, music…) |
| 4 | *"Who's your morning company?"* | livesWith (partner, kids, alone, etc.) | Multi-select |
| 5 | *"What's your bean?"* | faith ("christian", "jewish", "muslim", "spiritual", "secular", custom) + scripturePref if applicable | Cards with cream highlights |
| 6 | *"Which morning do you want?"* | theme (Dawn / Dusk / etc.), refreshHour, optional bgImageUrl | Live preview |

### User stories

#### US-9.1 — As a new user, onboarding should take under 90 seconds.
- **Acceptance**: 6 steps, no required fields except name. Skip-able. Completion under 90s on average device.

#### US-9.2 — As a user, I want to come back and edit any of these later.
- **Acceptance**: Every onboarding answer maps to a Settings field. No "locked in" state.

#### US-9.3 — As a user, my Day 1 dashboard shouldn't look generic.
- **Acceptance**: First Daily Grind generation uses jobTitle + interests; first Slow Sip uses hobbies + livesWith; first Pour Over uses faith pref. If the user skipped a step, the section falls back to widely-loved defaults.

---

## EPIC 10 · Account, Privacy & Export

> **Goal**: A trust contract. The user owns their data. We never break that.

### Branding integration
- Settings → Privacy uses direct voice (no metaphors). This is where we stop being clever.

### User stories

#### US-10.1 — As a user, I want to export everything I've put in.
- **Acceptance**: Settings → Export. Generates a JSON file of: profile, goals, journal entries, bookmarks, day records, theme prefs, click history. Email link valid 24h.

#### US-10.2 — As a user, I want to delete my account.
- **Acceptance**: Settings → Delete account. Two-step confirmation. All `User`-related rows deleted (cascade already wired in Prisma).

#### US-10.3 — As a user, I want to know exactly what leaves my device.
- **Acceptance**: Privacy page lists: what's stored locally (drafts, settings cache), what's stored in DB (journal text, goals, bookmarks), what goes to LLM provider (themes only, never raw journal), what goes to partners (anonymous voucher counts).

#### US-10.4 — As a user, I want to bring my own LLM key.
- **Acceptance**: Settings → LLM Provider. Encrypted at rest. Tested with a "verify connection" button before saving.

---

## 4.2 Acceptance criteria common to all stories

- **Reduced motion**: any decorative animation respects `prefers-reduced-motion: reduce`.
- **Keyboard navigable**: every interactive surface reachable via Tab; focus rings visible.
- **Screen-reader sane**: every icon-only button has `aria-label`; live regions for streak/voucher status changes.
- **Offline-friendly**: yesterday's content is shown if today's hasn't refreshed.
- **No telemetry without consent**: opt-in only.

## 4.3 Definition of Done (for any story)

- [ ] Implementation matches acceptance criteria
- [ ] TypeScript clean (`tsc --noEmit`)
- [ ] Tested in Dawn theme + at least one dark theme (Dusk)
- [ ] Tested at 375px (iPhone), 768px (tablet), 1280px (laptop)
- [ ] Voice cue copy reviewed by brand owner
- [ ] No `console.error` / `console.warn` introduced
- [ ] Reduced-motion path tested
