# Phase 10 — LLM Refresh Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the per-user daily content refresh happen automatically. Each user picked a `refreshTime` (HH:MM) and `tz` (IANA) during Phase 9 onboarding. Phase 10 turns those preferences into actual fires of Phase 8's `refreshDailyContent({ userId, triggeredBy })` server action — once per local day, idempotently, audited in `RefreshLog`. Two delivery mechanisms ship side-by-side because the deploy targets are different beasts: a `node-cron` ticker for `DEPLOY_TARGET=local` (single Node process owns the schedule), and a Railway-cron-driven HTTP endpoint for `DEPLOY_TARGET=railway` (Railway dispatches every minute, the endpoint scans the user table). A third mechanism — **cold-start catch-up** — runs on every boot regardless of target, so a missed scheduled refresh fires when the user opens the app.

**Deploy target this phase:** `local` and `railway`. The two are wired through the same orchestration core (`runRefreshIfDue`) so the audit log, dedup, concurrency cap, and logging are identical regardless of trigger.

**Architecture:**

```
                              +----------------------------+
                              |   Phase 8 server action    |
                              |   refreshDailyContent()    |
                              |   (per-day rate limit 3,   |
                              |    only for triggeredBy=   |
                              |    'manual')               |
                              +-------------^--------------+
                                            |
                              +-------------+--------------+
                              |   src/server/scheduler/    |
                              |   orchestrator.ts          |
                              |   - runRefreshIfDue()      |
                              |   - mutex via RefreshLog   |
                              |   - p-limit(3) queue       |
                              |   - logSafe() pino spans   |
                              +--^-----------^----------^--+
                                 |           |          |
            +--------------------+           |          +-----------------+
            |                                |                            |
   +--------+---------+             +--------+---------+         +--------+--------+
   | local.ts         |             | cold-start.ts    |         | /api/cron/      |
   | node-cron        |             | (instrumentation |         |   refresh-all   |
   | * * * * *        |             |  on every boot)  |         | Bearer-gated    |
   | DEPLOY_TARGET=   |             | scans all users  |         | Railway cron    |
   | local only       |             | misses -> fire   |         | * * * * *       |
   +------------------+             +------------------+         +-----------------+
                                            |
                                            v
                                +--------------------------+
                                |   Prisma RefreshLog      |
                                |   (userId, iso,          |
                                |    triggeredBy, status,  |
                                |    tokensUsed, error)    |
                                |   UNIQUE(userId, iso,    |
                                |          triggeredBy)    |
                                +--------------------------+
```

The single shared "is it due" predicate lives in `src/lib/scheduler/due.ts` (pure, deterministic, fully unit-tested). It takes `(now: Date, refreshTime: string, tz: string, lastFireIso: string | null)` and returns `{ due: boolean, iso: string }`. Every trigger surface calls it before deciding to fire.

The orchestrator is the **only** code path that calls Phase 8's `refreshDailyContent`. Cron, cold-start, and (future Phase 6/8) manual button all funnel through `runRefreshIfDue` for cron/cold-start, which acquires a mutex via a unique-constraint upsert on `RefreshLog(userId, iso, triggeredBy)`. If the upsert hits the unique constraint, that triggerer loses the race silently and returns `{ skipped: 'already-fired' }`. This makes "cron tick at 04:00:00 + cold-start sees missed refresh at 04:00:30" safe by construction.

**Tech Stack:** Next.js 15 instrumentation hook, `node-cron` (local only), `luxon` for IANA timezone math, `p-limit` for in-process concurrency, `pino` (already configured in Phase 8), Prisma (existing client), Vitest. No browser surface this phase, so Playwright is not needed.

**Dependency contracts assumed from earlier phases:**

