# Morning Mindfulness Dashboard — Specification

**Owner:** Dallas Miller
**Target environment:** Claude Code (single-page app, no backend)
**Reference implementation:** `morning-mindfulness-dashboard.html`
**Status:** v1 spec, intended to be authoritative for a fresh build

---

## 0. How to read this spec

This document is organized around **subsystems**. Each subsystem is independently implementable and has:

1. A short **purpose** statement
2. A **data model** (localStorage shape and/or in-memory shape)
3. A **behavior contract** (what it does, what triggers it)
4. **Acceptance criteria** (a checklist a reviewer could verify)

Two cross-cutting subsystems were called out as priorities and have extra detail:

- **§7 Goals & Tasks Tracking** — one model serves goals on every panel + the slide-up tasks drawer + the overview rollup
- **§9 Journal → Scripture Recommendation** — the loop where what the user writes today biases what scripture appears tomorrow

If you are recreating in Claude Code from scratch, you may want to build in this order: §3 Design System → §6 Storage → §7 Goals → §10 Articles → §9 Scripture → §8 Journal → §11 Stat widgets → §12 Heatmap → §13 Drawer → §14 Bible modal → §15 Breath. The reference HTML file demonstrates final assembly.

---

## 1. Product overview

A daily morning dashboard with four sections:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Mindfulness** | Begin the day with prayer, KJV scripture, rotating reflections, journal, mindfulness goals, breath practice |
| 2 | **Business / AI** | Curated AI/engineering content, top stories of the day, GitHub buzz, dev quotes, business goals |
| 3 | **Personal** | Financial inputs, health toggles, disconnect minutes, win-of-the-day, self-help reading, personal goals |
| 4 | **Goals Overview** | Whole-life rollup: progress rings, 60-day heatmap, per-section progress bars, filterable master goals list |

A **floating "Tasks" button** (bottom-right) opens a slide-up drawer that contains a quick-add task input plus a "view all goals" tab.

A **theme toggle** (top-right) switches light/dark.

The dashboard is **anchored to today**. There is no date scrubbing — past days exist only as colored cells in the heatmap (motivation), and content (articles, scripture, reflections, prayer) only displays for the current date.

---

## 2. Architecture

| Constraint | Decision |
|---|---|
| Backend | None. Single self-contained `index.html`. |
| Persistence | `localStorage` only. |
| Network at runtime | None required (Google Fonts optional). All daily content is embedded as a JSON `<script type="application/json">` block. |
| Dependencies | None. No build step. Plain HTML + CSS + JS. (Optional: Google Fonts for Fraunces + Inter.) |
| Refresh model | A human (or Claude) edits the embedded `DAILY_CONTENT` JSON each morning. The page re-reads it on load. |

The file's structural layout, in order:

```
<head> (CSS variables, base styles, component styles)
<body>
  <script id="daily-content-data" type="application/json">{...DAILY_CONTENT...}</script>
  <div class="app">
    Topbar (brand, streak pill, theme toggle)
    Hero (greeting, date, sub)
    Tabs (4 buttons)
    Panel: Mindfulness   (default visible)
    Panel: Business
    Panel: Personal
    Panel: Goals Overview
    Closing affirmation
  </div>
  Floating "Tasks" FAB
  Drawer scrim + drawer aside (Tasks tab + All-goals tab)
  Bible modal scrim + modal
  Toast
  <script>...all logic...</script>
</body>
```

---

## 3. Visual design system

### 3.1 Aesthetic

Warm, calm, bookish. Cream paper background, sage green and gold accents, deep ink text. Inspired by the original "Stillpoint" mindfulness dashboard. Both light and dark modes are first-class.

### 3.2 Type

| Role | Family | Weights |
|---|---|---|
| Display / serif | **Fraunces** (Google Fonts), fallback `Georgia, 'Times New Roman', serif` | 300, 400, 500, 600, 700 |
| Body / UI | **Inter** (Google Fonts), fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | 300, 400, 500, 600, 700 |

Use serif (`.serif` class or `font-family: 'Fraunces',serif`) for: hero date, card titles, reflection titles, scripture passage, scripture references, ring-stat numerals, prayer body, journal `<textarea>`. Inter for everything else.

### 3.3 CSS color tokens

Define both themes via CSS variables on `:root` and `[data-theme="dark"]`:

```css
:root {
  --bg:#f5f2ec; --bg-grad-1:#f7f3ec; --bg-grad-2:#ebe7df;
  --surface:rgba(255,255,255,0.74); --surface-solid:#fff; --surface-2:#fafaf6;
  --ink:#1a1f1c; --ink-soft:#5a655e; --ink-muted:#8a948d;
  --line:rgba(35,50,42,0.08); --line-strong:rgba(35,50,42,0.16);

  --sage:#5d7a6c; --sage-deep:#3e5a4d; --sage-soft:#dde6df;
  --gold:#b08d57; --gold-soft:#e8dec9; --rose:#c97b6e;
  --accent:#c2410c;             /* orange — Business/Pulse */
  --accent-soft:#fef0e6;

  /* Bible-paper palette */
  --paper:#f4ead8; --paper-2:#ede0c4;
  --paper-ink:#3a2e1c; --paper-line:#c9b48a;

  --shadow-sm:0 1px 2px rgba(20,30,25,.04),0 2px 8px rgba(20,30,25,.04);
  --shadow-md:0 2px 4px rgba(20,30,25,.05),0 12px 32px rgba(20,30,25,.06);
  --radius:18px; --radius-sm:10px;
}
[data-theme="dark"] {
  --bg:#131614; --bg-grad-1:#161a18; --bg-grad-2:#0e110f;
  --surface:rgba(28,33,30,0.72); --surface-solid:#1c211e; --surface-2:#20251f;
  --ink:#ece7da; --ink-soft:#a8b1aa; --ink-muted:#6f7872;
  --line:rgba(236,231,218,0.08); --line-strong:rgba(236,231,218,0.18);
  --sage:#95b3a2; --sage-deep:#b8d3c3; --sage-soft:rgba(149,179,162,0.15);
  --gold:#d3b070; --gold-soft:rgba(211,176,112,0.18);
  --accent:#f97316; --accent-soft:#2d1d10;
  --paper:#1f1a12; --paper-2:#251f15;
  --paper-ink:#e8dcbf; --paper-line:#5a4626;
}
```

Body background uses two radial gradients layered over a vertical linear gradient (sage at top, gold at right, deep cream beneath). Fixed background-attachment for atmosphere on scroll.

### 3.4 Iconography

**No emojis.** Every visual indicator is an inline SVG (Lucide-style stroke icons, `viewBox="0 0 24 24"`, `stroke-width:1.6` to `2.5`).

Reusable classes:

```css
.ic     { width:16px; height:16px; flex-shrink:0; vertical-align:-2px; }
.ic-sm  { width:12px; height:12px; }
.ic-lg  { width:20px; height:20px; }
```

**Section indicators** are colored dots, not glyphs:

```css
.sec-dot { display:inline-block; width:8px; height:8px; border-radius:999px;
           margin-right:8px; vertical-align:1px; flex-shrink:0; }
.sec-mindfulness { background: var(--sage); }
.sec-business    { background: var(--accent); }
.sec-personal    { background: var(--gold); }
.sec-general     { background: var(--ink-muted); }
```

