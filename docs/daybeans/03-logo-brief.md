# 03 · Logo Brief & AI Prompts

This document gives you (or any image-AI) **ready-to-paste prompts** for generating the
DayBeans logo system, and the design constraints they should respect.

## 3.1 The logo system at a glance

DayBeans needs **three lockups** that work together:

| # | Lockup | Use | Aspect |
|---|--------|-----|--------|
| 1 | **Wordmark** | Marketing site nav, email signature, footer, presentations | ~5:1 |
| 2 | **Monogram** | App favicon, social avatars, small surfaces | 1:1 |
| 3 | **App icon** | iOS / Android home screen, browser tab on small viewports | 1:1, rounded square |

All three should feel like the **same family**, not three separate logos. Espresso brown
on warm cream is the canonical pair; crema gold may appear as a secondary accent.

## 3.2 Hard constraints (non-negotiable)

These rules apply to every variant. Bake them into every prompt.

| Rule | Why |
|------|-----|
| **Two colors max:** espresso `#3b2415` + warm cream `#fffaf0`. Crema `#d4a86a` allowed only as a tertiary accent. | The brand reads instantly as "café." |
| **No mascots.** No anthropomorphic bean. No smiling cup. | We are not a cereal brand. |
| **No drop shadows, no bevels, no gradients on the mark.** Flat. | Logos must scale to 24px. |
| **Subtle coffee reference, not loud.** A single bean shape, a steam wisp, or a pour-over silhouette — pick one, never all. | "Coffee + dashboard" should feel discovered, not announced. |
| **Geometric warmth.** Round forms, slight ink-trap warmth. No sharp corners, no hairlines. | Echoes Fraunces typography. |
| **Reads at 24px.** The monogram and app icon must remain legible when scaled to favicon size. | Must work in OS chrome. |
| **No text inside the icon** (the app icon is iconic, not lettered). | Distinguishes from the wordmark. |

## 3.3 The wordmark

### Concept

The word **DayBeans** set in **Fraunces 500**, deep espresso `#3b2415`, with one subtle
coffee-bean tell hidden in the typography:

- The *e* in "Beans" has a soft vertical seam through its bowl, the way a coffee bean does.
- Or: the dot of the *i*… we don't have an *i*. So: the bowl of the *a* in "Day" gets a faint vertical seam.
- Subtlety is the win. Someone should notice it on the *third* read, not the first.

### AI prompt — wordmark

> ```
> A minimalist horizontal wordmark logo for a brand called "DayBeans".
> Set in a warm modern serif typeface (similar to Fraunces or Recoleta), weight 500,
> letterform tracking slightly tight. Color: a single deep espresso brown (#3b2415)
> on a warm cream background (#fffaf0). Two-color flat design only — no gradients,
> no shadows, no outlines.
>
> One letterform — the lowercase 'a' in "Day" or the lowercase 'e' in "Beans" —
> contains a single, very subtle vertical seam through its bowl, suggesting the
> seam of a coffee bean. The reference must be discoverable, not loud — looks
> like a typographic quirk, not a literal bean drawing.
>
> Composition: clean horizontal lockup, "DayBeans" as a single word with no space,
> no tagline, no decorative elements. Even baseline. Capital D, capital B, lowercase
> everywhere else.
>
> Style: editorial, calm, high-end café branding. Reminiscent of Stripe, Linear,
> and small-batch roaster brands. Vector-clean, infinitely scalable. Round forms,
> warm geometry, no sharp corners.
>
> Output: SVG-style flat artwork, transparent background OK, centered, with
> generous clearspace.
> ```

### Acceptance criteria for the wordmark

- Reads "DayBeans" instantly. No ambiguity.
- Bean reference is detectable on close inspection but not advertised.
- Survives at 80px width on screen.
- Inverts cleanly (cream on espresso) for dark-mode marketing.

## 3.4 The monogram

### Concept

A **DB monogram** in espresso, where the negative space inside the **D** is shaped like a
coffee bean (oval with a soft vertical seam). The **B** is bog-standard, balanced beside
it.

This is the favicon, the social avatar, and the rounded "DB" badge that appears in the app
nav.

### AI prompt — monogram

> ```
> A square monogram logo featuring the letters "DB" — capital D and capital B —
> set in a warm modern serif (similar to Fraunces or Recoleta), weight 600. The
> two letters share a single x-height baseline, gently kerned together as a
> ligature.
>
> The negative space inside the D is shaped like a coffee bean: a soft oval with
> a single vertical seam through the middle, occupying the inner counter of the
> D. The B is rendered straightforwardly with no decorative hidden imagery —
> only the D carries the bean detail.
>
> Color: deep espresso brown (#3b2415) letterforms on warm cream background
> (#fffaf0). Two-color flat design only — no gradients, no shadows. No outlines
> around the letters.
>
> Composition: tight square crop, centered, generous clearspace equal to half
> the letter height. The lockup feels like a small-batch coffee roaster's
> stamp or a literary publisher's emblem.
>
> Style: editorial, calm, high-end. Vector-clean, infinitely scalable. Reads
> clearly at 32px.
>
> Output: SVG-style flat artwork on a light cream square background, centered.
> ```

