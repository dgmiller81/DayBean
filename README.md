# DayBeans

> *Different beans. Same morning.*

DayBeans is one quiet page that knows what you've journaled, what you're working on, and what kind of day you need to face. Mindful, spiritual, secular, or just here for the coffee — DayBeans curates around you.

This is the **DayBean** fork. It preserves the original [the-daily-mind](https://github.com/dgmiller81/the-daily-mind) repo and adds the full DayBeans pivot: brand strategy, sprint plan, and 62 issue-ready tasks.

## Where to start

| You are | Read |
|---|---|
| Founder / marketing | [docs/daybeans/01-brand-strategy.md](docs/daybeans/01-brand-strategy.md) |
| Designer | [docs/daybeans/02-visual-identity.md](docs/daybeans/02-visual-identity.md) + [03-logo-brief.md](docs/daybeans/03-logo-brief.md) |
| PM / engineering | [docs/daybeans/04-product-requirements.md](docs/daybeans/04-product-requirements.md) + [05-journey-maps.md](docs/daybeans/05-journey-maps.md) |
| Engineer picking up a task | [docs/daybeans/06-implementation-plan.md](docs/daybeans/06-implementation-plan.md) → [07-sprint-plan.md](docs/daybeans/07-sprint-plan.md) → [08-tasks-and-issues.md](docs/daybeans/08-tasks-and-issues.md) |

The [README inside docs/daybeans/](docs/daybeans/README.md) is the navigable index.

## How the build is organized

- **[GitHub issues](https://github.com/dgmiller81/DayBean/issues)** — 62 tasks, one per issue, mapped to sprint milestones and labeled by track (`server` / `ui` / `infra` / `design` / `qa`).
- **[Project board](https://github.com/dgmiller81/DayBean/projects)** — kanban: Backlog → Ready → In Progress → In Review → Integration → Done.
- **Multi-agent protocol** — see [07-sprint-plan.md §7.3](docs/daybeans/07-sprint-plan.md#73-multi-agent-protocol--rules-of-engagement). Every task declares OWNS / READS / DEPENDS ON, so multiple agents can work in parallel without merge conflicts.

## Stack

Next.js 15 (App Router) · Prisma · SQLite (dev) → Postgres (prod) · TypeScript · Fraunces + Inter via `next/font`.

## Quick start

```bash
pnpm install
cp .env.example .env
# generate APP_ENCRYPTION_KEY: openssl rand -base64 32
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:4111.

## Deploy modes

| Mode | DB | Auth | LLM default |
|---|---|---|---|
| Local — no password | SQLite | none (auto-login) | LM Studio (headless, bundled setup) |
| Local — simple password | SQLite | one password set during onboarding | LM Studio |
| Local — full login | SQLite | Auth.js (Credentials + OAuth) | LM Studio |
| Railway | Postgres | Auth.js (forced) | OpenAI / Anthropic (user-supplied key) |

## Status

Sprint 0 (Foundation) in progress. See [milestones](https://github.com/dgmiller81/DayBean/milestones) for sprint progress.

## License

MIT — see [LICENSE](LICENSE).