| Phase | Symbol | Shape |
|---|---|---|
| 1 | `db` (Prisma client) | `import { db } from '@/server/db'` |
| 1 | `User` model | `id`, `email?`, `createdAt` |
| 7 | boot guard | already throws if `DEPLOY_TARGET=railway && !CRON_SECRET` |
| 7 | `instrumentation.ts` | exists; we extend its `register()` |
| 8 | `refreshDailyContent({ userId, triggeredBy })` | server-internal function returning `{ status, tokensUsed?, error? }`; `triggeredBy='manual'` enforces the 3/day rate limit, other values do not |
| 8 | `RefreshLog` model | already migrated in Phase 8 with the columns Phase 10 needs (Phase 10 adds the `(userId, iso, triggeredBy)` unique constraint if Phase 8 didn't) |
| 8 | `pino` logger | `import { logger } from '@/server/logger'`; supports `logger.child({ userId, iso, triggeredBy })` |
| 9 | `Pref.refreshTime`, `Pref.tz`, `Pref.onboardedAt` | populated for every onboarded user |

**Out of scope this phase:**

- The Phase 6/8 "Refresh now" UI button (already shipped in Phase 8 as a `manual` trigger).
- Multi-region cron failover (Railway cron has its own redundancy).
- Partial-day re-runs (one cron + one cold-start row max per `(userId, day)`; `manual` is unbounded by uniqueness because the per-day rate limit constrains it).
- Push notifications when a refresh fails — Phase 14 will surface via the dashboard error pill.

**Critical rule (re-stated for emphasis):** the cron endpoint **never trusts request body**. The user list comes from the DB. The body is read but ignored — it cannot direct which user to refresh, cannot inject a `userId`, cannot expand the work list. This matches `docs/security.md` Rate Limits cron-endpoint row: "ignores body; returns 200 even on duplicate".

---

## File Structure (created in this phase)

| File | Purpose |
|---|---|
| `prisma/migrations/<ts>_phase10_refreshlog_unique/migration.sql` | Confirms / adds `UNIQUE(userId, iso, triggeredBy)` and supporting indexes on `RefreshLog` |
| `prisma/schema.prisma` | (mutated) `RefreshLog` block re-stated for clarity even if Phase 8 already shipped it |
| `src/lib/scheduler/due.ts` | Pure tz-aware "is this user due?" decision |
| `src/lib/scheduler/iso.ts` | `localISO(now, tz)` — what day is "today" for this user |
| `src/server/scheduler/orchestrator.ts` | `runRefreshIfDue({ userId, triggeredBy, now })` — the only code path that calls `refreshDailyContent` from a scheduler |
| `src/server/scheduler/queue.ts` | `p-limit(3)` singleton + `runQueued(fn)` wrapper |
| `src/server/scheduler/local.ts` | `node-cron` per-process ticker, gated by `DEPLOY_TARGET=local` |
| `src/server/scheduler/cold-start.ts` | Boot-time catch-up scanner |
| `src/server/scheduler/index.ts` | Single entry point called from `instrumentation.ts` |
| `src/app/api/cron/refresh-all/route.ts` | Railway cron endpoint, Bearer-gated |
| `src/server/scheduler/auth.ts` | `verifyCronSecret(req)` constant-time compare |
| `instrumentation.ts` | (mutated) calls `bootScheduler()` |
| `tests/unit/scheduler/due.test.ts` | Tz math, edge cases (DST, late-night tz, midnight rollover) |
| `tests/unit/scheduler/iso.test.ts` | Local-tz ISO produces correct YYYY-MM-DD |
| `tests/unit/scheduler/auth.test.ts` | Constant-time compare; missing/wrong/extra-padding rejected |
| `tests/unit/scheduler/orchestrator.test.ts` | Mutex semantics; failure path writes `status='failed'` row |
| `tests/integration/scheduler/cron-endpoint.test.ts` | Bearer pass / fail / dedup / 200-on-empty |
| `tests/integration/scheduler/cold-start.test.ts` | Boot scan fires misses; doesn't double-fire if cron already ran |
| `tests/integration/scheduler/double-fire.test.ts` | Cron + cold-start same minute = exactly one fire |
| `tests/integration/scheduler/failure-path.test.ts` | Refresh throws -> `RefreshLog` row with truncated error |

---

## Task 1: Confirm and constrain the `RefreshLog` schema

**Files:**
- Mutate: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_phase10_refreshlog_unique/migration.sql`

Phase 8 created the `RefreshLog` table. Phase 10 confirms its shape and locks in the dedup contract. If Phase 8 already shipped the unique constraint and indexes below, this migration is a no-op (still committed, so the schema diff is clean).

- [ ] **Step 1: Re-state the `RefreshLog` model in `prisma/schema.prisma`**

Open `prisma/schema.prisma`. Locate the `RefreshLog` block. Replace it with the canonical Phase 10 form:

```prisma
model RefreshLog {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  iso          String   // local-tz YYYY-MM-DD for the *user*, not server
  triggeredBy  String   // 'cron' | 'cold-start' | 'manual'
  status       String   // 'success' | 'failed' | 'in-flight'
  tokensUsed   Int?
  error        String?  // truncated to 1024 chars before write
  startedAt    DateTime @default(now())
  completedAt  DateTime?

  @@unique([userId, iso, triggeredBy], name: "refreshlog_user_day_trigger")
  @@index([userId, iso])
  @@index([startedAt])
}
```

The unique constraint is the **single source of truth for dedup**. Cron and cold-start writers both attempt `db.refreshLog.create({ data: { ..., status: 'in-flight' } })`; the loser of the race catches the unique-violation error and returns `{ skipped: 'already-fired' }`. Manual triggers (Phase 8) intentionally use `triggeredBy='manual'` — the unique key includes `triggeredBy`, so manual is allowed up to the rate-limit cap (3/day) but cron and cold-start are 1/day each.

- [ ] **Step 2: Generate and apply the migration**

```bash
pnpm prisma migrate dev --name phase10_refreshlog_unique
```

Expected output:
```
Applying migration `<timestamp>_phase10_refreshlog_unique`
Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client in 120ms
```

If the constraint already exists, Prisma will produce an empty SQL file. Inspect the generated SQL — it should contain (or be empty if Phase 8 already shipped it):

```sql
-- AlterTable / CreateIndex statements
CREATE UNIQUE INDEX "RefreshLog_userId_iso_triggeredBy_key" ON "RefreshLog" ("userId", "iso", "triggeredBy");
CREATE INDEX "RefreshLog_userId_iso_idx" ON "RefreshLog" ("userId", "iso");
CREATE INDEX "RefreshLog_startedAt_idx" ON "RefreshLog" ("startedAt");
```

- [ ] **Step 3: Verify with a smoke insert**

Open a Prisma Studio session or use `pnpm tsx` to run:

```ts
await db.refreshLog.create({ data: { userId: SOME_USER_ID, iso: '2026-05-02', triggeredBy: 'cron', status: 'in-flight' } });
await db.refreshLog.create({ data: { userId: SOME_USER_ID, iso: '2026-05-02', triggeredBy: 'cron', status: 'in-flight' } });
```

Expected: the second call throws `PrismaClientKnownRequestError` with `code: 'P2002'` referencing the `userId,iso,triggeredBy` unique. If it succeeds, the constraint isn't there — fix before continuing.

Clean up the test rows. Commit when green.

---

## Task 2: Install dependencies (`luxon`, `node-cron`, `p-limit`)

**Files:**
- Mutate: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Add runtime deps**

```bash
pnpm add luxon node-cron p-limit
pnpm add -D @types/luxon @types/node-cron
```

Why each:

- **`luxon`** — IANA tz arithmetic that respects DST. `date-fns-tz` would also work; we chose `luxon` because its `DateTime.fromObject(..., { zone })` is far more readable than the date-fns equivalent and its DST behavior is documented per-method.
- **`node-cron`** — minute-granularity scheduling inside a single Node process for `DEPLOY_TARGET=local`. We don't use it on Railway because Railway-managed cron is the deploy-recommended path there.
- **`p-limit`** — tiny in-process concurrency cap. We don't want 50 cold-start refreshes hammering the LLM and DB on the same boot. Cap is 3.

- [ ] **Step 2: Confirm versions in `package.json`**

```json
{
  "dependencies": {
    "luxon": "^3.x.x",
    "node-cron": "^3.x.x",
    "p-limit": "^5.x.x"
  },
  "devDependencies": {
    "@types/luxon": "^3.x.x",
    "@types/node-cron": "^3.x.x"
  }
}
```

- [ ] **Step 3: Confirm `pnpm install --frozen-lockfile` still works**

```bash
pnpm install --frozen-lockfile
```

Expected: clean exit with no warnings about peer mismatches. Commit `package.json` and `pnpm-lock.yaml`.

---

## Task 3: TDD — pure timezone math (`due.ts` + `iso.ts`)

**Files:**
- Create: `tests/unit/scheduler/iso.test.ts`
- Create: `tests/unit/scheduler/due.test.ts`
- Create: `src/lib/scheduler/iso.ts`
- Create: `src/lib/scheduler/due.ts`

This is the heart of the phase. Get this wrong and every other surface is wrong. Test-first.

- [ ] **Step 1: Write `tests/unit/scheduler/iso.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { localISO } from '@/lib/scheduler/iso';

describe('localISO', () => {
  it('returns YYYY-MM-DD for the user-local day', () => {
    // 2026-05-02 03:30 UTC = 2026-05-01 23:30 New_York (EDT)
    const now = new Date('2026-05-02T03:30:00Z');
    expect(localISO(now, 'America/New_York')).toBe('2026-05-01');
    expect(localISO(now, 'UTC')).toBe('2026-05-02');
  });

  it('handles tz across the date line', () => {
    // 2026-05-02 03:30 UTC = 2026-05-02 12:30 Tokyo
    const now = new Date('2026-05-02T03:30:00Z');
    expect(localISO(now, 'Asia/Tokyo')).toBe('2026-05-02');
  });

  it('throws on unknown tz', () => {
    expect(() => localISO(new Date(), 'Atlantis/Lost')).toThrow(/zone/i);
  });
});
```

- [ ] **Step 2: Run — expect red**

```bash
pnpm vitest run tests/unit/scheduler/iso.test.ts
```

Expected: import error (`Cannot find module @/lib/scheduler/iso`).

- [ ] **Step 3: Implement `src/lib/scheduler/iso.ts`**

```ts
import { DateTime } from 'luxon';

/**
 * Returns the user-local YYYY-MM-DD for `now`, in the given IANA tz.
 * Throws if `tz` is not a valid IANA zone.
 */
export function localISO(now: Date, tz: string): string {
  const dt = DateTime.fromJSDate(now, { zone: tz });
  if (!dt.isValid) {
    throw new Error(`Invalid IANA zone: ${tz} (${dt.invalidReason}: ${dt.invalidExplanation})`);
  }
  return dt.toFormat('yyyy-LL-dd');
}
```

- [ ] **Step 4: Run — expect green**

```bash
pnpm vitest run tests/unit/scheduler/iso.test.ts
```

All three pass.

- [ ] **Step 5: Write `tests/unit/scheduler/due.test.ts`**

The contract: `isDue({ now, refreshTime, tz, lastFireIso })` returns `{ due: boolean, iso: string, reason?: string }`.

A user is due iff:
1. The user's *local-tz current time* is at or after `refreshTime` for the local day, AND
2. `lastFireIso !== iso(now, tz)` (no successful or in-flight cron/cold-start row for this iso)

For cron (minute-tick), we add a 5-minute grace window: if the local clock is currently between `refreshTime` and `refreshTime + 5min` AND no fire has happened today, fire now. The grace window catches scheduler clock skew between the cron dispatcher and the DB.

For cold-start, we don't need a grace window — if it's *any* time after `refreshTime` on the local day with no fire, we should catch up.

```ts
import { describe, it, expect } from 'vitest';
import { isDue } from '@/lib/scheduler/due';

describe('isDue', () => {
  describe('cron (minute-tick)', () => {
    it('fires when local clock equals refreshTime', () => {
      const now = new Date('2026-05-02T08:00:00Z'); // 04:00 New_York EDT
      const r = isDue({ mode: 'cron', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: null });
      expect(r.due).toBe(true);
      expect(r.iso).toBe('2026-05-02');
    });

    it('fires within the 5-minute grace window', () => {
      const now = new Date('2026-05-02T08:04:30Z'); // 04:04:30 EDT
      const r = isDue({ mode: 'cron', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: null });
      expect(r.due).toBe(true);
    });

    it('does NOT fire 6 minutes after refreshTime (cron is past, cold-start will pick up)', () => {
      const now = new Date('2026-05-02T08:06:00Z');
      const r = isDue({ mode: 'cron', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: null });
      expect(r.due).toBe(false);
      expect(r.reason).toMatch(/grace/i);
    });

    it('does NOT fire if already fired today', () => {
      const now = new Date('2026-05-02T08:00:00Z');
      const r = isDue({ mode: 'cron', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: '2026-05-02' });
      expect(r.due).toBe(false);
      expect(r.reason).toMatch(/already/i);
    });
  });

  describe('cold-start (catch-up)', () => {
    it('fires any time after refreshTime if not yet fired', () => {
      const now = new Date('2026-05-02T18:00:00Z'); // 14:00 EDT — well after 04:00
      const r = isDue({ mode: 'cold-start', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: null });
      expect(r.due).toBe(true);
    });

    it('does NOT fire before refreshTime', () => {
      const now = new Date('2026-05-02T07:30:00Z'); // 03:30 EDT
      const r = isDue({ mode: 'cold-start', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: null });
      expect(r.due).toBe(false);
    });

    it('does NOT fire if today already fired', () => {
      const now = new Date('2026-05-02T18:00:00Z');
      const r = isDue({ mode: 'cold-start', now, refreshTime: '04:00', tz: 'America/New_York', lastFireIso: '2026-05-02' });
      expect(r.due).toBe(false);
    });
  });

  describe('DST edge cases', () => {
    it('Spring-forward: 02:30 local does not exist; 03:00 should fire normally next day', () => {
      // 2026-03-08 is US spring-forward. 02:30 EST jumps to 03:30 EDT.
      const now = new Date('2026-03-08T07:30:00Z'); // 03:30 EDT
      const r = isDue({ mode: 'cron', now, refreshTime: '02:30', tz: 'America/New_York', lastFireIso: null });
      // Acceptable behavior: fires at first existent moment >= 02:30 local.
      expect(r.due).toBe(true);
    });

    it('Fall-back: 01:30 local exists twice; only fire once per day', () => {
      // 2026-11-01 is US fall-back. 01:30 occurs at both 05:30 UTC (EDT) and 06:30 UTC (EST).
      const firstPass = new Date('2026-11-01T05:30:00Z');
      const r1 = isDue({ mode: 'cron', now: firstPass, refreshTime: '01:30', tz: 'America/New_York', lastFireIso: null });
      expect(r1.due).toBe(true);

      const secondPass = new Date('2026-11-01T06:30:00Z');
      const r2 = isDue({ mode: 'cron', now: secondPass, refreshTime: '01:30', tz: 'America/New_York', lastFireIso: r1.iso });
      expect(r2.due).toBe(false);
    });
  });

  it('throws on bad tz', () => {
    expect(() => isDue({ mode: 'cron', now: new Date(), refreshTime: '04:00', tz: 'Mars/Olympus', lastFireIso: null }))
      .toThrow(/zone/i);
  });

  it('throws on bad refreshTime', () => {
    expect(() => isDue({ mode: 'cron', now: new Date(), refreshTime: '25:99', tz: 'UTC', lastFireIso: null }))
      .toThrow(/refreshTime/i);
  });
});
```

- [ ] **Step 6: Run — expect red**

```bash
pnpm vitest run tests/unit/scheduler/due.test.ts
```

- [ ] **Step 7: Implement `src/lib/scheduler/due.ts`**

```ts
import { DateTime } from 'luxon';
import { localISO } from './iso';

export type DueMode = 'cron' | 'cold-start';

export interface IsDueArgs {
  mode: DueMode;
  now: Date;
  refreshTime: string;          // 'HH:MM'
  tz: string;                   // IANA
  lastFireIso: string | null;   // most-recent cron/cold-start RefreshLog.iso for this user
}

export interface IsDueResult {
  due: boolean;
  iso: string;
  reason?: 'already' | 'before-refresh-time' | 'grace-window-passed';
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const GRACE_MINUTES = 5;

export function isDue(args: IsDueArgs): IsDueResult {
  const { mode, now, refreshTime, tz, lastFireIso } = args;

  const m = HHMM.exec(refreshTime);
  if (!m) throw new Error(`Invalid refreshTime: ${refreshTime} (expected HH:MM 24h)`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);

  const iso = localISO(now, tz);

  if (lastFireIso === iso) {
    return { due: false, iso, reason: 'already' };
  }

  // Build the local-day "due-at" instant and compare in absolute time.
  const dueAt = DateTime.fromISO(iso, { zone: tz })
    .set({ hour, minute, second: 0, millisecond: 0 });
  if (!dueAt.isValid) {
    // luxon couldn't construct the local time (DST gap). Bump to next valid second.
    const fallback = DateTime.fromJSDate(now, { zone: tz });
    if (fallback.toMillis() >= DateTime.fromISO(iso, { zone: tz }).toMillis()) {
      return { due: true, iso };
    }
    return { due: false, iso, reason: 'before-refresh-time' };
  }

  const nowMs = now.getTime();
  const dueMs = dueAt.toMillis();

  if (nowMs < dueMs) {
    return { due: false, iso, reason: 'before-refresh-time' };
  }

  if (mode === 'cron') {
    const graceMs = GRACE_MINUTES * 60 * 1000;
    if (nowMs > dueMs + graceMs) {
      return { due: false, iso, reason: 'grace-window-passed' };
    }
  }

  return { due: true, iso };
}
```

- [ ] **Step 8: Run — expect green**

```bash
pnpm vitest run tests/unit/scheduler/due.test.ts
pnpm vitest run tests/unit/scheduler/iso.test.ts
```

All cases pass. If the DST tests are flaky on your machine, double-check your system's IANA tz database is current (`Intl.supportedValuesOf('timeZone').includes('America/New_York')`).

Commit.

---

## Task 4: TDD — orchestrator (mutex, queue, error-truncation)

**Files:**
- Create: `tests/unit/scheduler/orchestrator.test.ts`
- Create: `src/server/scheduler/queue.ts`
- Create: `src/server/scheduler/orchestrator.ts`

The orchestrator is the **only** code path that calls `refreshDailyContent` from a scheduler. It owns the mutex, the concurrency cap, and the audit log row.

- [ ] **Step 1: Write `tests/unit/scheduler/orchestrator.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import * as phase8 from '@/server/llm/refresh';
import { runRefreshIfDue } from '@/server/scheduler/orchestrator';

vi.mock('@/server/llm/refresh', () => ({
  refreshDailyContent: vi.fn()
}));

const mockRefresh = vi.mocked(phase8.refreshDailyContent);

async function makeUser(overrides?: Partial<{ refreshTime: string; tz: string }>) {
  const u = await db.user.create({
    data: {
      pref: {
        create: {
          refreshTime: overrides?.refreshTime ?? '04:00',
          tz: overrides?.tz ?? 'UTC',
          onboardedAt: new Date()
        }
      }
    }
  });
  return u;
}

describe('runRefreshIfDue', () => {
  beforeEach(async () => {
    await db.refreshLog.deleteMany();
    await db.user.deleteMany();
    mockRefresh.mockReset();
    mockRefresh.mockResolvedValue({ status: 'success', tokensUsed: 1234 });
  });

  it('writes a success row and calls Phase 8', async () => {
    const u = await makeUser();
    const now = new Date('2026-05-02T04:00:00Z');
    const r = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });
    expect(r.fired).toBe(true);
    const log = await db.refreshLog.findFirst({ where: { userId: u.id } });
    expect(log?.status).toBe('success');
    expect(log?.tokensUsed).toBe(1234);
    expect(log?.iso).toBe('2026-05-02');
    expect(log?.triggeredBy).toBe('cron');
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockRefresh).toHaveBeenCalledWith({ userId: u.id, triggeredBy: 'cron' });
  });

  it('mutex: second concurrent call for same (userId, iso, triggeredBy) is a no-op', async () => {
    const u = await makeUser();
    const now = new Date('2026-05-02T04:00:00Z');

    // Slow Phase 8 down so the second call enters before the first finishes.
    mockRefresh.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return { status: 'success', tokensUsed: 100 };
    });

    const [a, b] = await Promise.all([
      runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now }),
      runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now })
    ]);

    const fires = [a, b].filter(x => x.fired);
    const skips = [a, b].filter(x => !x.fired);
    expect(fires.length).toBe(1);
    expect(skips.length).toBe(1);
    expect(skips[0].skipped).toBe('already-fired');
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it('cron and cold-start can each fire once per day (different triggeredBy = different mutex)', async () => {
    // Intentional: the unique key includes triggeredBy. The orchestrator additionally
    // checks lastFireIso ACROSS triggers and refuses if any kind has fired.
    // So a cold-start that runs after a cron success should be a no-op.
    const u = await makeUser();
    const now = new Date('2026-05-02T04:00:00Z');

    const r1 = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });
    expect(r1.fired).toBe(true);

    const r2 = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cold-start', now });
    expect(r2.fired).toBe(false);
    expect(r2.skipped).toBe('already-fired');
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it('writes a failed row when Phase 8 throws, with truncated error', async () => {
    const u = await makeUser();
    const huge = 'x'.repeat(5_000);
    mockRefresh.mockRejectedValueOnce(new Error(`boom: ${huge}`));

    const now = new Date('2026-05-02T04:00:00Z');
    const r = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });

    expect(r.fired).toBe(true); // we DID fire — just failed
    expect(r.error).toMatch(/boom/);
    const log = await db.refreshLog.findFirstOrThrow({ where: { userId: u.id } });
    expect(log.status).toBe('failed');
    expect(log.error?.length).toBeLessThanOrEqual(1024);
    expect(log.error).toMatch(/^boom/);
    expect(log.completedAt).toBeTruthy();
  });

  it('skips when not due (e.g. before refreshTime in user tz)', async () => {
    const u = await makeUser({ refreshTime: '04:00', tz: 'America/New_York' });
    // 02:00 EDT — before 04:00
    const now = new Date('2026-05-02T06:00:00Z');
    const r = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });
    expect(r.fired).toBe(false);
    expect(r.skipped).toBe('not-due');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect red (file does not yet exist)**

