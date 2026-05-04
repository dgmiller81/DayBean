# Phase 13 — Railway Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the production hosted shape on Railway. Phase 13 swaps the Phase 1 SQLite Prisma schema to Postgres at build time, lands the `railway.json` deploy descriptor, exposes a `/api/health` endpoint that probes the DB, documents the full Railway env-var contract, reinforces the Phase 7 boot guard with a startup banner, ensures `prisma migrate deploy` runs before `next start`, lays a small security-headers groundwork (full CSP/HSTS lands in Phase 14), and documents the manual Railway cron entry that drives the Phase 10 scheduler.

**This is the second security-critical phase.** Phase 7 made misconfigured auth refuse to boot. Phase 13 makes misconfigured *deploys* refuse to boot — and surfaces the running configuration in the first log line so a wrong env var is visible from Railway's log panel within seconds of a deploy. Read `docs/security.md` end-to-end before starting. Re-read master roadmap §2.1 (deploy modes), design call #10 (boot-time guards), and the Phase 13 row of the phase map. Re-read Phase 7's boot-guard rules (Phase 13 only *adds* to them — it does not weaken any of them) and Phase 10's cron-endpoint contract (Phase 13 wires the Railway cron job that calls it).

**Deploy targets this phase:** `railway` is the headline target — Phase 13 is the first phase that runs on Railway for real. `local` continues to work unchanged: the provider switcher defaults to `sqlite`, the healthcheck endpoint works against SQLite, the security headers ship on local too, and the boot banner prints in dev.

**Architecture:**

```
build time
  pnpm install --frozen-lockfile
    -> writes node_modules/
  DATABASE_PROVIDER=postgresql pnpm db:generate
    -> scripts/set-db-provider.ts rewrites prisma/schema.prisma:
         datasource db { provider = "postgresql" url = env("DATABASE_URL") }
    -> prisma generate emits a Postgres-flavored client into node_modules/.prisma/client
  pnpm build
    -> next build, runs the same instrumentation hook the runtime will run
       (Phase 7's boot guard fires here too — a bad env aborts the build,
       not the deploy)

start time (Railway)
  pnpm prisma migrate deploy
    -> applies any unapplied migrations against $DATABASE_URL
       fails the deploy if a migration fails (Railway will hold the previous
       version live until the new one passes the healthcheck)
  pnpm start
    -> next start
    -> instrumentation.ts runs Phase 7's runBootGuard() + Phase 13's
       printBootBanner() — banner is the first user-visible log line.
    -> Railway probes GET /api/health every N seconds; returns 200 when
       both Next and the DB are reachable, 503 otherwise.

cron (Railway dashboard, manual setup — see Task 8)
  every minute: POST $NEXT_PUBLIC_APP_URL/api/cron/refresh-all
                  -H "Authorization: Bearer $CRON_SECRET"
```

The provider switcher is a small Node script (`scripts/set-db-provider.ts`) that pure-Node-rewrites the `provider = "..."` line on `prisma/schema.prisma` based on `DATABASE_PROVIDER`. It accepts `sqlite` and `postgresql`, refuses anything else, and is invoked by every script that calls `prisma generate`, `prisma migrate dev`, or `prisma migrate deploy`. We choose this over Prisma's `provider = env("DATABASE_PROVIDER")` because:

1. Prisma's env-var-in-`provider` only landed in 5.x and is still gated behind `previewFeatures` for some sub-features (notably custom output paths and driver adapters); using a string keeps us off the moving target.
2. Migrations are written for a specific provider — the SQL inside `prisma/migrations/<ts>/migration.sql` differs between SQLite and Postgres for the same Prisma model. Phase 13 ships a Postgres migration baseline. The provider switcher is *also* what tells the Prisma engine which migration directory to honor.
3. A pure string in the schema gives a deterministic git diff: when the provider line changes, code review sees it. An env-var indirection hides the drift behind a runtime read.
4. The script is six lines of `readFileSync`/`writeFileSync` plus a regex; there is nothing to maintain.

**Tech Stack additions:** none — Phase 13 introduces zero new runtime dependencies. It adds one build-time helper (`scripts/set-db-provider.ts`), one route handler (`/api/health`), one Next.js config block (security headers), one dotfile (`railway.json`), and one deployment doc (`docs/deploy-railway.md`). The existing Postgres support comes free with Prisma — no new package install.

**Dependency contracts assumed from earlier phases:**

| Phase | Symbol | Shape |
|---|---|---|
| 1 | `prisma/schema.prisma` | currently `provider = "sqlite"`; Phase 13 makes the line rewriteable |
| 1 | `db` (Prisma client) | `import { db } from '@/server/db'` — used by healthcheck for `SELECT 1` |
| 7 | `runBootGuard()` | `import { runBootGuard } from '@/server/boot-guard'` — Phase 13 calls it from `instrumentation.ts` and adds a banner after it succeeds |
| 7 | `env` typed reader | `import { env } from '@/server/env'` — Phase 13 adds `DEPLOY_TARGET` and `DATABASE_PROVIDER` keys |
| 8 | `LlmCredential.encryptedKey` | encrypted with `APP_ENCRYPTION_KEY` — Phase 13 documents that losing this var loses every user's API keys |
| 10 | `POST /api/cron/refresh-all` | Bearer-token-gated cron entry point — Phase 13's Railway cron config calls it |

---

## File Structure

**Created:**

| File | Purpose |
|---|---|
| `scripts/set-db-provider.ts` | Build-time helper that rewrites `provider = "..."` in `prisma/schema.prisma` based on `$DATABASE_PROVIDER` |
| `src/app/api/health/route.ts` | Healthcheck endpoint — pings DB, returns version + DB status, 200 or 503 |
| `railway.json` | Railway deploy descriptor — build / start / healthcheck |
| `docs/deploy-railway.md` | Operator-facing deployment guide: env vars, custom domain, cutover from local |
| `tests/unit/set-db-provider.test.ts` | Asserts the schema rewrite is correct for `sqlite` and `postgresql`, and refuses unknown providers |
| `tests/integration/health.test.ts` | DB-up returns 200; DB-down returns 503 |
| `tests/integration/boot-guard-railway.test.ts` | `DEPLOY_TARGET=railway, AUTH_MODE=none` aborts; valid Railway env passes |

**Modified:**

| File | Change |
|---|---|
| `prisma/schema.prisma` | No structural change. Phase 13 only commits the file with `provider = "sqlite"` (the local default); the rewriter changes it during a Postgres build. We keep `sqlite` as the committed value so `git status` is clean for local devs. |
| `package.json` | New scripts: `db:set-provider`, `db:generate`, `db:migrate`, `db:deploy`. The first three wrap the existing Prisma commands so `set-db-provider.ts` runs first. |
| `src/server/env.ts` | Adds `DEPLOY_TARGET` (`'local' | 'railway'`, default `'local'`) and `DATABASE_PROVIDER` (`'sqlite' | 'postgresql'`, default `'sqlite'`) |
| `src/server/boot-guard.ts` | Adds Railway-specific reinforcement: requires `DATABASE_URL`, `CRON_SECRET`, `APP_ENCRYPTION_KEY`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` when `DEPLOY_TARGET=railway`. Adds `printBootBanner()` (info-level structured log, single line). |
| `instrumentation.ts` | Calls `printBootBanner()` after `runBootGuard()` succeeds. Phase 7 already wires this file. |
| `next.config.ts` | Adds `headers()` returning the three baseline security headers. |
| `.env.example` | Adds `DEPLOY_TARGET`, `DATABASE_PROVIDER`, `NEXT_PUBLIC_APP_URL`. Documents that `DATABASE_URL` is auto-injected by Railway's Postgres plugin. |
| `README.md` | Adds a "Deploying" section that points at `docs/deploy-railway.md`. |
| `docs/security.md` | Adds a "Production deploy" subsection cross-referencing this phase. (Append-only — does not change any existing text.) |

**Untouched (called out so reviewers know what stayed):** `src/server/db.ts` (Prisma client singleton — same code works for SQLite and Postgres), `src/server/crypto.ts` (encryption is provider-agnostic), every `src/app/(...)` route, every Phase 1-12 component.

---

## New Environment Variables

| Var | Required when | Default | Notes |
|---|---|---|---|
| `DEPLOY_TARGET` | always (defaults if unset) | `local` | `local` \| `railway`. Boot guard branches on this. |
| `DATABASE_PROVIDER` | only at build time | `sqlite` | `sqlite` \| `postgresql`. Read by the provider rewriter, never read at runtime. |
| `DATABASE_URL` | always (Phase 1 already required it for SQLite as `file:./dev.db`) | — | On Railway: injected by the Postgres plugin as `postgresql://user:pass@host:port/db`. Locally: `file:./prisma/dev.db`. |
| `NEXT_PUBLIC_APP_URL` | `DEPLOY_TARGET=railway` | — | Public origin, e.g. `https://daybeans.com`. Used as the OAuth callback base in `full` mode and as the cron endpoint base. Must match the Railway custom domain. |

