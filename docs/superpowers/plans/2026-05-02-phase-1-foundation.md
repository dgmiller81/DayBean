# Phase 1 — Project Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Next.js + Prisma + SQLite + Tailwind project that renders the 4-tab dashboard shell (no panel content yet) with the spec §3.3 design tokens, working theme toggle, and a Prisma schema that mirrors spec §6 storage.

**Deploy target this phase:** `local` only. Postgres/Railway support is added in Phase 13 — the schema is written so the provider can be flipped via tooling without restructuring.

**Architecture:** Next.js 15 App Router with Server Components for the shell and a Client Component for the theme toggle. CSS variables from the spec live in `globals.css` (no Tailwind translation yet — fidelity first). Prisma drives a SQLite file (`prisma/dev.db`). All later phases extend this foundation; Phase 1 ships nothing user-visible past the shell.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind v4, Prisma 5, SQLite, Vitest, pnpm.

---

## File Structure (created in this phase)

| File | Purpose |
|---|---|
| `package.json` | Project manifest |
| `tsconfig.json` | TypeScript config |
| `next.config.ts` | Next.js config (strict mode, Turbopack) |
| `tailwind.config.ts` | Tailwind config with content globs only — tokens stay in CSS |
| `postcss.config.mjs` | PostCSS for Tailwind |
| `prisma/schema.prisma` | Initial DB schema (User, Goal, Task, Day, Click, Pref) |
| `prisma/seed.ts` | Default goals seed (spec §7.1) |
| `.env.example` | Env var template |
| `.env` | Local env (gitignored) |
| `.gitignore` | Standard Node + Next + Prisma ignores |
| `src/styles/globals.css` | Spec §3.3 CSS variables + base styles |
| `src/app/layout.tsx` | Root layout — fonts, html data-theme, body grid |
| `src/app/page.tsx` | Dashboard shell — topbar, hero, tabs, 4 empty panels |
| `src/app/loading.tsx` | Boot fallback |
| `src/components/primitives/ThemeToggle.tsx` | Client component — flips light/dark |
| `src/components/primitives/StreakPill.tsx` | Topbar streak badge (placeholder text "0") |
| `src/components/Topbar.tsx` | Brand + streak + theme toggle |
| `src/components/Hero.tsx` | Greeting + date |
| `src/components/Tabs.tsx` | 4-tab nav, persists active tab to cookie |
| `src/components/panels/MindfulnessPanel.tsx` | Placeholder card |
| `src/components/panels/BusinessPanel.tsx` | Placeholder card |
| `src/components/panels/PersonalPanel.tsx` | Placeholder card |
| `src/components/panels/OverviewPanel.tsx` | Placeholder card |
| `src/lib/dates.ts` | `todayISO()`, `friendlyDate()` |
| `src/server/db.ts` | Prisma client singleton |
| `src/types/index.ts` | Shared TS types |
| `tests/unit/dates.test.ts` | Smoke tests for date helpers |
| `tests/unit/theme-toggle.test.tsx` | Smoke test for the theme toggle |
| `vitest.config.ts` | Vitest config |
| `README.md` | How to run locally |

---

## Task 1: Initialize repo and install Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `pnpm-lock.yaml`

- [ ] **Step 1: Initialize git and pnpm**

Run:
```bash
cd H:/personal/thedailymind
git init
pnpm init
```

Expected: `package.json` created with default fields and `.git/` directory initialized.

- [ ] **Step 2: Install Next.js, React, TypeScript**

Run:
```bash
pnpm add next@15 react@19 react-dom@19
pnpm add -D typescript @types/react @types/react-dom @types/node eslint eslint-config-next
```

Expected: `node_modules/` populated; `package.json` shows `next`, `react`, `react-dom` in `dependencies`.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};