For the section progress rows in Goals Overview, use `.sec-icon` (a circular badge containing the section's SVG).

### 3.5 Component primitives

| Class | Purpose |
|---|---|
| `.card` | Base content card — surface-solid, line border, radius 18, shadow-sm, hover lifts to shadow-md |
| `.card-header` | Flex row with eyebrow + title on left, optional metadata on right |
| `.card-eyebrow` | Small caps, gold, letter-spacing 0.16em, weight 600 |
| `.card-title` | Fraunces serif, 1.35rem, weight 500 |
| `.pulse-hero` | Wider hero card with subtle accent gradient — used for Business + Personal + Goals Overview tops |
| `.god-card` | Special hero for Daily God prayer — gold radial overlay, embedded `.prayer` blockquote |
| `.scripture-card` | Parchment-toned tappable card on Mindfulness — opens Bible modal |
| `.article-card` | Anchor styled as card, with optional badges, title, summary, source |
| `.top-card` | Larger article card variant for the 3 top stories on Business |
| `.quote-card` | Blockquote with gold left border, used for dev quotes |
| `.repo` | Row layout for GitHub repos |
| `.stat-card` | Small fixed-height card for Personal stat widgets |
| `.goal` | Row with check, name, progress, optional streak, optional remove |
| `.task-item` | Drawer task row |
| `.fab` | Fixed bottom-right, sage circle |
| `.drawer` | Bottom sheet, slides up |
| `.bible-page` | Modal interior styled as Bible paper |
| `.toast` | Bottom-right transient message |

### 3.6 Animations

```css
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

.panel.active { animation: fadeUp .45s ease both; }
.bible-modal.show { animation: fadeIn .25s ease; }
.bible-scrim.show { animation: fadeIn .2s ease; }
```

Drawer: `transform: translateY(100%)` → `translateY(0)` on `.open`, `transition .35s cubic-bezier(.2,.8,.2,1)`.

---

## 4. Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  Brand · Stillpoint × Pulse · for Dallas       [streak] [theme]  │
├───────────────────────────────────────────────────────────────────┤
│  Good morning, Dallas                                              │
│  Friday  May 1, 2026                                               │
│  A new month. A clean page.                                        │
├───────────────────────────────────────────────────────────────────┤
│  [Mindfulness] [Business/AI] [Personal] [Goals Overview]           │
├───────────────────────────────────────────────────────────────────┤
│  active panel content                                              │
│                                                                    │
│  closing affirmation                                               │
└───────────────────────────────────────────────────────────────────┘
                                                       [✓ Tasks]
```

Container: `max-width:1180px; margin:0 auto; padding:32px 28px 100px;`

Tabs: 4-column grid on desktop, 2-column on mobile. Each tab is a card with a leading icon + eyebrow + name.

Panels: only one is `display:block` at a time, others `display:none`.

---

## 5. Daily content model

A single `<script id="daily-content-data" type="application/json">` block at the top of `<body>` holds **all date-bound content for today**. The page parses it on load.

```json
{
  "date": "2026-05-01",
  "subhead": "A new month. A clean page.",
  "god": {
    "opening": "<one paragraph of opening reflection>",
    "prayer":  "<single-paragraph prayer text>",
    "carry":   "<one short carry-this-thought line>"
  },
  "mindfulness": {
    "articles": [
      { "title": "...", "source": "...", "url": "...", "summary": "..." }
    ]
  },
  "business": {
    "headline": "<one-sentence edge-of-day>",
    "briefing": "<HTML allowed; <strong> for the lead phrase>",
    "topStories": [
      { "kind": "lead" | "",
        "eyebrow": "Story of the day",
        "badges": [["b-product","Product"],["tag","Microsoft"]],
        "title": "...", "body": "...", "url": "...", "src": "domain.com" }
    ],
    "scan": ["headline 1", "...", "headline 8"],
    "articles": [
      { "badges": [["b-model","Model"],["tag","Anthropic"]],
        "title": "...", "summary": "...", "url": "...", "src": "anthropic.com" }
    ],
    "quotes": [
      { "text": "...", "source": "Author", "target": "context line", "url": "..." }
    ],
    "repos": [
      { "name": "OpenClaw", "org": "openclaw", "stars": "347K",
        "weekly": "+12K/day peak", "license": "MIT", "lang": "Python/TS",
        "pitch": "...", "url": "..." }
    ],
    "watchlist": ["item 1", "item 2", "item 3", "item 4"]
  },
  "personal": {
    "headline": "<one-sentence>",
    "motivation": { "text": "...", "author": "..." },
    "articles": [
      { "title": "...", "source": "...", "url": "...", "summary": "..." }
    ]
  }
}
```

**Refresh workflow:** to update tomorrow's content, regenerate this JSON block in place (do not touch goal/task/journal localStorage). The intent is that an LLM (Claude) updates this each morning by reading the previous block and writing a new one of the same shape.

Note: the **scripture** for the day is **not** in `DAILY_CONTENT`. It is computed at runtime from the `SCRIPTURES` library (§9) plus journal-driven theme bias. This is deliberate so that the user's journal can bend the next day's pick without a content refresh.

---

## 6. Storage

All persisted state lives in `localStorage` under a small set of keys. Use a thin `lsGet`/`lsSet` wrapper around JSON.parse / stringify.

| Key | Shape | Notes |
|---|---|---|
| `mm_theme` | `'light' \| 'dark'` | Toggled by header button |
| `mm_goals` | `Goal[]` | Single source of truth across all panels |
| `mm_tasks` | `Task[]` | Quick-add tasks shown in drawer |
| `mm_days` | `{ [iso]: DayRecord }` | Per-day check-ins, journal notes, health, disconnect, win, finance |
| `mm_clicks` | `{ [iso]: { mindfulness: N, business: N, personal: N } }` | Article click counts per section per day |
| `mm_filter` | `'all' \| 'mindfulness' \| 'business' \| 'personal'` | Goals Overview filter pill state |

Types:

```ts
type Goal = {
  id: string;          // 'g_god', 'g_learn', custom: 'g_min_<timestamp>'
  section: 'mindfulness' | 'business' | 'personal';
  title: string;
  type: 'check' | 'count' | 'time';
  target: number;      // 1 for check; e.g. 3 for "read 3"; e.g. 60 for "60 min"
};

type Task = {
  id: string;          // 't_<timestamp>'
  title: string;
  section: 'general' | 'mindfulness' | 'business' | 'personal';
  done: boolean;
  createdAt: number;   // Date.now()
  completedOn?: string;// ISO date, set when toggled to done
};

type DayRecord = {
  goals: { [goalId: string]: boolean | number };
  notes: string;       // journal text
  health: { slept?: boolean; moved?: boolean; ate?: boolean };
  disconnect: number;  // minutes
  win: string;         // win-of-the-day text
  fin: { net: string; cash: string; invest: string };
};
```

`getDay(iso)` is a memoized accessor that creates the record on first read and back-fills missing sub-shapes for older saved data.

Today is always `todayISO()`. Past days are read-only (the UI does not navigate to them).

---

## 7. Goals & Tasks tracking (cross-cutting subsystem)

> This was called out as the priority subsystem. It is the spine of the app.

### 7.1 Goals — single source of truth

`state.goals` is a flat array of `Goal` records. Every panel that shows goals filters this array by `section`. The Goals Overview tab shows the same array, optionally filtered by `state.filter`. The drawer's "All goals" tab shows the entire array unfiltered.

**Default goals** (seeded on first run; user can delete custom ones):

| ID | Section | Title | Type | Target |
|---|---|---|---|---|
| `g_god` | mindfulness | Time with God / prayer | check | 1 |
| `g_meditate` | mindfulness | Meditate (5+ minutes) | check | 1 |
| `g_present_kids` | mindfulness | Be fully present with my kids | check | 1 |
| `g_family` | mindfulness | Connect with family or a friend | check | 1 |
| `g_no_overcommit` | mindfulness | Said no to something I should have | check | 1 |
| `g_selfless` | mindfulness | One selfless act today | check | 1 |
| `g_walk` | mindfulness | Walk Parker & Kittle without my phone | check | 1 |
| `g_mf_read` | mindfulness | Read 1 mindfulness article | count | 1 |
| `g_learn` | business | Continuous improvement — read 3+ AI articles | count | 3 |
| `g_strategy` | business | 30 min on AI strategy & competitive scanning | check | 1 |
| `g_customer` | business | Talk to a customer (call, email, shadow) | check | 1 |
| `g_product` | business | Move the top product bet forward by one step | check | 1 |
| `g_team` | business | Unblock or coach one teammate | check | 1 |
| `g_demos` | business | Try one new AI tool / model / agent | check | 1 |
| `g_money` | personal | Check finances (YNAB / accounts) | check | 1 |
| `g_move` | personal | Move 30 minutes | check | 1 |
| `g_disconnect` | personal | Disconnect 60 minutes | time | 60 |
| `g_writing` | personal | Write something (memo, doc, post, journal) | check | 1 |
| `g_per_read` | personal | Read 1 self-help / motivation article | count | 1 |

### 7.2 Goal types

- **`check`**: 0/1 boolean per day. Toggling the row's checkbox flips `day.goals[id]` for today.
- **`count`**: integer counter per day, capped visually at `target`. Specific count goals are auto-incremented by other systems:
  - `g_mf_read` ← clicks to articles tagged `mindfulness`
  - `g_per_read` ← clicks to articles tagged `personal`
  - `g_learn` ← clicks to articles tagged `business`
  - All other count goals (custom) are incremented by tapping the row's checkbox (+1 per tap).
- **`time`**: minutes counter per day. The reserved `g_disconnect` is fed by the Disconnect widget (+15/+30/+60 buttons). Tapping the checkbox on a custom time goal records +15 min.

### 7.3 Computed values

```js
function progressFor(g, iso) {
  // returns { current, target, pct }
  if (g.type === 'check') ...
  if (g.type === 'count') {
    // wired counts come from state.clicks[iso][section]
    // custom counts come from day.goals[g.id]
  }
  if (g.type === 'time')  {
    // g_disconnect uses day.disconnect
    // others use day.goals[g.id]
  }
}

function streakFor(goalId) {
  // walks backward from today; counts consecutive days where progressFor >= 100%
}

function dailyStreak() {
  // walks backward from today; counts consecutive days where ANY goal hit 100%
}
```

The streak displayed in the topbar pill = `dailyStreak()`. Per-goal streak badges (the gold flame chip) appear only when `streakFor(g.id) > 0`.

### 7.4 Goal UI behaviors

- Each goal renders as a row: `[checkbox] [name + optional section dot] [N/T] [streak chip] [remove (custom only)]`
- Checkbox toggles per the type rules above
- "Add goal" exists per panel (check-type only) and inside the drawer (with section selector, type selector, target input)
- Custom goals (any not in `DEFAULT_GOALS`) get a hover-revealed remove button
- Goals Overview tab includes a filter row (`All / Mindfulness / Business / Personal`)
- Section progress bar on Overview = average `pct` of all goals in that section
- Section is identified by a colored dot (`.sec-dot.sec-{section}`)

### 7.5 Tasks — separate from goals

Tasks are **lightweight, ephemeral** — for "I should remember to do X today." They live in `state.tasks` and are shown in the drawer's "Tasks" tab.

UI:
- Quick-add form: text input + section selector (general / mindfulness / business / personal) + Add button
- Task row: `[checkbox] [section pill with dot] [title] [delete]`
- Sort: not-done first by `createdAt` desc, done last by `completedOn` desc
- FAB badge shows count of open (not-done) tasks

Tasks **count toward the daily streak** (any task completed today counts as activity for `dailyStreak()` — same rule as goals).

### 7.6 Acceptance criteria

- [ ] Default goals exist on first load, organized by section
- [ ] Toggling any check goal updates today's `DayRecord.goals[id]` and persists
- [ ] Clicking a Mindfulness article auto-credits `g_mf_read` (and similarly for Business/Personal)
- [ ] `+15` Disconnect button increments `day.disconnect` and is reflected in `g_disconnect` progress
- [ ] Per-goal streak badge appears once consecutive completions ≥ 1
- [ ] Custom goals can be added from any panel and from the drawer; only custom goals show a Remove button
- [ ] Goals Overview filter pills correctly subset the master list
- [ ] Tasks added from the drawer survive a page reload
- [ ] FAB count badge updates immediately on add/complete/delete
- [ ] Closing the drawer does not reset its tab; reopening shows the last tab

---

## 8. Journal subsystem

### 8.1 Purpose

A free-form daily reflection space. The text the user writes today **also feeds the scripture recommendation engine** (see §9). Editing the field auto-saves with debouncing and triggers a scripture re-evaluation.

### 8.2 UI

- Single `<textarea class="notes" id="daily-notes">` on the Mindfulness panel
- Placeholder text hints that mentioning themes (`humility`, `contentment`, `anxious`) influences future scripture picks
- A small `.save-status` line below shows "saving…" → "saved · HH:MM:SS"

### 8.3 Behavior

```js
const notesEl = document.getElementById('daily-notes');
let notesTimer;
notesEl.addEventListener('input', () => {
  getDay(today).notes = notesEl.value;
  showSavingIndicator();
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    persist();                  // writes mm_days
    showSavedIndicator();
    renderProgress();           // heatmap may light up
    renderScripturePreview();   // re-evaluate theme bias
  }, 500);
});
```

`loadNotes()` is called by `renderAll()` to populate the textarea from storage.

### 8.4 Acceptance criteria

- [ ] Typing reflects in `mm_days[today].notes` after 500ms idle
- [ ] Reload restores the saved notes
- [ ] Saving the journal triggers a scripture re-render (the theme line on the scripture card updates if a new keyword was added)

---

## 9. Scripture & Bible modal — Journal-driven recommendation engine

> This was called out as the second priority subsystem.

### 9.1 Two libraries

**A. `SCRIPTURES`** — array of KJV passages, each with `theme` (display name) and `themes` (keyword list).

```ts
type Scripture = {
  ref: string;             // "Philippians 4:11-13"
  theme: string;           // "Contentment" — display label
  themes: string[];        // ["contentment","content","peace","enough"] — keywords for matching
  passage: { v: number; text: string }[];   // KJV text by verse
  commentary: { title: string; body: string }[]; // 1–3 short commentary blocks
};
```

Seed library (12 entries — extend freely):

| Ref | Theme |
|---|---|
| Philippians 4:11–13 | Contentment |
| Micah 6:8 | Humility |
| Matthew 6:25–27, 33–34 | Anxiety |
| 1 Thessalonians 5:16–18 | Gratitude |
| Colossians 3:12–14 | Forgiveness |
| Proverbs 3:5–6 | Trust |
| Galatians 6:9 | Perseverance |
| Ephesians 6:4 | Fatherhood |
| Colossians 3:23–24 | Work |
| 2 Corinthians 9:7 | Generosity |
| Psalm 23:1–4 | Stillness |
| Psalm 46:10 | Stillness |

**B. `THEME_KEYWORDS`** — map of `themeName → keyword[]` used to scan journal text:

```js
const THEME_KEYWORDS = {
  Contentment: ["content","contentment","enough","satisfied","comparison","jealous","envy"],
  Humility:    ["humble","humility","pride","prideful","arrogant","ego"],
  Anxiety:     ["anxious","anxiety","worry","worried","stressed","overwhelm","fear","fearful","dread"],
  Gratitude:   ["grateful","gratitude","thankful","thanks","blessing","bless"],
  Forgiveness: ["forgive","forgiveness","grudge","resent","resentment","bitter","bitterness"],
  Trust:       ["trust","control","controlling","plan","uncertain","uncertainty","doubt"],
  Perseverance:["discipline","consistent","persevere","quit","give up","tired","weary","burnout"],
  Fatherhood:  ["kids","children","dad","father","cari","stace","parent","parenting"],
  Work:        ["career","work","job","sigmaera","project","team","leadership","ceo","cto","dale","bo"],
  Generosity:  ["generous","generosity","giving","selfless","tithe","share"],
  Stillness:   ["still","stillness","rest","quiet","silence","calm","sabbath"]
};
```

The keyword sets include user-specific tokens (kids' names, friends, company) so the dashboard can pick up references that aren't generic mood words.

### 9.2 Recommendation algorithm

```js
function recentJournalText(daysBack = 7) {
  // concatenate notes from today + last 6 days, lowercase
}