The following vars were introduced by earlier phases and Phase 13 only re-asserts their requirement on Railway:

| Var | Phase | Why Phase 13 cares |
|---|---|---|
| `AUTH_MODE` | 7 | Boot guard already forces `full` on Railway; Phase 13 prints it in the banner |
| `AUTH_SECRET` | 7 | Auth.js session signer; required on Railway because `AUTH_MODE=full` is forced |
| `APP_ENCRYPTION_KEY` | 7 reserved / 8 used | 32-byte base64. Lose it = lose every user's encrypted API key. Banner does NOT print this. |
| `CRON_SECRET` | 7 reserved / 10 used | Bearer the Railway cron sends to `/api/cron/refresh-all` |
| OAuth client IDs / secrets | 7 | Optional — Phase 7's provider registry only registers a provider when its pair is set. Phase 13 documents which to set on Railway. |

---

## Task 1: Provider switcher script

**Files:** create `scripts/set-db-provider.ts`, `tests/unit/set-db-provider.test.ts`; modify `package.json`, `.env.example`.

The provider switcher is a build-time-only Node script. It takes `$DATABASE_PROVIDER` (or its first CLI arg, in that order), validates it against an allow-list of two values, and rewrites the `provider = "..."` line on `prisma/schema.prisma`. It does not shell out, does not import Prisma, and does not touch the network. It is idempotent: running it twice with the same value produces no diff.

- [ ] **Step 1: Write the script**

Create `scripts/set-db-provider.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Build-time helper: rewrites the `provider = "..."` line on
 * prisma/schema.prisma based on $DATABASE_PROVIDER (or argv[2]).
 *
 * Why this exists: Prisma supports env-var-in-provider in recent versions,
 * but our migration baselines are provider-specific (the SQL emitted into
 * prisma/migrations/<ts>/migration.sql differs between sqlite and postgres
 * for the same Prisma model). Pinning the provider via a string in the
 * schema keeps the migration directory deterministic and makes provider
 * swaps visible in a git diff during code review.
 *
 * Usage:
 *   DATABASE_PROVIDER=postgresql tsx scripts/set-db-provider.ts
 *   tsx scripts/set-db-provider.ts sqlite
 *
 * Exits 0 on success, 1 on invalid input or missing schema file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ALLOWED = ["sqlite", "postgresql"] as const;
type Provider = (typeof ALLOWED)[number];

function isProvider(s: string): s is Provider {
  return (ALLOWED as readonly string[]).includes(s);
}

const provider = process.argv[2] ?? process.env.DATABASE_PROVIDER ?? "sqlite";
if (!isProvider(provider)) {
  console.error(
    `set-db-provider: invalid provider "${provider}". Expected one of: ${ALLOWED.join(", ")}`,
  );
  process.exit(1);
}

const schemaPath = resolve(process.cwd(), "prisma", "schema.prisma");
let schema: string;
try {
  schema = readFileSync(schemaPath, "utf8");
} catch (e) {
  console.error(`set-db-provider: cannot read ${schemaPath}: ${(e as Error).message}`);
  process.exit(1);
}

// Match the FIRST `provider = "..."` line inside the datasource block.
// We anchor on `provider` at start-of-line (with leading whitespace) followed
// by `=` and a double-quoted string.
const re = /^(\s*provider\s*=\s*)"(?:sqlite|postgresql|mysql|sqlserver|mongodb|cockroachdb)"/m;
if (!re.test(schema)) {
  console.error(
    `set-db-provider: could not locate a datasource provider line in ${schemaPath}`,
  );
  process.exit(1);
}

const next = schema.replace(re, `$1"${provider}"`);
if (next === schema) {
  console.log(`set-db-provider: provider already "${provider}", no change`);
  process.exit(0);
}

writeFileSync(schemaPath, next, "utf8");
console.log(`set-db-provider: provider set to "${provider}"`);
```

Notes on the regex: it accepts the six providers Prisma currently supports so that if someone manually edited `schema.prisma` to `mysql` for an experiment, this script can still find and rewrite the line. The output is *always* one of the two we allow.

- [ ] **Step 2: Add `tsx` to devDependencies** (if not already added by an earlier phase)

```bash
pnpm add -D tsx
```

Phase 1 may already have added it for `prisma/seed.ts`. If `pnpm list tsx` shows nothing, install it; otherwise skip. The script is run via `tsx`, not compiled — it is a one-off build helper, not application code.

- [ ] **Step 3: Wire `package.json` scripts**

Add four scripts (preserve any that already exist):

```json
{
  "scripts": {
    "db:set-provider": "tsx scripts/set-db-provider.ts",
    "db:generate": "pnpm db:set-provider && prisma generate",
    "db:migrate":  "pnpm db:set-provider && prisma migrate dev",
    "db:deploy":   "pnpm db:set-provider && prisma migrate deploy"
  }
}
```

`db:set-provider` reads `$DATABASE_PROVIDER` from the environment, so the build command in `railway.json` (Task 2) prepends `DATABASE_PROVIDER=postgresql` once and every subsequent script inherits it via `pnpm`'s sub-process env passthrough.

- [ ] **Step 4: Document the script in `.env.example`**

Append to `.env.example`:

```bash
# --- Phase 13: Deploy ---
# Where this instance is running. Boot guard refuses unsafe combinations.
# Allowed: local | railway. Default: local.
DEPLOY_TARGET=local

# Build-time only. Read by scripts/set-db-provider.ts. Never read at runtime.
# Allowed: sqlite | postgresql. Default: sqlite.
DATABASE_PROVIDER=sqlite

# Public origin for OAuth callbacks and cron endpoint. Required on Railway.
# Locally, leave empty or set to http://localhost:3000.
NEXT_PUBLIC_APP_URL=
```

- [ ] **Step 5: Test — happy path, both providers**