export default config;
```

- [ ] **Step 5: Add scripts to `package.json`**

Patch the `"scripts"` field to:
```json
{
  "scripts": {
    "dev": "next dev -p 4111",
    "build": "next build",
    "start": "next start -p 4111",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force"
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
out/
.env
.env.*.local
prisma/dev.db
prisma/dev.db-journal
.DS_Store
coverage/
*.log
```

- [ ] **Step 7: Verify dev server boots**

Run:
```bash
pnpm dev
```

Expected: server starts on `http://localhost:4111`. Stop with Ctrl+C. (Page will 404 since we haven't built `src/app/page.tsx` yet — that's fine; we just want Next to recognize the project.)

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 15 + TypeScript project"
```

---

## Task 2: Install Tailwind v4 and PostCSS

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`, `src/styles/globals.css`

- [ ] **Step 1: Install Tailwind**

Run:
```bash
pnpm add -D tailwindcss@4 @tailwindcss/postcss postcss
```

- [ ] **Step 2: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 3: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
};

export default config;
```

- [ ] **Step 4: Create `src/styles/globals.css` with spec §3.3 tokens (verbatim)**

```css
@import "tailwindcss";

:root {
  --bg:#f5f2ec; --bg-grad-1:#f7f3ec; --bg-grad-2:#ebe7df;
  --surface:rgba(255,255,255,0.74); --surface-solid:#fff; --surface-2:#fafaf6;
  --ink:#1a1f1c; --ink-soft:#5a655e; --ink-muted:#8a948d;
  --line:rgba(35,50,42,0.08); --line-strong:rgba(35,50,42,0.16);

  --sage:#5d7a6c; --sage-deep:#3e5a4d; --sage-soft:#dde6df;
  --gold:#b08d57; --gold-soft:#e8dec9; --rose:#c97b6e;
  --accent:#c2410c;
  --accent-soft:#fef0e6;

  --paper:#f4ead8; --paper-2:#ede0c4;
  --paper-ink:#3a2e1c; --paper-line:#c9b48a;

  --shadow-sm:0 1px 2px rgba(20,30,25,.04),0 2px 8px rgba(20,30,25,.04);
  --shadow-md:0 2px 4px rgba(20,30,25,.05),0 12px 32px rgba(20,30,25,.06);
  --radius:18px; --radius-sm:10px;
}

[data-theme="dark"] {
  --bg:#131614; --bg-grad-1:#161a18; --bg-grad-2:#0e110f;
  --surface:rgba(28,33,30,0.72); --surface-solid:#1c211e; --surface-2:#20251f;
  --ink:#ece7da; --ink-soft:#a8b1aa; --ink-muted:#6f7872;
  --line:rgba(236,231,218,0.08); --line-strong:rgba(236,231,218,0.18);
  --sage:#95b3a2; --sage-deep:#b8d3c3; --sage-soft:rgba(149,179,162,0.15);
  --gold:#d3b070; --gold-soft:rgba(211,176,112,0.18);
  --accent:#f97316; --accent-soft:#2d1d10;
  --paper:#1f1a12; --paper-2:#251f15;
  --paper-ink:#e8dcbf; --paper-line:#5a4626;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
}

body {
  background-image:
    radial-gradient(1200px 600px at 12% -10%, rgba(93,122,108,.10), transparent 60%),
    radial-gradient(1000px 500px at 110% 0%, rgba(176,141,87,.10), transparent 50%),
    linear-gradient(180deg, var(--bg-grad-1) 0%, var(--bg-grad-2) 100%);
  background-attachment: fixed;
  min-height: 100vh;
}

.serif { font-family: var(--font-fraunces), Georgia, "Times New Roman", serif; }

.app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 28px 100px;
}