function themeWeights() {
  const text = recentJournalText(7);
  const weights = {};
  for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
    let count = 0;
    for (const kw of kws) {
      const re = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'g');
      const m = text.match(re);
      if (m) count += m.length;
    }
    if (count > 0) weights[theme] = count;
  }
  return weights;
}

function pickScripture() {
  const weights = themeWeights();
  const themed  = Object.keys(weights);
  let candidates = SCRIPTURES;
  if (themed.length) {
    const filtered = SCRIPTURES.filter(s => themed.includes(s.theme));
    if (filtered.length) candidates = filtered;
  }
  // Seed by date so the same passage shows all day
  const dayNum = Math.floor(new Date(today + 'T00:00:00').getTime() / 86400000);
  return {
    passage: candidates[dayNum % candidates.length],
    hint: themed.length ? themed[0] : null
  };
}
```

**Behavior summary:**

1. Read the last 7 days of journal text (today + 6 prior).
2. Tally keyword hits per theme. Themes with ≥1 hit are "active."
3. If at least one theme is active, restrict candidates to scriptures whose `theme` is in the active set.
4. Otherwise, all scriptures are candidates.
5. Pick deterministically by date (so the same passage shows across the day). Different days → different passage. Adding entries to a winning bucket changes the rotation.

This intentionally **does not** use any external API or LLM. The recommendation evolves *because the user's writing changes*, not because of a remote service.

### 9.3 Scripture preview card (Mindfulness panel)

Lives directly under the Daily God card. Parchment-toned `.scripture-card` with:

- Eyebrow "Daily scripture · KJV"
- Reference (e.g. "Philippians 4:11-13") in serif
- Snippet (first verse, truncated at ~140 chars, italic serif)
- Theme line — when a journal-driven hint is present, formatted as: `Theme: Contentment · biased by your journal (Contentment)`
- Right-side "Open ›" affordance
- Decorative book SVG on the left

Click (or Enter / Space when focused) opens the Bible modal.

### 9.4 Bible modal — design contract

A modal styled to evoke a printed Bible page.

Structure:

```
┌─────────────────────────────────────────────────────────────┐
│  HOLY BIBLE · KING JAMES VERSION         [theme pill]   ✕  │
│  Philippians 4:11-13                                        │
├──────────────────────────────┬──────────────────────────────┤
│  THE PASSAGE                 │  NOTES & COMMENTARY          │
│                              │                              │
│  ¹¹ Not that I speak in      │  Contentment is learned,     │
│     respect of want…         │  not given                   │
│  ¹² I know both how to be    │    Paul says he has 'learned'│
│     abased…                  │    to be content…            │
│  ¹³ I can do all things      │                              │
│     through Christ…          │  v.13 in context             │
│                              │    This famous verse…        │
├─────────────────────────────────────────────────────────────┤
│  Mention a theme in your journal…              [Close]      │
└─────────────────────────────────────────────────────────────┘
```

Visual rules:

- Background: parchment gradient (`var(--paper)` → `var(--paper-2)`) plus two soft radial darkening overlays at 30/20 and 70/80
- Border: `1px solid var(--paper-line)`, `border-radius: 8px`
- Drop shadow: `0 40px 100px rgba(0,0,0,.65)` plus `0 0 0 1px rgba(58,46,28,.18)`
- Scrim: `rgba(20,15,5,.78)` plus `backdrop-filter: blur(3px)`
- Two equal columns (stacked on narrow viewports). Left has class `bible-col` for passage, right for commentary, separated by `1px solid var(--paper-line)`
- Verse numbers: small caps, gold (`color: var(--gold)`), Inter (sans), `vertical-align: super`. Renders as `<span class="verse-num">11</span>`
- Passage text: Fraunces serif, 1.05rem, `line-height: 1.85`, indented hanging verse layout via `padding-left: 1.6em; text-indent: -1.6em;`
- Commentary: section title (Fraunces 1rem) + paragraph (0.92rem, line-height 1.65)
- Footer: hint text on left, Close button on right
- Close: ✕ button (top-right of head), Close button (footer), scrim click, or `Escape` key

### 9.5 Acceptance criteria

- [ ] Scripture preview shows today's pick on Mindfulness panel
- [ ] Snippet uses first verse of the passage, truncated with ellipsis if needed
- [ ] When journal mentions e.g. "humble," the theme line appends `· biased by your journal (Humility)` and the next render picks a Humility-tagged passage
- [ ] Modal opens from the card, the Open chevron, and via keyboard (Enter/Space when card focused)
- [ ] Modal is a true overlay with strong scrim — content behind is not visually competing
- [ ] Verse numbers render in gold superscript; passage in serif
- [ ] Modal closes on ✕, footer Close, scrim click, or Escape
- [ ] Adding a new entry to `SCRIPTURES` makes it eligible the next time `pickScripture()` runs
- [ ] Adding a new keyword to `THEME_KEYWORDS` immediately changes detection (no rebuild)

---

## 10. Article click tracking

Every article-card style anchor (Mindfulness reading, Business articles, top stories, repos, dev quotes, Personal reading) has a `data-track-cat="<section>"` attribute. A document-level click handler:

```js
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-track-cat]');
  if (!a) return;
  const sec = a.dataset.trackCat;
  state.clicks[today] ||= {};
  state.clicks[today][sec] = (state.clicks[today][sec] || 0) + 1;

  // Auto-credit the section's "read N articles" goal
  const map = { g_mf_read:'mindfulness', g_per_read:'personal', g_learn:'business' };
  for (const gid of Object.keys(map)) {
    if (map[gid] !== sec) continue;
    getDay(today).goals[gid] = state.clicks[today][sec];
  }
  persist();
  renderAll();
  toast(`+1 article in ${sec}`);
});
```

The click is not prevented — the link still opens normally (`target="_blank"`).

---

## 11. Personal stat widgets

Four `.stat-card` widgets in a grid on the Personal panel.

| Widget | Behavior |
|---|---|
| **Financial** | Three text inputs (`Net`, `Cash`, `Invest`) — manual values, auto-saved per day to `day.fin`. Currency strings, no math. Note: "Manual until connectors are wired." (YNAB, USBank, IBKR don't have MCP connectors at time of build.) |
| **Health** | Three toggle buttons (`Slept 7h+`, `Moved 30m`, `Ate well`) — each toggles `day.health[k]` and swaps the inline SVG between an empty circle and a check-circle. `.health-toggle.on` adds sage background. |
| **Disconnect** | Big serif counter showing `day.disconnect` minutes. Buttons `+15 / +30 / +60 / −15` mutate the counter. The `g_disconnect` goal reads from this directly. |
| **Win of the day** | Single `<textarea class="win-area">` saved to `day.win`. Italic serif. |

All stat data is per-day in `mm_days[today]`.

---

## 12. Heatmap & Progress (Goals Overview panel)

### 12.1 Rings

Four ring stats:
- **Today**: completed/total goals
- **Last 7 days**: aggregate completion %
- **Best streak**: longest single-goal streak in days
- **Days journaled**: count of days with non-empty notes OR any tracked goals

Each ring is an SVG circle with `stroke-dasharray = circumference`, `stroke-dashoffset = circumference * (1 - pct/100)`, transitioned. Sage stroke for first two, gold (`.ring-svg.gold`) for the latter two.

### 12.2 60-day heatmap

Grid of 60 cells, 20 columns. Each cell represents one day going back from today.

Level rule:

```js
const ratio = totalGoals ? completedToday / totalGoals : 0;
let level = 0;
if      (ratio > 0    && ratio < 0.34)              level = 1;
else if (                  ratio < 0.67)            level = 2;
else if (                  ratio < 1)               level = 3;
else if (ratio === 1 && completedToday > 0)         level = 4;
if (level === 0 && hasJournalNotes)                 level = 1;
```

Cell classes: `.l1 .l2 .l3 .l4` map to increasingly saturated sage. Today's cell has `.is-today` (gold ring). Hover shows a tooltip via `::after` with `data-tooltip` attribute (e.g. `Tue, May 1 · 5/19 goals`).

Heatmap is **decorative only** — no click navigation in v1 (the dashboard is locked to today).

### 12.3 Section progress bars

Three rows (Mindfulness / Business / Personal) showing average `pct` across all goals in that section. Each row: `[icon] [name] [bar] [num%]`. Bar fill uses a sage→gold gradient.

---

## 13. Slide-up drawer

A bottom sheet (`.drawer`) anchored to the viewport, hidden via `transform: translateY(100%)`. The FAB (`#fab`) opens it; scrim click, ✕ button, or Escape closes it.