Create `tests/unit/set-db-provider.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";

const SCRIPT = resolve(process.cwd(), "scripts/set-db-provider.ts");
const TSX = resolve(process.cwd(), "node_modules/.bin/tsx");

function runIn(cwd: string, env: Record<string, string>, args: string[] = []) {
  return execFileSync(TSX, [SCRIPT, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function makeTempProject(initialProvider: string) {
  const dir = mkdtempSync(join(tmpdir(), "tdm-prov-"));
  mkdirSync(join(dir, "prisma"));
  writeFileSync(
    join(dir, "prisma", "schema.prisma"),
    `datasource db {\n  provider = "${initialProvider}"\n  url      = env("DATABASE_URL")\n}\n`,
    "utf8",
  );
  return dir;
}

describe("set-db-provider", () => {
  const cleanup: string[] = [];
  afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

  it("rewrites sqlite -> postgresql via env var", () => {
    const dir = makeTempProject("sqlite");
    cleanup.push(dir);
    runIn(dir, { DATABASE_PROVIDER: "postgresql" });
    const out = readFileSync(join(dir, "prisma", "schema.prisma"), "utf8");
    expect(out).toContain('provider = "postgresql"');
    expect(out).not.toContain('provider = "sqlite"');
  });

  it("rewrites postgresql -> sqlite via positional arg", () => {
    const dir = makeTempProject("postgresql");
    cleanup.push(dir);
    runIn(dir, {}, ["sqlite"]);
    const out = readFileSync(join(dir, "prisma", "schema.prisma"), "utf8");
    expect(out).toContain('provider = "sqlite"');
  });

  it("is idempotent", () => {
    const dir = makeTempProject("sqlite");
    cleanup.push(dir);
    runIn(dir, { DATABASE_PROVIDER: "sqlite" });
    runIn(dir, { DATABASE_PROVIDER: "sqlite" });
    const out = readFileSync(join(dir, "prisma", "schema.prisma"), "utf8");
    expect(out.match(/provider = "sqlite"/g)).toHaveLength(1);
  });

  it("rejects unknown provider", () => {
    const dir = makeTempProject("sqlite");
    cleanup.push(dir);
    expect(() => runIn(dir, { DATABASE_PROVIDER: "redis" })).toThrowError(/exit code 1/);
  });

  it("rejects missing schema file", () => {
    const dir = mkdtempSync(join(tmpdir(), "tdm-prov-empty-"));
    cleanup.push(dir);
    expect(() => runIn(dir, { DATABASE_PROVIDER: "sqlite" })).toThrowError(/exit code 1/);
  });
});
```

Notes: we drive the script with `execFileSync` (no shell, explicit argv) per the constraints in the task brief. Each test gets its own temp project so they cannot poison each other or the real `prisma/schema.prisma`.

Run:

```bash
pnpm vitest run tests/unit/set-db-provider.test.ts
```

Expected: 5 passed, 0 failed.

- [ ] **Step 6: Smoke-check on the real schema**

```bash
DATABASE_PROVIDER=postgresql pnpm db:set-provider
git diff prisma/schema.prisma
DATABASE_PROVIDER=sqlite pnpm db:set-provider
git diff prisma/schema.prisma
```

Expected: the first command shows a one-line provider change to `postgresql`; the second restores it. Leave the file at `sqlite` after the smoke check so local devs still get the SQLite path.

---

## Task 2: `railway.json` deploy descriptor

**Files:** create `railway.json` at the repo root.

Railway reads `railway.json` at deploy time to determine build and start commands, healthcheck, and restart policy. We use the Nixpacks builder (Railway's default) — Nixpacks auto-detects Next.js and pnpm, so we only override the four things we care about.

- [ ] **Step 1: Write `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile && DATABASE_PROVIDER=postgresql pnpm db:generate && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm prisma migrate deploy && pnpm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Why each piece:

- **`buildCommand`** runs `pnpm install --frozen-lockfile` first so a drifted `pnpm-lock.yaml` fails the build deterministically. The middle command sets `DATABASE_PROVIDER=postgresql` and calls `pnpm db:generate`, which (per Task 1) chains `set-db-provider` then `prisma generate`. The Prisma client emitted into `node_modules/.prisma/client` is now Postgres-flavored. `pnpm build` then runs `next build`, which also runs `instrumentation.ts` (Next 15's instrumentation hook fires at build for static analysis) — Phase 7's boot guard fires here, so a missing `APP_ENCRYPTION_KEY` *fails the build*, not the deploy.
- **`startCommand`** runs `pnpm prisma migrate deploy` *before* `pnpm start`. `migrate deploy` is the production migration runner — it does not prompt, only applies pending migrations, and exits non-zero on failure. Putting it before `next start` means a failing migration kills the deploy and Railway holds the previous version live (see "Cutover plan" in Notes for caveats on destructive migrations).
- **`healthcheckPath`** points at the endpoint Task 3 builds. Railway probes it during deploy; a non-200 response holds the deploy in "deploying" state and the previous version stays live.
- **`healthcheckTimeout: 30`** gives the cold-start enough wall-clock to compile the route, open the DB pool, and run `SELECT 1`. 30s is generous; tighten in Phase 14 if observed cold-starts are well under it.
- **`restartPolicyType: ON_FAILURE`** with `MaxRetries: 3` — if the process dies after a clean start (e.g. an unhandled rejection in a server action), Railway restarts up to three times before flipping the deploy red. After three, an operator gets a real notification instead of an infinite restart loop.

- [ ] **Step 2: Verify the schema URL**

`https://railway.app/railway.schema.json` is the schema reference Railway publishes at the time of writing (May 2026). Confirm it resolves with `curl -I https://railway.app/railway.schema.json` (or the Railway docs page on `railway.json`) before committing. If Railway has moved it, update the `$schema` value to whatever the docs reference. The schema URL is purely a hint for editors — Railway's deploy pipeline does not require it.

- [ ] **Step 3: Commit at end of phase only**

`railway.json` should be the *last* file committed in this phase. Once Railway sees this file in `main`, the next push triggers a real deploy. We want every other Phase 13 file in place before that happens.

---

## Task 3: Healthcheck endpoint

**Files:** create `src/app/api/health/route.ts`, `tests/integration/health.test.ts`.

The healthcheck endpoint has two responsibilities and two non-responsibilities. It MUST return 200 only when the process is up *and* the database responds; it MUST return JSON containing the running version and a DB status flag. It MUST NOT leak any internal information beyond those two fields — no env vars, no commit SHA, no host name, no migration list, no user count. Every byte of the response is reachable from the public internet without authentication.

- [ ] **Step 1: Read the package version at module load**

We embed the version into the JSON so a deploy that's stuck on an old build is visible from the healthcheck. Read it once at module init (not on every request) by importing `../../../../package.json` (Next.js bundles JSON imports natively).

- [ ] **Step 2: Write the route handler**

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import pkg from "../../../../package.json" assert { type: "json" };

export const dynamic = "force-dynamic"; // never cache; healthcheck must reflect now
export const revalidate = 0;
export const runtime = "nodejs"; // Prisma needs node, not edge

const VERSION = (pkg as { version?: string }).version ?? "0.0.0";

export async function GET(): Promise<NextResponse> {
  let dbOk = false;
  try {
    // Provider-agnostic ping. SELECT 1 works on sqlite and postgresql.
    // Prisma's $queryRawUnsafe with a constant string is safe here — there is
    // no user input on the path. We use $queryRaw to keep it consistent with
    // the rest of the codebase even though the constant is harmless.
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const body = {
    status: dbOk ? "ok" : "fail",
    version: VERSION,
    db: dbOk ? "ok" : "fail",
  } as const;

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
```

What is *deliberately not* in the response:

- No `commit` / `git_sha` — that's a Phase 14 addition once we have a build-time `NEXT_PUBLIC_COMMIT_SHA`. Even then it goes behind an auth gate; the public healthcheck stays minimal.
- No `uptime` / `pid` — fingerprintable host info.
- No `env` / `deploy_target` — the boot banner already logs that internally; exposing it publicly is gratuitous.
- No request-level info echoed back — eliminates an XSS-via-JSON vector.

- [ ] **Step 3: Test — DB up returns 200**

Create `tests/integration/health.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const queryRawMock = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => queryRawMock.mockReset());

  it("returns 200 + status:ok when DB pings", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    // No leaks
    expect(body).not.toHaveProperty("env");
    expect(body).not.toHaveProperty("deploy_target");
    expect(body).not.toHaveProperty("uptime");
  });

  it("returns 503 + status:fail when DB throws", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("fail");
    expect(body.db).toBe("fail");
  });

  it("never caches", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("does not leak the underlying error message", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("password authentication failed for user 'X'"));
    const res = await GET();
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("authentication");
  });
});
```

Run:

```bash
pnpm vitest run tests/integration/health.test.ts
```

Expected: 4 passed, 0 failed.

- [ ] **Step 4: Manual check against the dev server**

```bash
pnpm dev
curl -i http://localhost:3000/api/health
```

Expected: `HTTP/1.1 200 OK`, body `{"status":"ok","version":"<x.y.z>","db":"ok"}`. Then stop Postgres / move `dev.db` aside and re-curl: `HTTP/1.1 503 Service Unavailable`, body `{"status":"fail","version":"<x.y.z>","db":"fail"}`.

---

## Task 4: Boot guard reinforcement + startup banner

**Files:** modify `src/server/env.ts`, `src/server/boot-guard.ts`; create `tests/integration/boot-guard-railway.test.ts`.

Phase 7 already wrote `runBootGuard()` and the rules about `AUTH_MODE`, `APP_ENCRYPTION_KEY`, and `CRON_SECRET`. Phase 13 adds: (a) two new typed env keys, (b) Railway-specific assertions that fail fast at boot, (c) a startup banner that logs the resolved configuration at info level so misconfigurations are visible in Railway's log panel.

- [ ] **Step 1: Extend `src/server/env.ts`**

Add the two new keys to the Zod schema:

```ts
// at top of the existing schema literal
DEPLOY_TARGET: z.enum(["local", "railway"]).default("local"),
DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
NEXT_PUBLIC_APP_URL: z.string().url().optional(),
```

`DATABASE_PROVIDER` is parsed at runtime even though it's only meaningful at build time — having it in the typed env makes the banner's job trivial and gives us a stable place to add a runtime sanity check ("if running on Postgres but `DATABASE_PROVIDER=sqlite`, log a warning") in Phase 14 if we want it.

- [ ] **Step 2: Add Railway-specific rules to `runBootGuard()`**

Inside `runBootGuard()`, after the existing Phase 7 rules, append:

```ts
if (env.DEPLOY_TARGET === "railway") {
  // Phase 7 already requires AUTH_MODE=full on Railway. Re-state.
  if (env.AUTH_MODE !== "full") {
    throw new BootGuardError(
      "DEPLOY_TARGET=railway requires AUTH_MODE=full (Phase 7 rule)",
    );
  }
  // Phase 8 / Phase 13: encrypted credentials cannot be decrypted without it.
  if (!env.APP_ENCRYPTION_KEY) {
    throw new BootGuardError("APP_ENCRYPTION_KEY is required on Railway");
  }
  // Phase 7: session signer.
  if (!env.AUTH_SECRET) {
    throw new BootGuardError("AUTH_SECRET is required on Railway");
  }
  // Phase 10: cron endpoint authenticator.
  if (!env.CRON_SECRET) {
    throw new BootGuardError("CRON_SECRET is required on Railway");
  }
  // Phase 13: cron endpoint URL base + OAuth callback base.
  if (!env.NEXT_PUBLIC_APP_URL) {
    throw new BootGuardError(
      "NEXT_PUBLIC_APP_URL is required on Railway (used for OAuth callbacks and cron)",
    );
  }
  // DATABASE_URL is required on every target; on Railway it's injected by the
  // Postgres plugin. We check it here so the error message names Railway.
  if (!process.env.DATABASE_URL) {
    throw new BootGuardError(
      "DATABASE_URL is required on Railway (attach the Postgres plugin)",
    );
  }
  if (!process.env.DATABASE_URL.startsWith("postgresql://") &&
      !process.env.DATABASE_URL.startsWith("postgres://")) {
    throw new BootGuardError(
      `DATABASE_URL on Railway must be postgresql://... (got "${process.env.DATABASE_URL.slice(0, 12)}...")`,
    );
  }
}
```

The last check is the surprise one. If a developer copies a local `DATABASE_URL=file:./dev.db` into Railway's env panel by accident, the boot guard refuses to start instead of attempting to open `./dev.db` in a Railway container's ephemeral filesystem (which would silently "work" until the container restarts and loses every write).

- [ ] **Step 3: Add the startup banner**

The banner is a single info-level log line emitted *after* `runBootGuard()` returns. It uses `pino` if Phase 14 has landed it, otherwise plain `console.log`. The banner is the FIRST line a user sees in Railway's log panel after a deploy completes — it is the canary for misconfiguration.

In `src/server/boot-guard.ts`:

```ts
import pkg from "../../package.json" assert { type: "json" };