.card {
  background: var(--surface-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  transition: box-shadow .2s ease;
}
.card:hover { box-shadow: var(--shadow-md); }

.sec-dot {
  display:inline-block; width:8px; height:8px; border-radius:999px;
  margin-right:8px; vertical-align:1px; flex-shrink:0;
}
.sec-mindfulness { background: var(--sage); }
.sec-business    { background: var(--accent); }
.sec-personal    { background: var(--gold); }
.sec-general     { background: var(--ink-muted); }

.ic    { width:16px; height:16px; flex-shrink:0; vertical-align:-2px; }
.ic-sm { width:12px; height:12px; }
.ic-lg { width:20px; height:20px; }
```

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs src/styles/globals.css package.json pnpm-lock.yaml
git commit -m "feat: add tailwind v4 + spec design tokens to globals.css"
```

---

## Task 3: Wire fonts and root layout

**Files:**
- Create: `src/app/layout.tsx`, `src/app/loading.tsx`, `src/lib/dates.ts`

- [ ] **Step 1: Create `src/lib/dates.ts`**

```ts
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function friendlyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Create `tests/unit/dates.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { todayISO, friendlyDate } from "@/lib/dates";

describe("dates", () => {
  it("todayISO produces YYYY-MM-DD", () => {
    expect(todayISO(new Date("2026-05-02T15:00:00"))).toBe("2026-05-02");
  });

  it("friendlyDate formats as Weekday Month D, YYYY", () => {
    expect(friendlyDate("2026-05-02")).toMatch(/Saturday/);
    expect(friendlyDate("2026-05-02")).toMatch(/May 2, 2026/);
  });
});
```

- [ ] **Step 3: Install Vitest and configure**

Run:
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/node
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run the dates test, verify it passes**

Run:
```bash
pnpm test tests/unit/dates.test.ts
```

Expected: 2 passing.

- [ ] **Step 5: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Daily Mind",
  description: "A daily snapshot for spiritual, professional, and personal growth.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = (await cookies()).get("mm_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme} className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create `src/app/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <div className="app">
      <p style={{ color: "var(--ink-muted)", textAlign: "center", marginTop: "20vh" }}>
        Loading…
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/loading.tsx src/lib/dates.ts tests/ vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: root layout with Fraunces+Inter and theme cookie + dates helper"
```

---

## Task 4: Add Prisma + SQLite schema (mirroring spec §6)

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/server/db.ts`, `.env`, `.env.example`

- [ ] **Step 1: Install Prisma**

Run:
```bash
pnpm add -D prisma tsx
pnpm add @prisma/client
```

- [ ] **Step 2: Create `.env.example` and `.env`**

`.env.example`:
```
# Deploy target: 'local' or 'railway'. Boot guard refuses unsafe combos with AUTH_MODE.
DEPLOY_TARGET="local"

# DB (Phase 1 = sqlite). Phase 13 swaps to postgres for railway target.
DATABASE_URL="file:./dev.db"

# 32-byte base64 key — generate with: openssl rand -base64 32
APP_ENCRYPTION_KEY="REPLACE_WITH_32_BYTE_BASE64_KEY"

# Auth: 'none' | 'simple' | 'full'. Phase 1 uses 'none'. Phase 7 enables the others.
AUTH_MODE="none"

# Required when AUTH_MODE=full. Generate: openssl rand -base64 32
AUTH_SECRET=""

# Phase 10 scheduler. Required on railway.
CRON_SECRET=""
```

`.env` (copy of example with a real key — generate with `openssl rand -base64 32`):
```
DATABASE_URL="file:./dev.db"
APP_ENCRYPTION_KEY="<run: openssl rand -base64 32>"
AUTH_MODE="local-single"
```

- [ ] **Step 3: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())

  goals       Goal[]
  tasks       Task[]
  days        Day[]
  clicks      Click[]
  prefs       Pref?
}

model Pref {
  id          String  @id @default(cuid())
  userId      String  @unique
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme       String  @default("light")  // 'light' | 'dark' (extended in Phase 11)
  filter      String  @default("all")    // 'all' | 'mindfulness' | 'business' | 'personal'
  jobTitle    String?
  interests   String?                    // JSON array of strings
  faith       String?                    // 'christian' | 'jewish' | 'muslim' | 'spiritual' | 'none' | custom
  scripturePref String?                  // 'kjv' | 'niv' | etc; null when faith is 'none'
}

model Goal {
  id        String   @id            // 'g_god', 'g_min_<ts>'
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  section   String                  // 'mindfulness' | 'business' | 'personal'
  title     String
  type      String                  // 'check' | 'count' | 'time'
  target    Int
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, section])
}

model Task {
  id          String   @id          // 't_<ts>'
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  section     String                // 'general' | 'mindfulness' | 'business' | 'personal'
  done        Boolean  @default(false)
  createdAt   DateTime @default(now())
  completedOn String?               // ISO date

  @@index([userId, done])
}

model Day {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  iso        String                 // 'YYYY-MM-DD'
  goalsJson  String   @default("{}")   // map goalId -> boolean | number
  notes      String   @default("")
  healthJson String   @default("{}")   // { slept, moved, ate }
  disconnect Int      @default(0)
  win        String   @default("")
  finJson    String   @default("{}")   // { net, cash, invest }

  @@unique([userId, iso])
}

