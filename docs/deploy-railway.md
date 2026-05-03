# Deploying The Daily Mind to Railway

This is a single-service Next.js + Postgres deploy. SQLite stays the local-development DB.

## One-time setup

1. Create a new Railway project from this repo.
2. Add a **Postgres** service in the same project.
3. On the Web service, set these variables:

   | Variable | Value |
   |---|---|
   | `DEPLOY_TARGET` | `railway` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway-resolved reference) |
   | `APP_ENCRYPTION_KEY` | 32-byte base64 — `openssl rand -base64 32` |
   | `AUTH_MODE` | `none` (Phase 7 enables `simple` / `full`) |
   | `AUTH_SECRET` | required only when `AUTH_MODE=full` |
   | `LMSTUDIO_BASE_URL` | optional override; default is `http://localhost:1234/v1` |
   | `NODE_ENV` | `production` |

4. **Schema provider**: this repo's `prisma/schema.prisma` is currently `provider = "sqlite"`. To deploy on Railway with Postgres, switch to a Postgres-targeted schema in a follow-up commit (or maintain a parallel `prisma/schema.postgres.prisma`). The migrations folder is SQLite-shaped today; Postgres deploys must regenerate migrations against Postgres.

## Build & start

`railway.json` is already wired with:

- **buildCommand**: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
- **startCommand**: `pnpm exec prisma migrate deploy && pnpm start`
- **healthcheckPath**: `/api/health`

`/api/health` returns `{ status: "ok" }` after a successful `SELECT 1` against the DB; Railway uses this to gate the green deployment.

## Manual smoke test post-deploy

1. Visit the deployed URL — the dashboard should load with a "Showing default content" hint on the hero.
2. Visit `/api/health` and confirm `{ status: "ok", latencyMs: <50ms }` with the right `deployTarget`.
3. Open Settings → LLM Provider → add a credential → Test connection.
4. Click "edit content" → "Refresh today's content" → confirm the hero updates with LLM-generated text.

## Daily cron — refresh content automatically

Phase 10 ships `/api/cron/refresh` (POST, Bearer-token-gated). To trigger it nightly:

1. In Railway, add a **Cron Job** service in the same project.
2. Schedule: `0 4 * * *` (daily 04:00 UTC — adjust to your timezone).
3. Command:
   ```bash
   curl -fsS -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     "$WEB_PUBLIC_URL/api/cron/refresh" || exit 1
   ```
   (where `WEB_PUBLIC_URL` is the public domain of your Web service and `CRON_SECRET` is the same value set on the Web service).

The endpoint iterates every user with an `LlmCredential`, runs a refresh for today (`source='cron'`), and returns `{ iso, processedUsers, okCount, failures }`.

## Things deferred to later phases

- **Full Auth.js + 5 OAuth providers**: Phase 7 currently ships `simple` mode (single-password via iron-session + argon2id). `full` Auth.js mode is deferred — use `simple` mode on Railway for now (it's still single-tenant per deployment).
- **Cold-start catch-up**: if Railway restarts at 4:30 and the daily refresh hadn't fired yet, it's missed for that day. Phase 14 adds cold-start catch-up.
- **Rate limiting**: Phase 14 adds the 3-refresh/day and 30-fetch/hour caps.
- **CSP/HSTS headers**: Phase 14.
- **Schema split for Postgres provider**: requires `prisma migrate dev` against a real Postgres and a parallel migrations folder. Open a follow-up issue when ready to ship publicly.
