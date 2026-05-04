# 02 · Visual Identity System

The DayBeans look should feel like **a clean café in good morning light** — calm,
warm, intentional, with a single dark accent of espresso and a gold halo of crema.
Aurora and AI themes are the surprise — the system bends without breaking.

## 2.1 Color system

### 2.1.1 Primary palette ("Dawn" — the default theme)

These are the brand colors. Anything customer-facing — logo, packaging, email,
landing — should default to these.

| Token | Hex | Use |
|---|---|---|
| `--bg`            | `#f6efe4` | Page background, café-cream |
| `--bg-1`          | `#faf3e6` | Top of page gradient |
| `--bg-2`          | `#ecdfc7` | Bottom of page gradient (deeper crema) |
| `--surface`       | `#fffaf0` | Cards, modals (warm white, *not* pure white) |
| `--surface-2`     | `#f4e9d3` | Inset surfaces, secondary cards |
| `--ink`           | `#2b1d10` | Primary text, deep coffee brown |
| `--ink-soft`      | `#5a4530` | Body copy, secondary text |
| `--ink-muted`     | `#94816a` | Captions, eyebrows, helper text |
| `--line`          | `rgba(64,42,18,.10)` | Borders, dividers |
| `--line-strong`   | `rgba(64,42,18,.22)` | Stronger borders, focus rings |

### 2.1.2 Brand accents

| Token | Hex | Role | Personality |
|---|---|---|---|
| `--espresso`      | `#3b2415` | Primary CTA, brand anchor | Grown-up, dependable |
| `--espresso-deep` | `#1f120a` | Hover state on espresso | Pressed, attentive |
| `--crema`         | `#d4a86a` | Halo, highlight, streak pill | Warm, generous |
| `--crema-deep`    | `#a87a3c` | Crema hover, link emphasis | Confident |
| `--crema-soft`    | `#f6e7c4` | Crema-tinted backgrounds | Soft, edible |
| `--sage`          | `#5d7a6c` | Calm secondary, Pour Over moments | Quiet, considered |
| `--sage-deep`     | `#3e5a4d` | Sage hover, Bible-study moments | Steady |
| `--sage-soft`     | `#dde6df` | Pour Over surfaces | Restful |
| `--accent`        | `#c2410c` | Risk badges, alerts, "today" markers | Alive |
| `--accent-soft`   | `#f9d8c1` | Accent backgrounds | Friendly emphasis |

### 2.1.3 Supporting themes

DayBeans ships with 15 themes total. The five canonical brand-aware ones are:

| Theme | When | Vibe |
|---|---|---|
| **Dawn** *(default)* | Morning, anywhere | Warm cream + espresso + crema |
| **Dusk** | Late evening, dark mode | Espresso bg, crema accents |
| **Sepia** | The "library mood" — for readers | Old-paper, gold-leaf |
| **Aurora** | The "secular wonder" mood | Indigo + mint + magenta |
| **AI** | Power-user / engineer mood | Slate + neon teal |

Plus the legacy palette (Light, Dark, Warm, Forest, Midnight, Black, Slate, Steel, Crimson, Ember). Brand-marketing should always default to **Dawn**; the variants are user expression.

### 2.1.4 Color rules

- **Espresso is the brand anchor.** It's the primary CTA color. If you can only paint one button on a page, paint it espresso.
- **Crema is the *hero* accent — used sparingly.** The "free pour" giveaway block, the streak indicator, the active streak pill. Don't crema-flood.
- **Sage is the *quiet* accent.** Pour Over moments, faith content, breath ring, "you've journaled" affirmations.
- **Accent (rust orange) is the *attention* color.** Risk badges, today indicators, errors. Never use for happy state.
- **Never put crema on espresso text.** Contrast fails. Use cream/surface instead.

## 2.2 Typography

### 2.2.1 The two-typeface system

| Family | Role | Why |
|---|---|---|
| **Fraunces** | Display, headlines, journal entries, scripture, brand name | The slight optical ink-trap warmth feels like a literary morning paper. |
| **Inter** | UI, body, buttons, eyebrows | Quiet, neutral, gets out of the way. Pairs with Fraunces without competing. |

Both are open-source (Google Fonts). No license worries.

### 2.2.2 Type scale (Tailwind/CSS-friendly)

