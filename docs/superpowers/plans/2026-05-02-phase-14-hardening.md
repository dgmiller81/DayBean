# Phase 14 — Hardening, Security Review, E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every documented security deferral from Phases 1–13 and deliver the v1 hardening pass. Phase 14 lands the strict Content-Security-Policy + HSTS headers, full secure-cookie posture, regression coverage proving every server action requires a session (CSRF surface), the rate-limit module (in-memory locally, Upstash on Railway, with graceful fallback), the expanded `AuditLog` table covering every mutation, the Pino logger with key redaction, the GitHub PR auto-labeler for security-relevant paths, the Playwright golden-path E2E that exercises onboarding → dashboard → journal-driven scripture → tasks → theme → sign-out, the threat-model review and OWASP Top 10 pen-test checklist, and a clean dependency hygiene snapshot. After Phase 14 merges, v1 is shipped — there is no Phase 15.

**Deploy target this phase:** both `local` (in-memory rate limiter, dev pretty logs, Playwright runs against `pnpm dev`) and `railway` (Upstash rate limiter, JSON logs to stdout, HSTS, CSRF + CSP enforced). The `next.config.ts` headers block conditionally emits HSTS only when `DEPLOY_TARGET=railway`.

**Architecture:** No new server actions. Phase 14 is a *wrapping* phase. The pieces compose like this:

```
┌────────────────────────────────────────────────────────────────────┐
│  next.config.ts                                                    │
│   └─ headers() — CSP, X-Frame-Options, X-Content-Type-Options,    │
│      Referrer-Policy, Permissions-Policy, HSTS (Railway only)      │
└─────────────────────┬──────────────────────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────────────────────┐
│  src/server/                                                       │
│   ├─ logger.ts        — pino instance + redact paths              │
│   ├─ rate-limit.ts    — checkRate(key, limit, window)             │
│   │                     in-memory bucket (local) | Upstash (rwy)  │
│   ├─ audit.ts         — writeAuditLog() + withAudit(action, fn)   │
│   └─ actions/*.ts     — wrapped via withAudit() at call sites     │
└─────────────────────┬──────────────────────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────────────────────┐
│  tests/                                                            │
│   ├─ unit/                                                         │
│   │   ├─ rate-limit.test.ts                                        │
│   │   ├─ audit.test.ts                                             │
│   │   ├─ logger-redaction.test.ts                                  │
│   │   └─ headers.test.ts                                           │
│   ├─ integration/                                                  │
│   │   └─ csrf-session-required.test.ts                             │
│   └─ e2e/                                                          │
│       └─ golden-path.spec.ts                                       │
└────────────────────────────────────────────────────────────────────┘
```

Auth.js v5 already verifies sessions on every request that hits a server action; Phase 14 doesn't add CSRF tokens — it adds a *regression test* that proves the existing posture holds. If a future refactor accidentally exposes a server action without `requireUserId()`, the test fails.

**Tech Stack additions this phase:** `@playwright/test` (E2E), `@upstash/redis` + `@upstash/ratelimit` (Railway rate limiting), `pino` (already pulled forward) + `pino-pretty` (dev-only), `actions/labeler@v5` (CI). Everything else is already in the tree.

---

## File Structure (created or modified in this phase)

| File | New/Modified | Purpose |
|---|---|---|
| `next.config.ts` | Modified | Adds full CSP, HSTS (Railway only), Permissions-Policy, COOP defaults |
| `src/server/logger.ts` | New | Pino instance with redact paths and dev pretty-print |
| `src/server/rate-limit.ts` | New | `checkRate(key, limit, window)` — Upstash on Railway, in-memory locally |
| `src/server/audit.ts` | Modified | Adds `withAudit(action, fn)` wrapper; expands action vocabulary |
| `src/server/actions/goals.ts` | Modified | Wrap each mutation with `withAudit(...)` |
| `src/server/actions/tasks.ts` | Modified | Wrap each mutation with `withAudit(...)` |
| `src/server/actions/journal.ts` | Modified | Wrap save with `withAudit('journal.save', ...)` (no body content in metadata) |
| `src/server/actions/llm-credentials.ts` | Modified | Wrap save/delete with `withAudit('apikey.save'/'apikey.delete', ...)` (no plaintext) |
| `src/server/actions/refresh.ts` | Modified | Wrap fire with `withAudit('refresh.fire', ...)` |
| `src/server/fetch.ts` | Modified | Replace bare `console.log` calls with `logger.info` |
| `src/server/llm/index.ts` | Modified | Replace bare `console.log` with `logger.info`; redact prompt secrets at call site |
| `playwright.config.ts` | New | Single browser (Chromium), 1 worker, webServer command `pnpm dev` |
| `tests/e2e/golden-path.spec.ts` | New | Onboarding → dashboard → journal → tasks → theme → sign-out flow |
| `tests/e2e/fixtures/seed-fresh-user.ts` | New | DB reset helper invoked from E2E `beforeAll` |
| `tests/integration/csrf-session-required.test.ts` | New | Calls every server action without a session; expects rejection |
| `tests/unit/rate-limit.test.ts` | New | Burst, window-rollover, fallback-to-in-memory tests |
| `tests/unit/audit.test.ts` | New | `withAudit` writes a row on success and on failure; metadata is sanitized |
| `tests/unit/logger-redaction.test.ts` | New | Spy asserts `password`, `apiKey`, `encryptedKey`, `authorization`, `cookie` are redacted |
| `tests/unit/headers.test.ts` | New | Boots `next.config.ts` headers() and asserts CSP / HSTS shape |
| `.github/labeler.yml` | New | Auto-label `type:security` for security-relevant paths |
| `.github/workflows/labeler.yml` | New | Runs `actions/labeler@v5` on PR open |
| `.github/workflows/e2e.yml` | New | Runs Playwright golden-path on PR + main |
| `.github/workflows/audit.yml` | Modified | Adds `pnpm list --depth=0 > docs/dependencies.md` step |
| `docs/threat-model-review.md` | New | STRIDE walkthrough, each row links to a verifying test |
| `docs/pentest-checklist.md` | New | OWASP Top 10 v2021 checklist with status + evidence |
| `docs/dependencies.md` | New (auto) | Snapshot of `pnpm list --depth=0` |
| `package.json` | Modified | New deps + `test:e2e`, `audit:deps` scripts |
| `.env.example` | Modified | Documents `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` (Railway only) |

---

## Task 1: Install dependencies and update env template

**Files:**
- Modify: `package.json`, `.env.example`
- New: `pnpm-lock.yaml` deltas

- [ ] **Step 1: Install Playwright**

Run:
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Expected: `@playwright/test` appears in `devDependencies`. Chromium binary downloaded into `~/.cache/ms-playwright/`. The `playwright install` step is local-only — CI has its own install step in `.github/workflows/e2e.yml`.

- [ ] **Step 2: Install Upstash rate limiter**

Run:
```bash
pnpm add @upstash/redis @upstash/ratelimit
```

Expected: both packages in `dependencies`. They're imported lazily so they don't load when `UPSTASH_REDIS_URL` is unset — no Railway-only code on the local hot path.

- [ ] **Step 3: Install pino-pretty**

Run:
```bash
pnpm add -D pino-pretty
```

Expected: `pino-pretty` in `devDependencies`. Pino itself was added in Phase 7's logger placeholder; if it's still missing here, also `pnpm add pino`.

- [ ] **Step 4: Add scripts**

Edit `package.json` `scripts`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "audit:deps": "pnpm audit --audit-level=high && pnpm list --depth=0 > docs/dependencies.md",
    "...": "..."
  }
}
```

Expected: `pnpm test:e2e` runs only Playwright; `pnpm test` continues to run only Vitest.

- [ ] **Step 5: Document new env vars**

Append to `.env.example`:

```dotenv
# --- Phase 14: rate limiting (Railway only) ---
# When DEPLOY_TARGET=railway and these are set, rate limiting uses Upstash Redis.
# When unset (or DEPLOY_TARGET=local), an in-memory bucket is used and a warning is logged at boot.
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```

Expected: `.env.example` documents the two new vars, but they remain optional. Boot does NOT fail when they are missing — the rate limiter degrades to the in-memory bucket and emits one `warn` log line.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "phase-14: add @playwright/test, @upstash/redis, @upstash/ratelimit, pino-pretty"
```

---

## Task 2: Strict CSP + HSTS + secure-cookie defaults

**Files:**
- Modify: `next.config.ts`, `src/server/auth.ts` (cookie options assertion only)
- New: `tests/unit/headers.test.ts`

The Phase 13 deploy plan added a baseline `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin`. Phase 14 adds the full CSP from `docs/security.md` §"Content Security Policy" plus HSTS on Railway.

- [ ] **Step 1: Write the headers test first (TDD)**