Two internal tabs:
1. **Tasks** (default): quick-add form + list (see §7.5)
2. **All goals**: shows every goal (no filter), with section dots and remove buttons

The drawer also has its own `goalForm` for adding goals across any section (parallel to the per-panel "+ add goal" buttons).

---

## 14. Other modules

### 14.1 4-7-8 Breathing timer (Mindfulness panel)

Single button `#breathBtn`. On first press: shows a stage panel below, starts a 1-second-tick timer cycling through phases (Inhale 4 → Hold 7 → Exhale 8 → repeat). The button label flips between "Start 4-7-8" and "Stop." Visual phase + count update each tick.

### 14.2 Theme toggle

`#theme-toggle` swaps `state.theme` between `'light'` and `'dark'`, sets `document.documentElement.dataset.theme`, and replaces the SVG inside the button (moon ⇄ sun paths). Persisted to `mm_theme`.

### 14.3 Toast

`#toast` is a fixed bottom-right pill. `toast(msg)` sets text, adds `.show` for 1800ms. Used for "+1 article in X", "Goal added", "+15 min recorded", etc.

### 14.4 Streak badge in topbar

`#streakCount` shows `dailyStreak()` value. `bumpStreak()` recomputes and updates DOM after any user action that could affect it.

### 14.5 Closing affirmation

