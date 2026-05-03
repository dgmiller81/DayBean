# The Daily Mind

A personal growth and learning dashboard — spiritual, professional, and personal — collated into a single morning snapshot. Built to run on your workstation or hosted on Railway.

## Status

**v1 in progress.** Repo is at planning phase. Implementation begins with Phase 1.

- [Master roadmap](docs/superpowers/plans/2026-05-02-master-roadmap.md) — vision, tech stack, 14-phase plan, deploy modes
- [Phase 1 plan](docs/superpowers/plans/2026-05-02-phase-1-foundation.md) — first detailed plan, executable today
- [Epics & sub-items](docs/epics.md) — what each phase ships
- [Security posture](docs/security.md) — secrets, threat model, CSP, rate limits
- [Contributing](docs/contributing.md) — branch / commit / PR strategy
- [Mockup](mockup/spec.md) — original v1 spec and reference HTML

## Deploy modes

| Mode | DB | Auth | LLM default |
|---|---|---|---|
| Local — no password | SQLite | none (auto-login) | LM Studio (headless, bundled setup) |
| Local — simple password | SQLite | one password set during onboarding | LM Studio |
| Local — full login | SQLite | Auth.js (Credentials + OAuth) | LM Studio |
| Railway | Postgres | Auth.js (forced) | OpenAI / Anthropic (user-supplied key) |

## Quick start (after Phase 1)

```bash
pnpm install
cp .env.example .env
# generate APP_ENCRYPTION_KEY: openssl rand -base64 32
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000.

## License

MIT — see [LICENSE](LICENSE).