export function printBootBanner(): void {
  const e = env; // already-parsed env from the typed reader
  // List of env vars the banner reports. Boolean form (set/unset) only —
  // never the value, because that would print AUTH_SECRET hashes etc.
  const presence = (k: string) =>
    process.env[k] && process.env[k] !== "" ? "set" : "unset";

  const line = {
    msg: "boot",
    version: (pkg as { version?: string }).version ?? "0.0.0",
    deploy_target: e.DEPLOY_TARGET,
    auth_mode: e.AUTH_MODE,
    db_provider: e.DATABASE_PROVIDER,
    app_url: e.NEXT_PUBLIC_APP_URL ?? null,
    secrets: {
      AUTH_SECRET: presence("AUTH_SECRET"),
      APP_ENCRYPTION_KEY: presence("APP_ENCRYPTION_KEY"),
      CRON_SECRET: presence("CRON_SECRET"),
      DATABASE_URL: presence("DATABASE_URL"),
    },
    oauth: {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      azure:  !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
      twitter: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    },
  };

  // pino-style structured log if available, else JSON.stringify.
  // No interpolation of secret VALUES anywhere.
  console.log(JSON.stringify(line));
}
```

Crucial property: `secrets.*` is `"set" | "unset"`, never the value. The banner answers "are my secrets configured?" without printing them. OAuth providers report a boolean of pair-completeness, which is what the Phase 7 provider registry actually checks.

- [ ] **Step 4: Wire it from `instrumentation.ts`**

`instrumentation.ts` (Phase 7) currently reads:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBootGuard } = await import("@/server/boot-guard");
    runBootGuard();
  }
}
```

Extend to:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBootGuard, printBootBanner } = await import("@/server/boot-guard");
    runBootGuard();
    printBootBanner();
  }
}
```

`printBootBanner` runs only after `runBootGuard` returns; if the guard throws, the banner never runs and the only log line is the guard's error — which is the right ordering.

- [ ] **Step 5: Test**

Create `tests/integration/boot-guard-railway.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

function withEnv(over: Record<string, string>, fn: () => unknown) {
  const saved = { ...process.env };
  Object.assign(process.env, over);
  try {
    return fn();
  } finally {
    process.env = saved;
  }
}

async function loadGuard() {
  vi.resetModules();
  return await import("@/server/boot-guard");
}

const RAILWAY_OK = {
  DEPLOY_TARGET: "railway",
  AUTH_MODE: "full",
  AUTH_SECRET: "x".repeat(43),
  APP_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
  CRON_SECRET: "y".repeat(32),
  NEXT_PUBLIC_APP_URL: "https://daybeans.com",
  DATABASE_URL: "postgresql://u:p@h:5432/d",
};