A static centered footer with the Stillpoint closing meditation:

> "I am here. I am enough. I am loved. I am loving.
> I am exactly where I need to be."

---

## 15. Reflections library

15 reflections rotating 5-at-a-time. Daily seed via `Math.floor(Date.now()/86400000) % 15`, then strided pick: `(seed + i*3) % 15` for `i=0..4`.

Each reflection has shape:

```ts
{ title: string, body: string, practice: string }
```

The body and practice are written in the second person, addressing Dallas directly. Names of his children (Cari's three, Stace's one), dogs (Parker, Kittle), friends (Lenny, John, Tyler, Jared, Kayla, Jocelyn, Korto, Brian, Jamie, Klint, Sue, plus Melanie, Stephanie, Rainey), and work context (SigmaEra, Dale, Bo) appear in specific reflections.

The full library is in the reference HTML — copy it verbatim, then extend over time.

---

## 16. Render flow

```
boot:
  applyTheme();
  renderAll();

renderAll():
  renderHero();
  renderMindfulness();    // god card, scripture preview, reflections, mindfulness articles
  renderBusiness();       // headline, briefing, topStories, scan, articles, repos, quotes, watchlist
  renderPersonal();       // headline, motivation, articles, stat widgets
  renderGoals();          // each per-panel goals list + drawer + overview
  renderProgress();       // rings + section bars + heatmap + streak
  renderTasks();          // drawer task list + FAB count
  loadNotes();            // populate journal textarea
```