model Click {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  iso          String                  // 'YYYY-MM-DD'
  section      String                  // 'mindfulness' | 'business' | 'personal'
  count        Int      @default(0)

  @@unique([userId, iso, section])
}
```

- [ ] **Step 4: Create the migration**

Run:
```bash
pnpm db:migrate -- --name init
pnpm db:generate
```

Expected: `prisma/migrations/<timestamp>_init/` directory, `prisma/dev.db` file, Prisma Client generated.

- [ ] **Step 5: Create `src/server/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;
```

- [ ] **Step 6: Create `prisma/seed.ts` with default goals (spec §7.1)**

```ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const DEFAULTS: Array<{ id: string; section: string; title: string; type: string; target: number }> = [
  { id: "g_god", section: "mindfulness", title: "Time with God / prayer", type: "check", target: 1 },
  { id: "g_meditate", section: "mindfulness", title: "Meditate (5+ minutes)", type: "check", target: 1 },
  { id: "g_present_kids", section: "mindfulness", title: "Be fully present with my kids", type: "check", target: 1 },
  { id: "g_family", section: "mindfulness", title: "Connect with family or a friend", type: "check", target: 1 },
  { id: "g_no_overcommit", section: "mindfulness", title: "Said no to something I should have", type: "check", target: 1 },
  { id: "g_selfless", section: "mindfulness", title: "One selfless act today", type: "check", target: 1 },
  { id: "g_walk", section: "mindfulness", title: "Walk the dogs without my phone", type: "check", target: 1 },
  { id: "g_mf_read", section: "mindfulness", title: "Read 1 mindfulness article", type: "count", target: 1 },
  { id: "g_learn", section: "business", title: "Continuous improvement — read 3+ AI articles", type: "count", target: 3 },
  { id: "g_strategy", section: "business", title: "30 min on AI strategy & competitive scanning", type: "check", target: 1 },
  { id: "g_customer", section: "business", title: "Talk to a customer (call, email, shadow)", type: "check", target: 1 },
  { id: "g_product", section: "business", title: "Move the top product bet forward by one step", type: "check", target: 1 },
  { id: "g_team", section: "business", title: "Unblock or coach one teammate", type: "check", target: 1 },
  { id: "g_demos", section: "business", title: "Try one new AI tool / model / agent", type: "check", target: 1 },
  { id: "g_money", section: "personal", title: "Check finances", type: "check", target: 1 },
  { id: "g_move", section: "personal", title: "Move 30 minutes", type: "check", target: 1 },
  { id: "g_disconnect", section: "personal", title: "Disconnect 60 minutes", type: "time", target: 60 },
  { id: "g_writing", section: "personal", title: "Write something (memo, doc, post, journal)", type: "check", target: 1 },
  { id: "g_per_read", section: "personal", title: "Read 1 self-help / motivation article", type: "count", target: 1 },
];