describe("boot guard — Railway", () => {
  it("aborts when AUTH_MODE=none on Railway", async () => {
    await withEnv({ ...RAILWAY_OK, AUTH_MODE: "none" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/AUTH_MODE=full/);
    });
  });

  it("aborts when AUTH_MODE=simple on Railway", async () => {
    await withEnv({ ...RAILWAY_OK, AUTH_MODE: "simple" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/AUTH_MODE=full/);
    });
  });

  it("aborts when APP_ENCRYPTION_KEY is missing", async () => {
    await withEnv({ ...RAILWAY_OK, APP_ENCRYPTION_KEY: "" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/APP_ENCRYPTION_KEY/);
    });
  });

  it("aborts when CRON_SECRET is missing", async () => {
    await withEnv({ ...RAILWAY_OK, CRON_SECRET: "" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/CRON_SECRET/);
    });
  });

  it("aborts when NEXT_PUBLIC_APP_URL is missing", async () => {
    await withEnv({ ...RAILWAY_OK, NEXT_PUBLIC_APP_URL: "" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/NEXT_PUBLIC_APP_URL/);
    });
  });

  it("aborts when DATABASE_URL is sqlite on Railway", async () => {
    await withEnv({ ...RAILWAY_OK, DATABASE_URL: "file:./dev.db" }, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).toThrowError(/postgresql/);
    });
  });

  it("passes with a complete Railway env", async () => {
    await withEnv(RAILWAY_OK, async () => {
      const { runBootGuard } = await loadGuard();
      expect(() => runBootGuard()).not.toThrow();
    });
  });
});

describe("boot banner", () => {
  it("never prints a secret value", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await withEnv(RAILWAY_OK, async () => {
      const { printBootBanner } = await loadGuard();
      printBootBanner();
    });
    const out = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();
    expect(out).not.toContain(RAILWAY_OK.AUTH_SECRET);
    expect(out).not.toContain(RAILWAY_OK.CRON_SECRET);
    expect(out).not.toContain(RAILWAY_OK.APP_ENCRYPTION_KEY);
    expect(out).not.toContain("u:p@h"); // DATABASE_URL credentials
    // But it DOES report presence
    expect(out).toMatch(/AUTH_SECRET[^,}]*set/);
    expect(out).toMatch(/CRON_SECRET[^,}]*set/);
  });

  it("reports unset when secrets are missing", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await withEnv({ ...RAILWAY_OK, CRON_SECRET: "" }, async () => {
      const { printBootBanner } = await loadGuard();
      printBootBanner();
    });
    const out = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();
    expect(out).toMatch(/CRON_SECRET[^,}]*unset/);
  });
});
```

Run:

```bash
pnpm vitest run tests/integration/boot-guard-railway.test.ts
```

Expected: 9 passed, 0 failed.

---

## Task 5: Migrate-on-deploy and the Postgres migration baseline

**Files:** modify `package.json` (already done in Task 1), modify `prisma/migrations/` (auto-generated).

The Phase 1 migration baseline was generated against SQLite. The same Prisma model emits *different* SQL when the provider is Postgres — most notably, SQLite uses `TEXT` for everything Postgres calls `TEXT NOT NULL DEFAULT ''`, and SQLite has no native `JSONB` (the `Pref.interests Json` column becomes `TEXT` with JSON-string serialization in SQLite, `JSONB` in Postgres).

Phase 13 generates the Postgres baseline as a *new, additional* migration directory inside `prisma/migrations/`, NOT as a rewrite of the SQLite baseline. Both baselines live side-by-side; Prisma's migration runner picks the right one based on the connected provider.

- [ ] **Step 1: Spin up a local Postgres for migration generation**

```bash
docker run --rm -d --name tdm-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tdm \
  -p 5432:5432 postgres:16
```

If you don't have Docker, use a Railway preview branch's `DATABASE_URL` instead. The point is to have a real Postgres reachable at a `postgresql://` URL.

- [ ] **Step 2: Generate the baseline migration**

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tdm \
  pnpm prisma migrate dev --name pg_baseline --create-only
```

`--create-only` writes the migration but does not apply it. Inspect the new directory in `prisma/migrations/<timestamp>_pg_baseline/migration.sql` — it should contain `CREATE TABLE "User" ...` with `text`, `boolean`, `timestamp`, `jsonb` types as appropriate.

- [ ] **Step 3: Apply locally to verify**

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tdm \
  pnpm db:deploy
```

Expected: `migrate deploy` reports "All migrations have been successfully applied."

- [ ] **Step 4: Verify the SQLite path still works**

```bash
DATABASE_PROVIDER=sqlite pnpm db:set-provider
DATABASE_URL=file:./prisma/dev.db pnpm prisma migrate status
```

Expected: SQLite migrations still recognized; no spurious "drift detected." Restore the schema to `provider = "sqlite"` after this so local dev works out of the box.

- [ ] **Step 5: Tear down the local Postgres**

```bash
docker stop tdm-pg
```

- [ ] **Step 6: Commit the new migration directory**

```bash
git add prisma/migrations/<timestamp>_pg_baseline/
git status
```

Expected: only the new directory is added; no changes to existing migrations.

---

## Task 6: Security headers groundwork

**Files:** modify `next.config.ts`.

Phase 14 will land the full Content-Security-Policy and HSTS. Phase 13 lays the floor: three response headers that every defended Next.js app should set unconditionally, on every route, on every deploy target. They are cheap, well-supported, and have zero runtime cost.

- [ ] **Step 1: Extend `next.config.ts`**

Append a `headers()` async function inside the existing config object:

```ts
const config: NextConfig = {
  // ...existing fields from Phase 1...
  async headers() {
    return [
      {
        // Apply to every route, including /api/* and static assets
        source: "/:path*",
        headers: [
          // Stops the site being framed by another origin (clickjacking).
          // Phase 14 will replace this with a CSP frame-ancestors directive,
          // which subsumes X-Frame-Options. Both can coexist; modern browsers
          // prefer CSP if both are present.
          { key: "X-Frame-Options", value: "DENY" },
          // Disables MIME-type sniffing so a JSON response cannot be
          // re-interpreted as HTML by an aggressive browser.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Default referer policy: same-origin internal links keep the full
          // path; cross-origin gets only the origin. Avoids leaking
          // /onboarding/<step> paths to article links the user clicks.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
```

What is *not* in this set, deferred to Phase 14:

- `Content-Security-Policy` — needs the connect-src list aligned with the actually-configured LLM provider; we want to set it once we know the shape, not before.
- `Strict-Transport-Security` — Railway terminates TLS at the edge. HSTS belongs at the edge too, and Phase 14 routes traffic through Railway's `Public Networking` settings. Setting HSTS in app code can lock the user out of localhost dev if they ever hit localhost over HTTPS by mistake.
- `Permissions-Policy` — needs an explicit list of features to allow/deny; mock it up in Phase 14 alongside the CSP.

- [ ] **Step 2: Manual verification**

```bash
pnpm dev
curl -I http://localhost:3000/
```

Expected response headers include:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Try a static asset and the healthcheck:

```bash
curl -I http://localhost:3000/api/health
curl -I http://localhost:3000/_next/static/<any-known-file>
```

Same three headers should appear on both. (Next applies `headers()` matchers to every response that flows through its handler, including static assets served via the framework.)

- [ ] **Step 3: Add a smoke assertion to an existing test**

Inside `tests/integration/health.test.ts` (Task 3), add one extra check at the bottom of the "DB up" test:

```ts
expect(res.headers.get("x-frame-options")).toBe("DENY");
expect(res.headers.get("x-content-type-options")).toBe("nosniff");
expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
```

(Note: in App Router route handlers, `headers()` from `next.config.ts` is applied by the framework for the actual HTTP response, so this assertion holds in a real `next start` but will *not* hold against the unit-test invocation of the handler. If the assertions fail in unit, gate them behind a Playwright smoke test in Phase 14 instead. Document the limitation inline.)

---

## Task 7: `docs/deploy-railway.md` — operator deployment guide

**Files:** create `docs/deploy-railway.md`.