Any user action that mutates state should:
1. Mutate state
2. `persist()`
3. Call the smallest set of render functions that reflect the change (or `renderAll()` if simpler)
4. Optionally `toast()`

---

## 17. Accessibility & keyboard

- All interactive controls are buttons or inputs (no `div` click handlers except the scripture card, which has `tabindex="0"` + Enter/Space handler)
- Tabs use `role="tablist"` + `role="tab"` + `aria-selected`
- Drawer: scrim click, ✕ button, Escape closes
- Modal: scrim, ✕, footer Close, Escape close
- Focus states inherit browser defaults; ensure custom buttons don't suppress them

---

## 18. Daily refresh workflow

> The dashboard is "updated daily" — but never *pre-filled* for future days. Past days show only as heatmap cells.

To refresh tomorrow's content:

1. Open the file. Locate the `<script id="daily-content-data" type="application/json">` block.
2. Replace its body with a freshly-generated JSON object of the same shape (§5).
3. The `date` field is informational; the page does not re-key on it.
4. Do **not** touch any `mm_*` localStorage values — those are user-owned.
5. The `SCRIPTURES` library and `THEME_KEYWORDS` are *not* part of the daily refresh; they are versioned with the codebase and grow over time.

A natural workflow with Claude: "Refresh today's content for the dashboard." Claude reads the existing JSON for shape, generates a new one for the new date, and writes it back.