async function main() {
  // Single-user local default
  const user = await db.user.upsert({
    where: { id: "local-default" },
    update: {},
    create: { id: "local-default", name: "You" },
  });

  await db.pref.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  for (const g of DEFAULTS) {
    await db.goal.upsert({
      where: { id: `${user.id}::${g.id}` },
      update: {},
      create: {
        id: `${user.id}::${g.id}`,
        userId: user.id,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
    });
  }

  console.log("Seeded default user + goals.");
}

main().finally(() => db.$disconnect());
```

> **Why the composite goal id (`userId::g_god`)?** Spec uses bare `g_god` ids, but the DB needs them globally unique across users. Resolution: store as `${userId}::${specId}` in `Goal.id`; UI/server actions strip the prefix when comparing against the spec's special-case ids (`g_mf_read`, `g_per_read`, `g_learn`, `g_disconnect`).

- [ ] **Step 7: Run seed**

Run:
```bash
pnpm db:seed
```

Expected: log `Seeded default user + goals.` and a row count visible via `pnpm prisma studio` (optional check).

- [ ] **Step 8: Commit**

```bash
git add prisma/ src/server/db.ts .env.example package.json pnpm-lock.yaml
git commit -m "feat: prisma schema + sqlite + default goals seed"
```

---

## Task 5: Build the dashboard shell

**Files:**
- Create: `src/app/page.tsx`, `src/components/Topbar.tsx`, `src/components/Hero.tsx`, `src/components/Tabs.tsx`, `src/components/panels/*Panel.tsx`, `src/components/primitives/StreakPill.tsx`, `src/components/primitives/ThemeToggle.tsx`

- [ ] **Step 1: Create `src/components/primitives/ThemeToggle.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState<"light" | "dark">(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `mm_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      style={{
        background: "var(--surface-solid)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--ink)",
      }}
    >
      {theme === "light" ? (
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/primitives/StreakPill.tsx`**

```tsx
export function StreakPill({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--gold-soft)",
        color: "var(--gold)",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      <svg className="ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 2c1 4 4 6 4 10a4 4 0 1 1-8 0c0-2 1-3 1-5-2 1-3 3-3 5a6 6 0 0 0 12 0c0-5-4-7-6-10z" />
      </svg>
      <span>{count}</span>
    </span>
  );
}
```

- [ ] **Step 3: Create `src/components/Topbar.tsx`**

```tsx
import { ThemeToggle } from "./primitives/ThemeToggle";
import { StreakPill } from "./primitives/StreakPill";

export function Topbar({ theme, name }: { theme: "light" | "dark"; name: string }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
          The Daily Mind
        </span>
        <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>· for {name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <StreakPill count={0} />
        <ThemeToggle initial={theme} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create `src/components/Hero.tsx`**

```tsx
import { friendlyDate } from "@/lib/dates";

export function Hero({ name, iso, sub }: { name: string; iso: string; sub?: string }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
        Good morning, {name}
      </h1>
      <p className="serif" style={{ color: "var(--ink-soft)", margin: "6px 0 0", fontSize: 18 }}>
        {friendlyDate(iso)}
      </p>
      {sub ? (
        <p style={{ color: "var(--ink-muted)", margin: "8px 0 0", fontSize: 14 }}>{sub}</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Create the four placeholder panel components**

Each in `src/components/panels/`:

`MindfulnessPanel.tsx`:
```tsx
export function MindfulnessPanel() {
  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MINDFULNESS
      </div>
      <h2 className="serif" style={{ fontSize: "1.35rem", fontWeight: 500, margin: "8px 0 0" }}>
        Coming in Phase 3
      </h2>
      <p style={{ color: "var(--ink-muted)", marginTop: 8 }}>
        God card, scripture preview, reflections, journal, mindfulness goals, breath practice.
      </p>
    </div>
  );
}
```

`BusinessPanel.tsx`, `PersonalPanel.tsx`, `OverviewPanel.tsx`: same shape, different eyebrow + body text referencing their phase numbers (4, 4, 5).

- [ ] **Step 6: Create `src/components/Tabs.tsx`**

```tsx
"use client";
import { useState } from "react";
import { MindfulnessPanel } from "./panels/MindfulnessPanel";
import { BusinessPanel } from "./panels/BusinessPanel";
import { PersonalPanel } from "./panels/PersonalPanel";
import { OverviewPanel } from "./panels/OverviewPanel";

type Tab = "mindfulness" | "business" | "personal" | "overview";

const TABS: Array<{ id: Tab; label: string; eyebrow: string; dotClass: string }> = [
  { id: "mindfulness", label: "Mindfulness", eyebrow: "Stillpoint", dotClass: "sec-mindfulness" },
  { id: "business",    label: "Business / AI", eyebrow: "Pulse", dotClass: "sec-business" },
  { id: "personal",    label: "Personal", eyebrow: "Compass", dotClass: "sec-personal" },
  { id: "overview",    label: "Goals Overview", eyebrow: "All-up", dotClass: "sec-general" },
];

export function Tabs({ initial = "mindfulness" }: { initial?: Tab }) {
  const [active, setActive] = useState<Tab>(initial);
  return (
    <>
      <div
        role="tablist"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          margin: "0 0 24px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => {
              setActive(t.id);
              document.cookie = `mm_tab=${t.id}; path=/; max-age=31536000; SameSite=Lax`;
            }}
            className="card"
            style={{
              cursor: "pointer",
              padding: "14px 16px",
              textAlign: "left",
              outline: active === t.id ? "2px solid var(--sage)" : "none",
              outlineOffset: -2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={`sec-dot ${t.dotClass}`} />
              <span style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
                {t.eyebrow.toUpperCase()}
              </span>
            </div>
            <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>
      <section>
        {active === "mindfulness" && <MindfulnessPanel />}
        {active === "business" && <BusinessPanel />}
        {active === "personal" && <PersonalPanel />}
        {active === "overview" && <OverviewPanel />}
      </section>
    </>
  );
}
```

- [ ] **Step 7: Create `src/app/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { Topbar } from "@/components/Topbar";
import { Hero } from "@/components/Hero";
import { Tabs } from "@/components/Tabs";
import { todayISO } from "@/lib/dates";
import { db } from "@/server/db";

export default async function Page() {
  const c = await cookies();
  const theme: "light" | "dark" = c.get("mm_theme")?.value === "dark" ? "dark" : "light";
  const tab = (c.get("mm_tab")?.value as "mindfulness" | "business" | "personal" | "overview" | undefined) ?? "mindfulness";

  // Single-user local default — Phase 7 generalizes this
  const user = await db.user.findUnique({ where: { id: "local-default" } });
  const name = user?.name ?? "Friend";

  return (
    <main className="app">
      <Topbar theme={theme} name={name} />
      <Hero name={name} iso={todayISO()} sub="A fresh page." />
      <Tabs initial={tab} />
      <footer
        className="serif"
        style={{
          marginTop: 48,
          textAlign: "center",
          color: "var(--ink-muted)",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        I am here. I am enough. I am loved. I am loving.
        <br />
        I am exactly where I need to be.
      </footer>
    </main>
  );
}
```

- [ ] **Step 8: Run dev server, verify shell renders**

Run:
```bash
pnpm dev
```

Open `http://localhost:4111`. Verify:
- Page renders without errors
- Topbar shows brand, "0" streak pill, and theme toggle
- Greeting + today's date in serif
- 4 tabs visible; clicking each swaps the panel
- Theme toggle flips light↔dark; the body background, surfaces, and ink colors change immediately
- Refreshing the page preserves the theme (cookie set)

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: dashboard shell — topbar, hero, 4-tab nav, theme toggle"
```

---

## Task 6: Theme toggle smoke test

**Files:**
- Create: `tests/unit/theme-toggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";

describe("ThemeToggle", () => {
  it("starts at the initial theme and flips on click", () => {
    const { getByRole } = render(<ThemeToggle initial="light" />);
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Run the test, verify it passes**

Run:
```bash
pnpm test tests/unit/theme-toggle.test.tsx
```

Expected: 1 passing.

- [ ] **Step 3: Run full test suite**

Run:
```bash
pnpm test
```

Expected: all tests pass (3 total).

- [ ] **Step 4: Commit**

```bash
git add tests/unit/theme-toggle.test.tsx
git commit -m "test: theme toggle flips data-theme attribute"
```

---

## Task 7: README and final smoke

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# The Daily Mind

A daily snapshot dashboard for spiritual, professional, and personal growth.

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

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Run Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed default user + goals |
| `pnpm db:reset` | Drop and re-seed the DB |

## Structure

See [`docs/superpowers/plans/2026-05-02-master-roadmap.md`](docs/superpowers/plans/2026-05-02-master-roadmap.md).
```

- [ ] **Step 2: Final verification**

Run:
```bash
pnpm install
pnpm db:reset           # drops, migrates, runs seed
pnpm test
pnpm build              # production build must succeed
```

Expected:
- `pnpm install` clean
- `pnpm db:reset` shows "Seeded default user + goals."
- `pnpm test` reports 3 passing
- `pnpm build` succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with quick start"
```

---

## Phase 1 Acceptance Criteria

- [ ] `pnpm dev` boots the dashboard at `http://localhost:4111`
- [ ] Topbar shows brand "The Daily Mind", a streak pill (showing 0), and a working theme toggle
- [ ] Theme toggle flips `<html data-theme>` between `light` and `dark` and persists via cookie
- [ ] Hero shows greeting + today's date in serif (Fraunces) — falls back gracefully if Google Fonts blocked
- [ ] 4-tab nav renders, each tab card has the correct section dot and eyebrow
- [ ] Clicking a tab swaps the panel; the selection persists across reloads (cookie)
- [ ] Each panel is a placeholder card naming the phase that fills it
- [ ] Closing affirmation (spec §14.5) renders in the footer
- [ ] Prisma schema migrates clean; `pnpm db:seed` creates `local-default` user, default Pref, and 19 default goals
- [ ] `pnpm test` passes (dates + theme-toggle smoke tests)
- [ ] `pnpm build` succeeds with strict TS, no `any`
- [ ] No emoji anywhere in the codebase (spec §3.4)
- [ ] All design tokens from spec §3.3 present verbatim in `globals.css`

When all boxes are checked, Phase 1 is done. Move to Phase 2 (data layer): write `phase-2-data-layer.md` immediately before starting it.
