# Phase 9 — Onboarding Flow + LM Studio Bundle Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first-run onboarding wizard that gathers identity (name + roles), content interests, spiritual prefs, starter goals, LLM provider choice (with optional LM Studio detection/bootstrap), and the daily refresh schedule (time + IANA timezone). The wizard persists progress to the database (no client localStorage), gates every dashboard request behind `Pref.onboardedAt`, and hands control to Phase 10's scheduler via `Pref.refreshTime` and `Pref.tz`.

**Deploy target this phase:** `local` and `railway`. The onboarding flow is identical on both; the LM Studio step is auto-disabled when `DEPLOY_TARGET=railway` (since `lms` cannot run inside Railway's container).

**Architecture:**

- A first-run **middleware gate** (`src/middleware.ts`) inspects the authenticated session's `Pref.onboardedAt`. If null and the route is not exempt (`/api/*`, `/_next/*`, `/onboarding/*`, `/login`, `/signup`, `/auth/*`, static assets), it 307-redirects to `/onboarding`. Already-onboarded users hitting `/onboarding` are bounced to `/`.
- **Wizard layout** is a Server Component (`src/app/onboarding/layout.tsx`) that loads the user's current `Pref` row, computes the next pending step, and renders a stepper chrome. Each step is its own route (`/onboarding/hello`, `/roles`, `/interests`, `/faith`, `/goals`, `/llm`, `/schedule`, `/done`) so deep-linking and browser back/forward behave correctly.
- **Inputs are Client Component islands** (chips, radios, time picker) embedded inside Server Component layouts. Mutations go through **server actions** that resolve the user via `requireUserId()` (Phase 7's contract), validate with Zod, and write to `Pref` + `User` + `Goal`.
- **State persistence**: progress is written eagerly. On every "Continue" click the action saves both the field values AND `Pref.onboardingStep` (smallint 1..8). A page refresh resumes the wizard at the last saved step. The final step sets `Pref.onboardedAt` and clears the redirect.
- **LLM provider step** writes through Phase 8's encrypted `LlmCredential` save action. API keys never touch this phase's code in plaintext; the wizard hands the key string to the existing Phase 8 `saveLlmCredential()` server action and only reads back the redacted shape (`{ provider, last4 }`).
- **LM Studio bootstrap** is a Node script invoked via a server action. The action spawns a Node child process (no shell), captures stdout, parses the JSON contract, and surfaces the result to the client. The script itself uses `execFileSync` with explicit argv when calling `lms` so there is zero shell-injection surface even though v1 inputs are constants.
- **Schedule step** captures `refreshTime` (`HH:MM`, default `04:00`) and `tz` (IANA, autodetected via `Intl.DateTimeFormat().resolvedOptions().timeZone` in the browser, validated server-side against the IANA list shipped by Node's `Intl.supportedValuesOf('timeZone')`). Phase 10 reads these and schedules the per-user cron.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Prisma, Zod, Vitest, Playwright (light E2E), Node `child_process` (`execFileSync`).

**Dependency contracts assumed from earlier phases:**

| Phase | Symbol | Shape |
|---|---|---|
| 1 | `db` (Prisma client) | `import { db } from '@/server/db'` |
| 1 | `Pref` model | already has `theme`, `filter`, `interests`, `faith`, `scripturePref`, `jobTitle` |
| 2 | `addGoal()`, `removeGoal()` | server actions for goal mutation |
| 7 | `requireUserId()` | `import { requireUserId } from '@/server/auth'` — throws `UnauthorizedError` if no session |
| 8 | `saveLlmCredential({ provider, apiKey })` | server action; encrypts then stores |
| 8 | `testLlmCredential({ provider, apiKey })` | returns `{ ok: boolean, error?: string }` |
| 8 | `LlmCredential` model | `userId`, `provider`, `ciphertext`, `last4`, `createdAt` |

**Out of scope this phase:**

- The actual cron firing (Phase 10).
- OAuth provider buttons on the wizard (Phase 7 owns auth-mode UI).
- LM Studio model auto-pull — we surface a suggestion and link, never pull automatically.
- Multi-language i18n — wizard copy is English only; the spec calls for serif voice.

---

## File Structure (created in this phase)

| File | Purpose |
|---|---|
| `prisma/migrations/<ts>_add_onboarding_pref_columns/migration.sql` | Adds `onboardedAt`, `onboardingStep`, `refreshTime`, `tz`, `roles`, `defaultLlmProvider` to `Pref` |
| `prisma/schema.prisma` | (mutated) reflects the new columns |
| `src/middleware.ts` | First-run gate redirecting unfinished users to `/onboarding` |
| `src/server/onboarding/actions.ts` | Server actions for every step + finishOnboarding |
| `src/server/onboarding/lms.ts` | Wraps `scripts/setup-lms.ts` invocation; parses JSON contract |
| `src/server/onboarding/zod.ts` | Zod schemas for every step payload |
| `src/server/onboarding/state.ts` | `loadOnboardingState(userId)` + `nextRoute(step)` helpers |
| `src/app/onboarding/layout.tsx` | Server Component shell (stepper, progress dots) |
| `src/app/onboarding/page.tsx` | Server redirect to the user's next pending step |
| `src/app/onboarding/hello/page.tsx` | Step 1 — name |
| `src/app/onboarding/roles/page.tsx` | Step 2 — roles |
| `src/app/onboarding/interests/page.tsx` | Step 3 — content interests |
| `src/app/onboarding/faith/page.tsx` | Step 4 — spiritual prefs |
| `src/app/onboarding/goals/page.tsx` | Step 5 — starter goals |
| `src/app/onboarding/llm/page.tsx` | Step 6 — LLM provider |
| `src/app/onboarding/schedule/page.tsx` | Step 7 — refresh time + tz |
| `src/app/onboarding/done/page.tsx` | Step 8 — summary + finish |
| `src/components/onboarding/Stepper.tsx` | Server-rendered progress dots |
| `src/components/onboarding/ChipMulti.tsx` | Client island — multi-select chip group |
| `src/components/onboarding/RadioRow.tsx` | Client island — radio with label/help |
| `src/components/onboarding/TimePicker.tsx` | Client island — time input that also reports browser tz |
| `src/components/onboarding/HelloForm.tsx` | Client form for step 1 |
| `src/components/onboarding/RolesForm.tsx` | Client form for step 2 |
| `src/components/onboarding/InterestsForm.tsx` | Client form for step 3 |
| `src/components/onboarding/FaithForm.tsx` | Client form for step 4 |
| `src/components/onboarding/GoalsForm.tsx` | Client form for step 5 |
| `src/components/onboarding/LlmForm.tsx` | Client form for step 6 (incl. test-connection + LM Studio bootstrap) |
| `src/components/onboarding/ScheduleForm.tsx` | Client form for step 7 |
| `src/components/onboarding/DoneSummary.tsx` | Client form for step 8 (just the finish button) |
| `src/components/onboarding/SubmitButton.tsx` | Shared `useFormStatus()` button |
| `src/lib/onboarding/constants.ts` | `ROLE_OPTIONS`, `INTEREST_OPTIONS`, `FAITH_OPTIONS`, `SCRIPTURE_OPTIONS` |
| `scripts/setup-lms.ts` | Node script — detect/start LM Studio + emit JSON |
| `tests/unit/onboarding/zod.test.ts` | Validates Zod schemas |
| `tests/unit/onboarding/state.test.ts` | Validates next-step routing |
| `tests/unit/scripts/setup-lms.test.ts` | Validates argv builder is shell-free |
| `tests/integration/onboarding-flow.test.ts` | Full wizard happy path |
| `tests/integration/onboarding-skip-llm.test.ts` | Skip-LLM path leaves `LlmCredential` empty |

---

## Task 1: Migration — extend `Pref` with onboarding columns

**Files:**
- Mutate: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_add_onboarding_pref_columns/migration.sql` (auto-generated)

- [ ] **Step 1: Inspect current `Pref` shape**

Confirm Phase 1 already shipped these columns: `theme`, `filter`, `jobTitle`, `interests`, `faith`, `scripturePref`. If any are missing on the row in your local DB, the Phase 1 migration may have shipped a slimmer version — that's fine; the migration below is additive and idempotent against the columns that don't yet exist.

- [ ] **Step 2: Edit `prisma/schema.prisma` — add the new fields**

Replace the `Pref` model with:

```prisma
model Pref {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  theme               String   @default("light")
  filter              String   @default("all")
  jobTitle            String?
  interests           String?                 // JSON array of strings
  faith               String?                 // 'christian' | 'jewish' | 'muslim' | 'spiritual' | 'none'
  scripturePref       String?                 // 'kjv' | 'niv' | etc

  // Phase 9 additions
  roles               String?                 // JSON array of strings
  defaultLlmProvider  String?                 // 'openai' | 'anthropic' | 'lmstudio' | null
  refreshTime         String   @default("04:00")  // HH:MM, 24h
  tz                  String   @default("UTC")    // IANA tz, set during onboarding
  onboardingStep      Int      @default(0)        // 0..8 — last completed step
  onboardedAt         DateTime?

  @@index([onboardedAt])
}
```

- [ ] **Step 3: Generate the migration**

Run:
```bash
pnpm prisma migrate dev --name add_onboarding_pref_columns
```

Expected: `prisma/migrations/<ts>_add_onboarding_pref_columns/migration.sql` written, Prisma Client regenerated, `prisma/dev.db` patched.

- [ ] **Step 4: Verify the SQL**

Open the generated `migration.sql`. It should contain `ALTER TABLE "Pref" ADD COLUMN "roles" TEXT;` (and similar) plus the index `CREATE INDEX "Pref_onboardedAt_idx" ON "Pref"("onboardedAt");`. SQLite forbids adding NOT NULL columns without defaults — the schema above gives `refreshTime` and `tz` defaults so the migration is non-destructive.

- [ ] **Step 5: Re-run seed**

```bash
pnpm db:seed
```

Expected: `local-default` user's `Pref` row gains `refreshTime='04:00'`, `tz='UTC'`, `onboardingStep=0`, `onboardedAt=NULL`. The user is now considered "not onboarded" and the gate (Task 3) will redirect them.

> If you want the local-default user to skip onboarding for development, manually `UPDATE "Pref" SET "onboardedAt" = CURRENT_TIMESTAMP WHERE "userId" = 'local-default';` after running the integration tests once.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(onboarding): add Pref columns for onboardedAt, roles, refreshTime, tz, llm provider"
```

---

## Task 2: Constants and Zod schemas

**Files:**
- Create: `src/lib/onboarding/constants.ts`, `src/server/onboarding/zod.ts`

- [ ] **Step 1: Create `src/lib/onboarding/constants.ts`**

```ts
export const ROLE_OPTIONS = [
  "parent",
  "partner",
  "leader",
  "builder",
  "learner",
  "friend",
  "teammate",
  "customer-facing",
  "individual-contributor",
  "manager",
  "founder",
  "creative",
  "student",
  "caregiver",
] as const;

export const INTEREST_OPTIONS = [
  "ai",
  "design",
  "leadership",
  "finance",
  "history",
  "philosophy",
  "engineering",
  "product",
  "marketing",
  "psychology",
  "writing",
  "fitness",
  "parenting",
  "faith",
  "current-events",
  "science",
] as const;

export const FAITH_OPTIONS = ["christian", "jewish", "muslim", "spiritual", "none"] as const;

export const SCRIPTURE_OPTIONS = ["kjv", "niv", "esv", "nasb", "nlt", "nrsv"] as const;

export const LLM_PROVIDERS = ["openai", "anthropic", "lmstudio", "later"] as const;

export type RoleOption = (typeof ROLE_OPTIONS)[number];
export type InterestOption = (typeof INTEREST_OPTIONS)[number];
export type FaithOption = (typeof FAITH_OPTIONS)[number];
export type ScriptureOption = (typeof SCRIPTURE_OPTIONS)[number];
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const ONBOARDING_STEPS = [
  "hello",
  "roles",
  "interests",
  "faith",
  "goals",
  "llm",
  "schedule",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
```

- [ ] **Step 2: Create `src/server/onboarding/zod.ts`**

```ts
import { z } from "zod";
import {
  ROLE_OPTIONS,
  INTEREST_OPTIONS,
  FAITH_OPTIONS,
  SCRIPTURE_OPTIONS,
  LLM_PROVIDERS,
} from "@/lib/onboarding/constants";

const FREE_TEXT = z.string().trim().min(1).max(40);

export const HelloSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const RolesSchema = z.object({
  roles: z
    .array(z.union([z.enum(ROLE_OPTIONS), FREE_TEXT]))
    .min(1, "Pick at least one role")
    .max(12),
});

export const InterestsSchema = z.object({
  interests: z
    .array(z.union([z.enum(INTEREST_OPTIONS), FREE_TEXT]))
    .min(1, "Pick at least one topic")
    .max(16),
});

export const FaithSchema = z
  .object({
    faith: z.enum(FAITH_OPTIONS),
    scripturePref: z.enum(SCRIPTURE_OPTIONS).optional().nullable(),
  })
  .refine(
    (v) => v.faith === "none" || (v.faith !== "none" && v.scripturePref != null),
    { message: "Pick a scripture translation", path: ["scripturePref"] },
  );

export const GoalsSchema = z.object({
  // ids of the 19 default goals the user wants to KEEP (rest get removed)
  enabledDefaultIds: z.array(z.string().min(1)).max(64),
  // up to 3 custom check-goals
  customGoals: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        section: z.enum(["mindfulness", "business", "personal"]),
      }),
    )
    .max(3),
});

export const LlmSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("openai"),
    apiKey: z.string().min(20, "Key looks too short").max(400),
  }),
  z.object({
    provider: z.literal("anthropic"),
    apiKey: z.string().min(20, "Key looks too short").max(400),
  }),
  z.object({
    provider: z.literal("lmstudio"),
    // No key for local LM Studio. Optional endpoint override.
    endpoint: z.string().url().optional(),
  }),
  z.object({
    provider: z.literal("later"),
  }),
]);

export const ScheduleSchema = z.object({
  refreshTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)"),
  tz: z
    .string()
    .min(1)
    .max(64)
    .refine(
      (s) => {
        try {
          // Throws RangeError if invalid
          new Intl.DateTimeFormat("en-US", { timeZone: s });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Unknown IANA timezone" },
    ),
});

export type HelloInput = z.infer<typeof HelloSchema>;
export type RolesInput = z.infer<typeof RolesSchema>;
export type InterestsInput = z.infer<typeof InterestsSchema>;
export type FaithInput = z.infer<typeof FaithSchema>;
export type GoalsInput = z.infer<typeof GoalsSchema>;
export type LlmInput = z.infer<typeof LlmSchema>;
export type ScheduleInput = z.infer<typeof ScheduleSchema>;
```

- [ ] **Step 3: Write `tests/unit/onboarding/zod.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  HelloSchema,
  RolesSchema,
  FaithSchema,
  ScheduleSchema,
  LlmSchema,
} from "@/server/onboarding/zod";

describe("onboarding/zod", () => {
  it("rejects empty name", () => {
    expect(HelloSchema.safeParse({ name: "" }).success).toBe(false);
    expect(HelloSchema.safeParse({ name: "Dallas" }).success).toBe(true);
  });

  it("requires at least one role", () => {
    expect(RolesSchema.safeParse({ roles: [] }).success).toBe(false);
    expect(RolesSchema.safeParse({ roles: ["parent"] }).success).toBe(true);
    expect(RolesSchema.safeParse({ roles: ["custom-thing"] }).success).toBe(true);
  });

  it("faith=none does not require scripturePref", () => {
    expect(FaithSchema.safeParse({ faith: "none" }).success).toBe(true);
  });

  it("faith=christian requires scripturePref", () => {
    expect(FaithSchema.safeParse({ faith: "christian" }).success).toBe(false);
    expect(
      FaithSchema.safeParse({ faith: "christian", scripturePref: "kjv" }).success,
    ).toBe(true);
  });

  it("schedule rejects bad time and bad tz", () => {
    expect(ScheduleSchema.safeParse({ refreshTime: "25:00", tz: "UTC" }).success).toBe(false);
    expect(
      ScheduleSchema.safeParse({ refreshTime: "04:00", tz: "Mars/Olympus" }).success,
    ).toBe(false);
    expect(
      ScheduleSchema.safeParse({ refreshTime: "04:00", tz: "America/Chicago" }).success,
    ).toBe(true);
  });

  it("llm discriminated union enforces shape per provider", () => {
    expect(LlmSchema.safeParse({ provider: "later" }).success).toBe(true);
    expect(LlmSchema.safeParse({ provider: "openai" }).success).toBe(false);
    expect(
      LlmSchema.safeParse({ provider: "openai", apiKey: "sk-" + "x".repeat(40) }).success,
    ).toBe(true);
    expect(LlmSchema.safeParse({ provider: "lmstudio" }).success).toBe(true);
  });
});
```

- [ ] **Step 4: Run the tests, verify they pass**

Run:
```bash
pnpm test tests/unit/onboarding/zod.test.ts
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding/constants.ts src/server/onboarding/zod.ts tests/unit/onboarding/zod.test.ts
git commit -m "feat(onboarding): add option constants + Zod schemas for every wizard step"
```

---

## Task 3: First-run middleware gate

**Files:**
- Create: `src/middleware.ts`
- Create: `src/server/onboarding/state.ts`

- [ ] **Step 1: Create `src/server/onboarding/state.ts`**

```ts
import { db } from "@/server/db";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/constants";

export type OnboardingState = {
  userId: string;
  step: number;            // 0..8 — last completed step
  done: boolean;
  next: OnboardingStep;    // the step the user should land on
};

export async function loadOnboardingState(userId: string): Promise<OnboardingState> {
  const pref = await db.pref.findUnique({ where: { userId } });
  const step = pref?.onboardingStep ?? 0;
  const done = pref?.onboardedAt != null;
  const next = ONBOARDING_STEPS[Math.min(step, ONBOARDING_STEPS.length - 1)];
  return { userId, step, done, next };
}

export function nextRoute(step: number): string {
  const idx = Math.min(Math.max(step, 0), ONBOARDING_STEPS.length - 1);
  return `/onboarding/${ONBOARDING_STEPS[idx]}`;
}
```

- [ ] **Step 2: Write `tests/unit/onboarding/state.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { nextRoute } from "@/server/onboarding/state";

describe("onboarding/state", () => {
  it("nextRoute returns first step for fresh user", () => {
    expect(nextRoute(0)).toBe("/onboarding/hello");
  });
  it("nextRoute clamps to last step on overflow", () => {
    expect(nextRoute(99)).toBe("/onboarding/done");
  });
  it("nextRoute clamps to first on negative", () => {
    expect(nextRoute(-1)).toBe("/onboarding/hello");
  });
  it("nextRoute walks the wizard", () => {
    expect(nextRoute(1)).toBe("/onboarding/roles");
    expect(nextRoute(4)).toBe("/onboarding/goals");
    expect(nextRoute(6)).toBe("/onboarding/schedule");
  });
});
```

Run:
```bash
pnpm test tests/unit/onboarding/state.test.ts
```

Expected: 4 passing.

- [ ] **Step 3: Create `src/middleware.ts`**

The middleware runs in the Edge runtime, which means **no Prisma access**. We piggyback on a small companion cookie (`mm_onb`) that Phase 7's session writer must set whenever a session is issued. To keep this phase self-contained we ALSO add a server-side fallback gate inside the dashboard layout (see Step 4) — both must agree, and the layout is the source of truth.

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXEMPT_PREFIXES = [
  "/api/",
  "/_next/",
  "/onboarding",
  "/login",
  "/signup",
  "/auth/",
];

const EXEMPT_FILES = [
  "/favicon.ico",
  "/robots.txt",
  "/manifest.webmanifest",
];

function isExempt(pathname: string): boolean {
  for (const p of EXEMPT_PREFIXES) if (pathname.startsWith(p)) return true;
  for (const f of EXEMPT_FILES) if (pathname === f) return true;
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true; // any *.ext static
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isExempt(pathname)) return NextResponse.next();

  // Phase 7's session cookie. If absent, defer to Phase 7's auth middleware.
  const session = req.cookies.get("__Secure-next-auth.session-token")
    ?? req.cookies.get("next-auth.session-token")
    ?? req.cookies.get("mm_session"); // simple-mode cookie from Phase 7
  if (!session) return NextResponse.next();

  // Companion onboarded-flag cookie written by Phase 7 at session-issue time
  // and by finishOnboarding() at completion time. 1 byte of payload — pure mirror.
  const onb = req.cookies.get("mm_onb")?.value;
  if (onb === "1") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/onboarding";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Apply to every path except the static asset bypass we do inside the middleware
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

> **Why a companion cookie?** The middleware runs in the Edge runtime where Prisma is unavailable. Phase 7 owns the session cookie, but the session JWT is opaque to the Edge unless we share the secret across runtimes. The `mm_onb` cookie is a 1-byte read-only flag (`Path=/`, `Secure` on Railway, `Max-Age=31536000`) that lets the gate run cheaply. The wizard's `finishOnboarding()` sets it; logout clears it. **Phase 7 must write `mm_onb` whenever it issues a session.** If Phase 7 hasn't shipped that yet, gate the dashboard layout (Server Component) with the same check by calling `loadOnboardingState(await requireUserId())`.

- [ ] **Step 4: Add a server-side fallback gate in the dashboard layout**

In `src/app/(dash)/layout.tsx` (created by Phase 1 or Phase 7), add at the top of the Server Component:

```ts
import { redirect } from "next/navigation";
import { requireUserId } from "@/server/auth";
import { loadOnboardingState } from "@/server/onboarding/state";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const { done } = await loadOnboardingState(userId);
  if (!done) redirect("/onboarding");
  return <>{children}</>;
}
```

This is the source of truth; the middleware is an optimization. Both must agree.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/server/onboarding/state.ts tests/unit/onboarding/state.test.ts
git commit -m "feat(onboarding): first-run middleware gate + dashboard layout fallback"
```

---

## Task 4: Server actions for every wizard step

**Files:**
- Create: `src/server/onboarding/actions.ts`

- [ ] **Step 1: Create `src/server/onboarding/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth";
import {
  HelloSchema,
  RolesSchema,
  InterestsSchema,
  FaithSchema,
  GoalsSchema,
  LlmSchema,
  ScheduleSchema,
} from "./zod";
import { saveLlmCredential } from "@/server/llm/credentials";   // Phase 8 contract
import { addGoal, removeGoal } from "@/server/actions/goals";   // Phase 2 contract
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/constants";

function nextStepRoute(step: OnboardingStep): string {
  const i = ONBOARDING_STEPS.indexOf(step);
  const n = ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
  return `/onboarding/${n}`;
}

async function bumpStep(userId: string, completed: OnboardingStep) {
  const idx = ONBOARDING_STEPS.indexOf(completed);
  await db.pref.upsert({
    where: { userId },
    update: { onboardingStep: { set: Math.max(idx + 1, 1) } },
    create: { userId, onboardingStep: idx + 1 },
  });
}

export async function saveStepHello(formData: FormData) {
  const userId = await requireUserId();
  const parsed = HelloSchema.parse({ name: formData.get("name") });
  await db.user.update({ where: { id: userId }, data: { name: parsed.name } });
  await bumpStep(userId, "hello");
  redirect(nextStepRoute("hello"));
}

export async function saveStepRoles(formData: FormData) {
  const userId = await requireUserId();
  const raw = formData.getAll("role").map(String);
  const parsed = RolesSchema.parse({ roles: raw });
  await db.pref.upsert({
    where: { userId },
    update: { roles: JSON.stringify(parsed.roles) },
    create: { userId, roles: JSON.stringify(parsed.roles) },
  });
  await bumpStep(userId, "roles");
  redirect(nextStepRoute("roles"));
}

export async function saveStepInterests(formData: FormData) {
  const userId = await requireUserId();
  const raw = formData.getAll("interest").map(String);
  const parsed = InterestsSchema.parse({ interests: raw });
  await db.pref.upsert({
    where: { userId },
    update: { interests: JSON.stringify(parsed.interests) },
    create: { userId, interests: JSON.stringify(parsed.interests) },
  });
  await bumpStep(userId, "interests");
  redirect(nextStepRoute("interests"));
}

export async function saveStepFaith(formData: FormData) {
  const userId = await requireUserId();
  const faith = String(formData.get("faith") ?? "");
  const scripturePref = formData.get("scripturePref")
    ? String(formData.get("scripturePref"))
    : null;
  const parsed = FaithSchema.parse({ faith, scripturePref });
  await db.pref.upsert({
    where: { userId },
    update: { faith: parsed.faith, scripturePref: parsed.scripturePref ?? null },
    create: {
      userId,
      faith: parsed.faith,
      scripturePref: parsed.scripturePref ?? null,
    },
  });
  await bumpStep(userId, "faith");
  redirect(nextStepRoute("faith"));
}

export async function saveStepGoals(formData: FormData) {
  const userId = await requireUserId();

  const enabledDefaultIds = formData.getAll("enabled").map(String);
  const customRaw = formData.getAll("custom").map(String);
  const customGoals = customRaw
    .map((c) => {
      try {
        return JSON.parse(c) as { title: string; section: string };
      } catch {
        return null;
      }
    })
    .filter((g): g is { title: string; section: "mindfulness" | "business" | "personal" } =>
      !!g && ["mindfulness", "business", "personal"].includes(g.section ?? ""),
    );

  const parsed = GoalsSchema.parse({ enabledDefaultIds, customGoals });

  // Remove any DEFAULT goals not in the enabled set
  const allDefaults = await db.goal.findMany({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  const enabledSet = new Set(parsed.enabledDefaultIds);
  for (const g of allDefaults) {
    if (!enabledSet.has(g.id)) await removeGoal(g.id);
  }

  // Add custom goals (check-type, target=1)
  for (const c of parsed.customGoals) {
    await addGoal({
      title: c.title,
      section: c.section,
      type: "check",
      target: 1,
    });
  }

  await bumpStep(userId, "goals");
  redirect(nextStepRoute("goals"));
}

export async function saveStepLlm(formData: FormData) {
  const userId = await requireUserId();
  const provider = String(formData.get("provider") ?? "");

  const payload =
    provider === "openai" || provider === "anthropic"
      ? { provider, apiKey: String(formData.get("apiKey") ?? "") }
      : provider === "lmstudio"
      ? {
          provider: "lmstudio" as const,
          endpoint: formData.get("endpoint")
            ? String(formData.get("endpoint"))
            : undefined,
        }
      : { provider: "later" as const };

  const parsed = LlmSchema.parse(payload);

  if (parsed.provider === "openai" || parsed.provider === "anthropic") {
    // Phase 8 owns encryption — we hand the plaintext key off and never log it.
    await saveLlmCredential({ provider: parsed.provider, apiKey: parsed.apiKey });
    await db.pref.update({
      where: { userId },
      data: { defaultLlmProvider: parsed.provider },
    });
  } else if (parsed.provider === "lmstudio") {
    await db.pref.update({
      where: { userId },
      data: { defaultLlmProvider: "lmstudio" },
    });
    // No credential row — local model needs no key.
  } else {
    // 'later' — leave defaultLlmProvider null
    await db.pref.update({
      where: { userId },
      data: { defaultLlmProvider: null },
    });
  }

  await bumpStep(userId, "llm");
  redirect(nextStepRoute("llm"));
}

export async function saveStepSchedule(formData: FormData) {
  const userId = await requireUserId();
  const parsed = ScheduleSchema.parse({
    refreshTime: String(formData.get("refreshTime") ?? ""),
    tz: String(formData.get("tz") ?? ""),
  });
  await db.pref.update({
    where: { userId },
    data: { refreshTime: parsed.refreshTime, tz: parsed.tz },
  });
  await bumpStep(userId, "schedule");
  redirect(nextStepRoute("schedule"));
}

export async function finishOnboarding() {
  const userId = await requireUserId();
  await db.pref.update({
    where: { userId },
    data: { onboardedAt: new Date(), onboardingStep: ONBOARDING_STEPS.length },
  });
  // Set the companion cookie the Edge middleware reads.
  const c = await cookies();
  c.set("mm_onb", "1", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.DEPLOY_TARGET === "railway",
  });
  revalidatePath("/", "layout");
  redirect("/");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/onboarding/actions.ts
git commit -m "feat(onboarding): server actions for each wizard step + finishOnboarding"
```

---

## Task 5: `scripts/setup-lms.ts` — LM Studio detection and bootstrap

**Files:**
- Create: `scripts/setup-lms.ts`
- Create: `tests/unit/scripts/setup-lms.test.ts`

- [ ] **Step 1: Create `scripts/setup-lms.ts`**

The script is invoked by Node from the server action, never by the browser. It writes a single-line JSON object to stdout describing the result. **Every `lms` call uses `execFileSync` with explicit argv** — we deliberately avoid the shell-spawning variants, never use string concatenation, and never accept user input as a bare argument.

```ts
#!/usr/bin/env node
/* scripts/setup-lms.ts
 *
 * Detects LM Studio's `lms` CLI on PATH, optionally starts the headless server,
 * and lists locally installed models. Emits a single JSON line on stdout:
 *
 *   { detected, started, models: [], suggestion?, error? }
 *
 * Exit codes:
 *   0  — success (detected, possibly started)
 *   1  — `lms` not on PATH (printable instructions follow on stderr)
 *   2  — `lms` present but `lms server start` failed
 *   3  — unexpected error
 *
 * Security:
 *   We use execFileSync with explicit argv arrays — NEVER the shell-spawning
 *   variant, NEVER string concatenation. Even though v1 inputs are constants,
 *   this is forward-defense: if a future caller passes a model name from user
 *   input, we want zero shell surface to worry about.
 */

import { execFileSync } from "node:child_process";
import { platform } from "node:os";

type Result = {
  detected: boolean;
  started: boolean;
  models: string[];
  suggestion?: string;
  error?: string;
};

/** Build argv arrays explicitly. Inputs are constants; no shell, no quoting. */
export function lmsArgv(action: "version" | "start" | "ls"): {
  bin: string;
  args: string[];
} {
  const bin = "lms";
  switch (action) {
    case "version":
      return { bin, args: ["--version"] };
    case "start":
      return { bin, args: ["server", "start", "--port", "1234"] };
    case "ls":
      return { bin, args: ["ls"] };
  }
}

function detect(): boolean {
  try {
    const { bin, args } = lmsArgv("version");
    execFileSync(bin, args, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function start(): boolean {
  try {
    const { bin, args } = lmsArgv("start");
    // detached background; we don't tail logs.
    execFileSync(bin, args, { stdio: "pipe", timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

function listModels(): string[] {
  try {
    const { bin, args } = lmsArgv("ls");
    const out = execFileSync(bin, args, { stdio: "pipe", timeout: 5_000 }).toString(
      "utf8",
    );
    // `lms ls` prints a table; we want the model identifiers on lines 2+
    // (line 0 is a header). Be defensive: filter blank lines + comment lines.
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];
    return lines.slice(1).map((l) => l.split(/\s+/)[0]).filter(Boolean);
  } catch {
    return [];
  }
}

function emit(result: Result, code = 0): never {
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(code);
}

function installInstructions(): string {
  const os = platform();
  if (os === "darwin") return "Install LM Studio: https://lmstudio.ai (then re-run setup)";
  if (os === "win32") return "Install LM Studio: https://lmstudio.ai (then add `lms` to PATH and re-run)";
  return "Install LM Studio: https://lmstudio.ai (Linux: AppImage or .deb)";
}

function main(): void {
  try {
    if (!detect()) {
      process.stderr.write(installInstructions() + "\n");
      emit(
        {
          detected: false,
          started: false,
          models: [],
          error: "lms not on PATH",
          suggestion: installInstructions(),
        },
        1,
      );
    }

    const started = start();
    if (!started) {
      emit(
        {
          detected: true,
          started: false,
          models: [],
          error: "lms detected but `lms server start` failed",
        },
        2,
      );
    }

    const models = listModels();
    const suggestion =
      models.length === 0
        ? "Run `lms get llama-3.2-3b-instruct` to install a small starter model (~2 GB)."
        : undefined;

    emit({ detected: true, started: true, models, suggestion });
  } catch (err) {
    emit(
      {
        detected: false,
        started: false,
        models: [],
        error: (err as Error).message ?? "unknown error",
      },
      3,
    );
  }
}

if (require.main === module) main();
```

- [ ] **Step 2: Create `tests/unit/scripts/setup-lms.test.ts`**

This test asserts the **argv builder** has zero shell surface — it must return arrays of strings with no embedded spaces, semicolons, backticks, or `&` characters. We don't actually invoke `lms` (CI may not have it).

```ts
import { describe, expect, it } from "vitest";
import { lmsArgv } from "../../../scripts/setup-lms";

describe("setup-lms argv builder", () => {
  it("never produces shell metacharacters", () => {
    const dangerous = /[;&|`$()<>"'\\]/;
    for (const action of ["version", "start", "ls"] as const) {
      const { bin, args } = lmsArgv(action);
      expect(bin).toBe("lms");
      expect(dangerous.test(bin)).toBe(false);
      for (const a of args) {
        expect(typeof a).toBe("string");
        expect(dangerous.test(a)).toBe(false);
      }
    }
  });

  it("uses array form, not concatenation", () => {
    const { args } = lmsArgv("start");
    expect(args).toEqual(["server", "start", "--port", "1234"]);
  });

  it("handles every action without throwing", () => {
    expect(() => lmsArgv("version")).not.toThrow();
    expect(() => lmsArgv("start")).not.toThrow();
    expect(() => lmsArgv("ls")).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the test**

```bash
pnpm test tests/unit/scripts/setup-lms.test.ts
```

Expected: 3 passing.

- [ ] **Step 4: Create the server-side wrapper `src/server/onboarding/lms.ts`**

```ts
"use server";

import { execFileSync } from "node:child_process";
import path from "node:path";

export type LmsResult = {
  detected: boolean;
  started: boolean;
  models: string[];
  suggestion?: string;
  error?: string;
};

/**
 * Runs scripts/setup-lms.ts in a Node child process. Returns the parsed JSON
 * result. Refuses to run on Railway (no `lms` binary is available there).
 */
export async function runSetupLms(): Promise<LmsResult> {
  if (process.env.DEPLOY_TARGET === "railway") {
    return {
      detected: false,
      started: false,
      models: [],
      error: "LM Studio is only available on local installs.",
    };
  }
  const scriptPath = path.resolve(process.cwd(), "scripts/setup-lms.ts");
  try {
    const out = execFileSync(
      process.execPath,                                  // node binary, full path
      ["--import", "tsx", scriptPath],                   // tsx loader for TS
      { stdio: "pipe", timeout: 30_000 },
    ).toString("utf8");
    // The script writes one JSON line; stderr may also have install advice.
    const line = out.split(/\r?\n/).filter(Boolean).pop() ?? "{}";
    return JSON.parse(line) as LmsResult;
  } catch (err) {
    // Capture any JSON the script emitted on stdout BEFORE the non-zero exit
    const e = err as { stdout?: Buffer; message?: string };
    if (e?.stdout) {
      try {
        const line = e.stdout.toString("utf8").split(/\r?\n/).filter(Boolean).pop();
        if (line) return JSON.parse(line) as LmsResult;
      } catch {
        /* fall through */
      }
    }
    return {
      detected: false,
      started: false,
      models: [],
      error: e?.message ?? "Failed to run setup-lms",
    };
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add scripts/setup-lms.ts src/server/onboarding/lms.ts tests/unit/scripts/setup-lms.test.ts
git commit -m "feat(onboarding): scripts/setup-lms.ts (execFileSync, argv-only) + server wrapper"
```

---

## Task 6: Wizard layout, stepper, and step-1 (Hello)

**Files:**
- Create: `src/app/onboarding/layout.tsx`, `src/app/onboarding/page.tsx`, `src/app/onboarding/hello/page.tsx`
- Create: `src/components/onboarding/Stepper.tsx`, `src/components/onboarding/SubmitButton.tsx`, `src/components/onboarding/HelloForm.tsx`

- [ ] **Step 1: Create `src/components/onboarding/SubmitButton.tsx`**

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label = "Continue" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: "var(--sage)",
        color: "white",
        border: "none",
        borderRadius: 999,
        padding: "10px 20px",
        cursor: pending ? "wait" : "pointer",
        fontWeight: 600,
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/onboarding/Stepper.tsx`**

```tsx
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants";

export function Stepper({ current }: { current: number }) {
  return (
    <ol
      aria-label="Onboarding progress"
      style={{
        display: "flex",
        gap: 6,
        listStyle: "none",
        padding: 0,
        margin: "0 0 24px",
      }}
    >
      {ONBOARDING_STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li
            key={s}
            aria-current={state === "active" ? "step" : undefined}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background:
                state === "done"
                  ? "var(--sage)"
                  : state === "active"
                  ? "var(--gold)"
                  : "var(--line)",
            }}
            title={s}
          />
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Create `src/app/onboarding/layout.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { loadOnboardingState } from "@/server/onboarding/state";
import { redirect } from "next/navigation";
import { Stepper } from "@/components/onboarding/Stepper";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const state = await loadOnboardingState(userId);
  if (state.done) redirect("/");

  return (
    <main className="app" style={{ maxWidth: 640 }}>
      <header style={{ marginBottom: 16 }}>
        <p
          style={{
            color: "var(--gold)",
            fontSize: 11,
            letterSpacing: ".16em",
            fontWeight: 600,
            margin: 0,
          }}
        >
          WELCOME
        </p>
        <h1
          className="serif"
          style={{ fontSize: 28, margin: "4px 0 0", color: "var(--ink)" }}
        >
          Let&apos;s get you set up
        </h1>
      </header>
      <Stepper current={state.step} />
      <div className="card">{children}</div>
    </main>
  );
}
```

- [ ] **Step 4: Create `src/app/onboarding/page.tsx`**

This is the bare `/onboarding` URL. It looks up the user's last completed step and forwards to the matching step page.

```tsx
import { redirect } from "next/navigation";
import { requireUserId } from "@/server/auth";
import { loadOnboardingState, nextRoute } from "@/server/onboarding/state";

export default async function OnboardingIndex() {
  const userId = await requireUserId();
  const state = await loadOnboardingState(userId);
  redirect(nextRoute(state.step));
}
```

- [ ] **Step 5: Create `src/components/onboarding/HelloForm.tsx`**

```tsx
"use client";

import { saveStepHello } from "@/server/onboarding/actions";
import { SubmitButton } from "./SubmitButton";

export function HelloForm({ defaultName }: { defaultName: string }) {
  return (
    <form action={saveStepHello} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="serif" style={{ fontSize: 18 }}>
          What should we call you?
        </span>
        <input
          name="name"
          required
          minLength={1}
          maxLength={80}
          defaultValue={defaultName}
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line-strong)",
            borderRadius: 8,
            background: "var(--surface-solid)",
            color: "var(--ink)",
            fontSize: 16,
          }}
        />
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create `src/app/onboarding/hello/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { HelloForm } from "@/components/onboarding/HelloForm";

export default async function HelloPage() {
  const userId = await requireUserId();
  const user = await db.user.findUnique({ where: { id: userId } });
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        Hello there.
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        We&apos;ll greet you by name on the dashboard each morning.
      </p>
      <HelloForm defaultName={user?.name ?? ""} />
    </>
  );
}
```

- [ ] **Step 7: Manual smoke test**

Run:
```bash
pnpm dev
```

Reset the local user to "not onboarded":
```bash
sqlite3 prisma/dev.db "UPDATE Pref SET onboardedAt=NULL, onboardingStep=0 WHERE userId='local-default';"
```

Open `http://localhost:3000`. Confirm:

- The middleware bounces you to `/onboarding`.
- `/onboarding` redirects to `/onboarding/hello`.
- The Hello form renders with the seeded name pre-filled.
- Submitting advances to `/onboarding/roles` (which doesn't exist yet — expect 404, that's fine).

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/app/onboarding/ src/components/onboarding/Stepper.tsx src/components/onboarding/SubmitButton.tsx src/components/onboarding/HelloForm.tsx
git commit -m "feat(onboarding): wizard shell, stepper, and Hello (step 1)"
```

---

## Task 7: Step 2 (Roles) and Step 3 (Interests) — multi-select chips

**Files:**
- Create: `src/components/onboarding/ChipMulti.tsx`, `src/components/onboarding/RolesForm.tsx`, `src/components/onboarding/InterestsForm.tsx`
- Create: `src/app/onboarding/roles/page.tsx`, `src/app/onboarding/interests/page.tsx`

- [ ] **Step 1: Create `src/components/onboarding/ChipMulti.tsx`**

A re-usable multi-select chip group with an "Other" free-text affordance. It is a Client Component that owns its selection state and mirrors it into hidden form fields with the given `name` so a plain `<form action={…}>` POSTs the correct array.

```tsx
"use client";

import { useState } from "react";

export function ChipMulti({
  name,
  options,
  initial = [],
  allowOther = true,
}: {
  name: string;
  options: readonly string[];
  initial?: string[];
  allowOther?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [other, setOther] = useState("");

  function toggle(opt: string) {
    setSelected((s) => (s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt]));
  }

  function addOther() {
    const v = other.trim();
    if (!v) return;
    if (!selected.includes(v)) setSelected((s) => [...s, v]);
    setOther("");
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              aria-pressed={on}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: on ? "var(--sage)" : "var(--line-strong)",
                background: on ? "var(--sage-soft)" : "var(--surface-solid)",
                color: "var(--ink)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {opt}
            </button>
          );
        })}
        {selected
          .filter((s) => !options.includes(s))
          .map((custom) => (
            <button
              key={custom}
              type="button"
              onClick={() => toggle(custom)}
              aria-pressed={true}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--gold)",
                background: "var(--gold-soft)",
                color: "var(--ink)",
                cursor: "pointer",
                fontSize: 14,
              }}
              title="Click to remove"
            >
              {custom} ×
            </button>
          ))}
      </div>

      {allowOther && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Add your own…"
            maxLength={40}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              background: "var(--surface-solid)",
              color: "var(--ink)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOther();
              }
            }}
          />
          <button
            type="button"
            onClick={addOther}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      )}

      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/onboarding/RolesForm.tsx`**

```tsx
"use client";

import { saveStepRoles } from "@/server/onboarding/actions";
import { ROLE_OPTIONS } from "@/lib/onboarding/constants";
import { ChipMulti } from "./ChipMulti";
import { SubmitButton } from "./SubmitButton";

export function RolesForm({ initial }: { initial: string[] }) {
  return (
    <form action={saveStepRoles} style={{ display: "grid", gap: 16 }}>
      <ChipMulti name="role" options={ROLE_OPTIONS} initial={initial} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/components/onboarding/InterestsForm.tsx`**

```tsx
"use client";

import { saveStepInterests } from "@/server/onboarding/actions";
import { INTEREST_OPTIONS } from "@/lib/onboarding/constants";
import { ChipMulti } from "./ChipMulti";
import { SubmitButton } from "./SubmitButton";

export function InterestsForm({ initial }: { initial: string[] }) {
  return (
    <form action={saveStepInterests} style={{ display: "grid", gap: 16 }}>
      <ChipMulti name="interest" options={INTEREST_OPTIONS} initial={initial} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/app/onboarding/roles/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { RolesForm } from "@/components/onboarding/RolesForm";

export default async function RolesPage() {
  const userId = await requireUserId();
  const pref = await db.pref.findUnique({ where: { userId } });
  const initial: string[] = pref?.roles ? JSON.parse(pref.roles) : [];
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        What roles do you spend time in?
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        We tailor reflections and goals to the hats you wear. Pick as many as fit; add your own.
      </p>
      <RolesForm initial={initial} />
    </>
  );
}
```

- [ ] **Step 5: Create `src/app/onboarding/interests/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { InterestsForm } from "@/components/onboarding/InterestsForm";

export default async function InterestsPage() {
  const userId = await requireUserId();
  const pref = await db.pref.findUnique({ where: { userId } });
  const initial: string[] = pref?.interests ? JSON.parse(pref.interests) : [];
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        What topics do you want to follow?
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        These guide which articles, repos, and quotes show up on your Business and Personal panels.
      </p>
      <InterestsForm initial={initial} />
    </>
  );
}
```

- [ ] **Step 6: Manual smoke test**

Run `pnpm dev`. Walk through Hello → Roles → Interests. Verify each step persists (refresh the page mid-flow; selections come back) and advances correctly.

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/ChipMulti.tsx src/components/onboarding/RolesForm.tsx src/components/onboarding/InterestsForm.tsx src/app/onboarding/roles/ src/app/onboarding/interests/
git commit -m "feat(onboarding): roles and interests steps with multi-select chips"
```

---

## Task 8: Step 4 (Faith) and Step 5 (Starter Goals)

**Files:**
- Create: `src/components/onboarding/RadioRow.tsx`, `src/components/onboarding/FaithForm.tsx`, `src/components/onboarding/GoalsForm.tsx`
- Create: `src/app/onboarding/faith/page.tsx`, `src/app/onboarding/goals/page.tsx`

- [ ] **Step 1: Create `src/components/onboarding/RadioRow.tsx`**

```tsx
"use client";

export function RadioRow<T extends string>({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: { value: T; label: string; help?: string }[];
  selected: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" style={{ display: "grid", gap: 8 }}>
      {options.map((o) => {
        const on = selected === o.value;
        return (
          <label
            key={o.value}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: 12,
              border: "1px solid",
              borderColor: on ? "var(--sage)" : "var(--line-strong)",
              borderRadius: 12,
              cursor: "pointer",
              background: on ? "var(--sage-soft)" : "var(--surface-solid)",
            }}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
              style={{ marginTop: 4 }}
            />
            <span>
              <span style={{ fontWeight: 600 }}>{o.label}</span>
              {o.help && (
                <span
                  style={{
                    display: "block",
                    color: "var(--ink-muted)",
                    fontSize: 13,
                  }}
                >
                  {o.help}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/onboarding/FaithForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { saveStepFaith } from "@/server/onboarding/actions";
import { FAITH_OPTIONS, SCRIPTURE_OPTIONS, type FaithOption, type ScriptureOption } from "@/lib/onboarding/constants";
import { RadioRow } from "./RadioRow";
import { SubmitButton } from "./SubmitButton";

const FAITH_LABEL: Record<FaithOption, string> = {
  christian: "Christian",
  jewish: "Jewish",
  muslim: "Muslim",
  spiritual: "Spiritual / other",
  none: "None",
};

export function FaithForm({
  initialFaith,
  initialScripture,
}: {
  initialFaith: FaithOption | null;
  initialScripture: ScriptureOption | null;
}) {
  const [faith, setFaith] = useState<FaithOption | null>(initialFaith);
  const [scripture, setScripture] = useState<ScriptureOption | null>(initialScripture);

  return (
    <form action={saveStepFaith} style={{ display: "grid", gap: 16 }}>
      <RadioRow
        name="faith"
        selected={faith}
        onChange={setFaith}
        options={FAITH_OPTIONS.map((v) => ({
          value: v,
          label: FAITH_LABEL[v],
          help:
            v === "christian"
              ? "v1 wires KJV scripture into the dashboard."
              : v !== "none"
              ? "Captured for v2; the v1 scripture engine is KJV-Christian only."
              : "Skip the scripture card on the Mindfulness panel.",
        }))}
      />

      {faith && faith !== "none" && (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            Preferred scripture translation
          </span>
          <select
            name="scripturePref"
            value={scripture ?? ""}
            onChange={(e) => setScripture(e.target.value as ScriptureOption)}
            required
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "var(--surface-solid)",
              color: "var(--ink)",
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {SCRIPTURE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/onboarding/faith/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { FaithForm } from "@/components/onboarding/FaithForm";
import type { FaithOption, ScriptureOption } from "@/lib/onboarding/constants";

export default async function FaithPage() {
  const userId = await requireUserId();
  const pref = await db.pref.findUnique({ where: { userId } });
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        Where do you place your spiritual center?
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        Optional — drives whether the daily scripture card appears.
      </p>
      <FaithForm
        initialFaith={(pref?.faith as FaithOption | undefined) ?? null}
        initialScripture={(pref?.scripturePref as ScriptureOption | undefined) ?? null}
      />
    </>
  );
}
```

- [ ] **Step 4: Create `src/components/onboarding/GoalsForm.tsx`**

This step is the most input-dense. The user can:
- toggle each of the 19 default goals on/off (default: all on)
- add up to 3 custom check-goals with title + section

```tsx
"use client";

import { useState } from "react";
import { saveStepGoals } from "@/server/onboarding/actions";
import { SubmitButton } from "./SubmitButton";

type DefaultGoal = { id: string; title: string; section: string };
type CustomDraft = { title: string; section: "mindfulness" | "business" | "personal" };

export function GoalsForm({ defaults }: { defaults: DefaultGoal[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(defaults.map((d) => d.id)));
  const [customs, setCustoms] = useState<CustomDraft[]>([]);

  function toggle(id: string) {
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function addCustom() {
    if (customs.length >= 3) return;
    setCustoms((c) => [...c, { title: "", section: "personal" }]);
  }

  function updateCustom(i: number, patch: Partial<CustomDraft>) {
    setCustoms((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function removeCustom(i: number) {
    setCustoms((c) => c.filter((_, j) => j !== i));
  }

  const sections: Array<"mindfulness" | "business" | "personal"> = [
    "mindfulness",
    "business",
    "personal",
  ];

  return (
    <form action={saveStepGoals} style={{ display: "grid", gap: 20 }}>
      {sections.map((sec) => (
        <fieldset
          key={sec}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <legend
            style={{
              fontSize: 12,
              letterSpacing: ".16em",
              color: "var(--gold)",
              fontWeight: 600,
              padding: "0 6px",
              textTransform: "uppercase",
            }}
          >
            <span className={`sec-dot sec-${sec}`} />
            {sec}
          </legend>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {defaults
              .filter((d) => d.section === sec)
              .map((d) => (
                <li key={d.id}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabled.has(d.id)}
                      onChange={() => toggle(d.id)}
                    />
                    <span style={{ color: "var(--ink)" }}>{d.title}</span>
                  </label>
                </li>
              ))}
          </ul>
        </fieldset>
      ))}

      {[...enabled].map((id) => (
        <input key={id} type="hidden" name="enabled" value={id} />
      ))}

      <section style={{ display: "grid", gap: 8 }}>
        <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
          Add up to 3 of your own
        </h3>
        {customs.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={c.title}
              maxLength={80}
              placeholder="A goal of your own"
              onChange={(e) => updateCustom(i, { title: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "var(--surface-solid)",
                color: "var(--ink)",
              }}
            />
            <select
              value={c.section}
              onChange={(e) =>
                updateCustom(i, {
                  section: e.target.value as CustomDraft["section"],
                })
              }
              style={{
                padding: "8px 10px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "var(--surface-solid)",
                color: "var(--ink)",
              }}
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeCustom(i)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line-strong)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                cursor: "pointer",
              }}
              aria-label="Remove this custom goal"
            >
              ×
            </button>
            {/* Hidden serialized JSON field — only emitted if the title is non-empty */}
            {c.title.trim() ? (
              <input
                type="hidden"
                name="custom"
                value={JSON.stringify({ title: c.title.trim(), section: c.section })}
              />
            ) : null}
          </div>
        ))}
        {customs.length < 3 && (
          <button
            type="button"
            onClick={addCustom}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px dashed var(--line-strong)",
              background: "transparent",
              color: "var(--ink-soft)",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            + add a custom goal
          </button>
        )}
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create `src/app/onboarding/goals/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { GoalsForm } from "@/components/onboarding/GoalsForm";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const defaults = await db.goal.findMany({
    where: { userId, isDefault: true },
    select: { id: true, title: true, section: true },
    orderBy: { id: "asc" },
  });
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        Pick your starter goals.
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        Defaults are on. Untoggle anything that doesn&apos;t fit; add a few of your own.
      </p>
      <GoalsForm defaults={defaults} />
    </>
  );
}
```

- [ ] **Step 6: Manual smoke**

Walk Hello → Roles → Interests → Faith → Goals. Confirm Faith hides the scripture dropdown when "None" is selected, and that toggling defaults persists across a refresh — refreshing the goals step shows whatever is currently in the goals table (the source of truth).

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/RadioRow.tsx src/components/onboarding/FaithForm.tsx src/components/onboarding/GoalsForm.tsx src/app/onboarding/faith/ src/app/onboarding/goals/
git commit -m "feat(onboarding): faith + starter-goals steps"
```

---

## Task 9: Step 6 (LLM provider) — credentials, test connection, LM Studio bootstrap

**Files:**
- Create: `src/components/onboarding/LlmForm.tsx`
- Create: `src/app/onboarding/llm/page.tsx`
- Create: `src/server/onboarding/llm-actions.ts` (thin wrappers around Phase 8's test action so the form can call them safely)

- [ ] **Step 1: Create `src/server/onboarding/llm-actions.ts`**

```ts
"use server";

import { requireUserId } from "@/server/auth";
import { testLlmCredential } from "@/server/llm/credentials";   // Phase 8
import { runSetupLms } from "./lms";

export async function testLlmConnection(formData: FormData) {
  await requireUserId();
  const provider = String(formData.get("provider") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "");
  if (provider !== "openai" && provider !== "anthropic") {
    return { ok: false, error: "Unsupported provider for test" } as const;
  }
  return await testLlmCredential({ provider, apiKey });
}

export async function bootstrapLmStudio() {
  await requireUserId();
  return await runSetupLms();
}
```

- [ ] **Step 2: Create `src/components/onboarding/LlmForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { saveStepLlm } from "@/server/onboarding/actions";
import { testLlmConnection, bootstrapLmStudio } from "@/server/onboarding/llm-actions";
import { LLM_PROVIDERS, type LlmProvider } from "@/lib/onboarding/constants";
import { RadioRow } from "./RadioRow";
import { SubmitButton } from "./SubmitButton";

const LABEL: Record<LlmProvider, { label: string; help: string }> = {
  lmstudio: {
    label: "LM Studio (local, free)",
    help: "Runs a small model on this computer. No API key, no per-token cost.",
  },
  openai: {
    label: "OpenAI",
    help: "Uses your OpenAI API key. We encrypt it at rest with AES-256-GCM.",
  },
  anthropic: {
    label: "Anthropic",
    help: "Uses your Anthropic API key. We encrypt it at rest with AES-256-GCM.",
  },
  later: {
    label: "I'll set this up later",
    help: "Skip — daily content stays manual until you wire one up in Settings.",
  },
};

type LmsResult = {
  detected: boolean;
  started: boolean;
  models: string[];
  suggestion?: string;
  error?: string;
};

export function LlmForm() {
  const [provider, setProvider] = useState<LlmProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [testStatus, setTestStatus] = useState<null | { ok: boolean; error?: string }>(null);
  const [lmsStatus, setLmsStatus] = useState<LmsResult | null>(null);
  const [pending, startTransition] = useTransition();

  function runTest() {
    if (provider !== "openai" && provider !== "anthropic") return;
    const fd = new FormData();
    fd.set("provider", provider);
    fd.set("apiKey", apiKey);
    startTransition(async () => {
      setTestStatus(null);
      const r = await testLlmConnection(fd);
      setTestStatus(r);
    });
  }

  function runLms() {
    startTransition(async () => {
      setLmsStatus(null);
      const r = await bootstrapLmStudio();
      setLmsStatus(r);
    });
  }

  return (
    <form action={saveStepLlm} style={{ display: "grid", gap: 16 }}>
      <RadioRow
        name="provider"
        selected={provider}
        onChange={setProvider}
        options={LLM_PROVIDERS.map((v) => ({
          value: v,
          label: LABEL[v].label,
          help: LABEL[v].help,
        }))}
      />

      {(provider === "openai" || provider === "anthropic") && (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {provider === "openai" ? "OpenAI API key" : "Anthropic API key"}
            </span>
            <input
              type="password"
              name="apiKey"
              required
              minLength={20}
              maxLength={400}
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-…" : "sk-ant-…"}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "var(--surface-solid)",
                color: "var(--ink)",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={runTest}
              disabled={pending || apiKey.length < 20}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--line-strong)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {pending ? "Testing…" : "Test connection"}
            </button>
            {testStatus && (
              <span
                style={{
                  fontSize: 13,
                  color: testStatus.ok ? "var(--sage-deep)" : "var(--rose)",
                }}
              >
                {testStatus.ok ? "Looks good." : testStatus.error ?? "Failed."}
              </span>
            )}
          </div>
        </div>
      )}

      {provider === "lmstudio" && (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Endpoint (optional — defaults to http://localhost:1234)
            </span>
            <input
              type="url"
              name="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:1234"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "var(--surface-solid)",
                color: "var(--ink)",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            />
          </label>
          <button
            type="button"
            onClick={runLms}
            disabled={pending}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              cursor: pending ? "wait" : "pointer",
              alignSelf: "flex-start",
            }}
          >
            {pending ? "Setting up…" : "Set up local model"}
          </button>
          {lmsStatus && (
            <div
              role="status"
              style={{
                fontSize: 13,
                padding: 10,
                borderRadius: 8,
                background: lmsStatus.detected
                  ? "var(--sage-soft)"
                  : "var(--accent-soft)",
                color: "var(--ink)",
              }}
            >
              {lmsStatus.detected ? (
                <>
                  <strong>LM Studio detected.</strong>{" "}
                  Server {lmsStatus.started ? "started" : "could not start"}.{" "}
                  {lmsStatus.models.length > 0
                    ? `Installed models: ${lmsStatus.models.join(", ")}.`
                    : null}{" "}
                  {lmsStatus.suggestion ?? null}
                </>
              ) : (
                <>
                  <strong>LM Studio not found.</strong>{" "}
                  Install it from{" "}
                  <a
                    href="https://lmstudio.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--sage-deep)", textDecoration: "underline" }}
                  >
                    lmstudio.ai
                  </a>
                  , add the <code>lms</code> CLI to your PATH, then come back.
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/onboarding/llm/page.tsx`**

```tsx
import { LlmForm } from "@/components/onboarding/LlmForm";

export default function LlmPage() {
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        Pick a model.
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        The dashboard refreshes its content with whichever model you choose. You can switch
        in Settings any time.
      </p>
      <LlmForm />
    </>
  );
}
```

- [ ] **Step 4: Manual smoke**

Restart `pnpm dev`. On the LLM step:

- Selecting OpenAI/Anthropic shows the API-key field and "Test connection" button. With a fake key the test returns an error message. With a real key (in your `.env` for testing) it succeeds.
- Selecting LM Studio shows the endpoint field and "Set up local model" button. Clicking it runs the script. If you have `lms` installed, the panel reports the result; if not, it shows the install hint.
- Selecting "I'll set this up later" submits without any further input.

- [ ] **Step 5: Commit**

```bash
git add src/server/onboarding/llm-actions.ts src/components/onboarding/LlmForm.tsx src/app/onboarding/llm/
git commit -m "feat(onboarding): LLM provider step (test connection + LM Studio bootstrap)"
```

---

## Task 10: Step 7 (Schedule) and Step 8 (Done)

**Files:**
- Create: `src/components/onboarding/TimePicker.tsx`, `src/components/onboarding/ScheduleForm.tsx`, `src/components/onboarding/DoneSummary.tsx`
- Create: `src/app/onboarding/schedule/page.tsx`, `src/app/onboarding/done/page.tsx`

- [ ] **Step 1: Create `src/components/onboarding/TimePicker.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export function TimePicker({
  defaultTime = "04:00",
  defaultTz,
}: {
  defaultTime?: string;
  defaultTz?: string;
}) {
  const [time, setTime] = useState(defaultTime);
  const [tz, setTz] = useState(defaultTz ?? "UTC");

  // Detect browser tz on mount if no defaultTz was provided
  useEffect(() => {
    if (defaultTz) return;
    try {
      const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (guessed) setTz(guessed);
    } catch {
      /* keep UTC */
    }
  }, [defaultTz]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Refresh time</span>
        <input
          type="time"
          name="refreshTime"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line-strong)",
            borderRadius: 8,
            background: "var(--surface-solid)",
            color: "var(--ink)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            width: 140,
          }}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Time zone</span>
        <input
          type="text"
          name="tz"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          required
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line-strong)",
            borderRadius: 8,
            background: "var(--surface-solid)",
            color: "var(--ink)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            maxWidth: 280,
          }}
        />
        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          IANA name (e.g. America/Chicago). We auto-detected this from your browser.
        </span>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/onboarding/ScheduleForm.tsx`**

```tsx
"use client";

import { saveStepSchedule } from "@/server/onboarding/actions";
import { TimePicker } from "./TimePicker";
import { SubmitButton } from "./SubmitButton";

export function ScheduleForm({
  defaultTime,
  defaultTz,
}: {
  defaultTime: string;
  defaultTz: string;
}) {
  return (
    <form action={saveStepSchedule} style={{ display: "grid", gap: 16 }}>
      <TimePicker defaultTime={defaultTime} defaultTz={defaultTz} />
      <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: 0 }}>
        Your model will pull tomorrow&apos;s content at this time, in your local zone. If the app
        isn&apos;t running at that moment, the refresh runs the next time you open it.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton />
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/onboarding/schedule/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { ScheduleForm } from "@/components/onboarding/ScheduleForm";

export default async function SchedulePage() {
  const userId = await requireUserId();
  const pref = await db.pref.findUnique({ where: { userId } });
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        When should we refresh?
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        4:00 a.m. is the default — it&apos;s before most people wake up. Pick whatever feels right.
      </p>
      <ScheduleForm
        defaultTime={pref?.refreshTime ?? "04:00"}
        defaultTz={pref?.tz ?? ""}
      />
    </>
  );
}
```

- [ ] **Step 4: Create `src/components/onboarding/DoneSummary.tsx`**

```tsx
"use client";

import { finishOnboarding } from "@/server/onboarding/actions";
import { SubmitButton } from "./SubmitButton";

export function DoneSummary({
  name,
  roles,
  interests,
  faith,
  scripturePref,
  refreshTime,
  tz,
  llmProvider,
  goalCount,
}: {
  name: string;
  roles: string[];
  interests: string[];
  faith: string | null;
  scripturePref: string | null;
  refreshTime: string;
  tz: string;
  llmProvider: string | null;
  goalCount: number;
}) {
  return (
    <form action={finishOnboarding} style={{ display: "grid", gap: 16 }}>
      <dl style={{ display: "grid", gap: 8, margin: 0 }}>
        <Row label="Name" value={name} />
        <Row label="Roles" value={roles.join(", ") || "—"} />
        <Row label="Topics" value={interests.join(", ") || "—"} />
        <Row
          label="Spiritual"
          value={
            faith && faith !== "none"
              ? `${faith}${scripturePref ? ` (${scripturePref.toUpperCase()})` : ""}`
              : "None"
          }
        />
        <Row label="Goals to start" value={`${goalCount}`} />
        <Row
          label="Daily refresh"
          value={`${refreshTime} ${tz}`}
        />
        <Row label="Model" value={llmProvider ?? "Manual (you can wire one in Settings)"} />
      </dl>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SubmitButton label="Take me to my dashboard" />
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <dt style={{ width: 140, color: "var(--ink-soft)", fontSize: 13 }}>{label}</dt>
      <dd style={{ margin: 0, color: "var(--ink)", fontSize: 14 }}>{value}</dd>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/onboarding/done/page.tsx`**

```tsx
import { requireUserId } from "@/server/auth";
import { db } from "@/server/db";
import { DoneSummary } from "@/components/onboarding/DoneSummary";

export default async function DonePage() {
  const userId = await requireUserId();
  const [user, pref, goals] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.pref.findUnique({ where: { userId } }),
    db.goal.count({ where: { userId } }),
  ]);

  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>
        Ready when you are.
      </h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
        Quick recap — you can change any of this from the Settings gear later.
      </p>
      <DoneSummary
        name={user?.name ?? ""}
        roles={pref?.roles ? JSON.parse(pref.roles) : []}
        interests={pref?.interests ? JSON.parse(pref.interests) : []}
        faith={pref?.faith ?? null}
        scripturePref={pref?.scripturePref ?? null}
        refreshTime={pref?.refreshTime ?? "04:00"}
        tz={pref?.tz ?? "UTC"}
        llmProvider={pref?.defaultLlmProvider ?? null}
        goalCount={goals}
      />
    </>
  );
}
```

- [ ] **Step 6: Manual smoke**

Walk the wizard end-to-end. Confirm:

- The summary screen reflects every previous selection.
- "Take me to my dashboard" sends you to `/`.
- Hitting `/onboarding` again now redirects to `/` (the layout's `state.done` short-circuit fires).
- The companion cookie `mm_onb` is `1` in DevTools (Application → Cookies).

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/TimePicker.tsx src/components/onboarding/ScheduleForm.tsx src/components/onboarding/DoneSummary.tsx src/app/onboarding/schedule/ src/app/onboarding/done/
git commit -m "feat(onboarding): schedule + done summary, finishOnboarding writes mm_onb cookie"
```

---

## Task 11: Integration tests — happy path and skip-LLM path

**Files:**
- Create: `tests/integration/onboarding-flow.test.ts`, `tests/integration/onboarding-skip-llm.test.ts`

These tests run against a real (test) SQLite DB. They invoke the server actions directly (no HTTP) and assert on the resulting DB rows. Mock `requireUserId` to return a fresh test user, and stub `saveLlmCredential` / `testLlmCredential` from Phase 8 (the `LlmCredential` table is owned by Phase 8).

- [ ] **Step 1: Add a tiny test DB helper at `tests/helpers/db.ts`**

```ts
import { execSync } from "node:child_process";
import { db } from "@/server/db";

export async function resetTestDb() {
  // Wipe and re-create — assumes DATABASE_URL points to a test file (e.g. file:./test.db).
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("Refusing to reset: DATABASE_URL must contain 'test'");
  }
  execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
  await db.user.deleteMany();
}

export async function createTestUser(id = "test-user") {
  return db.user.create({ data: { id, name: "Tester" } });
}
```

- [ ] **Step 2: Add the happy-path test `tests/integration/onboarding-flow.test.ts`**

```ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { db } from "@/server/db";
import { resetTestDb, createTestUser } from "../helpers/db";

// Mock auth resolver
vi.mock("@/server/auth", () => ({
  requireUserId: async () => "test-user",
}));

// Mock Phase 8 surface
vi.mock("@/server/llm/credentials", () => ({
  saveLlmCredential: vi.fn(async () => ({ ok: true })),
  testLlmCredential: vi.fn(async () => ({ ok: true })),
}));

// Mock redirect — we only care about side-effects
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn() }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  saveStepHello,
  saveStepRoles,
  saveStepInterests,
  saveStepFaith,
  saveStepGoals,
  saveStepLlm,
  saveStepSchedule,
  finishOnboarding,
} from "@/server/onboarding/actions";

function fd(entries: Array<[string, string]>) {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe("onboarding happy path", () => {
  beforeEach(async () => {
    await resetTestDb();
    await createTestUser("test-user");
    // Seed two default goals so we can test the "keep / drop" toggle behavior
    await db.goal.createMany({
      data: [
        { id: "test-user::g_god", userId: "test-user", section: "mindfulness", title: "Pray", type: "check", target: 1, isDefault: true },
        { id: "test-user::g_money", userId: "test-user", section: "personal", title: "Check finances", type: "check", target: 1, isDefault: true },
      ],
    });
    await db.pref.create({ data: { userId: "test-user" } });
  });

  it("walks every step and ends onboarded", async () => {
    await saveStepHello(fd([["name", "Dallas"]]));
    expect((await db.user.findUnique({ where: { id: "test-user" } }))?.name).toBe("Dallas");

    await saveStepRoles(fd([["role", "parent"], ["role", "leader"]]));
    expect(JSON.parse((await db.pref.findUnique({ where: { userId: "test-user" } }))?.roles ?? "[]")).toEqual(
      ["parent", "leader"],
    );

    await saveStepInterests(fd([["interest", "ai"], ["interest", "leadership"]]));
    expect(JSON.parse((await db.pref.findUnique({ where: { userId: "test-user" } }))?.interests ?? "[]")).toEqual(
      ["ai", "leadership"],
    );

    await saveStepFaith(fd([["faith", "christian"], ["scripturePref", "kjv"]]));
    const after4 = await db.pref.findUnique({ where: { userId: "test-user" } });
    expect(after4?.faith).toBe("christian");
    expect(after4?.scripturePref).toBe("kjv");

    // Keep g_god, drop g_money, add 1 custom
    await saveStepGoals(
      fd([
        ["enabled", "test-user::g_god"],
        ["custom", JSON.stringify({ title: "Walk dogs", section: "personal" })],
      ]),
    );
    const goals = await db.goal.findMany({ where: { userId: "test-user" } });
    expect(goals.find((g) => g.id === "test-user::g_god")).toBeDefined();
    expect(goals.find((g) => g.id === "test-user::g_money")).toBeUndefined();
    expect(goals.some((g) => g.title === "Walk dogs")).toBe(true);

    await saveStepLlm(
      fd([
        ["provider", "anthropic"],
        ["apiKey", "sk-ant-" + "x".repeat(40)],
      ]),
    );
    expect((await db.pref.findUnique({ where: { userId: "test-user" } }))?.defaultLlmProvider).toBe(
      "anthropic",
    );

    await saveStepSchedule(fd([["refreshTime", "05:30"], ["tz", "America/Chicago"]]));
    const after7 = await db.pref.findUnique({ where: { userId: "test-user" } });
    expect(after7?.refreshTime).toBe("05:30");
    expect(after7?.tz).toBe("America/Chicago");

    await finishOnboarding();
    const after8 = await db.pref.findUnique({ where: { userId: "test-user" } });
    expect(after8?.onboardedAt).toBeInstanceOf(Date);
    expect(after8?.onboardingStep).toBe(8);
  });
});
```

- [ ] **Step 3: Add the skip-LLM test `tests/integration/onboarding-skip-llm.test.ts`**

```ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { db } from "@/server/db";
import { resetTestDb, createTestUser } from "../helpers/db";

vi.mock("@/server/auth", () => ({
  requireUserId: async () => "test-user-2",
}));

const saveSpy = vi.fn(async () => ({ ok: true }));
vi.mock("@/server/llm/credentials", () => ({
  saveLlmCredential: saveSpy,
  testLlmCredential: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveStepLlm, finishOnboarding } from "@/server/onboarding/actions";

describe("onboarding — skip LLM (Later)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await createTestUser("test-user-2");
    await db.pref.create({ data: { userId: "test-user-2" } });
  });

  it("does not create an LlmCredential row when provider is 'later'", async () => {
    const fd = new FormData();
    fd.set("provider", "later");
    await saveStepLlm(fd);

    const pref = await db.pref.findUnique({ where: { userId: "test-user-2" } });
    expect(pref?.defaultLlmProvider).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();

    // Phase 8 owns LlmCredential — assert that no row was written for our user.
    const cred = await db.$queryRawUnsafe<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM LlmCredential WHERE userId = ?",
      "test-user-2",
    ).catch(() => [{ count: 0 }]); // table may not yet exist on Phase 9 dev branches
    expect(cred[0]?.count ?? 0).toBe(0);

    await finishOnboarding();
    const after = await db.pref.findUnique({ where: { userId: "test-user-2" } });
    expect(after?.onboardedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 4: Run the integration tests**

Set `DATABASE_URL=file:./test.db` for the test env (e.g. via a `tests/.env` Vitest pulls in, or in the test script). Run:

```bash
DATABASE_URL=file:./prisma/test.db pnpm test tests/integration/
```

Expected: both tests pass.

> If the LM Studio test is flaky in CI because `lms` isn't installed, no test in this file invokes it — the LM Studio path is unit-tested in `tests/unit/scripts/setup-lms.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/db.ts tests/integration/onboarding-flow.test.ts tests/integration/onboarding-skip-llm.test.ts
git commit -m "test(onboarding): integration coverage for happy path + skip-LLM path"
```

---

## Task 12: Final verification

- [ ] **Step 1: Reset and re-run everything**

```bash
pnpm prisma migrate reset --force
pnpm db:seed
sqlite3 prisma/dev.db "UPDATE Pref SET onboardedAt=NULL, onboardingStep=0 WHERE userId='local-default';"
pnpm dev
```

Walk the wizard end-to-end in the browser. Confirm:

- Every step persists across refreshes.
- The middleware bounces away from `/` while `mm_onb` is unset.
- Submitting "Take me to my dashboard" lands on `/` and the dashboard renders.
- Hitting `/onboarding` after completion redirects to `/`.

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
pnpm build
```

Expected: all tests pass, build is clean.

- [ ] **Step 3: Commit (if any final fixes)**

```bash
git add -A
git commit -m "chore: final wiring check for phase-9 onboarding"
```

---

## Phase 9 Acceptance Criteria

- [ ] Migration `add_onboarding_pref_columns` adds `onboardedAt`, `onboardingStep`, `roles`, `defaultLlmProvider`, `refreshTime`, `tz` to `Pref`.
- [ ] Server action `saveStepHello` writes `User.name` and bumps `Pref.onboardingStep` to 1.
- [ ] Server actions `saveStepRoles`, `saveStepInterests` write JSON arrays to `Pref.roles` / `Pref.interests`.
- [ ] `saveStepFaith` rejects `christian|jewish|muslim|spiritual` without a `scripturePref` (Zod fails closed).
- [ ] `saveStepGoals` removes any default goal not in `enabledDefaultIds` and adds up to 3 custom check-goals via Phase 2's `addGoal()`.
- [ ] `saveStepLlm` saves an encrypted credential through Phase 8's `saveLlmCredential()` for OpenAI/Anthropic, and writes nothing to `LlmCredential` when "later" or "lmstudio" is chosen.
- [ ] `saveStepSchedule` validates `refreshTime` against `^([01]\d|2[0-3]):[0-5]\d$` and `tz` against `Intl.DateTimeFormat`'s known list.
- [ ] `finishOnboarding` sets `Pref.onboardedAt = now()` and writes the `mm_onb=1` companion cookie that the middleware reads.
- [ ] Middleware `src/middleware.ts` redirects all non-exempt routes to `/onboarding` while `mm_onb` is unset, and is bypassed for `/api/*`, `/_next/*`, `/onboarding/*`, `/login`, `/signup`, `/auth/*`, and any path with a file extension.
- [ ] Dashboard layout has a server-side fallback gate that calls `loadOnboardingState()` and redirects if not done.
- [ ] `/onboarding` resumes at the user's last unfinished step (refresh-safe — state is server-side, no client localStorage).
- [ ] Wizard layout renders a stepper and serif-styled headings.
- [ ] All inputs are inline SVG / native HTML; no emoji anywhere.
- [ ] `scripts/setup-lms.ts` uses `execFileSync` with explicit argv arrays only — no shell, no string concatenation. Unit test enforces this.
- [ ] `scripts/setup-lms.ts` exits 1 with install instructions when `lms` is not on PATH.
- [ ] Server wrapper `runSetupLms()` returns a structured `{ detected, started, models, suggestion?, error? }` JSON shape and refuses to run when `DEPLOY_TARGET=railway`.
- [ ] LLM step's "Test connection" calls Phase 8's `testLlmCredential` and surfaces its `{ ok, error? }` result.
- [ ] Integration test `onboarding-flow.test.ts` walks all 8 steps and asserts every persisted field.
- [ ] Integration test `onboarding-skip-llm.test.ts` confirms the "Later" branch leaves `defaultLlmProvider` null and never calls `saveLlmCredential`.
- [ ] Unit test `setup-lms.test.ts` asserts the argv builder produces no shell metacharacters.
- [ ] `pnpm test` passes; `pnpm build` succeeds.

---

## Notes for the agent

**Phase 10 (scheduler) consumes this phase as follows.**

- It reads `Pref.refreshTime` (HH:MM, 24h) and `Pref.tz` (IANA) for every onboarded user (`onboardedAt IS NOT NULL`) and computes the next UTC fire-time per day.
- On boot, the scheduler queries `RefreshLog` (Phase 10 owns this table) for every onboarded user; if the last successful refresh is older than the most recent expected fire-time, it runs the refresh immediately ("cold-start catch-up") — this is exactly the behavior the user requested ("If app isn't running then it would pull at time of launch").
- In `local` deploys the scheduler uses `node-cron` keyed by `(userId, refreshTime, tz)`. In `railway` deploys a single Railway cron tick fires every minute, hits `/api/cron/refresh-all`, and the route loops over onboarded users to find which ones are due — protected by `CRON_SECRET`.
- Users who picked `defaultLlmProvider = null` ("Later") are skipped by the scheduler with a structured log line; their dashboard renders the "Configure an LLM in Settings" hint until they wire one up.

**Contract for Phase 7 (auth).** This phase requires:

- `requireUserId()` server helper that throws when no session is present (used by every server action and page in `src/app/onboarding/`).
- A non-HttpOnly companion cookie `mm_onb` written whenever a session is issued. Phase 9 sets it to `1` on `finishOnboarding()`; Phase 7 must also write the correct value (`0` for new users, `1` for already-onboarded ones) at session-issue time so the middleware gate works on every login.

**Contract for Phase 8 (settings + LLM).** This phase requires:

- `saveLlmCredential({ provider: 'openai' | 'anthropic', apiKey: string }): Promise<void>` — encrypts and stores; never logs the key.
- `testLlmCredential({ provider, apiKey }): Promise<{ ok: boolean, error?: string }>` — does a cheap echo call.
- `LlmCredential` table is owned by Phase 8; this phase only touches it indirectly through the two functions above.

**State model recap.** Onboarding state lives in three places, in this priority:

1. `Pref.onboardedAt` (boolean done flag, source of truth).
2. `Pref.onboardingStep` (0..8, last completed step — used by `/onboarding` to resume).
3. `mm_onb` cookie (Edge-readable mirror of #1, optimization only; if it disagrees with the DB, the DB wins on the next request).

**Why not localStorage?** A user who refreshes mid-wizard, opens the app on a second device, or clears local storage must not lose progress. Server-side step bookkeeping is the right call — and it's what the user explicitly requested.

**Edge cases handled by this plan.**

- User skips LLM, finishes onboarding, then later opens Settings to wire one up: Phase 8's settings page handles the post-onboarding flow; this phase only concerns first-run.
- User picks "lmstudio" but `lms` is missing: the bootstrap button surfaces an install hint; the user can still continue (since LM Studio is optional); the saved `defaultLlmProvider` is `lmstudio` and the scheduler will fail-closed with a clear log.
- User changes their mind on faith mid-wizard: re-running the step overwrites `Pref.faith` and `Pref.scripturePref`; if they switch from "christian" to "none" the scripture pref is cleared.
- User has a tz like `Asia/Kolkata` that isn't in any short list: the input is free-text validated by `Intl.DateTimeFormat` — any IANA name Node accepts is accepted here.

**Spec gaps surfaced while writing this plan.**

- The original spec §6 / §7 schema doesn't carry `roles`, `tz`, `refreshTime`, or `onboardedAt` — they originate here. Phase 10 will read them; Phase 13 (Railway deploy) needs to ensure the same migration runs against Postgres without modification (it does — the columns are vanilla `TEXT`/`INTEGER`/`DATETIME`).
- The spec describes a single user; the multi-user surface introduced in Phase 7 is what makes per-user scheduling meaningful.
- LM Studio's `lms ls` output format is not stable across versions; the parser in `scripts/setup-lms.ts` is intentionally lenient and degrades to "no models" rather than throwing.

When all acceptance boxes are checked, Phase 9 is done. Move to Phase 10 (scheduler): write `phase-10-scheduler.md` immediately before starting it.