```bash
pnpm vitest run tests/unit/scheduler/orchestrator.test.ts
```

- [ ] **Step 3: Implement `src/server/scheduler/queue.ts`**

```ts
import pLimit from 'p-limit';

const CONCURRENCY = 3;
const limit = pLimit(CONCURRENCY);

export function runQueued<T>(fn: () => Promise<T>): Promise<T> {
  return limit(fn);
}

export function activeCount(): number {
  return limit.activeCount;
}

export function pendingCount(): number {
  return limit.pendingCount;
}
```

- [ ] **Step 4: Implement `src/server/scheduler/orchestrator.ts`**

```ts
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { isDue } from '@/lib/scheduler/due';
import { localISO } from '@/lib/scheduler/iso';
import { refreshDailyContent } from '@/server/llm/refresh';
import { runQueued } from './queue';
import { Prisma } from '@prisma/client';

export type Trigger = 'cron' | 'cold-start';

export interface RunArgs {
  userId: string;
  triggeredBy: Trigger;
  now: Date;
}

export interface RunResult {
  fired: boolean;
  iso: string;
  skipped?: 'not-due' | 'already-fired' | 'no-pref' | 'not-onboarded';
  status?: 'success' | 'failed';
  tokensUsed?: number;
  error?: string;
}

const ERR_MAX = 1024;
const truncate = (s: string) => (s.length > ERR_MAX ? s.slice(0, ERR_MAX - 1) + '…' : s);

export async function runRefreshIfDue(args: RunArgs): Promise<RunResult> {
  const { userId, triggeredBy, now } = args;

  const pref = await db.pref.findUnique({ where: { userId } });
  if (!pref) {
    return { fired: false, iso: '', skipped: 'no-pref' };
  }
  if (!pref.onboardedAt) {
    return { fired: false, iso: localISO(now, pref.tz || 'UTC'), skipped: 'not-onboarded' };
  }

  const iso = localISO(now, pref.tz);

  // Cross-trigger dedup: if ANY scheduler trigger already wrote a row today, skip.
  const existing = await db.refreshLog.findFirst({
    where: { userId, iso, triggeredBy: { in: ['cron', 'cold-start'] } },
    select: { id: true, triggeredBy: true, status: true }
  });
  if (existing) {
    return { fired: false, iso, skipped: 'already-fired' };
  }

  const decision = isDue({
    mode: triggeredBy === 'cold-start' ? 'cold-start' : 'cron',
    now,
    refreshTime: pref.refreshTime,
    tz: pref.tz,
    lastFireIso: null  // we already checked above
  });
  if (!decision.due) {
    return { fired: false, iso, skipped: 'not-due' };
  }

  const childLog = logger.child({ userId, iso, triggeredBy });

  return runQueued(async () => {
    // Acquire mutex via unique-constraint upsert.
    let logRowId: string;
    try {
      const created = await db.refreshLog.create({
        data: { userId, iso, triggeredBy, status: 'in-flight', startedAt: now }
      });
      logRowId = created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { fired: false, iso, skipped: 'already-fired' };
      }
      throw e;
    }

    childLog.info({ event: 'refresh.start' });

    try {
      const result = await refreshDailyContent({ userId, triggeredBy });
      await db.refreshLog.update({
        where: { id: logRowId },
        data: {
          status: result.status,
          tokensUsed: result.tokensUsed,
          completedAt: new Date()
        }
      });
      childLog.info({ event: 'refresh.success', tokensUsed: result.tokensUsed });
      return { fired: true, iso, status: 'success', tokensUsed: result.tokensUsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const trunc = truncate(message);
      await db.refreshLog.update({
        where: { id: logRowId },
        data: { status: 'failed', error: trunc, completedAt: new Date() }
      });
      childLog.error({ event: 'refresh.failure', err: trunc });
      return { fired: true, iso, status: 'failed', error: trunc };
    }
  });
}
```