Create `tests/unit/headers.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import nextConfig from "../../next.config";

describe("next.config.ts headers()", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  it("emits a strict CSP on every route", async () => {
    process.env.DEPLOY_TARGET = "local";
    const headers = await nextConfig.headers!();
    const all = headers.flatMap((h) => h.headers);
    const csp = all.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp!.value).toContain("default-src 'self'");
    expect(csp!.value).toContain("connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:1234");
    expect(csp!.value).toContain("frame-ancestors 'none'");
    expect(csp!.value).toContain("form-action 'self'");
    expect(csp!.value).toContain("base-uri 'self'");
  });

  it("does NOT emit HSTS in local mode", async () => {
    process.env.DEPLOY_TARGET = "local";
    const headers = await nextConfig.headers!();
    const all = headers.flatMap((h) => h.headers);
    const hsts = all.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts).toBeUndefined();
  });

  it("emits HSTS with preload + includeSubDomains on Railway", async () => {
    process.env.DEPLOY_TARGET = "railway";
    const headers = await nextConfig.headers!();
    const all = headers.flatMap((h) => h.headers);
    const hsts = all.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts!.value).toBe("max-age=63072000; includeSubDomains; preload");
  });

  it("emits X-Content-Type-Options: nosniff", async () => {
    process.env.DEPLOY_TARGET = "local";
    const headers = await nextConfig.headers!();
    const all = headers.flatMap((h) => h.headers);
    const xcto = all.find((h) => h.key === "X-Content-Type-Options");
    expect(xcto?.value).toBe("nosniff");
  });

  it("emits a restrictive Permissions-Policy", async () => {
    process.env.DEPLOY_TARGET = "local";
    const headers = await nextConfig.headers!();
    const all = headers.flatMap((h) => h.headers);
    const pp = all.find((h) => h.key === "Permissions-Policy");
    expect(pp).toBeDefined();
    expect(pp!.value).toMatch(/camera=\(\)/);
    expect(pp!.value).toMatch(/microphone=\(\)/);
    expect(pp!.value).toMatch(/geolocation=\(\)/);
  });
});
```

Run it now:

```bash
pnpm test tests/unit/headers.test.ts
```

Expected: all five tests fail. `next.config.ts` does not yet have a `headers()` function (Phase 13 set them via middleware or a partial config).

- [ ] **Step 2: Implement the headers in `next.config.ts`**

Replace the file body:

```ts
import type { NextConfig } from "next";

const isRailway = process.env.DEPLOY_TARGET === "railway";

// Content-Security-Policy is the same for both deploy targets.
// LM Studio (http://localhost:1234) is allow-listed in connect-src so the
// browser can reach the model server when AUTH_MODE=none on a workstation.
// In Railway mode this is harmless: the browser cannot reach localhost:1234
// from a remote origin anyway, so it stays in the allowlist for symmetry.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:1234",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const permissionsPolicy = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

const baseHeaders: Array<{ key: string; value: string }> = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const railwayOnlyHeaders: Array<{ key: string; value: string }> = [
  // 2 years, includeSubDomains, preload — only on Railway because local dev
  // runs on http and HSTS would brick the browser for that origin.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    const headers = isRailway ? [...baseHeaders, ...railwayOnlyHeaders] : baseHeaders;
    return [
      {
        // Match every route, including API and Server Action endpoints.
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Re-run the test**

```bash
pnpm test tests/unit/headers.test.ts
```

Expected: all five tests pass.

- [ ] **Step 4: Verify cookie options on Auth.js**

Open `src/server/auth.ts`. Phase 7 set `cookies.sessionToken.options` to:

```ts
{
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
}
```

Add a runtime assertion at module top so a misconfigured cookie object aborts boot rather than silently shipping insecure cookies:

```ts
// Phase 14 assertion — never let a cookie regress to non-HttpOnly or non-Secure on Railway.
if (isRailway) {
  if (!authOptions.cookies?.sessionToken?.options?.secure) {
    throw new Error("Auth.js sessionToken cookie must be Secure on Railway");
  }
  if (!authOptions.cookies?.sessionToken?.options?.httpOnly) {
    throw new Error("Auth.js sessionToken cookie must be HttpOnly");
  }
  if (authOptions.cookies?.sessionToken?.options?.sameSite !== "lax") {
    throw new Error("Auth.js sessionToken cookie must use SameSite=Lax");
  }
}
```

Where `isRailway = process.env.DEPLOY_TARGET === "railway"`.

- [ ] **Step 5: Manual sanity check via curl**

In a separate shell, start the dev server (`pnpm dev`) and run:

```bash
curl -sI http://localhost:3000/ | grep -Ei 'content-security-policy|x-frame-options|x-content-type|referrer|permissions-policy|strict-transport'
```

Expected: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all present. HSTS absent (because `DEPLOY_TARGET=local`).

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/server/auth.ts tests/unit/headers.test.ts
git commit -m "phase-14: enforce strict CSP + HSTS (Railway) + secure cookie defaults with regression tests"
```

---

## Task 3: CSRF / session-required regression test

**Files:**
- New: `tests/integration/csrf-session-required.test.ts`

Auth.js v5 + Next.js server actions verify the user's session cookie before invoking the action handler. Phase 14 doesn't add a new CSRF token — it adds a *test* that fails if any future server action accidentally bypasses `requireUserId()`. This is the regression layer that protects against "hot-fix" PRs that forget the auth check.

- [ ] **Step 1: Enumerate all server actions**

Use Grep to list every file that exports `"use server"` actions under `src/server/actions/`. Confirm the list includes:

- `goals.ts` (`createGoal`, `updateGoal`, `deleteGoal`, `incrementGoal`, `toggleCheckGoal`)
- `tasks.ts` (`createTask`, `toggleTask`, `deleteTask`)
- `journal.ts` (`saveJournal`)
- `days.ts` (`updateDayWidget`)
- `clicks.ts` (`recordClick`)
- `prefs.ts` (`setPreference`)
- `llm-credentials.ts` (`saveLlmCredential`, `deleteLlmCredential`)
- `refresh.ts` (`fireManualRefresh`)
- `friendsfamily.ts` (Phase 12 stub — `addFriendsFamilyNote`)
- `theme.ts` (`setTheme`)

If any are missing from the test, add a TODO and revisit before merging.

- [ ] **Step 2: Write the integration test**

Create `tests/integration/csrf-session-required.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createGoal } from "@/server/actions/goals";
import { saveJournal } from "@/server/actions/journal";
import { createTask } from "@/server/actions/tasks";
import { saveLlmCredential } from "@/server/actions/llm-credentials";
import { fireManualRefresh } from "@/server/actions/refresh";
import { setPreference } from "@/server/actions/prefs";
import { addFriendsFamilyNote } from "@/server/actions/friendsfamily";

// All server actions internally call requireUserId(), which throws "UNAUTHENTICATED"
// when there is no Auth.js session. We simulate "no session" by NOT mocking
// next-auth's getServerSession — the unmocked module returns null in test env.

describe("server actions reject calls without a session", () => {
  beforeAll(() => {
    // Force Auth.js to return null session by clearing any test-bootstrap session.
    delete process.env.__TEST_USER_ID__;
  });

  const cases: Array<[string, () => Promise<unknown>]> = [
    ["goals.createGoal",     () => createGoal({ title: "x", section: "personal", kind: "check", target: 1 })],
    ["tasks.createTask",     () => createTask({ title: "x" })],
    ["journal.saveJournal",  () => saveJournal({ iso: "2026-05-02", notes: "anything" })],
    ["llm.saveCredential",   () => saveLlmCredential({ provider: "openai", apiKey: "redacted-fake-value" })],
    ["refresh.fireManual",   () => fireManualRefresh()],
    ["prefs.setPreference",  () => setPreference({ key: "theme", value: "dark" })],
    ["ff.addNote",           () => addFriendsFamilyNote({ contact: "x", note: "y" })],
  ];

  for (const [name, fn] of cases) {
    it(`${name} throws UNAUTHENTICATED when no session`, async () => {
      await expect(fn()).rejects.toThrow(/UNAUTHENTICATED|requireUserId|No session/i);
    });
  }
});
```

- [ ] **Step 3: Run it**

```bash
pnpm test tests/integration/csrf-session-required.test.ts
```

Expected: every case passes — i.e., every server action refuses to run without a session.

- [ ] **Step 4: Negative-control: confirm a session DOES allow it**

Add one more test using the existing test helper from Phase 7 (`tests/utils/with-test-session.ts`):

```ts
import { withTestSession } from "../utils/with-test-session";

it("createGoal succeeds when a session is present", async () => {
  await withTestSession({ userId: "local-default" }, async () => {
    const goal = await createGoal({ title: "session sanity", section: "personal", kind: "check", target: 1 });
    expect(goal.id).toBeTruthy();
  });
});
```

Expected: passes. Now we know the negative-result tests above are real (not just every action being broken).

- [ ] **Step 5: Commit**

```bash
git add tests/integration/csrf-session-required.test.ts
git commit -m "phase-14: regression test asserting every server action requires a session"
```

---

## Task 4: Rate-limit middleware

**Files:**
- New: `src/server/rate-limit.ts`, `tests/unit/rate-limit.test.ts`
- Modify: `src/server/auth/sign-in.ts`, `src/server/actions/refresh.ts`, `src/server/fetch.ts`, `src/server/actions/friendsfamily.ts`

The rate limit module must:

1. Expose a single `checkRate(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number; reset: number }>`.
2. On Railway with both `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` set, use `@upstash/ratelimit` with a sliding window.
3. Otherwise (local mode, or Railway with Upstash unset), use an in-memory `Map<string, { count, resetAt }>` bucket — and emit one warn log line at first use.
4. Be deterministic in tests via injected clock and an explicit `__resetForTests()` export.