---

## 19. Build & run

- No build step
- Works as a `file://` URL in any modern browser
- Works in Cowork as a live artifact (typography may fall back; sandbox blocks Google Fonts)
- LocalStorage is per-origin — Chrome at `file://` and the same file at a private hostname are separate stores

---

## 20. Out of scope (deliberately)

- Multi-device sync
- Account / auth
- Live data via web APIs (Bible verse APIs, financial APIs, news APIs)
- Backend storage
- iOS / Android app shell
- Notifications

These are reasonable v2 candidates but the v1 design intentionally keeps the file standalone.

---

## 21. Recreation checklist for Claude Code

Build in this order; check off each item:

- [ ] Scaffold `index.html` with `<head>` + `<body>` skeleton, CSS variables, base typography
- [ ] Add component CSS for `.card`, `.tab-btn`, `.fab`, `.drawer`, `.bible-page`, `.scripture-card`, `.god-card`, `.goal`, `.task-item`, `.heatmap`, `.ring-stat`, `.toast`
- [ ] Embed empty `<script id="daily-content-data" type="application/json">` block + define `DAILY_CONTENT` shape
- [ ] Build the topbar (brand, streak pill, theme toggle) and hero
- [ ] Build the 4-tab nav and 4 empty panel containers
- [ ] Implement `lsGet`/`lsSet` and storage shapes
- [ ] Implement `state` object + `getDay()` + `persist()`
- [ ] Implement `applyTheme()` and theme toggle
- [ ] Implement `renderHero()` (today only)
- [ ] Implement `renderMindfulness()` for god card + reflections rotation
- [ ] Implement article cards + click tracking → goal credit
- [ ] Implement `renderBusiness()` with topStories, scan, articles, repos, quotes, watchlist
- [ ] Implement `renderPersonal()` with stat widgets (financial, health, disconnect, win) and articles
- [ ] Implement `progressFor`, `streakFor`, `dailyStreak`, `bumpStreak`
- [ ] Implement `renderGoals()` for all three panels + Overview filter list + drawer goals list
- [ ] Implement `renderProgress()` for rings + section bars + heatmap
- [ ] Implement task system (`renderTasks`, add form, toggle, delete, FAB count)
- [ ] Implement drawer open/close/tab + scrim + Escape
- [ ] Implement journal textarea with debounced save
- [ ] Implement `SCRIPTURES` library + `THEME_KEYWORDS` map
- [ ] Implement `recentJournalText`, `themeWeights`, `pickScripture`, `renderScripturePreview`
- [ ] Implement Bible modal: open from card, render passage with verse numbers, render commentary, close on ✕/scrim/Escape
- [ ] Implement breathing timer
- [ ] Implement toast
- [ ] Wire `renderAll()` and call on boot
- [ ] Verify: §7.6 Goals/Tasks acceptance criteria
- [ ] Verify: §9.5 Scripture acceptance criteria
- [ ] Verify: light + dark theme look right
- [ ] Verify: page works without internet (no required external requests)

---

## 22. File manifest (this delivery)

| File | Purpose |
|---|---|
| `spec.md` | This document |
| `morning-mindfulness-dashboard.html` | Reference implementation — ground truth for any ambiguity |

When the spec and the reference disagree, the reference wins for v1. Note any divergences in v1.1 of this document.