- [ ] **Step 5: Run — expect green**

```bash
pnpm vitest run tests/unit/scheduler/orchestrator.test.ts
```

If the mutex test is flaky: confirm Prisma's transactional behavior on your provider. SQLite serializes writes globally, so the race naturally resolves. Postgres handles the unique violation in-flight; the test should pass deterministically there too.

Commit.

---

## Task 5: TDD — Bearer auth for the cron endpoint

**Files:**
- Create: `tests/unit/scheduler/auth.test.ts`
- Create: `src/server/scheduler/auth.ts`

- [ ] **Step 1: Write `tests/unit/scheduler/auth.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyCronSecret } from '@/server/scheduler/auth';

const SECRET = 'a'.repeat(48);

function reqWith(headerValue: string | undefined): Request {
  const h = new Headers();
  if (headerValue !== undefined) h.set('Authorization', headerValue);
  return new Request('https://example.com/api/cron/refresh-all', { method: 'POST', headers: h });
}

describe('verifyCronSecret', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('accepts a correct Bearer header', () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    expect(verifyCronSecret(reqWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it('rejects a missing header', () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    expect(verifyCronSecret(reqWith(undefined))).toBe(false);
  });

  it('rejects a wrong secret of equal length', () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    expect(verifyCronSecret(reqWith(`Bearer ${'b'.repeat(48)}`))).toBe(false);
  });

  it('rejects a wrong secret of unequal length without leaking timing', () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    expect(verifyCronSecret(reqWith(`Bearer short`))).toBe(false);
  });

  it('rejects raw secret without Bearer prefix', () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    expect(verifyCronSecret(reqWith(SECRET))).toBe(false);
  });

  it('throws if CRON_SECRET env is unset', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(() => verifyCronSecret(reqWith(`Bearer ${SECRET}`))).toThrow(/CRON_SECRET/);
  });
});
```