| Use | Family · weight · size · line | Token |
|---|---|---|
| Hero headline | Fraunces · 400 · `clamp(2.6rem, 6.6vw, 5.4rem)` · 1.02 | `--text-hero` |
| Section title | Fraunces · 400 · `clamp(2rem, 4.4vw, 3.4rem)` · 1.06 | `--text-h2` |
| Card title | Fraunces · 500 · `1.4rem` · 1.1 | `--text-h3` |
| Subhead / large body | Inter · 400 · `1.18rem` · 1.55 | `--text-lead` |
| Body | Inter · 400 · `1rem` · 1.6 | `--text-body` |
| Small / meta | Inter · 500 · `.82rem` · 1.5 | `--text-meta` |
| Eyebrow | Inter · 600 · `.72rem` · 1 · `letter-spacing: .14em` · uppercase | `--text-eyebrow` |
| Quote / journal | Fraunces italic · 300 · `1.4rem`+ · 1.4 | `--text-quote` |

### 2.2.3 Typography rules

- **Fraunces gets italic where copy is the brand voice.** Italic is the wink. *"Your bean. Your brief."*
- **Pull-quotes always use Fraunces italic 300.** It's the most "morning paper" energy in the system.
- **Eyebrows always use Inter 600 / .72rem / .14em letter-spacing / uppercase.** They function as section markers and section quasi-logos.
- **Body never goes below `.82rem`.** Helper text under 13px is unreadable on most laptops. We are not that brand.
- **Headlines word-reveal on first paint** — see motion section.

## 2.3 Logo system

See [03 · Logo Brief](03-logo-brief.md) for AI generation prompts. Quick spec:

- **Wordmark**: "DayBeans" in Fraunces 500, espresso, with the *e* in "Beans" looking like a coffee bean (subtle vertical seam through the e's bowl).
- **Monogram**: "DB" in espresso, white space inside the D shaped like a coffee bean.
- **App icon**: Espresso-filled rounded square, crema-colored steam trail rising, single bean centered.

### Logo placement

- **Always pair with a 36–40px brand-mark and "DayBeans" wordmark.**
- **Minimum clearspace:** half the wordmark height on every side.
- **Minimum size:** 80px wide for wordmark, 28px for monogram, 24px for app icon.
- **Don't:** outline, shadow, or rotate the logo. Don't put "by [parent co]" anywhere. Don't add a tagline beneath the logo on the page (taglines live in their own treatment).

## 2.4 Iconography

### 2.4.1 Icon language

- **Single 1.7px stroke, rounded caps and joins.** Lucide / Feather style.
- **No filled icons.** When something is "active" (e.g., bookmarked), the icon flips to filled — that's the only filled state.
- **No two-color icons.** Icon = current text color, period.

### 2.4.2 Coffee motif kit

A small library of recurring shapes:

| Motif | Use | Where |
|---|---|---|
| **Cup with steam** | Hero illustration, splash | Landing hero, app loading |
| **Single bean** | Subtle bullet, decorative | List items in marketing, footer |
| **Bean count cluster** | Streak indicator | Bean Count tab, streak pill |
| **Saucer** | Footer accent | Marketing footer divider |
| **Pour-over kettle** | Pour Over tab icon (alt) | Optional secondary icon |
| **Steam wisp** | Animated decoration | Hero, loading states |

Render all motifs in **espresso 1.7px stroke** with crema fills only when explicitly highlighted.

## 2.5 Spacing & layout

### 2.5.1 Spacing scale

| Token | px | Where |
|---|---|---|
| `--s-1` | 4 | Tight icon gaps |
| `--s-2` | 8 | Inline gaps |
| `--s-3` | 12 | Compact card padding |
| `--s-4` | 16 | Default padding |
| `--s-5` | 22 | Section internal gap |
| `--s-6` | 28 | Card padding |
| `--s-7` | 36 | Page horizontal padding |
| `--s-8` | 48 | Modal padding |
| `--s-9` | 60 | Section vertical gap (mobile) |
| `--s-10` | 90 | Section vertical gap (desktop) |

### 2.5.2 Radius

| Token | Use |
|---|---|
| `--r-sm: 6px` | Heatmap cells, tiny pills |
| `--r-md: 10px` | Buttons, small cards |
| `--r-lg: 14px` | Cards |
| `--r-xl: 22px` | Hero card, large content |
| `--r-2xl: 28px` | Modal, login card, giveaway block |
| `--r-pill: 999px` | Eyebrows, status pills |

### 2.5.3 Container widths

- **Reading container**: `max-width: 720px` — for journal, scripture, long copy.
- **Content container**: `max-width: 1180px` — primary app + landing.
- **Wide container**: `max-width: 1240px` — landing-only, when we need the breathing room.

### 2.5.4 Grids

- **Pillars / 4-tile grids**: `grid-template-columns: repeat(4, 1fr)`, collapsing to 2 then 1.
- **Side panel + content**: `1.2fr .8fr` desktop, single column under 980px.

## 2.6 Motion principles

### 2.6.1 The four motion rules

1. **Reveal, don't enter.** Headlines word-reveal on first paint (`translateY(28px) → 0`). No big slide-in choreography.
2. **Drift, don't bounce.** Background gradients drift over 22s; nothing in the brand bounces.
3. **Steam.** When something needs to come alive, it does so with a gentle vertical wisp animation, never a wiggle.
4. **Honor reduced motion.** All decorative animation is disabled when `prefers-reduced-motion: reduce`. Functional motion (e.g. tab transitions) stays at `.001s`.

### 2.6.2 Standard timings

| Motion | Duration | Easing |
|---|---|---|
| Hover lift | 150ms | `cubic-bezier(.2,.7,.2,1)` |
| Section reveal | 900ms | `cubic-bezier(.2,.7,.2,1)` |
| Tab transition | 250ms | `ease` |
| Drift | 22s | `ease-in-out infinite alternate` |
| Steam wisp | 3s | `ease-in-out infinite` |
| Breath ring | 5s | `ease-in-out infinite alternate` |

## 2.7 Imagery

### 2.7.1 Photography direction

- **Available light.** No studio. No flash.
- **Real moments.** A hand reaching for a mug, a journal at the corner of a desk, the steam from a pour-over.
- **Warm color grading.** Push toward `--bg-2` and `--crema-soft` highlights. Never cool/blue.
- **Negative space is OK and encouraged.**
- **People are diverse, but never staged.** We don't shoot models smiling at coffee.

### 2.7.2 Illustration direction

- **Line-only or two-tone (espresso + crema).** Never illustration with full color.
- **Mid-stroke imperfection.** A drawn cup should look hand-drawn, not perfect.
- **No mascots.** No "Bean Buddy." Tempting; wrong.

## 2.8 Sample compositions

### 2.8.1 The hero composition (landing page)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   [eyebrow with steam wisp]                         │
│                                                     │
│   Different beans.                                  │
│   Same morning.                                     │
│                                                     │
│   [subhead, 580px max]                              │
│   (boba quip in muted italic underneath)            │
│                                                     │
│   [Brew my morning →]  [See it in motion]           │
│                                                     │
│   ✓ Faith-aware  ✓ Curated to your job  ✓ ...       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Right column: animated cup illustration + tilted "today" preview card.

### 2.8.2 The card style (used everywhere)

```
┌─ surface ─────────────────────────────────────────┐
│  EYEBROW — uppercase, ink-muted                   │
│  Card title — Fraunces 500, 1.4rem                │
│                                                   │
│  Body copy in Inter, ink-soft, .96rem.            │
│                                                   │
│  [optional inline action]                         │
│  ┄┄┄┄┄┄┄┄ dashed line ┄┄┄┄┄┄┄┄                    │
│  [optional second block]                          │
└───────────────────────────────────────────────────┘
1px line border · 22px radius · 28px padding
hover: lift 6px, line-strong border, shadow-lift
```

## 2.9 Implementation notes for engineers

- **CSS custom properties only.** No Sass variables for the brand tokens — they need to swap with theme.
- **Theme tokens go on `:root` and per-theme `[data-theme="..."]` blocks.** Already wired in `src/styles/globals.css`.
- **Fonts loaded via `next/font/google`** for Fraunces + Inter (already wired in `src/app/layout.tsx`).
- **Add brand-color tokens** (`--espresso`, `--crema`, `--crema-soft`) to the existing palette as part of the rename pass — see [06 · Implementation Plan](06-implementation-plan.md).