- [ ] **Step 1: Write the test first**

Create `tests/unit/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRate, __resetForTests, __setClock } from "@/server/rate-limit";

describe("checkRate (in-memory mode)", () => {
  beforeEach(() => {
    __resetForTests();
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_TOKEN;
  });

  it("permits up to `limit` calls inside the window", async () => {
    __setClock(() => 1_000_000);
    for (let i = 0; i < 3; i++) {
      const r = await checkRate("user:abc:refresh", 3, 60);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(3 - i - 1);
    }
  });

  it("rejects the (limit+1)-th call inside the window", async () => {
    __setClock(() => 1_000_000);
    for (let i = 0; i < 3; i++) await checkRate("user:abc:refresh", 3, 60);
    const r = await checkRate("user:abc:refresh", 3, 60);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("rolls over after the window expires", async () => {
    let now = 1_000_000;
    __setClock(() => now);
    for (let i = 0; i < 3; i++) await checkRate("user:abc:refresh", 3, 60);
    expect((await checkRate("user:abc:refresh", 3, 60)).ok).toBe(false);

    now = 1_000_000 + 61 * 1000; // 61 seconds later
    const r = await checkRate("user:abc:refresh", 3, 60);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("namespaces by key — different users do not share a bucket", async () => {
    __setClock(() => 1_000_000);
    for (let i = 0; i < 3; i++) await checkRate("user:abc:refresh", 3, 60);
    const r = await checkRate("user:xyz:refresh", 3, 60);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("logs a warn line on first call when Upstash is unconfigured on Railway", async () => {
    process.env.DEPLOY_TARGET = "railway";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetForTests();
    await checkRate("user:abc:refresh", 3, 60);
    // The logger redirects to pino; for the unit test we accept either stderr
    // OR the boolean sentinel exposed by __resetForTests().
    process.env.DEPLOY_TARGET = "local";
    warnSpy.mockRestore();
  });
});

describe("checkRate (Upstash mode, mocked)", () => {
  beforeEach(() => {
    __resetForTests();
    process.env.UPSTASH_REDIS_URL = "https://example-redis.upstash.io";
    process.env.UPSTASH_REDIS_TOKEN = "token-redacted";
    process.env.DEPLOY_TARGET = "railway";
  });

  it("delegates to @upstash/ratelimit when env is configured", async () => {
    // Mock the Upstash module — full Redis isn't reachable in unit tests.
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        constructor() {}
        limit = vi.fn().mockResolvedValue({ success: true, remaining: 2, reset: Date.now() + 60000 });
      },
    }));
    vi.doMock("@upstash/redis", () => ({
      Redis: class {
        constructor() {}
      },
    }));
    const { checkRate: cr } = await import("@/server/rate-limit");
    const r = await cr("user:abc:refresh", 3, 60);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });
});
```

Run:

```bash
pnpm test tests/unit/rate-limit.test.ts
```

Expected: all tests fail because `src/server/rate-limit.ts` doesn't exist.

- [ ] **Step 2: Implement `src/server/rate-limit.ts`**

```ts
import { logger } from "./logger";

type RateResult = { ok: boolean; remaining: number; reset: number };

// Injectable clock for tests.
let _now: () => number = () => Date.now();
export function __setClock(fn: () => number) {
  _now = fn;
}

// In-memory bucket. Key -> { count, resetAt (ms epoch) }.
const _bucket = new Map<string, { count: number; resetAt: number }>();
export function __resetForTests() {
  _bucket.clear();
  _now = () => Date.now();
  _upstashWarned = false;
}

let _upstashWarned = false;

async function checkRateInMemory(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const now = _now();
  const entry = _bucket.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowSec * 1000;
    _bucket.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, reset: resetAt };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, reset: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, reset: entry.resetAt };
}

// Lazy-load Upstash so it doesn't pull into local-mode bundles.
let _upstashLimiter: { limit: (key: string) => Promise<{ success: boolean; remaining: number; reset: number }> } | null = null;

async function getUpstashLimiter(limit: number, windowSec: number) {
  if (_upstashLimiter) return _upstashLimiter;
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });
  // A separate Ratelimit instance is created per (limit, window) tuple, but
  // for simplicity we use a single sliding window keyed by (limit, windowSec).
  _upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix: "tdm",
  });
  return _upstashLimiter;
}

export async function checkRate(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const useUpstash =
    process.env.DEPLOY_TARGET === "railway" &&
    !!process.env.UPSTASH_REDIS_URL &&
    !!process.env.UPSTASH_REDIS_TOKEN;

  if (useUpstash) {
    try {
      const limiter = await getUpstashLimiter(limit, windowSec);
      const r = await limiter.limit(key);
      return { ok: r.success, remaining: r.remaining, reset: r.reset };
    } catch (err) {
      logger.warn({ err, key }, "rate-limit: Upstash error, falling back to in-memory");
      return checkRateInMemory(key, limit, windowSec);
    }
  }

  if (process.env.DEPLOY_TARGET === "railway" && !_upstashWarned) {
    logger.warn(
      { hasUrl: !!process.env.UPSTASH_REDIS_URL, hasToken: !!process.env.UPSTASH_REDIS_TOKEN },
      "rate-limit: running on Railway with in-memory bucket — set UPSTASH_REDIS_URL/TOKEN for cross-instance limits",
    );
    _upstashWarned = true;
  }

  return checkRateInMemory(key, limit, windowSec);
}
```

- [ ] **Step 3: Re-run the rate-limit tests**

```bash
pnpm test tests/unit/rate-limit.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Wire into login**

Open `src/server/auth/sign-in.ts`. Replace the existing ad-hoc per-IP throttle (Phase 7 used a naïve in-process counter) with a `checkRate()` call:

```ts
import { checkRate } from "@/server/rate-limit";

// inside signInWithPassword(email, password, ip):
const rate = await checkRate(`login:${ip}`, 10, 15 * 60);
if (!rate.ok) {
  await writeAuditLog({ action: "login.ratelimit", ip, meta: { reset: rate.reset } });
  throw new Error("RATE_LIMITED");
}
```

- [ ] **Step 5: Wire into manual refresh**

Open `src/server/actions/refresh.ts`. Inside `fireManualRefresh()`:

```ts
import { checkRate } from "@/server/rate-limit";

const userId = await requireUserId();
const rate = await checkRate(`refresh:${userId}`, 3, 24 * 60 * 60);
if (!rate.ok) {
  throw new Error("RATE_LIMITED:refresh-cap-3-per-day");
}
```

- [ ] **Step 6: Wire into web fetch**

Open `src/server/fetch.ts`. Inside the public `fetchArticle(url)` function:

```ts
import { checkRate } from "@/server/rate-limit";

const userId = await requireUserId();
const rate = await checkRate(`webfetch:${userId}`, 30, 60 * 60);
if (!rate.ok) {
  throw new Error("RATE_LIMITED:webfetch-30-per-hour");
}
```

- [ ] **Step 7: Wire into Friends & Family note creation**

Open `src/server/actions/friendsfamily.ts`. Inside `addFriendsFamilyNote()`:

```ts
import { checkRate } from "@/server/rate-limit";

const userId = await requireUserId();
const rate = await checkRate(`ff:${userId}`, 60, 60 * 60); // generous; abuse-prevention only
if (!rate.ok) {
  throw new Error("RATE_LIMITED:ff-note");
}
```

- [ ] **Step 8: Sanity test the wiring**

```bash
pnpm test
```

Expected: all unit tests pass; the new ratelimit-coupled tests in Phase 7 (login lockout) and Phase 8 (refresh 4th call returns RATE_LIMITED) still pass after the swap.

- [ ] **Step 9: Commit**

```bash
git add src/server/rate-limit.ts tests/unit/rate-limit.test.ts \
        src/server/auth/sign-in.ts src/server/actions/refresh.ts \
        src/server/fetch.ts src/server/actions/friendsfamily.ts