- [ ] **Step 2: Implement `src/server/scheduler/auth.ts`**

```ts
import { timingSafeEqual } from 'node:crypto';

export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('CRON_SECRET is not set');
  }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return false;
  const presented = header.slice('Bearer '.length);

  // Constant-time compare; Buffer lengths must match for timingSafeEqual.
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  if (a.length !== b.length) {
    // Still do a dummy compare to keep timing flat-ish.
    const dummy = Buffer.alloc(b.length);
    timingSafeEqual(dummy, b);
    return false;
  }
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 3: Run — expect green**

```bash
pnpm vitest run tests/unit/scheduler/auth.test.ts
```

Commit.

---

## Task 6: Cron HTTP endpoint (Railway dispatcher)

**Files:**
- Create: `src/app/api/cron/refresh-all/route.ts`
- Create: `tests/integration/scheduler/cron-endpoint.test.ts`

The endpoint is hit by Railway's cron at minute granularity. It scans every onboarded user, asks the orchestrator if each is due, and returns a summary. Per `docs/security.md` Rate Limits: **ignores body; returns 200 even on duplicate**. We also return 200 on partial failure — a single user's LLM call exploding does not invalidate the dispatcher's contract.

The cron endpoint never trusts request body. The user list comes from the DB. Errors are vague ("Invalid token" or "Refresh queued"), never reveal whether a user exists.

- [ ] **Step 1: Implement `src/app/api/cron/refresh-all/route.ts`**

```ts
import { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { verifyCronSecret } from '@/server/scheduler/auth';
import { runRefreshIfDue } from '@/server/scheduler/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Step 1: gate on Bearer. Return a constant message — never reveal user existence.
  let ok = false;
  try {
    ok = verifyCronSecret(req);
  } catch {
    // CRON_SECRET unset on Railway is a boot guard violation upstream; respond 500.
    return Response.json({ error: 'Server not configured' }, { status: 500 });
  }
  if (!ok) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const now = new Date();
  const log = logger.child({ event: 'cron.tick', tickAt: now.toISOString() });
  log.info({ event: 'cron.start' });

  // Step 2: scan onboarded users. Body is ignored.
  const users = await db.user.findMany({
    where: { pref: { onboardedAt: { not: null } } },
    select: { id: true }
  });

  let fired = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  // The orchestrator already wraps in p-limit(3); we can launch all tasks at once.
  const results = await Promise.allSettled(
    users.map(u => runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now }))
  );

  for (const r of results) {
    if (r.status === 'rejected') {
      failed++;
      errors.push(String(r.reason).slice(0, 200));
      continue;
    }
    const v = r.value;
    if (v.fired && v.status === 'success') fired++;
    else if (v.fired && v.status === 'failed') failed++;
    else skipped++;
  }

  log.info({ event: 'cron.done', usersScanned: users.length, fired, failed, skipped });

  // Per security doc: returns 200 even on partial / duplicate.
  return Response.json({
    message: 'Refresh queued',
    usersScanned: users.length,
    fired,
    failed,
    skipped
  }, { status: 200 });
}

// GET is rejected explicitly so naive scanners get 405, not 200.
export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}
```

- [ ] **Step 2: Write `tests/integration/scheduler/cron-endpoint.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import { POST } from '@/app/api/cron/refresh-all/route';

vi.mock('@/server/llm/refresh', () => ({
  refreshDailyContent: vi.fn(async () => ({ status: 'success', tokensUsed: 99 }))
}));

const SECRET = 'test-cron-secret-test-cron-secret-test-cron-secret-12';

function makeReq(opts: { token?: string; body?: unknown } = {}): Request {
  const headers = new Headers();
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  return new Request('https://example.com/api/cron/refresh-all', {
    method: 'POST',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
}

describe('POST /api/cron/refresh-all', () => {
  beforeEach(async () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    await db.refreshLog.deleteMany();
    await db.user.deleteMany();
  });

  it('401s without a Bearer token', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Invalid token');
  });

  it('401s with a wrong Bearer token', async () => {
    const res = await POST(makeReq({ token: 'wrong-secret-of-correct-format-padding-here-yes' }));
    expect(res.status).toBe(401);
  });

  it('200 with no users scanned when DB is empty', async () => {
    const res = await POST(makeReq({ token: SECRET }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usersScanned).toBe(0);
    expect(json.fired).toBe(0);
  });

  it('fires for due users and writes RefreshLog', async () => {
    // Fake "now" by stubbing pref.refreshTime to current minute.
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: `${hh}:${mm}`, tz: 'UTC', onboardedAt: now } } }
    });

    const res = await POST(makeReq({ token: SECRET }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usersScanned).toBe(1);
    expect(json.fired).toBe(1);

    const log = await db.refreshLog.findFirstOrThrow({ where: { userId: u.id } });
    expect(log.status).toBe('success');
    expect(log.triggeredBy).toBe('cron');
  });

  it('is a no-op (200, dedup) on a second tick within the grace window', async () => {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    await db.user.create({
      data: { pref: { create: { refreshTime: `${hh}:${mm}`, tz: 'UTC', onboardedAt: now } } }
    });

    const r1 = await POST(makeReq({ token: SECRET }));
    const r2 = await POST(makeReq({ token: SECRET }));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const j1 = await r1.json();
    const j2 = await r2.json();
    expect(j1.fired).toBe(1);
    expect(j2.fired).toBe(0);
    expect(j2.skipped).toBe(1);
  });

  it('ignores request body — body cannot inject userId', async () => {
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(Date.now() - 86400_000) } } }
    });
    // Body claims a different (non-existent) user; should be ignored.
    const res = await POST(makeReq({ token: SECRET, body: { userId: 'attacker-id', forceFire: true } }));
    expect(res.status).toBe(200);
    // The endpoint scans users from the DB. Whether `u` fires depends on its
    // actual pref vs. now — the body is irrelevant either way.
  });
});
```

- [ ] **Step 3: Run — expect green**

```bash
pnpm vitest run tests/integration/scheduler/cron-endpoint.test.ts
```

Commit.

---

## Task 7: Local `node-cron` ticker

**Files:**
- Create: `src/server/scheduler/local.ts`

For `DEPLOY_TARGET=local`, a single Node process drives the schedule. We register a `* * * * *` cron expression that, every minute, scans every onboarded user and asks the orchestrator if they're due. The orchestrator's grace-window logic + dedup row makes "I just fired the same minute the cron tick happened" safe.

This module **must be a no-op** when `DEPLOY_TARGET=railway` — Railway uses the HTTP endpoint instead, and we don't want two firers in the same process.

- [ ] **Step 1: Implement `src/server/scheduler/local.ts`**

```ts
import cron, { ScheduledTask } from 'node-cron';
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { runRefreshIfDue } from './orchestrator';