### Acceptance criteria for the monogram

- Reads "DB" without explanation.
- The bean shape is felt before it's seen.
- Works at 32×32 (browser favicon scale).
- Pairs naturally with the wordmark when used together.

## 3.5 The app icon

### Concept

A **rounded square** in espresso, with a subtle **steam wisp** rising in cream. A single
**bean silhouette** sits at the bottom-center, partially submerged in the wordless square
— like a bean settling into a cup.

App icon never includes text. iOS/Android will scale it small — every detail must survive
at 60×60.

### AI prompt — app icon

> ```
> A square iOS/Android app icon, rounded corners (matching iOS 18 squircle).
> Background: solid deep espresso brown (#3b2415). Foreground: a single warm
> cream colored (#fffaf0) graphic — three short, parallel, gently curving steam
> wisps rising from a single coffee bean centered in the lower third of the
> square.
>
> The bean is a simple oval with a soft vertical seam, also rendered in cream.
> The steam wisps are thin, organic, slightly varying in length, with rounded
> ends. They do not connect to anything literal — no cup, no saucer, no plate.
> Just bean + rising warmth.
>
> Color: two-color total (espresso bg, cream artwork). Optional: a single
> accent of muted gold (#d4a86a) on the bean's seam highlight. No gradients,
> no shadows, no outlines.
>
> Style: minimal, calm, contemporary. Like the Headspace, Calm, or Notion app
> icons in spirit — clean, two-color, recognizable at any scale. Reads at 24×24
> (Mac dock minimum).
>
> Composition: centered focal artwork, ample padding (about 18% of the square
> on every side), no text anywhere.
>
> Output: 1024×1024 PNG with rounded-square shape, transparent corners outside
> the squircle, espresso-filled inside.
> ```

### Acceptance criteria for the app icon

- Recognizable in the iOS dock at 60px.
- Doesn't look like any of: Calm, Headspace, Strava, Notion, Spotify (all have similar minimalist energy — we want to be in that family but not confusable).
- Espresso color reads as warm brown on every screen, never muddy purple.
- Steam wisps look organic, not architectural.

## 3.6 Logo variations to generate

For each of the three lockups, ask the AI for the following set:

| Variant | Notes |
|---|---|
| **Primary** | Espresso on cream — the canonical version |
| **Inverted** | Cream on espresso — for dark-mode and packaging |
| **Single-color cream** | Cream on transparent — for over coffee photography |
| **Single-color espresso** | Espresso on transparent — for paper goods |
| **One-color black** | Pure black — for legal/print situations where two-color isn't allowed |

## 3.7 Sample brand-mark compositions to test

When evaluating AI-generated logo candidates, look at them in these contexts:

1. **App splash** — espresso square covering the full screen, monogram centered in cream.
2. **Favicon at 16px** — does the monogram still read as "DB"?
3. **Marketing footer** — wordmark + tagline ("Different beans. Same morning.") in 14px.
4. **Coffee sleeve mockup** — wordmark printed on a kraft-brown cup sleeve. Does it look like a brand you'd be proud to hold?
5. **Email avatar** — monogram on a circular crop. Edges should breathe.
6. **iOS home screen** — app icon next to Calm, Apple Notes, Stripe — does it hold its own?

If any of these fails, regenerate with the failing context added to the prompt.

## 3.8 Suggested generation tools (in order of preference)

1. **Midjourney v6** — best for logo concept exploration; use the prompts above with `--style raw --aspect 1:1` for monogram/icon, `--aspect 5:1` for wordmark.
2. **Adobe Firefly Vector** — best for clean vector output once a direction is chosen.
3. **Recraft.ai** — strongest at on-brief two-color flat illustration.
4. **Hand-finalize in Figma** — every AI-generated logo gets re-traced by a human in Figma to fix kerning, vector cleanliness, and hinting. Don't ship raw AI output.

## 3.9 What to hand the designer (deliverable list)

When the brand is ready, the design hand-off should include:

- `logo/wordmark-espresso.svg`, `…-cream.svg`, `…-black.svg`
- `logo/monogram-*.svg` (same five variants)
- `logo/app-icon.png` at 1024, 512, 256, 128, 64
- `logo/favicon.ico` (multi-resolution)
- `brand-tokens.css` — the full color/type/spacing token sheet from [02 · Visual Identity](02-visual-identity.md)
- Figma library: `Brand / DayBeans` with all logos, swatches, type styles, and motif kit components

## 3.10 Naming protection

Before finalizing, run `DayBeans` through:

- USPTO trademark search
- A `.com` and `.app` domain availability check
- An iOS App Store name search
- A Google search to make sure no existing café or roastery uses the name

If conflicts surface, fall back to **DayBean** (singular) or **MorningBeans** as
backup brand names. Keep the visual identity unchanged.
