# Deploying DayBeans to Railway

Single-service Next.js deploy. Two DB paths are supported:

- **Recommended today — SQLite + Railway Volume.** Single instance, zero extra services, uses the migrations already in this repo.
- **Future — Postgres.** Schema/migrations need to be regenerated against a live Postgres (not yet committed).

SQLite stays the local-development DB in either case.

## One-time setup (SQLite + Volume — immediately deployable)

1. Create a new Railway project from this repo.
2. On the Web service, attach a **Volume** mounted at `/data`. This is what makes the SQLite file survive deploys and restarts.
3. Set these variables on the Web service:

   | Variable | Value | Notes |
   |---|---|---|
   | `DEPLOY_TARGET` | `railway` | Boot guard enforces the rules below. |
   | `DATABASE_URL` | `file:/data/prod.db` | Path must be inside the mounted Volume. |
   | `APP_ENCRYPTION_KEY` | 32-byte base64 — `openssl rand -base64 32` | Required. |
   | `AUTH_MODE` | `simple` | Boot guard rejects `none` on Railway. `full` is deferred. |
   | `AUTH_SECRET` | `openssl rand -base64 32` | Required by `simple` and `full`. |
   | `SIMPLE_PASSWORD_HASH` | output of `pnpm exec tsx scripts/hash-password.ts` | Required by `simple`. |
   | `CRON_SECRET` | `openssl rand -base64 32` | Required on Railway (boot guard). |
   | `LMSTUDIO_BASE_URL` | optional | Default `http://localhost:1234/v1` (won't reach LM Studio from Railway — set per-user OpenAI/Anthropic keys instead). |
   | `NODE_ENV` | `production` | Railway sets this by default; pinning is fine. |
   | `PREBREW_POLICY` | optional, default `always` | S2 dual-run cost-graduation. `always` (Stage 0) → pre-brew everyone; `tiered` / `reactive` / `smart-resume` to dial cost down later. |
   | `RESEND_API_KEY` | optional | S5 voucher emails. When unset, claim flow logs `[email:dev]` and continues — fine for pre-launch. Set this once you're issuing real codes. |
   | `EMAIL_FROM` | optional | Default `"DayBeans <hello@daybeans.com>"`. Override with your verified Resend sender. |

4. Do **not** set `PORT` manually — Railway injects it, and `next start` reads it automatically.

> **Single-instance only.** SQLite + Volume cannot be horizontally scaled. Keep replicas at 1.

## One-time setup (Postgres — when you're ready)

1. Add a **Postgres** service to the same project.
2. Set `DATABASE_URL` on the Web service to `${{Postgres.DATABASE_URL}}` (Railway resolves the reference).
3. Switch `prisma/schema.prisma` `provider` to `postgresql`, regenerate migrations against a live Postgres (`prisma migrate dev`), and commit the new `prisma/migrations/` folder. The current SQLite migrations will not apply.
4. All other variables from the SQLite table above still apply.

## Build & start

`railway.json` is already wired with:

- **buildCommand**: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
- **startCommand**: `pnpm start:railway` (runs `prisma migrate deploy` then `next start -H 0.0.0.0`; Next.js reads the `PORT` env var that Railway injects)
- **healthcheckPath**: `/api/health`
- **healthcheckTimeout**: 300s (covers cold-start migration on the Volume)

`/api/health` returns `{ status: "ok" }` after a successful `SELECT 1` against the DB; Railway uses this to gate the green deployment.

## Manual smoke test post-deploy

1. Visit the deployed URL — the dashboard should load with a "Showing default content" hint on the hero.
2. Visit `/api/health` and confirm `{ status: "ok", latencyMs: <50ms }` with the right `deployTarget`.
3. Open Settings → LLM Provider → add a credential → Test connection.
4. Click "edit content" → "Refresh today's content" → confirm the hero updates with LLM-generated text.

## Daily crons — refresh content automatically

Two cron-triggered jobs ship today; both are gated by an `X-Cron-Secret` header (S2 dual-run resilience):

| Job | Endpoint | Recommended schedule | Notes |
|---|---|---|---|
| Morning brew | `/api/cron/morning-brew` | `0 * * * *` (top of every hour) | Iterates users; runs only when a user's local hour matches `Pref.refreshHour` AND no successful morning RefreshLog exists for today. |
| Evening pre-brew | `/api/cron/evening-prebrew` | `0 * * * *` (same hourly tick) | Iterates users; runs only when local hour matches `Pref.prebrewHour` (default 17) AND `PREBREW_POLICY` allows it. Writes `backupContentJson` for tomorrow. |

In Railway, add a **Cron Job** service in the same project for each. Command shape:

```bash
curl -fsS -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  "$WEB_PUBLIC_URL/api/cron/morning-brew" || exit 1
```

(where `WEB_PUBLIC_URL` is your service's public domain and `CRON_SECRET` matches the value set on the Web service.)

The pre-S2 `/api/cron/refresh` endpoint still works (Bearer-token-gated) and now runs phase=`morning` under the hood — keep it scheduled if you've already wired it; new deploys should prefer the per-phase endpoints above.

## Things deferred to later phases

- **Full Auth.js + 5 OAuth providers**: Phase 7 currently ships `simple` mode (single-password via iron-session + argon2id). `full` Auth.js mode is deferred — use `simple` mode on Railway for now (it's still single-tenant per deployment).
- **Cold-start catch-up**: if Railway restarts at 4:30 and the daily refresh hadn't fired yet, it's missed for that day. Phase 14 adds cold-start catch-up.
- **Rate limiting**: Phase 14 adds the 3-refresh/day and 30-fetch/hour caps.
- **CSP/HSTS headers**: Phase 14.
- **Schema split for Postgres provider**: requires `prisma migrate dev` against a real Postgres and a parallel migrations folder. Open a follow-up issue when ready to ship publicly.