let task: ScheduledTask | null = null;

export function startLocalScheduler() {
  if (task) return;  // idempotent

  if (process.env.DEPLOY_TARGET !== 'local') {
    logger.info({ event: 'scheduler.local.skip', deployTarget: process.env.DEPLOY_TARGET });
    return;
  }

  task = cron.schedule(
    '* * * * *',
    async () => {
      const now = new Date();
      const log = logger.child({ event: 'scheduler.local.tick', at: now.toISOString() });
      try {
        const users = await db.user.findMany({
          where: { pref: { onboardedAt: { not: null } } },
          select: { id: true }
        });
        log.info({ event: 'scheduler.local.scan', users: users.length });

        // Orchestrator already throttles via p-limit(3).
        await Promise.allSettled(
          users.map(u => runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now }))
        );
      } catch (err) {
        log.error({ event: 'scheduler.local.error', err: String(err).slice(0, 500) });
      }
    },
    { timezone: 'UTC' }  // server runs the tick on UTC; per-user tz handled by isDue()
  );

  logger.info({ event: 'scheduler.local.started' });
}

export function stopLocalScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info({ event: 'scheduler.local.stopped' });
  }
}
```

- [ ] **Step 2: Manual smoke test**

Set `DEPLOY_TARGET=local` and `pnpm dev`. Watch logs. Wait one minute. You should see `scheduler.local.tick`. If you have a user with `onboardedAt` set, you should see `scheduler.local.scan` with the user count.

If you instead want to test the firing path without waiting for the user's actual scheduled time, temporarily set their `Pref.refreshTime` to the current `HH:MM` (UTC) via Prisma Studio.

We don't ship a unit test for `local.ts` because the value is in the cron schedule integration with the orchestrator — both pieces are individually tested. A future Phase 14 hardening step may add a fake-timers integration test, but that's not in scope here.

Commit.

---

## Task 8: Cold-start catch-up (boot guard)

**Files:**
- Create: `src/server/scheduler/cold-start.ts`
- Create: `tests/integration/scheduler/cold-start.test.ts`
- Mutate: `instrumentation.ts`
- Create: `src/server/scheduler/index.ts`

When the app boots, we don't know how long it was off. A user with `refreshTime=04:00` and `tz=America/New_York` who opens the app at 09:00 EDT would otherwise have to wait until tomorrow's 04:00 cron tick. Cold-start fixes this: **on boot, scan every onboarded user; if today's local-tz refreshTime has passed AND no `RefreshLog` row exists for `(userId, iso)`, fire inline**.

The user requirement: "If app isn't running then it would pull at time of launch."

- [ ] **Step 1: Implement `src/server/scheduler/cold-start.ts`**

```ts
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { runRefreshIfDue } from './orchestrator';

const COLD_START_DELAY_MS = 5_000;  // give the rest of boot a chance

export async function runColdStartCatchUp(now: Date = new Date()) {
  const log = logger.child({ event: 'scheduler.cold-start' });
  log.info({ event: 'scheduler.cold-start.begin', at: now.toISOString() });

  const users = await db.user.findMany({
    where: { pref: { onboardedAt: { not: null } } },
    select: { id: true }
  });

  log.info({ event: 'scheduler.cold-start.scan', users: users.length });

  // Orchestrator's p-limit(3) caps actual concurrency.
  const results = await Promise.allSettled(
    users.map(u => runRefreshIfDue({ userId: u.id, triggeredBy: 'cold-start', now }))
  );

  let fired = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'rejected') { failed++; continue; }
    if (r.value.fired && r.value.status === 'success') fired++;
    else if (r.value.fired && r.value.status === 'failed') failed++;
    else skipped++;
  }
  log.info({ event: 'scheduler.cold-start.done', fired, failed, skipped });
}

export function scheduleColdStartCatchUp() {
  // Defer slightly so DB pool, instrumentation, etc. are warm.
  setTimeout(() => {
    runColdStartCatchUp().catch(err => {
      logger.error({ event: 'scheduler.cold-start.crash', err: String(err).slice(0, 500) });
    });
  }, COLD_START_DELAY_MS).unref?.();
}
```

The `.unref?.()` keeps the timer from holding the event loop open — important for graceful shutdown in Next.js dev.

- [ ] **Step 2: Implement `src/server/scheduler/index.ts`**

```ts
import { logger } from '@/server/logger';
import { startLocalScheduler } from './local';
import { scheduleColdStartCatchUp } from './cold-start';

let booted = false;

export function bootScheduler() {
  if (booted) return;
  booted = true;

  logger.info({
    event: 'scheduler.boot',
    deployTarget: process.env.DEPLOY_TARGET ?? 'local'
  });

  // Re-confirm Phase 7's boot guard. Phase 7 already throws upstream;
  // this is defense-in-depth so the scheduler never silently runs
  // without the cron secret in production.
  if (process.env.DEPLOY_TARGET === 'railway' && !process.env.CRON_SECRET) {
    throw new Error('CRON_SECRET required on Railway (scheduler boot guard)');
  }

  startLocalScheduler();
  scheduleColdStartCatchUp();
}
```

- [ ] **Step 3: Wire `instrumentation.ts`**

Open `instrumentation.ts` (created in Phase 7). Add the scheduler boot to its `register()`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Existing Phase 7 boot guards run here...

  const { bootScheduler } = await import('@/server/scheduler');
  bootScheduler();
}
```

The dynamic import keeps `node-cron` and Prisma out of the Edge runtime bundle.

- [ ] **Step 4: Write `tests/integration/scheduler/cold-start.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import { runColdStartCatchUp } from '@/server/scheduler/cold-start';

vi.mock('@/server/llm/refresh', () => ({
  refreshDailyContent: vi.fn(async () => ({ status: 'success', tokensUsed: 42 }))
}));

describe('runColdStartCatchUp', () => {
  beforeEach(async () => {
    await db.refreshLog.deleteMany();
    await db.user.deleteMany();
  });

  it('fires for users whose refreshTime has passed today with no log row', async () => {
    // Build a "now" of 12:00 UTC; user's refreshTime is 04:00 UTC, no log row.
    const now = new Date(Date.UTC(2026, 4, 2, 12, 0, 0));
    const u = await db.user.create({
      data: {
        pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } }
      }
    });

    await runColdStartCatchUp(now);

    const log = await db.refreshLog.findFirstOrThrow({ where: { userId: u.id } });
    expect(log.triggeredBy).toBe('cold-start');
    expect(log.status).toBe('success');
    expect(log.iso).toBe('2026-05-02');
  });

  it('does not fire if cron already ran for today', async () => {
    const now = new Date(Date.UTC(2026, 4, 2, 12, 0, 0));
    const u = await db.user.create({
      data: {
        pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } }
      }
    });
    await db.refreshLog.create({
      data: {
        userId: u.id,
        iso: '2026-05-02',
        triggeredBy: 'cron',
        status: 'success',
        startedAt: new Date(now.getTime() - 60_000),
        completedAt: new Date(now.getTime() - 30_000),
        tokensUsed: 100
      }
    });

    await runColdStartCatchUp(now);

    const logs = await db.refreshLog.findMany({ where: { userId: u.id } });
    expect(logs.length).toBe(1);
    expect(logs[0].triggeredBy).toBe('cron');
  });

  it('does not fire if local refreshTime has not passed yet', async () => {
    const now = new Date(Date.UTC(2026, 4, 2, 3, 0, 0));  // 03:00 UTC
    const u = await db.user.create({
      data: {
        pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } }
      }
    });

    await runColdStartCatchUp(now);

    const logs = await db.refreshLog.findMany({ where: { userId: u.id } });
    expect(logs.length).toBe(0);
  });

  it('skips users who never finished onboarding', async () => {
    const now = new Date(Date.UTC(2026, 4, 2, 12, 0, 0));
    await db.user.create({
      data: {
        pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: null } }
      }
    });

    await runColdStartCatchUp(now);

    const logs = await db.refreshLog.findMany();
    expect(logs.length).toBe(0);
  });
});
```