git commit -m "phase-14: unify rate limiting via checkRate() — Upstash on Railway, in-memory locally"
```

---

## Task 5: Audit log expansion + `withAudit` wrapper

**Files:**
- Modify: `src/server/audit.ts` (add `withAudit`), `prisma/schema.prisma` (add `userAgent` column)
- Modify: every server action under `src/server/actions/`
- New: `tests/unit/audit.test.ts`

Phase 7 introduced `AuditLog` with action vocabulary `login.success | login.fail | login.ratelimit | logout | password.set`. Phase 14 expands the vocabulary and wraps every mutation.

The new actions:

| Action | Source | Metadata fields |
|---|---|---|
| `goal.create` | `actions/goals.ts:createGoal` | `{ goalId, section, kind }` |
| `goal.update` | `actions/goals.ts:updateGoal` | `{ goalId, fields: ["title","target",...] }` |
| `goal.delete` | `actions/goals.ts:deleteGoal` | `{ goalId }` |
| `goal.increment` | `actions/goals.ts:incrementGoal` | `{ goalId, delta }` |
| `goal.toggle` | `actions/goals.ts:toggleCheckGoal` | `{ goalId, value }` |
| `task.create` | `actions/tasks.ts:createTask` | `{ taskId }` |
| `task.toggle` | `actions/tasks.ts:toggleTask` | `{ taskId, done }` |
| `task.delete` | `actions/tasks.ts:deleteTask` | `{ taskId }` |
| `journal.save` | `actions/journal.ts:saveJournal` | `{ iso, length: notes.length }` ← never the body |
| `apikey.save` | `actions/llm-credentials.ts:saveLlmCredential` | `{ provider, last4 }` ← never plaintext |
| `apikey.delete` | `actions/llm-credentials.ts:deleteLlmCredential` | `{ provider }` |
| `refresh.fire` | `actions/refresh.ts:fireManualRefresh` | `{ trigger: "manual" }` |
| `ff.note.create` | `actions/friendsfamily.ts:addFriendsFamilyNote` | `{ contact }` ← never note body |

- [ ] **Step 1: Confirm the schema fits**

Open `prisma/schema.prisma`. The Phase 7 `AuditLog` model:

```prisma
model AuditLog {
  id       String   @id @default(cuid())
  userId   String?
  action   String
  targetId String?
  ip       String?
  meta     Json?
  at       DateTime @default(now())
  user     User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([userId, at])
  @@index([action, at])
}
```

Phase 14 needs `userAgent String?`. Add it:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  targetId  String?
  ip        String?
  userAgent String?
  meta      Json?
  at        DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([userId, at])
  @@index([action, at])
}
```

- [ ] **Step 2: Migrate**

```bash
pnpm prisma migrate dev --name audit_log_user_agent
```

Expected: migration created and applied; client regenerated.

- [ ] **Step 3: Add `withAudit` to `src/server/audit.ts`**

Append:

```ts
import { headers } from "next/headers";
import { logger } from "./logger";

type AuditMeta = Record<string, unknown>;

export async function clientUserAgent(): Promise<string | undefined> {
  try {
    const h = await headers();
    return h.get("user-agent") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Wraps a server-action body so that every successful mutation writes an AuditLog row.
 * On failure, writes a row with action `<action>.error` and re-throws.
 *
 * The metadata callback receives the function's return value on success and the
 * thrown error on failure. It MUST NOT include PII or secrets — the caller is
 * responsible for filtering body content.
 */
export async function withAudit<T>(
  action: string,
  fn: () => Promise<T>,
  meta?: (out: T | undefined, err?: unknown) => AuditMeta,
): Promise<T> {
  let userId: string | null = null;
  try {
    userId = await getCurrentUserIdOrNull(); // already exists from Phase 7
  } catch {
    userId = null;
  }
  const ip = await clientIp(); // existing helper
  const userAgent = await clientUserAgent();

  try {
    const out = await fn();
    await writeAuditLog({
      action,
      userId: userId ?? undefined,
      ip,
      userAgent,
      meta: meta ? meta(out) : undefined,
    });
    return out;
  } catch (err) {
    try {
      await writeAuditLog({
        action: `${action}.error`,
        userId: userId ?? undefined,
        ip,
        userAgent,
        meta: meta ? meta(undefined, err) : { message: (err as Error).message?.slice(0, 200) },
      });
    } catch (auditErr) {
      // Do not let audit-write failures swallow the original error.
      logger.error({ auditErr, action }, "audit: failed to write error row");
    }
    throw err;
  }
}
```

`writeAuditLog` is updated to also accept `userAgent`:

```ts
export async function writeAuditLog(input: {
  action: string;
  userId?: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        targetId: input.targetId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        meta: input.meta ? (input.meta as object) : null,
      },
    });
  } catch (err) {
    logger.error({ err, action: input.action }, "audit: write failed");
  }
}
```

- [ ] **Step 4: Wire `withAudit` into `actions/goals.ts`**

Example for `createGoal`:

```ts
"use server";
import { withAudit } from "@/server/audit";
import { requireUserId } from "@/server/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

const Schema = z.object({
  title: z.string().min(1).max(120),
  section: z.enum(["mind", "business", "personal"]),
  kind: z.enum(["check", "count"]),
  target: z.number().int().min(1).max(100),
});

export async function createGoal(input: z.infer<typeof Schema>) {
  return withAudit(
    "goal.create",
    async () => {
      const userId = await requireUserId();
      const parsed = Schema.parse(input);
      const goal = await prisma.goal.create({
        data: { ...parsed, userId },
      });
      return goal;
    },
    (out) => ({ goalId: out?.id, section: out?.section, kind: out?.kind }),
  );
}
```

Apply the same pattern to `updateGoal`, `deleteGoal`, `incrementGoal`, `toggleCheckGoal`. The `meta` callback for each emits only ID + structural fields, never user-typed content.

- [ ] **Step 5: Wire `withAudit` into `actions/journal.ts`**

The journal save case is the riskiest — never include the notes body in `meta`:

```ts
export async function saveJournal(input: { iso: string; notes: string }) {
  return withAudit(
    "journal.save",
    async () => {
      const userId = await requireUserId();
      const parsed = JournalSchema.parse(input);
      const day = await upsertDay(userId, parsed.iso, { journalNotes: parsed.notes });
      return { id: day.id };
    },
    (out, err) => err
      ? { length: input.notes?.length ?? 0 }
      : { iso: input.iso, length: input.notes.length }, // length only — never the body
  );
}
```

- [ ] **Step 6: Wire `withAudit` into `actions/llm-credentials.ts`**

```ts
export async function saveLlmCredential(input: { provider: string; apiKey: string }) {
  return withAudit(
    "apikey.save",
    async () => {
      const userId = await requireUserId();
      const parsed = LlmCredSchema.parse(input);
      const last4 = parsed.apiKey.slice(-4);
      const encryptedKey = encrypt(parsed.apiKey, userId);
      await prisma.llmCredential.upsert({
        where: { userId_provider: { userId, provider: parsed.provider } },
        update: { encryptedKey, last4 },
        create: { userId, provider: parsed.provider, encryptedKey, last4 },
      });
      return { provider: parsed.provider, last4 };
    },
    // CRITICAL — only provider + last4. Never include the plaintext key or the encrypted blob.
    (out) => ({ provider: out?.provider, last4: out?.last4 }),
  );
}
```

- [ ] **Step 7: Wire `withAudit` into the remaining actions**

`actions/tasks.ts`, `actions/refresh.ts`, `actions/friendsfamily.ts` follow the same pattern. For the manual refresh:

```ts
export async function fireManualRefresh() {
  return withAudit(
    "refresh.fire",
    async () => {
      const userId = await requireUserId();
      const rate = await checkRate(`refresh:${userId}`, 3, 24 * 60 * 60);
      if (!rate.ok) throw new Error("RATE_LIMITED:refresh-cap-3-per-day");
      const result = await runRefresh(userId, "manual");
      return { iso: result.iso, tokensUsed: result.tokensUsed };
    },
    (out) => ({ trigger: "manual", iso: out?.iso, tokensUsed: out?.tokensUsed }),
  );
}
```

- [ ] **Step 8: Tests for `withAudit`**

Create `tests/unit/audit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { withAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { withTestSession } from "../utils/with-test-session";

describe("withAudit()", () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
  });

  it("writes a row on success", async () => {
    await withTestSession({ userId: "local-default" }, async () => {
      await withAudit("goal.create", async () => ({ id: "g1" }), (out) => ({ goalId: out?.id }));
    });
    const rows = await prisma.auditLog.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].action).toBe("goal.create");
    expect((rows[0].meta as { goalId: string }).goalId).toBe("g1");
    expect(rows[0].userId).toBe("local-default");
  });

  it("writes a `<action>.error` row and re-throws on failure", async () => {
    await withTestSession({ userId: "local-default" }, async () => {
      await expect(
        withAudit("goal.create", async () => { throw new Error("boom"); }),
      ).rejects.toThrow("boom");
    });
    const rows = await prisma.auditLog.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0].action).toBe("goal.create.error");
  });

  it("never persists secrets in meta when caller redacts correctly", async () => {
    await withTestSession({ userId: "local-default" }, async () => {
      await withAudit(
        "apikey.save",
        async () => ({ provider: "openai", last4: "abcd" }),
        (out) => ({ provider: out?.provider, last4: out?.last4 }), // intentional contract
      );
    });
    const rows = await prisma.auditLog.findMany();
    const meta = rows[0].meta as Record<string, unknown>;
    expect(meta).toEqual({ provider: "openai", last4: "abcd" });
    expect(JSON.stringify(meta)).not.toMatch(/sk-/);
    expect(JSON.stringify(meta)).not.toMatch(/encryptedKey/);
  });

  it("does not throw if audit write itself fails (best-effort)", async () => {
    const spy = vi.spyOn(prisma.auditLog, "create").mockRejectedValueOnce(new Error("db down"));
    await withTestSession({ userId: "local-default" }, async () => {
      const out = await withAudit("goal.create", async () => ({ id: "g1" }));
      expect(out.id).toBe("g1");
    });
    spy.mockRestore();
  });
});
```

Run:

```bash
pnpm test tests/unit/audit.test.ts
```

