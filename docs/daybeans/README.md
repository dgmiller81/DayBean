# DayBeans — Strategy & Build Plan

> *Different beans. Same morning.*

This folder is the full pivot package for **DayBeans** (formerly The Daily Mind): a witty,
coffee-shaped, faith-and-secular-friendly personal-growth dashboard whose killer feature
is **journal-driven content curation** — you write what's on your mind, and tomorrow's
content bends toward it.

It contains everything a designer, PM, and engineering team need to act:

| # | Document | Audience | What it answers |
|---|----------|----------|-----------------|
| [01](01-brand-strategy.md) | **Brand Strategy** | Founder, marketing | Who DayBeans is for, what we sound like, what we will and won't do |
| [02](02-visual-identity.md) | **Visual Identity System** | Designer, frontend | Colors, type, motion, iconography, the coffee-motif kit |
| [03](03-logo-brief.md) | **Logo Brief & AI Prompts** | Designer (or any image AI) | Multiple ready-to-paste prompts for wordmark / monogram / app icon |
| [04](04-product-requirements.md) | **Product Requirements** | PM, engineering | Epics + user stories + acceptance criteria, with brand voice woven in |
| [05](05-journey-maps.md) | **Journey Maps** | PM, design | New-user, daily, journal-magic, and rewards journeys |
| [06](06-implementation-plan.md) | **Implementation Plan** | Engineering | Extend-vs-rebuild recommendation, phased work, file-level deltas |
| [07](07-sprint-plan.md) | **Sprint Plan & Multi-Agent Protocol** | Eng lead, ops | 7-sprint timeline, parallelization map, rules of engagement for multi-agent execution |
| [08](08-tasks-and-issues.md) | **Tasks & GitHub Issues** | Engineering | 62 issue-ready task cards with file ownership, dependencies, and acceptance criteria |

---

## Build recommendation: **extend, don't rebuild**

The existing Next.js / Prisma / sage-cream app already has:

- Daily LLM content generation with journal-aware prompts
- 4 tabs that map cleanly to the new Pour Over / Daily Grind / Slow Sip / Bean Count
- Bookmarks, journal entries, themes, sticky header, drawer — all working
- 15 themes + bg-image overlay system

What DayBeans needs is a **brand pivot, voice rewrite, two new feature epics, and tighter
journal→content coupling** — not a re-architecture. Rebuilding throws away ~6 months of
working surface for no net gain.

The implementation plan in [06](06-implementation-plan.md) lays out the work as five
phased PRs, each independently shippable.

**Estimate: 6–9 weeks of focused work to ship the full DayBeans launch surface**,
including coffee-partnership integration and the journal-magic loop.