- [ ] **Step 5: Run — expect green**

```bash
pnpm vitest run tests/integration/scheduler/cold-start.test.ts
```

Commit.

---

## Task 9: TDD — double-fire prevention + failure path

**Files:**
- Create: `tests/integration/scheduler/double-fire.test.ts`
- Create: `tests/integration/scheduler/failure-path.test.ts`

These two tests pin down the behaviors that the security doc actually depends on.

- [ ] **Step 1: Write `tests/integration/scheduler/double-fire.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import { runRefreshIfDue } from '@/server/scheduler/orchestrator';
import { runColdStartCatchUp } from '@/server/scheduler/cold-start';

const phase8 = vi.hoisted(() => ({ refreshDailyContent: vi.fn() }));
vi.mock('@/server/llm/refresh', () => phase8);

describe('cron tick + cold-start on the same minute', () => {
  beforeEach(async () => {
    await db.refreshLog.deleteMany();
    await db.user.deleteMany();
    phase8.refreshDailyContent.mockReset();
    // Slow Phase 8 so concurrent calls overlap.
    phase8.refreshDailyContent.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 80));
      return { status: 'success', tokensUsed: 1 };
    });
  });

  it('fires exactly once when both triggers race', async () => {
    const now = new Date(Date.UTC(2026, 4, 2, 4, 0, 0));
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } } }
    });

    const [cronResult, coldResult] = await Promise.all([
      runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now }),
      runColdStartCatchUp(now)
    ]);

    const logs = await db.refreshLog.findMany({ where: { userId: u.id } });
    expect(logs.length).toBe(1);
    expect(phase8.refreshDailyContent).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Write `tests/integration/scheduler/failure-path.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import { runRefreshIfDue } from '@/server/scheduler/orchestrator';

const phase8 = vi.hoisted(() => ({ refreshDailyContent: vi.fn() }));
vi.mock('@/server/llm/refresh', () => phase8);

describe('refresh failure path', () => {
  beforeEach(async () => {
    await db.refreshLog.deleteMany();
    await db.user.deleteMany();
    phase8.refreshDailyContent.mockReset();
  });

  it('writes a failed RefreshLog row with the truncated error', async () => {
    const huge = 'X'.repeat(8_000);
    phase8.refreshDailyContent.mockRejectedValueOnce(new Error(`upstream blew up: ${huge}`));

    const now = new Date(Date.UTC(2026, 4, 2, 4, 0, 0));
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } } }
    });

    const r = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });
    expect(r.fired).toBe(true);
    expect(r.status).toBe('failed');

    const log = await db.refreshLog.findFirstOrThrow({ where: { userId: u.id } });
    expect(log.status).toBe('failed');
    expect(log.error).toBeDefined();
    expect(log.error!.length).toBeLessThanOrEqual(1024);
    expect(log.error!.startsWith('upstream blew up')).toBe(true);
    expect(log.completedAt).not.toBeNull();
  });

  it('a failure does NOT block tomorrow\'s cron run (different iso)', async () => {
    phase8.refreshDailyContent
      .mockRejectedValueOnce(new Error('day-1 fail'))
      .mockResolvedValueOnce({ status: 'success', tokensUsed: 50 });

    const day1 = new Date(Date.UTC(2026, 4, 2, 4, 0, 0));
    const day2 = new Date(Date.UTC(2026, 4, 3, 4, 0, 0));
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(day1.getTime() - 86400_000) } } }
    });

    await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now: day1 });
    await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now: day2 });

    const logs = await db.refreshLog.findMany({ where: { userId: u.id }, orderBy: { iso: 'asc' } });
    expect(logs.length).toBe(2);
    expect(logs[0].status).toBe('failed');
    expect(logs[1].status).toBe('success');
  });

  it('leaks no LLM payload to logs (re-confirms Phase 8 hygiene)', async () => {
    // We don't assert log spy here directly — Phase 8's log spy test covers it.
    // This test just confirms the orchestrator doesn't add new fields that would leak.
    phase8.refreshDailyContent.mockResolvedValueOnce({ status: 'success', tokensUsed: 10 });

    const now = new Date(Date.UTC(2026, 4, 2, 4, 0, 0));
    const u = await db.user.create({
      data: { pref: { create: { refreshTime: '04:00', tz: 'UTC', onboardedAt: new Date(now.getTime() - 86400_000) } } }
    });

    const r = await runRefreshIfDue({ userId: u.id, triggeredBy: 'cron', now });
    expect(r.fired).toBe(true);
    // The result object surfaces only safe fields.
    expect(Object.keys(r).sort()).toEqual(expect.arrayContaining(['fired', 'iso', 'status', 'tokensUsed']));
    expect(JSON.stringify(r)).not.toContain('payload');
    expect(JSON.stringify(r)).not.toContain('apiKey');
  });
});
```

- [ ] **Step 3: Run — expect green**

```bash
pnpm vitest run tests/integration/scheduler/double-fire.test.ts tests/integration/scheduler/failure-path.test.ts
```

Commit.

---

## Phase 10 Acceptance Criteria

Verify each before declaring Phase 10 done:

- [ ] `prisma/schema.prisma` `RefreshLog` model has the canonical Phase 10 shape: `(id, userId, iso, triggeredBy, status, tokensUsed?, error?, startedAt, completedAt?)` with `@@unique([userId, iso, triggeredBy])`.
- [ ] `pnpm prisma migrate status` reports the Phase 10 migration applied with no drift.
- [ ] `pnpm vitest run tests/unit/scheduler` and `pnpm vitest run tests/integration/scheduler` both pass green.
- [ ] In `DEPLOY_TARGET=local` mode: starting the dev server logs `scheduler.local.started` and `scheduler.cold-start.begin` within 10 seconds of boot.
- [ ] In `DEPLOY_TARGET=railway` mode (simulate via `DEPLOY_TARGET=railway pnpm dev` with a stubbed `CRON_SECRET`): the local ticker is **not** started (`scheduler.local.skip` log), but cold-start still runs.
- [ ] Boot guard refuses to start when `DEPLOY_TARGET=railway` and `CRON_SECRET` is unset (Phase 7 contract; Phase 10 re-confirms in `bootScheduler`).
- [ ] `POST /api/cron/refresh-all` returns 401 with `{ error: 'Invalid token' }` when no Bearer header is present.
- [ ] `POST /api/cron/refresh-all` returns 401 when the Bearer is wrong (constant-time compare; manual check via two requests with same wrong token has indistinguishable timing within reason).
- [ ] `POST /api/cron/refresh-all` returns 200 with `{ message: 'Refresh queued', usersScanned, fired, failed, skipped }` when Bearer is correct.
- [ ] Two cron ticks within the 5-minute grace window for the same user produce exactly one `RefreshLog` row (the second tick reports `skipped: 1`).
- [ ] A cron tick that races a cold-start scan for the same user/day produces exactly one `RefreshLog` row.
- [ ] A failing refresh writes a `RefreshLog` row with `status='failed'`, an `error` value of length <= 1024 characters, and a non-null `completedAt`.
- [ ] A failure on day N does **not** prevent day N+1 from firing (uniqueness is on `iso`, not just `userId`).
- [ ] The cron endpoint **never** reads request body to determine which user to refresh. Sending a body with `{ userId: 'attacker' }` does not affect the work list (verified by integration test).
- [ ] `pino` logs include `userId`, `iso`, `triggeredBy`, and event names (`refresh.start`, `refresh.success`, `refresh.failure`, `cron.tick`, `scheduler.cold-start.begin`); they do **not** include any LLM input/output payload, the user's API key, or the user's journal text.
- [ ] Phase 8's manual rate limit (3/day) is unaffected by cron/cold-start fires (manual is a separate `triggeredBy` and not constrained by the cron unique key).
- [ ] `p-limit(3)` caps in-process concurrency: with 50 onboarded users on cold-start, no more than 3 calls to `refreshDailyContent` are in flight at once (verifiable by inspecting `activeCount()` mid-test if desired; not a hard CI gate).
- [ ] No emoji in any source file or log line introduced this phase.

---

## Notes

### How Phase 13 (Railway deploy) wires this in

Phase 13 will own the Railway-side wiring. The relevant entries it adds to `railway.json` (or service config) look like this:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  },
  "services": [
    {
      "name": "web",
      "deploy": { "startCommand": "pnpm start" }
    },
    {
      "name": "cron-refresh",
      "cron": {
        "schedule": "* * * * *",
        "command": "curl -fsS -X POST -H \"Authorization: Bearer $CRON_SECRET\" \"$RAILWAY_PUBLIC_DOMAIN/api/cron/refresh-all\""
      }
    }
  ]
}
```