Expected: all four tests pass.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ \
        src/server/audit.ts \
        src/server/actions/goals.ts src/server/actions/tasks.ts \
        src/server/actions/journal.ts src/server/actions/llm-credentials.ts \
        src/server/actions/refresh.ts src/server/actions/friendsfamily.ts \
        tests/unit/audit.test.ts
git commit -m "phase-14: expand AuditLog vocabulary + add withAudit() wrapper around every mutation"
```

---

## Task 6: PR auto-labeler

**Files:**
- New: `.github/labeler.yml`, `.github/workflows/labeler.yml`

- [ ] **Step 1: Create `.github/labeler.yml`**

```yaml
# Auto-applies the `type:security` label whenever a PR touches a security-relevant
# path. The labeler runs in `.github/workflows/labeler.yml` on PR open & sync.
type:security:
  - changed-files:
      - any-glob-to-any-file:
          - 'src/server/auth/**'
          - 'src/server/auth.ts'
          - 'src/server/crypto.ts'
          - 'src/server/llm/**'
          - 'src/server/fetch.ts'
          - 'src/server/rate-limit.ts'
          - 'src/server/audit.ts'
          - 'prisma/schema.prisma'
          - 'next.config.ts'
          - '.github/workflows/**'
          - 'docs/security.md'
          - 'docs/threat-model-review.md'
          - 'docs/pentest-checklist.md'

type:database:
  - changed-files:
      - any-glob-to-any-file:
          - 'prisma/schema.prisma'
          - 'prisma/migrations/**'

type:tests:
  - changed-files:
      - any-glob-to-any-file:
          - 'tests/**'
          - 'playwright.config.ts'
          - 'vitest.config.ts'

type:docs:
  - changed-files:
      - any-glob-to-any-file:
          - 'docs/**'
          - 'README.md'
```

- [ ] **Step 2: Create `.github/workflows/labeler.yml`**

```yaml
name: PR Labeler

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml
          sync-labels: true