This is the only doc (besides the plan itself) that ships in Phase 13. It is operator-facing and lives outside `docs/superpowers/plans/`. It covers: provisioning, env vars, custom domain, OAuth callbacks, cron setup, and the cutover from local SQLite. It is *not* a marketing doc — it assumes the reader has a Railway account and shell access.

- [ ] **Step 1: Create the file with this skeleton**

```markdown
# Deploying DayBeans to Railway

This is the production hosting path. Local SQLite continues to work and is documented in `README.md`; this doc only covers Railway.

## 0. Prerequisites

- Railway account with billing attached.
- A clone of this repo.
- The `railway` CLI (`npm i -g @railway/cli`) is optional — every step here is doable via the dashboard.
- A 32-byte base64 string for `APP_ENCRYPTION_KEY`. Generate once and store in a password manager:
  ```bash
  openssl rand -base64 32
  ```
- A 32+ byte base64 string for `AUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- A long random string for `CRON_SECRET` (40+ chars, URL-safe):
  ```bash
  openssl rand -base64 30 | tr -d '/+=' | head -c 40
  ```

## 1. Create the Railway project

1. New Project -> Deploy from GitHub Repo -> select this repo.
2. Railway detects `railway.json` and uses Nixpacks. No further build config needed.
3. The first deploy will FAIL the boot guard because env vars are not set yet. That is expected — we set them in Step 2 then redeploy.

## 2. Provision the database

1. From the project view, click `+ New` -> `Database` -> `PostgreSQL`.
2. Wait for the plugin to provision. Railway exposes `DATABASE_URL` automatically — the app service can reference it via the `${{Postgres.DATABASE_URL}}` template variable.
3. In the app service's `Variables` tab, add:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

## 3. Set the production env vars

In the app service's `Variables` tab, add the following. NEVER paste secrets into shared screenshots or pull-request descriptions.

| Var | Value | Notes |
|---|---|---|
| `DEPLOY_TARGET` | `railway` | Mandatory. Boot guard refuses to start without it on Railway. |
| `DATABASE_PROVIDER` | `postgresql` | Read at build time only. |
| `AUTH_MODE` | `full` | Boot guard refuses any other value on Railway. |
| `AUTH_SECRET` | (32+ byte base64) | Auth.js session signer. **Lose this and every session is invalidated.** |
| `APP_ENCRYPTION_KEY` | (32 byte base64) | Encrypts user-stored API keys. **Lose this and every encrypted key is unrecoverable** — affected users will need to re-enter their LLM API keys. |
| `CRON_SECRET` | (40+ char random) | Bearer token the Railway cron sends to `/api/cron/refresh-all`. |
| `NEXT_PUBLIC_APP_URL` | `https://<your-railway-or-custom-domain>` | Used for OAuth callbacks and the cron URL. Must match the domain Railway serves. |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Already set in Step 2. |

OAuth provider variables are *optional* — only set the pairs for the providers you want enabled. Each provider's button in the login screen only appears when its pair is fully set:

| Var pair | Effect |
|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Enables Google sign-in |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` | Enables GitHub sign-in |
| `AZURE_AD_CLIENT_ID` + `AZURE_AD_CLIENT_SECRET` + `AZURE_AD_TENANT_ID` | Enables Microsoft / Azure AD sign-in |
| `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET` | Enables X / Twitter sign-in |
| `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` | Enables Facebook sign-in |

After saving, redeploy the app service. The first successful deploy logs a JSON banner like:

```json
{"msg":"boot","version":"0.13.0","deploy_target":"railway","auth_mode":"full","db_provider":"postgresql","app_url":"https://daybeans.com","secrets":{"AUTH_SECRET":"set","APP_ENCRYPTION_KEY":"set","CRON_SECRET":"set","DATABASE_URL":"set"},"oauth":{"google":true,"github":false,"azure":false,"twitter":false,"facebook":false}}
```

If any `secrets.*` reads `unset`, the boot guard would already have aborted — its absence in the log means the deploy is broken. Re-check the `Variables` tab.

## 4. Custom domain

1. In the app service, `Settings` -> `Networking` -> `Add Custom Domain`.
2. Enter your domain (e.g. `daybeans.com`). Railway issues a TLS cert via Let's Encrypt automatically once DNS resolves.
3. At your DNS provider, add a `CNAME` record from `daybeans.com` (or `www`, your call) to the Railway-provided target (e.g. `<id>.up.railway.app`).
4. **Update `NEXT_PUBLIC_APP_URL`** to the new domain. This is critical for OAuth: each provider's app config (in Google Console, GitHub Developer Settings, etc.) lists allowed redirect URIs that must match exactly. If `NEXT_PUBLIC_APP_URL` and the OAuth provider's redirect URI disagree, sign-in returns "redirect_uri_mismatch" with no useful Railway log.
5. Redeploy after changing `NEXT_PUBLIC_APP_URL`.

## 5. Set up the cron job for the LLM scheduler

Phase 10 implemented `POST /api/cron/refresh-all` that, when called with the right Bearer header, fans out to every user whose scheduled refresh time has elapsed. Railway's cron jobs are configured per-service in the dashboard; **as of build time (May 2026), Railway's cron jobs are NOT expressible in `railway.json`** — they live only in the dashboard. (Re-check before deploy: Railway updates this surface periodically.)

In the app service's `Settings` -> `Cron Jobs`:

1. Add a new cron job.
2. Schedule: `* * * * *` (every minute).
3. Command: leave the existing service running. The cron uses an HTTP fan-out, NOT a separate service. Use a one-shot HTTP request:
   ```bash
   curl -fsS -X POST \
     -H "Authorization: Bearer ${CRON_SECRET}" \
     -H "Content-Type: application/json" \
     "${NEXT_PUBLIC_APP_URL}/api/cron/refresh-all"
   ```
   Railway's cron supports environment variable expansion in the command field, so `${CRON_SECRET}` and `${NEXT_PUBLIC_APP_URL}` resolve from the service's variables.
4. Save.

The cron endpoint is idempotent (Phase 10 design): two ticks for the same `(userId, iso)` produce one refresh, not two. Once-a-minute cadence gives a `<= 60s` p99 latency on the user-configured refresh time without hammering OpenAI/Anthropic.

If Railway later adds cron-job support to `railway.json`, move the entry there in a follow-up phase. For now this MUST be a manual setup step.

## 6. Smoke check the deploy

Once the deploy is green:

```bash
curl -fsS https://<your-domain>/api/health
# {"status":"ok","version":"0.13.0","db":"ok"}
curl -fsS -I https://<your-domain>/
# expect X-Frame-Options: DENY etc.
```

Then sign in via the UI and confirm a manual content refresh works.

## 7. Rotation

- `AUTH_SECRET`: rotate by replacing the var and redeploying. Active sessions are invalidated (users sign in again). No data loss.
- `APP_ENCRYPTION_KEY`: ROTATION REQUIRES RE-ENCRYPTION. There is no Phase 13 tooling for this — it's a Phase 14 operator script. **Until then, treat this key as forever**. If it leaks, take the service offline, generate a new one, ask users to delete and re-enter their stored API keys (their `LlmCredential` rows become unreadable but the rest of their data is fine).
- `CRON_SECRET`: rotate at will; the cron job and `/api/cron/refresh-all` only need to agree.
- OAuth secrets: rotate per provider docs; redeploy.

## 8. Database backups

Railway's Postgres plugin offers automated daily backups on paid plans. Enable them. v1 has no app-level export tool — backups are the only path out. (See "Cutover plan" in `docs/superpowers/plans/2026-05-02-phase-13-railway.md` for what is and isn't migrated from a local SQLite to Railway Postgres.)
```

- [ ] **Step 2: Cross-link from `README.md`**

Add a `## Deploying` section to `README.md` (one paragraph + link), e.g.:

> DayBeans ships in two shapes: local (SQLite) for personal use on a single workstation, and Railway (Postgres) for hosted, multi-device access. Local is the default — `pnpm install && pnpm db:migrate && pnpm dev` works out of the box. For the Railway path, see [`docs/deploy-railway.md`](docs/deploy-railway.md).

- [ ] **Step 3: Append a pointer to `docs/security.md`**

Under a new `## Production deploy` heading at the bottom of `docs/security.md`:

> The production-only constraints documented in this file (`AUTH_MODE=full` forced, `APP_ENCRYPTION_KEY` mandatory, `CRON_SECRET` mandatory, `DATABASE_URL` must be `postgresql://`) are mechanically enforced by the boot guard implemented in Phase 7 and reinforced in Phase 13. The operator playbook lives at `docs/deploy-railway.md`. The plan that landed Railway support is `docs/superpowers/plans/2026-05-02-phase-13-railway.md`.

---

## Task 8: Railway cron — manual verification step

**Files:** none (this is a runbook step).

The cron endpoint is implemented in Phase 10. Phase 13's job is to set up the Railway cron job that calls it, and to verify end-to-end that the trigger fires and the endpoint accepts it.

- [ ] **Step 1: Confirm Phase 10 endpoint exists and is Bearer-gated**

```bash
curl -i -X POST https://<your-domain>/api/cron/refresh-all
# expect: HTTP/1.1 401
curl -i -X POST -H "Authorization: Bearer wrong" https://<your-domain>/api/cron/refresh-all
# expect: HTTP/1.1 401
curl -i -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://<your-domain>/api/cron/refresh-all
# expect: HTTP/1.1 200 + JSON
```

If the unauthorized requests return anything other than 401 (especially 200), STOP. The endpoint is open and the cron job will be the least of the problems. File a Phase 10 follow-up before continuing.

- [ ] **Step 2: Configure the Railway cron**

Per `docs/deploy-railway.md` §5. Save with schedule `* * * * *`.

- [ ] **Step 3: Watch the logs for one minute**

In Railway's log panel, filter for `cron`. Within 60s of saving, expect a log entry from the cron worker showing the curl exit code (`0`) and an entry from the app showing the `POST /api/cron/refresh-all` 200.

- [ ] **Step 4: Document any deviation**

If Railway's cron has been redesigned by the time you run this (it is a frequently-updated surface), update `docs/deploy-railway.md` §5 in the same PR — do not let the doc rot.

---

## Phase 13 Acceptance Criteria

Phase 13 is done when ALL of these hold simultaneously:

**Provider switcher**
- [ ] `scripts/set-db-provider.ts` exists, is executable via `tsx`, and rewrites `prisma/schema.prisma` based on `$DATABASE_PROVIDER` (or argv).
- [ ] The script refuses any value not in `{sqlite, postgresql}` with exit code 1.
- [ ] `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:deploy` all run the rewriter before invoking Prisma.
- [ ] The committed `prisma/schema.prisma` has `provider = "sqlite"` (the local default).
- [ ] `tests/unit/set-db-provider.test.ts` passes (5 cases).

**Build & deploy descriptor**
- [ ] `railway.json` exists at the repo root with the build/start/healthcheck described in Task 2.
- [ ] A test deploy on Railway succeeds with `DEPLOY_TARGET=railway, AUTH_MODE=full, DATABASE_PROVIDER=postgresql`.
- [ ] The deploy logs show the boot banner as the first app-level log line.

**Healthcheck**
- [ ] `GET /api/health` returns 200 + `{status:"ok", version, db:"ok"}` when DB is reachable.
- [ ] Returns 503 + `{status:"fail", version, db:"fail"}` when DB is unreachable.
- [ ] Never includes `env`, `deploy_target`, `uptime`, or any internal info beyond the three documented fields.
- [ ] Never caches (response includes `Cache-Control: no-store`).
- [ ] `tests/integration/health.test.ts` passes (4 cases).

**Boot guard reinforcement**
- [ ] `runBootGuard()` aborts when `DEPLOY_TARGET=railway` and any of `AUTH_MODE != full`, `APP_ENCRYPTION_KEY` unset, `AUTH_SECRET` unset, `CRON_SECRET` unset, `NEXT_PUBLIC_APP_URL` unset, or `DATABASE_URL` not `postgresql://...`.
- [ ] `printBootBanner()` runs after the guard and emits a JSON line containing `version`, `deploy_target`, `auth_mode`, `db_provider`, `app_url`, secret-presence flags (set/unset), OAuth-pair flags.
- [ ] No banner output ever contains a secret VALUE — only `set`/`unset` flags.
- [ ] `tests/integration/boot-guard-railway.test.ts` passes (9 cases).

**Migrate-on-deploy**
- [ ] A new `prisma/migrations/<ts>_pg_baseline/` directory exists, generated from the same Prisma model.
- [ ] `pnpm prisma migrate deploy` succeeds against a fresh Postgres.
- [ ] The SQLite path still works against `prisma/dev.db` after restoring the schema's provider line.
- [ ] `railway.json`'s `startCommand` runs `prisma migrate deploy` before `next start`.

**Security headers**
- [ ] Every response includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] No CSP, HSTS, or `Permissions-Policy` is set yet (Phase 14 will).

**Cron**
- [ ] `docs/deploy-railway.md` §5 documents the manual cron entry with the exact curl command.
- [ ] After setup, the Railway cron worker logs a successful 200 against `/api/cron/refresh-all` once per minute.
- [ ] Unauthorized POSTs to that endpoint return 401.

**Custom domain**
- [ ] `docs/deploy-railway.md` §4 documents the CNAME setup and the requirement that `NEXT_PUBLIC_APP_URL` matches the domain Railway serves.
- [ ] OAuth providers' redirect URIs match `NEXT_PUBLIC_APP_URL` (verified manually for any provider whose pair is set).

**Documentation**
- [ ] `docs/deploy-railway.md` exists and is referenced from `README.md`.
- [ ] `docs/security.md` has a `## Production deploy` subsection cross-referencing this phase.
- [ ] `.env.example` documents `DEPLOY_TARGET`, `DATABASE_PROVIDER`, `NEXT_PUBLIC_APP_URL`.

**No regressions**
- [ ] Local-no-password mode (`DEPLOY_TARGET=local, AUTH_MODE=none, DATABASE_PROVIDER=sqlite`) still boots, still serves, still passes its existing test suite.
- [ ] Local-simple-password mode unchanged.
- [ ] Local-full-login mode unchanged.

---

## Notes

### Why Phase 13 ships before Phase 14

Phase 14 (hardening) lands the full CSP, HSTS, audit log, and CSRF middleware. Those are *defenses*. Phase 13 lands the *deploy* — the first thing on a public IP. We sequence deploy before hardening because:

1. The boot-guard rules in Phase 7 already cover the auth shape. Pushing to Railway with the guard active is safer than pushing without it AND without CSP, simultaneously.
2. Phase 14 needs a real deploy target to verify against. Trying to verify CSP rules on localhost gives false confidence — different connect-src, different Service Worker behavior.
3. The three security headers in Task 6 are the cheap floor; the rest is Phase 14's surface.

### Cutover plan: local SQLite -> Railway Postgres

This is the question every operator will ask: *"I've been using DayBeans locally for two months. I want to start using the Railway deploy. What happens to my journal entries, my goals, my heatmap?"*

**The answer for v1: nothing migrates automatically. Local data stays local.**

The supported cutover is:

1. **Stand up the Railway deploy fresh.** Follow `docs/deploy-railway.md`. The Postgres plugin starts empty. The first time you sign in, Phase 9's onboarding runs again — same wizard, fresh `User` row, no goals.
2. **Choose a primary instance.** Either:
   - **Local primary, Railway secondary:** keep using local for daily entries; Railway is for occasional access from another device — but those entries don't sync back. Users who pick this should expect Railway's `DayRecord` rows to drift from local's. Recommend against unless you genuinely have two parallel lives.
   - **Railway primary, local archive:** treat Railway as your real instance from the cutover date forward. The local SQLite DB becomes a read-only archive of pre-cutover days. Stop running `pnpm dev` after cutover, or run it only when you want to look at old entries.
3. **Re-create stable structure manually.** The data that's worth re-entering (and small enough to do by hand):
   - Goals (DEFAULT_GOALS plus any custom ones)
   - Job title and business interests (Settings > Profile)
   - LLM provider + API key (Settings > LLM — must re-enter the API key plaintext once; Phase 8's encryption key on Railway differs from local's so the encrypted bytes are not portable)
   - Faith / scripture preferences (Onboarding step, or Settings)
4. **Accept what doesn't transfer.** Daily DayRecord rows, journal entries, click history, refresh logs — these stay in the local SQLite. There is no v1 export tool. The local file (`prisma/dev.db`) is yours forever; you can `sqlite3` it to read old entries.

**Why no migration tool in v1:** the data model has user-private fields encrypted under `APP_ENCRYPTION_KEY`. Moving them between deploys means decrypt-and-re-encrypt under the new key, which is a non-trivial script and a non-trivial security review. We will write that script when at least three users actually want to migrate. Until then, the manual cutover above is fine for personal use.

**Future: a Phase 14+ migration tool.** Sketch (out of scope for v1):
- `pnpm tsx scripts/export-local.ts > tdm-export.json` — dumps every row from the local SQLite, decrypting `LlmCredential.encryptedKey` so the export is portable, and signing the file with the local `AUTH_SECRET` so re-import can verify provenance.
- `pnpm tsx scripts/import-railway.ts tdm-export.json` — re-encrypts under the new `APP_ENCRYPTION_KEY`, re-keys `userId`s, applies a one-shot insert.
- The export file contains plaintext API keys for the duration it lives on disk. Treat it like a password file.

We're explicitly NOT building this in v1 because the threat model around the export file is its own design problem.

### What Phase 13 deliberately does NOT do

- It does NOT add CSP. Phase 14.
- It does NOT add HSTS. Phase 14 (HSTS at the app level interacts badly with localhost; see Task 6 step 1's comment).
- It does NOT add an audit log table. Phase 14.
- It does NOT add rate limiting beyond what Phase 7 already shipped for login attempts and what Phase 10 shipped for cron. The healthcheck endpoint is intentionally rate-limit-free — it's a load-balancer probe and over-rate-limiting it breaks Railway's deploy.
- It does NOT write a data-migration tool from local SQLite to Railway Postgres. See "Cutover plan" above.
- It does NOT change any UI. Every panel, every component, every server action from Phases 1-12 is byte-identical.
- It does NOT introduce any new runtime dependencies. Zero `pnpm add` for application code. The only `pnpm add -D` is `tsx` if Phase 1 didn't already add it.

### Operational checklist for the first Railway deploy

After landing this phase, the very first deploy should be done by the lead, not via auto-deploy:

1. Push the Phase 13 commit to a feature branch.
2. Open a PR. Watch CI run the new tests.
3. On Railway, create the project against the feature branch (Railway supports per-branch deploys natively).
4. Configure all env vars per `docs/deploy-railway.md`.
5. Watch the deploy. The boot banner is the success indicator. If the guard aborts, fix the var and redeploy — do NOT remove guard rules to "make it boot." That would defeat the entire phase.
6. Hit the healthcheck. Sign in. Run a manual content refresh.
7. Set up the cron. Watch one tick.
8. THEN merge the PR to `main` and let auto-deploy take over.

### Common boot-guard failures and what they mean

| Error | Real cause | Fix |
|---|---|---|
| `DEPLOY_TARGET=railway requires AUTH_MODE=full` | Forgot to set `AUTH_MODE` | Set `AUTH_MODE=full` |
| `APP_ENCRYPTION_KEY is required on Railway` | Variable typo (`APP_ENCRYPT_KEY`?) or empty value | Re-paste from your password manager |
| `CRON_SECRET is required on Railway` | Skipped because the cron isn't wired yet | Set it now anyway; the boot guard refuses to start without it. Wire the cron in Task 8. |
| `NEXT_PUBLIC_APP_URL is required on Railway` | Set to `${{RAILWAY_PUBLIC_DOMAIN}}` and that variable doesn't resolve | Use a literal URL like `https://daybeans.com` |
| `DATABASE_URL on Railway must be postgresql://...` | Pasted local SQLite URL by mistake; or Postgres plugin not attached | Attach the Postgres plugin and reference `${{Postgres.DATABASE_URL}}` |

### Why the healthcheck pings the DB

A common mistake is to make the healthcheck a static `200 OK` so Railway always considers the deploy healthy. That defeats the point. If the DB connection is broken — pool exhausted, network glitch, migration mid-flight — every server action 500s. We want Railway to know.

The tradeoff is that a flapping DB makes the service flap, which on Railway can cause the deploy to roll back. That's intentional: *if the DB is unreliable, we'd rather have Railway hold the previous (working) version live than swap in a new one whose DB is also unreliable*. If this becomes a real problem in production (it shouldn't — Railway-managed Postgres is rock solid), Phase 14 can add a tolerance window: "DB has to fail 3 consecutive checks before we 503."

### What's in the `version` field

The healthcheck's `version` is `package.json#version`. We bump `package.json` once per phase (see the project README). The banner uses the same source, so the banner and healthcheck always agree.

If you want to know which commit a deploy is on, that's a Phase 14 addition — `NEXT_PUBLIC_COMMIT_SHA` injected at build time. Until then, the version string is enough to disambiguate phases; commit-level tracking comes from Railway's own deploy log.

### A note on `instrumentation.ts`

Next.js 15's instrumentation hook fires in two distinct places:

1. **At build time**, during `next build`, for static analysis (so the boot guard fails the BUILD if env is bad — this is good).
2. **At runtime**, on the first request after `next start`, on the Node runtime side only.

Phase 7 already handles the `NEXT_RUNTIME === "nodejs"` gate. Phase 13 doesn't change this — both the guard and the banner inherit the same gating. The build-time fire is what catches a misconfigured env in CI before the deploy is even attempted; the runtime fire is what produces the visible banner in Railway logs.

### Timeline expectation

Phase 13 should be a 1-2 day phase. There is no UI. There is no new component. The risk concentration is in the boot-guard tests (covering all the failure modes) and the first-deploy ceremony. Resist the urge to combine it with Phase 14 — keep the deploy and the hardening as separate, reviewable phases.

### Verification step (end of phase)

Run the full local test suite plus the new ones:

```bash
pnpm vitest run
pnpm prisma migrate status   # local SQLite still happy
DATABASE_PROVIDER=postgresql pnpm db:set-provider
git diff prisma/schema.prisma   # one line: provider -> postgresql
DATABASE_PROVIDER=sqlite pnpm db:set-provider
git diff prisma/schema.prisma   # clean — back to sqlite
```

Then push the branch and watch Railway. Banner -> healthcheck -> sign-in -> cron tick -> done.

Commit message:

```
feat(phase-13): Railway production deploy

- scripts/set-db-provider.ts: build-time provider switcher
- src/app/api/health: healthcheck endpoint (DB ping, version)
- railway.json: deploy descriptor with healthcheck + migrate-on-deploy
- src/server/boot-guard.ts: Railway-specific reinforcement + startup banner
- next.config.ts: baseline security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- docs/deploy-railway.md: operator deployment guide
- prisma/migrations/<ts>_pg_baseline: Postgres migration baseline
- tests for: provider script, healthcheck, Railway boot guard, banner

Closes Phase 13.
```