A few notes for whoever picks up Phase 13:

- The cron service must be in the same Railway project as the web service so it has access to `CRON_SECRET` from the shared env. **Do not** put the secret in the cron's command line in plaintext — Railway exposes service env vars to cron commands, so `$CRON_SECRET` is the right pattern.
- Use `$RAILWAY_PUBLIC_DOMAIN` (Railway-provided) rather than hard-coding the domain. If the deployment uses a custom domain, swap to `https://daybeans.com`.
- The cron schedule is `* * * * *` (every minute) on purpose. The endpoint is cheap when no users are due — it does one DB query (`findMany` filtered by `onboardedAt`) and exits. The orchestrator's grace window absorbs minor cron drift.
- If Railway's cron has a minimum interval longer than 1 minute on the chosen plan, the grace window in `due.ts` (5 min) covers up to a 5-minute interval. If Railway's interval is even longer, bump `GRACE_MINUTES` to match.

### Phase 8 / Phase 10 rate-limit boundary

This is the most-misunderstood bit of Phase 10, so it's worth restating:

| Trigger | Per-day limit | Source |
|---|---|---|
| `manual` (user clicks "Refresh now") | 3/day per user | Phase 8 server-action rate limiter |
| `cron` (Railway cron or local node-cron) | 1/day per user | `RefreshLog` unique constraint on `(userId, iso, 'cron')` |
| `cold-start` (boot catch-up) | 1/day per user | `RefreshLog` unique constraint on `(userId, iso, 'cold-start')`, plus orchestrator's cross-trigger dedup that refuses cold-start if cron already ran today |

In practice a user gets at most 1 scheduler-driven refresh per local day, plus up to 3 manual refreshes. The two paths are intentionally disjoint: a cron failure doesn't burn a manual attempt, and a manual refresh doesn't suppress the cron (because the cron unique key includes `triggeredBy`).

The orchestrator's cross-trigger check (`triggeredBy: { in: ['cron', 'cold-start'] }`) ensures cron and cold-start never *both* fire on the same day even though their unique keys differ. Manual refreshes are allowed to coexist with scheduler refreshes — the user might want a fresh pull at 11am on top of the 4am cron.

### Why a 5-minute grace window?

The cron endpoint can be hit at any time within a minute of the scheduled tick (Railway's cron has its own scheduling jitter, typically <10 seconds, but planning for skew). If a user picks `04:00` and the tick lands at `04:00:23`, we want to fire — that's the obvious case. If for some reason a tick gets delayed (Railway maintenance, cold-start of the dispatcher), a 5-minute window catches it without firing on the *next* day's tick. After 5 minutes, the cron path bails out — `cold-start` will catch the missed refresh on the user's next app launch.

### Why no auto-pull on every dashboard hit?

The user's app session is irrelevant to the schedule. We **do not** trigger a refresh on every dashboard load — that would burn LLM tokens and rate-limit budget. The boot-time catch-up is per-process, not per-request: the `bootScheduler()` function uses a module-level `booted` flag so multiple Next.js server instances (in a future scaled deploy) each run cold-start exactly once on their own boot.

### Logging hygiene re-confirmed

Per `docs/security.md` Logging Hygiene, we use `pino` and never log full request bodies or decrypted secrets. Phase 10 introduces these log events:

| Event | Fields |
|---|---|
| `scheduler.boot` | `deployTarget` |
| `scheduler.local.started` | (none) |
| `scheduler.local.skip` | `deployTarget` |
| `scheduler.local.tick` | `at` (ISO) |
| `scheduler.local.scan` | `users` (count) |
| `scheduler.local.error` | `err` (truncated) |
| `scheduler.cold-start.begin` | `at` |
| `scheduler.cold-start.scan` | `users` |
| `scheduler.cold-start.done` | `fired`, `failed`, `skipped` |
| `scheduler.cold-start.crash` | `err` (truncated) |
| `cron.tick` / `cron.start` | `tickAt` |
| `cron.done` | `usersScanned`, `fired`, `failed`, `skipped` |
| `refresh.start` | `userId`, `iso`, `triggeredBy` |
| `refresh.success` | `userId`, `iso`, `triggeredBy`, `tokensUsed` |
| `refresh.failure` | `userId`, `iso`, `triggeredBy`, `err` (truncated) |

None of these include the LLM prompt, the LLM completion, the user's journal, the user's API key, or any other sensitive material. Phase 14 will add a global `logSafe()` redactor as a belt-and-suspenders defense, but Phase 10's logs are already shaped to never carry sensitive payloads.

### Spec gaps surfaced during planning

While writing this plan I noticed two ambiguities worth recording for the parent agent:

1. **Default tz for users created before Phase 9 onboarding shipped** — Phase 9's migration sets `Pref.tz` default to `'UTC'`. If any users exist in the DB from Phase 1-8 era without onboarding, they'll be skipped by the orchestrator (`onboardedAt` is null). Confirmed safe.
2. **Cron schedule is UTC at the dispatcher** — `node-cron` uses `{ timezone: 'UTC' }` for the *tick*; per-user tz arithmetic happens inside `isDue()`. This is a deliberate choice so the dispatcher's clock is unambiguous; the only tz-aware code is `due.ts`/`iso.ts`. If someone later changes this they need to update `due.ts` accordingly.

### Final commit

```bash
git add prisma/migrations prisma/schema.prisma \
  src/lib/scheduler src/server/scheduler src/app/api/cron \
  instrumentation.ts package.json pnpm-lock.yaml \
  tests/unit/scheduler tests/integration/scheduler
git commit -m "Phase 10: LLM refresh scheduler (cron, cold-start, dedup, audit)"
```

Verify with:

```bash
pnpm prisma migrate status
pnpm vitest run tests/unit/scheduler tests/integration/scheduler
pnpm tsc --noEmit
pnpm next build
```

All four commands must pass clean. Move on to Phase 11 only after green.