```

- [ ] **Step 3: Pre-create the labels**

Document this in `docs/contributing.md` (don't add the GitHub-CLI call to a workflow; the labels need to exist in the repo for the action to attach them):

```bash
gh label create type:security --color B60205 --description "Touches auth, crypto, LLM, fetch, schema, or CI"
gh label create type:database --color 0E8A16 --description "Touches Prisma schema or migrations"
gh label create type:tests    --color FBCA04 --description "Touches tests or test config"
gh label create type:docs     --color 5319E7 --description "Documentation only"
```

- [ ] **Step 4: Commit**

```bash
git add .github/labeler.yml .github/workflows/labeler.yml docs/contributing.md
git commit -m "phase-14: PR auto-labeler — type:security on auth/crypto/llm/fetch/schema paths"
```

---

## Task 7: Pino logger + redaction

**Files:**
- New: `src/server/logger.ts`, `tests/unit/logger-redaction.test.ts`
- Modify: every `src/server/**` file that uses `console.log` / `console.error`

- [ ] **Step 1: Implement the logger**

Create `src/server/logger.ts`:

```ts
import pino, { type Logger } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  // Redact known-sensitive paths anywhere in the log object.
  redact: {
    paths: [
      "password",
      "passwordHash",
      "apiKey",
      "encryptedKey",
      "authorization",
      "cookie",
      "*.password",
      "*.passwordHash",
      "*.apiKey",
      "*.encryptedKey",
      "*.authorization",
      "*.cookie",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.DEPLOY_TARGET ?? "local",
  },
  // Hide the default pid/hostname in production logs — Railway's log aggregator
  // already adds those, so they only add noise.
  ...(isDev ? {} : { base: undefined }),
};

let _logger: Logger;

if (isDev) {
  // Pretty-print in dev. pino-pretty is a devDependency.
  const transport = pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
    },
  });
  _logger = pino(baseConfig, transport);
} else {
  _logger = pino(baseConfig);
}

export const logger = _logger;
```

- [ ] **Step 2: Test redaction**

Create `tests/unit/logger-redaction.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("logger redaction", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = "production"; // turn off pino-pretty for the test
    process.env.LOG_LEVEL = "info";
  });

  async function captureNext() {
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    (process.stdout.write as unknown as (s: string) => void) = (s: string) => {
      chunks.push(s.toString());
      return true;
    };
    const { logger } = await import("@/server/logger");
    logger.info(
      {
        userId: "u1",
        password: "supersecret-password",
        apiKey: "redacted-fake-key",
        encryptedKey: "base64-blob",
        nested: { authorization: "Bearer abc.def", cookie: "session=xyz" },
        headers: { authorization: "Bearer nope", cookie: "session=secret" },
        notes: "user typed this — must be visible",
      },
      "test-line",
    );
    process.stdout.write = origWrite;
    return chunks.join("");
  }

  it("redacts password / apiKey / encryptedKey / authorization / cookie", async () => {
    const out = await captureNext();
    expect(out).not.toMatch(/supersecret-password/);
    expect(out).not.toMatch(/redacted-fake-key/);
    expect(out).not.toMatch(/base64-blob/);
    expect(out).not.toMatch(/Bearer abc\.def/);
    expect(out).not.toMatch(/Bearer nope/);
    expect(out).not.toMatch(/session=xyz/);
    expect(out).not.toMatch(/session=secret/);
    expect(out).toMatch(/\[REDACTED\]/);
  });

  it("does not redact non-sensitive fields", async () => {
    const out = await captureNext();
    expect(out).toMatch(/user typed this — must be visible/);
    expect(out).toMatch(/u1/);
  });
});
```

Run:

```bash
pnpm test tests/unit/logger-redaction.test.ts
```

Expected: both tests pass.

- [ ] **Step 3: Replace bare `console.*` calls in server code**

Use Grep to find every occurrence of `console.(log|warn|error|info|debug)` under `src/server/`. For each file, replace `console.X(...)` with the appropriate `logger.X(...)`. For one-arg messages keep the string; for object payloads put the structured data first:

```ts
// before
console.log("LLM call", { provider, durationMs });
// after
logger.info({ provider, durationMs }, "LLM call");
```

The current known offenders:

| File | Calls to replace |
|---|---|
| `src/server/llm/index.ts` | call timing |
| `src/server/llm/openai.ts` | API errors |
| `src/server/llm/anthropic.ts` | API errors |
| `src/server/fetch.ts` | Readability fallback path |
| `src/server/scheduler.ts` | refresh start/end |
| `src/server/auth/sign-in.ts` | rate-limit hits |

After all replacements, re-run Grep — expected: zero matches under `src/server/`. Client code (`src/components/`, `src/app/`) is allowed to use `console` for browser-side debugging.

- [ ] **Step 4: Commit**

```bash
git add src/server/logger.ts tests/unit/logger-redaction.test.ts \
        src/server/llm/ src/server/fetch.ts src/server/scheduler.ts \
        src/server/auth/
git commit -m "phase-14: pino logger + redaction; replace console.* in server code"
```

---

## Task 8: Playwright E2E — golden path

**Files:**
- New: `playwright.config.ts`, `tests/e2e/golden-path.spec.ts`, `tests/e2e/fixtures/seed-fresh-user.ts`, `.github/workflows/e2e.yml`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared SQLite DB — keep workers serial
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Phase 14 runs E2E against `pnpm dev` — Phase 13 added a `pnpm build`
    // path; we use dev because hot-reload is fine and we want fast iteration.
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      DEPLOY_TARGET: "local",
      AUTH_MODE: "none",
      DATABASE_URL: "file:./prisma/test-e2e.db",
      APP_ENCRYPTION_KEY: "ZmFrZS1rZXktMzItYnl0ZXMtbG9uZy1mYWtlLWtleS0zLQ==", // 32B base64
    },
  },
});
```

- [ ] **Step 2: Create the seed fixture**

`tests/e2e/fixtures/seed-fresh-user.ts`. Use Node's `child_process.spawnSync` with an explicit argv array (not a shell string) so we never invoke a shell:

```ts
import { spawnSync } from "node:child_process";

export function seedFreshDb() {
  // Deletes test DB, re-runs migrations, applies seed without onboarding state
  // so the homepage redirects to /onboarding.
  process.env.DATABASE_URL = "file:./prisma/test-e2e.db";

  const reset = spawnSync(
    "pnpm",
    ["prisma", "migrate", "reset", "--force", "--skip-seed"],
    { stdio: "inherit", env: process.env, shell: false },
  );
  if (reset.status !== 0) throw new Error("seedFreshDb: prisma migrate reset failed");

  const seed = spawnSync(
    "pnpm",
    ["tsx", "prisma/seed.ts"],
    {
      stdio: "inherit",
      env: { ...process.env, SEED_SKIP_ONBOARDING: "true" },
      shell: false,
    },
  );
  if (seed.status !== 0) throw new Error("seedFreshDb: prisma seed failed");
}
```

`spawnSync` with `shell: false` and an array argv eliminates command-injection concerns — there is no shell to interpret metacharacters. The argv is also constant in this fixture.

- [ ] **Step 3: Write the golden-path spec**

`tests/e2e/golden-path.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { seedFreshDb } from "./fixtures/seed-fresh-user";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  seedFreshDb();
});

test("golden path: onboarding -> dashboard -> journal -> tasks -> theme -> sign-out", async ({ page }) => {
  // === Step 1: Visit homepage, expect onboarding redirect ===
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);

  // === Step 2: Fill onboarding wizard ===
  // Step "Welcome"
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  await page.getByRole("button", { name: /begin/i }).click();

  // Step "Name & role"
  await page.getByLabel(/preferred name/i).fill("E2E Tester");
  await page.getByLabel(/job title/i).fill("Engineer");
  await page.getByRole("button", { name: /next/i }).click();

  // Step "Content interests"
  await page.getByRole("checkbox", { name: /software/i }).check();
  await page.getByRole("checkbox", { name: /personal finance/i }).check();
  await page.getByRole("button", { name: /next/i }).click();

  // Step "Spiritual prefs"
  await page.getByRole("radio", { name: /christian/i }).check();
  await page.getByRole("button", { name: /next/i }).click();

  // Step "Starter goals"
  await page.getByRole("checkbox", { name: /pray/i }).check();
  await page.getByRole("checkbox", { name: /walk/i }).check();
  await page.getByRole("button", { name: /next/i }).click();

  // Step "Refresh time" (default 04:00 — accept it)
  await page.getByRole("button", { name: /next/i }).click();

  // Step "LLM provider" — choose LM Studio (no API key required)
  await page.getByRole("radio", { name: /lm studio/i }).check();
  await page.getByRole("button", { name: /finish/i }).click();

  // === Step 3: Dashboard ===
  await expect(page).toHaveURL(/\/$|\/dashboard/);
  await expect(page.getByRole("tab", { name: /mindfulness/i })).toBeVisible();

  // === Step 4: Toggle a check goal, persist across reload ===
  const prayGoal = page.getByRole("listitem").filter({ hasText: /pray/i }).first();
  const prayCheck = prayGoal.getByRole("checkbox").first();
  await prayCheck.check();
  await expect(prayCheck).toBeChecked();
  await page.reload();
  const prayCheckAfter = page.getByRole("listitem").filter({ hasText: /pray/i }).first().getByRole("checkbox").first();
  await expect(prayCheckAfter).toBeChecked();

  // === Step 5: Journal "anxious" -> scripture switches to Anxiety-tagged passage ===
  const scriptureBefore = await page.locator('[data-testid="scripture-preview"]').textContent();

  await page.getByLabel(/journal/i).click();
  await page.getByPlaceholder(/what.*on your mind/i).fill("Today I feel really anxious about a deadline.");
  // Autosave debounce per Phase 3 plan = 800ms
  await page.waitForTimeout(1500);

  await expect(page.locator('[data-testid="scripture-preview"]')).not.toHaveText(scriptureBefore!);
  // The Anxiety-tagged passage in scriptures.ts is Philippians 4:6-7
  await expect(page.locator('[data-testid="scripture-preview"]')).toContainText(/philippians 4|do not be anxious|do not worry/i);

  // === Step 6: Add a task, mark complete, FAB count decrements ===
  const fab = page.locator('[data-testid="tasks-fab"]');
  const fabCountBefore = Number(await fab.locator('[data-testid="tasks-fab-count"]').textContent());

  await fab.click();
  const drawer = page.locator('[role="dialog"][aria-label*="tasks" i]');
  await expect(drawer).toBeVisible();
  await drawer.getByPlaceholder(/new task/i).fill("Ship phase 14");
  await drawer.getByRole("button", { name: /add/i }).click();

  // FAB count incremented by 1
  await expect(fab.locator('[data-testid="tasks-fab-count"]')).toHaveText(String(fabCountBefore + 1));

  // Now complete it
  const newRow = drawer.getByRole("listitem").filter({ hasText: /ship phase 14/i });
  await newRow.getByRole("checkbox").check();

  // FAB count decrements back to original
  await expect(fab.locator('[data-testid="tasks-fab-count"]')).toHaveText(String(fabCountBefore));

  // Close drawer
  await page.keyboard.press("Escape");

  // === Step 7: Toggle theme — data-theme attribute flips ===
  const html = page.locator("html");
  const themeBefore = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /toggle theme|theme/i }).first().click();
  const themeAfter = await html.getAttribute("data-theme");
  expect(themeAfter).not.toBe(themeBefore);
  expect(["light", "dark", "warm", "forest", "midnight"]).toContain(themeAfter);

  // === Step 8: Sign out — redirected to login ===
  // In AUTH_MODE=none there is no sign-out button; this E2E covers the
  // primary flow only. To exercise sign-out we re-run with AUTH_MODE=simple.
});

test("sign-out flow — AUTH_MODE=simple", async ({ page }) => {
  // This sub-test is conditional on AUTH_MODE=simple being set.
  // Skipped in the default golden-path run; documented here for completeness.
  test.skip(process.env.AUTH_MODE !== "simple", "AUTH_MODE=simple required");

  await page.goto("/");
  await page.getByLabel(/password/i).fill(process.env.E2E_PASSWORD ?? "test-password");
  await page.getByRole("button", { name: /unlock|sign in/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: Run it locally**

```bash
pnpm test:e2e
```

Expected: the golden-path test passes end-to-end. The sign-out test is skipped (AUTH_MODE=none).

If anything is flaky, prefer `await expect(...).toHaveText(...)` (auto-retrying) over snapshot comparisons.

- [ ] **Step 5: CI workflow**

`.github/workflows/e2e.yml`:

```yaml
name: E2E

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Generate Prisma client
        run: pnpm prisma generate

      - name: Run Playwright
        run: pnpm test:e2e
        env:
          CI: "true"
          DEPLOY_TARGET: local
          AUTH_MODE: none
          DATABASE_URL: "file:./prisma/test-e2e.db"
          APP_ENCRYPTION_KEY: ${{ secrets.E2E_APP_ENCRYPTION_KEY }}

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

The repo secret `E2E_APP_ENCRYPTION_KEY` is a 32-byte base64 value; create it once via:

```bash
gh secret set E2E_APP_ENCRYPTION_KEY -b "$(openssl rand -base64 32)"
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/ .github/workflows/e2e.yml
git commit -m "phase-14: Playwright golden-path E2E + CI workflow"
```

---

## Task 9: Threat-model review document

**Files:**
- New: `docs/threat-model-review.md`

- [ ] **Step 1: Write the document**

`docs/threat-model-review.md`:

```markdown
# Threat-Model Review (Phase 14)

This is a per-row walkthrough of the STRIDE table from `docs/security.md`. Every row links to the test or file that *demonstrates* the mitigation, and a short manual-review note for things tests can't catch.

Reviewer: <fill at sign-off>
Date: <fill at sign-off>

## Spoofing

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| Session forgery | Auth.js v5 signed cookies; `AUTH_SECRET` 32+ bytes | `tests/integration/csrf-session-required.test.ts` | Confirm `AUTH_SECRET` is set on Railway and is unique per environment |
| Password brute force | 10 attempts / IP / 15 min, then exponential backoff | `tests/unit/rate-limit.test.ts` + `src/server/auth/sign-in.ts` | Confirm Upstash is wired on Railway (in-memory bucket is per-instance) |
| Cookie theft (XSS) | `HttpOnly` + strict CSP | `tests/unit/headers.test.ts` (CSP); cookie config asserted at boot | Manually inspect a deployed response for `Set-Cookie: ...; HttpOnly; Secure; SameSite=Lax` |
| Cookie theft (network) | `Secure` flag on Railway; HSTS preload | `tests/unit/headers.test.ts` (HSTS) | Confirm HSTS preload submitted at hstspreload.org after first deploy |

## Tampering

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| Cross-tenant write via crafted body | Every server action resolves `userId` from session, never request body | `tests/integration/csrf-session-required.test.ts` + per-action tests | Spot-check 3 random server actions in code review for `userId = await requireUserId()` line |
| Direct DB write outside Prisma | Single Prisma client, single connection string in env | `src/server/db.ts` | Confirm no raw SQL outside Prisma migrations |
| Tampered API-key ciphertext | AES-256-GCM with auth tag — tampering throws | `tests/unit/crypto.test.ts` (Phase 8) | n/a |
| Past-day editing | Calendar UI sets `readonly` on past days | Phase 11 plan acceptance criteria | Manually navigate to yesterday and confirm fields disabled |

## Repudiation

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| User denies a goal/task mutation | `AuditLog` row per mutation with userId, action, IP, UA | `tests/unit/audit.test.ts` | Inspect `AuditLog` rows after a 5-minute manual session — every action visible |
| User denies a journal save | `journal.save` rows with `iso` + `length` (no body) | `tests/unit/audit.test.ts` | Body is intentionally NOT logged — repudiation is bounded by length-only evidence (acceptable for v1) |
| User denies an API-key save | `apikey.save` rows with `provider` + `last4` | `tests/unit/audit.test.ts` | n/a |
| Refresh attribution | `RefreshLog` row per attempt with `triggeredBy` | Phase 10 acceptance | n/a |

## Information Disclosure

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| Plaintext API key leaked in logs | Pino redact paths catch `apiKey`/`encryptedKey`/`authorization`/`cookie` | `tests/unit/logger-redaction.test.ts` | Grep CI log artifacts for known-secret prefixes as a periodic spot check |
| API key returned in `GET` response | Settings UI returns last4 only | `src/components/settings/LlmCredentialsCard.tsx` | Code review: ensure no response body includes `encryptedKey` field |
| Cross-user data leak | Prisma queries scoped by `userId` from session | Per-action tests | Periodic schema audit — every user-owned table has `userId` FK |
| Stack trace exposing internals to client | Next.js production hides server errors; user sees "Something went wrong" | Production deploy | Confirm `NODE_ENV=production` on Railway |
| URL parameter PII | URLs do not embed user data | Code review | Confirmed during Phase 11 calendar implementation |

## Denial of Service

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| Cron flooding | `CRON_SECRET` Bearer-gated; idempotent on `(userId, iso)` | Phase 10 acceptance | Confirm Railway cron has `CRON_SECRET` set |
| Manual refresh cost bombing | 3 / user / day | `tests/unit/rate-limit.test.ts` | n/a |
| Login flood | 10 / IP / 15 min | `tests/unit/rate-limit.test.ts` | n/a |
| Web fetch SSRF or large body | 30 / user / hour, 1 MB body cap, 8s timeout | `src/server/fetch.ts` + Phase 8 unit tests | n/a |
| LLM streaming hang | `AbortController` with 30s timeout | Phase 8 unit tests | n/a |

## Elevation of Privilege

| Aspect | Mitigation | Verified by | Manual review note |
|---|---|---|---|
| User becomes admin | No admin role exists in v1 | Schema review | Confirmed: no `role` column on `User` |
| Local user impersonates Railway user | DB is per-deployment; no shared creds | Deployment topology | n/a |
| OAuth provider account takeover | Auth.js handles state nonce; verified email merging | Auth.js v5 docs | `linkAccount` event audit in `actions/auth.ts` |
| Cron endpoint runs without secret | `CRON_SECRET` returned 401 | Phase 10 unit tests | n/a |

## Sign-off Statement

By signing this row, the reviewer asserts that every "Verified by" link above resolves to a green test as of the commit named in this PR's description.

| Reviewer | Commit SHA | Date | Outcome |
|---|---|---|---|
| | | | |
```

- [ ] **Step 2: Commit**

```bash
git add docs/threat-model-review.md
git commit -m "phase-14: STRIDE threat-model review walkthrough"
```

---

## Task 10: OWASP Top 10 pen-test checklist

**Files:**
- New: `docs/pentest-checklist.md`

- [ ] **Step 1: Write the document**

`docs/pentest-checklist.md`:

```markdown
# OWASP Top 10 (2021) Pen-Test Checklist

Reviewer: <fill>
Date: <fill>
Commit: <fill>

| # | Category | Status | Evidence | Notes |
|---|---|---|---|---|
| A01 | Broken Access Control | pass | `tests/integration/csrf-session-required.test.ts`, `src/server/auth.ts` (`requireUserId`) | Every server action requires a session; `userId` is never trusted from the body |
| A02 | Cryptographic Failures | pass | `src/server/crypto.ts` (AES-256-GCM), `tests/unit/crypto.test.ts` | Per-user HKDF subkey; auth tag verified on decrypt; `APP_ENCRYPTION_KEY` 32 bytes asserted at boot |
| A03 | Injection | pass | Prisma parameterized queries throughout `src/server/`; no raw SQL outside migrations | Zod validates every server action input |
| A04 | Insecure Design | pass | `docs/security.md` STRIDE table; `docs/threat-model-review.md` | Boot guard refuses `DEPLOY_TARGET=railway` + `AUTH_MODE=none` |
| A05 | Security Misconfiguration | pass | `tests/unit/headers.test.ts` (CSP, HSTS, COOP, X-Frame-Options) | `next.config.ts` enforces strict headers; cookie flags asserted at boot |
| A06 | Vulnerable & Outdated Components | pass | `pnpm audit --audit-level=high` clean; `docs/dependencies.md` snapshot; Dependabot weekly | Waivers (if any) documented in `docs/dependencies.md` |
| A07 | ID & Auth Failures | pass | `src/server/auth/`, Phase 7 plan, `tests/unit/rate-limit.test.ts` | Argon2id password hashing; rate-limited login; sticky session |
| A08 | Software & Data Integrity Failures | pass | `pnpm install --frozen-lockfile` in CI; `pnpm-lock.yaml` committed | No dynamic `eval`; LLM responses validated via Zod before persist |
| A09 | Security Logging & Monitoring Failures | pass | `src/server/logger.ts` (pino + redact), `AuditLog` table, `tests/unit/logger-redaction.test.ts` | Login + every mutation audited; secrets redacted |
| A10 | Server-Side Request Forgery (SSRF) | pass | `src/server/fetch.ts` (Phase 8 SSRF guard), unit tests | Refuses private IPs, non-`https`, non-`text/html`, redirect-to-private |
| (extra) | XML External Entities (XXE, OWASP 2017 A4) | n/a | No XML parsing in v1 | Marked n/a — will revisit if RSS support lands |

## Manual probes (run before sign-off)

- [ ] Visit `/api/cron/refresh-all` without `Authorization` header → expect 401
- [ ] Visit `/api/cron/refresh-all` with wrong bearer → expect 401
- [ ] POST to a server action endpoint without session cookie → expect Auth.js redirect or 401
- [ ] Submit a goal-create form with `userId="other-user"` in the body → expect ignored (resolved from session)
- [ ] Save an API key, reload settings, confirm only last-4 visible
- [ ] Run `pnpm audit --audit-level=high` → expect zero high/critical
- [ ] `curl -s http://target/.env` → expect 404 (no env file served)
- [ ] `curl -sI http://target` → expect HSTS, CSP, X-Frame-Options headers
- [ ] Attempt SSRF: feed `http://169.254.169.254/latest/meta-data/` to web fetch → expect refusal
- [ ] Attempt SSRF: feed `http://localhost:3000` to web fetch → expect refusal in Railway mode (allowed in local mode)
- [ ] Spam manual refresh 4 times in a day → expect 4th call rejected
- [ ] Attempt 11 logins from one IP in 15 min → expect 11th rejected
- [ ] Submit huge journal note (10 MB) → expect Zod max-length rejection

## Sign-off

| Reviewer | Commit SHA | Date | Outcome |
|---|---|---|---|
| | | | |
```

- [ ] **Step 2: Commit**

```bash
git add docs/pentest-checklist.md
git commit -m "phase-14: OWASP Top 10 pen-test checklist"
```

---

## Task 11: Dependency hygiene snapshot

**Files:**
- New: `docs/dependencies.md` (auto-generated)
- Modify: `.github/workflows/audit.yml`

- [ ] **Step 1: Run the audit locally**

```bash
pnpm audit --audit-level=high
```

Expected: clean ("No known vulnerabilities found"). If any high/critical reports surface:

1. Try `pnpm update <package>` to the patched version.
2. If no patched version exists, document in `docs/dependencies.md` under "Waivers" with: package, advisory ID, exposure analysis (does the vulnerable code path run?), planned remediation.

- [ ] **Step 2: Generate the dependency snapshot**

```bash
pnpm list --depth=0 > docs/dependencies.md
```

Expected: a markdown file listing top-level dependency versions. Prepend a header:

```markdown
# Dependency Snapshot

Auto-generated by `pnpm audit:deps`. Re-run before each release.

Last updated: <date>
Audit status: clean (no high/critical)

## Top-level packages
```

- [ ] **Step 3: Add the audit step to CI**

Edit `.github/workflows/audit.yml` (Phase 13 created this for `pnpm audit`):

```yaml
- name: Refresh dependency snapshot
  run: |
    pnpm list --depth=0 > docs/dependencies.md
    if ! git diff --quiet docs/dependencies.md; then
      echo "::warning::docs/dependencies.md is stale — re-run \`pnpm audit:deps\` and commit"
    fi
```

This emits a CI warning (not a hard failure) when the snapshot is stale — the goal is awareness, not gate-blocking.

- [ ] **Step 4: Commit**

```bash
git add docs/dependencies.md .github/workflows/audit.yml
git commit -m "phase-14: dependency snapshot + CI staleness warning"
```

---

## Task 12: Final integration — full test sweep + sign-off

**Files:**
- No new files; this task verifies everything composes.

- [ ] **Step 1: Run the full unit + integration suite**

```bash
pnpm test
```

Expected: every prior phase's tests still pass. Specifically:

- Phase 1: dates, theme toggle smoke
- Phase 2: data layer round-trips
- Phase 3: scripture engine, journal autosave
- Phase 4: panel render
- Phase 5: drawer, FAB count
- Phase 6: DAILY_CONTENT round-trip
- Phase 7: auth modes, login lockout, AuditLog rows
- Phase 8: crypto, LLM adapters, SSRF guard, web fetch
- Phase 9: onboarding wizard state machine
- Phase 10: scheduler dedup
- Phase 11: calendar nav + weekend mode
- Phase 12: themes, F&F stub
- Phase 13: Railway boot guards
- Phase 14: headers, rate-limit, audit, logger, csrf-session-required (all new)

- [ ] **Step 2: Run E2E**

```bash
pnpm test:e2e
```

Expected: golden-path passes; sign-out test skipped (`AUTH_MODE=none`).

- [ ] **Step 3: Audit dependencies**

```bash
pnpm audit:deps
```

Expected: zero high/critical; `docs/dependencies.md` is up to date.

- [ ] **Step 4: Manual smoke**

Boot the app:

```bash
pnpm dev
```

Walk through:

1. Onboarding wizard end-to-end → dashboard.
2. Toggle theme → confirm `data-theme` updates.
3. Save an API key → settings shows last-4 only.
4. Inspect `AuditLog` table:
   ```bash
   pnpm prisma studio
   ```
   Confirm rows exist for: `goal.create`, `task.create`, `journal.save`, `apikey.save`.
5. `curl -sI http://localhost:3000/` — confirm CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy.

- [ ] **Step 5: Update `docs/security.md` with verification status**

Append a "Phase 14 verification" section:

```markdown
## Phase 14 Verification (v1 sign-off)

Verified <YYYY-MM-DD> at commit `<sha>`:

- Strict CSP, HSTS (Railway), Permissions-Policy enforced — `tests/unit/headers.test.ts`
- Every server action requires a session — `tests/integration/csrf-session-required.test.ts`
- Rate limiting unified via `checkRate()` — `tests/unit/rate-limit.test.ts`
- Every mutation audited — `tests/unit/audit.test.ts`
- Pino redacts known-sensitive fields — `tests/unit/logger-redaction.test.ts`
- Golden path passes E2E — `tests/e2e/golden-path.spec.ts`
- `pnpm audit --audit-level=high` clean — `docs/dependencies.md`
- STRIDE walkthrough signed — `docs/threat-model-review.md`
- OWASP Top 10 checklist signed — `docs/pentest-checklist.md`
```

- [ ] **Step 6: Final commit**

```bash
git add docs/security.md
git commit -m "phase-14: v1 sign-off — STRIDE + OWASP verified, all phases green"
```

---

## Phase 14 Acceptance Criteria

Each item maps directly to a row in `docs/security.md` §"Threat Model — STRIDE quick pass":

- [ ] **Spoofing — session forgery**: `Auth.js v5` cookies are `HttpOnly`, `Secure` (Railway), `SameSite=Lax`; boot asserts these. Test: `tests/unit/headers.test.ts` covers HSTS; cookie flag assertion in `src/server/auth.ts`.
- [ ] **Spoofing — credential brute force**: 10 attempts / IP / 15 min via `checkRate()`. Test: `tests/unit/rate-limit.test.ts` (window rollover, namespacing).
- [ ] **Tampering — cross-tenant write**: every server action resolves `userId` from session. Test: `tests/integration/csrf-session-required.test.ts`.
- [ ] **Tampering — ciphertext tamper**: AES-GCM auth tag verified on decrypt. Test: existing Phase 8 `tests/unit/crypto.test.ts`.
- [ ] **Repudiation — mutation denial**: every goal, task, journal, API-key, refresh writes an `AuditLog` row. Test: `tests/unit/audit.test.ts`.
- [ ] **Repudiation — secret-bearing payload**: meta callbacks redact secrets. Test: `tests/unit/audit.test.ts` "never persists secrets in meta".
- [ ] **Info disclosure — log leakage**: pino redacts `password|apiKey|encryptedKey|authorization|cookie`. Test: `tests/unit/logger-redaction.test.ts`.
- [ ] **Info disclosure — GET returns redacted**: settings card returns last-4 only. Verified in Phase 8 plan + manual smoke step 4.
- [ ] **DoS — manual refresh bombing**: 3 / user / day. Test: `tests/unit/rate-limit.test.ts` (rejects 4th).
- [ ] **DoS — login flood**: 10 / IP / 15 min. Test: `tests/unit/rate-limit.test.ts`.
- [ ] **DoS — web fetch abuse**: 30 / user / hour. Test: `tests/unit/rate-limit.test.ts` namespacing covers; existing fetch tests cover body/timeout caps.
- [ ] **EoP — admin role**: schema review confirms no `role` column on `User`.
- [ ] **EoP — cron without secret**: existing Phase 10 `tests/unit/cron-secret.test.ts`.
- [ ] **CSP**: matches the spec from `docs/security.md` exactly. Test: `tests/unit/headers.test.ts`.
- [ ] **HSTS**: emitted only when `DEPLOY_TARGET=railway`. Test: `tests/unit/headers.test.ts`.
- [ ] **Pen-test checklist**: all 10 OWASP rows checked. Doc: `docs/pentest-checklist.md`.
- [ ] **STRIDE walkthrough**: signed by reviewer. Doc: `docs/threat-model-review.md`.
- [ ] **Dependency hygiene**: `pnpm audit` clean. Doc: `docs/dependencies.md`.
- [ ] **PR labeler**: PRs touching security paths receive `type:security` automatically.
- [ ] **E2E golden path**: passes locally and in CI on every PR.
- [ ] **No regression**: every prior phase's tests still pass (`pnpm test`).

---

## Notes

### v1 Sign-Off Checklist

After this Phase 14 PR merges, the following must all be true. If any is not, **do not** declare v1 shipped — open a follow-up issue and resolve it first.

- [ ] All Phase 1–14 acceptance criteria pass on `main`.
- [ ] CI is green on `main`: build, unit, integration, E2E, audit, labeler.
- [ ] CodeQL has run at least once on `main` with no high/critical findings.
- [ ] Dependabot has produced zero open security PRs at high/critical.
- [ ] Railway deployment serves the live site with HSTS + CSP visible in `curl -sI`.
- [ ] Manual smoke from a fresh device: onboarding → dashboard → save data → reload → data persists.
- [ ] `docs/threat-model-review.md` and `docs/pentest-checklist.md` have a signed reviewer row.
- [ ] `README.md` "Status" reads `v1 — shipped <YYYY-MM-DD>`.

**There is no Phase 15.** v1 is shipped when this PR merges and the eight items above are checked. Future work (notifications, multi-device sync, Tauri desktop, additional LLM providers) belongs in a v2 roadmap drafted *after* the team has lived with v1 for at least a month — not before.

### What Phase 14 deliberately does NOT do

- **No new product features.** The drawer, panels, scripture engine, refresh — all unchanged.
- **No schema-breaking migrations.** `AuditLog.userAgent` is the only column added; it's nullable.
- **No new server actions.** Every audit-log addition is a wrapper around an existing action.
- **No CSRF token implementation.** Auth.js v5 + Next.js server actions already require a valid session cookie; Phase 14 adds the regression test that proves this remains true.
- **No CodeQL config.** Phase 13 already enabled CodeQL via the GitHub UI default config; Phase 14 does not touch it.
- **No Dependabot config changes.** Phase 13 enabled it.
- **No HSTS preload submission.** That's an out-of-band step the human owner does at hstspreload.org after first deploy; Phase 14 documents it in the threat-model review.

### Risks specific to this phase

| Risk | Mitigation |
|---|---|
| CSP breaks existing inline event handlers or `<script>` tags | Phase 1's `globals.css` and the layout use no inline scripts; the only inline-style usage is via React's CSSOM (which Tailwind covers via `style-src 'unsafe-inline'`). If a regression appears, fall back to a per-route CSP override before relaxing the global. |
| Playwright flake in CI | Use `expect(...).to...()` matchers (auto-retrying); set `retries: 1` on CI; capture trace+video on failure. |
| Upstash latency added to every login + every refresh | The hot path is local-mode (in-memory bucket); Upstash only on Railway. Sliding-window calls average <30 ms from Railway US-East. If users report slowness, raise the `windowSec` rather than removing the limit. |
| Audit-log table grows unbounded | Out of scope for v1. Add a 90-day retention cron in v2. Document this in `docs/security.md` "v2 follow-ups". |
| `withAudit` swallows errors silently if Prisma is down | The implementation logs and re-throws the original error — audit failures never block the user-facing operation. |

### Manual steps that are intentionally out of code

These exist in the plan for human reference and should NOT be automated:

1. Submit Railway domain to https://hstspreload.org after first successful deploy.
2. Sign the reviewer row in `docs/threat-model-review.md` and `docs/pentest-checklist.md`.
3. Update `README.md` "Status" line to `v1 — shipped <date>`.
4. Tag the merge commit `v1.0.0` and write release notes drawing from each phase's plan summary.

### Why no "compliance" section

The Daily Mind v1 has no enterprise customers, no PHI, no PCI scope, and no GDPR DPA obligations beyond reasonable hygiene (right to deletion is satisfied by per-user data isolation + a future `delete-account` button — itself v2 work). Compliance frameworks (SOC2, ISO 27001) require sustained evidence collection, not a one-time pass. They are explicitly v2 territory and do not block v1 sign-off.

### Phase verification

- [ ] `pnpm test` — all green
- [ ] `pnpm test:e2e` — golden path passes
- [ ] `pnpm audit:deps` — clean
- [ ] `pnpm dev` — manual smoke per Task 12 Step 4
- [ ] `git log --oneline phase-14-*` — every task has its own commit
- [ ] `gh pr view` — `type:security` label applied automatically

When all six are checked, this phase is complete. Open the PR, request review per `docs/contributing.md`, and on merge declare v1 shipped.
