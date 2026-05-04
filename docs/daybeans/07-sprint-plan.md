# 07 · Sprint Plan & Multi-Agent Protocol

This is the runbook for actually building DayBeans in the **DayBean** fork, designed
so multiple AI agents (or human engineers) can work in parallel without stepping on
each other.

> **Ground rule:** every task owns specific files. No two parallel tasks may write
> to the same file. If a task needs to touch a file already owned by another, it
> blocks until the owning task merges.

---

## 7.1 The 7-sprint shape

| Sprint | Theme | Duration | Parallel-ready? |
|---|---|---|---|
| **S0 · Foundation** | Repo bootstrap, all schema migrations, type contracts, brand-token scaffold, cron infra stub | 1 wk | No — sequential. Unblocks everything else. |
| **S1 · Brand Pivot** | DayBeans rename, voice rewrite, tab labels, default theme = Dawn, marketing landing port | 1.5 wk | Yes — 5 tracks |
| **S2 · Dual-Run Resilience** | Morning + 5pm cron, primary/backup precedence, admin observability | 1 wk | Yes — 4 tracks |
| **S3 · Slow Sip Features** | Hobbies / livesWith / finance check-in, rotating section cards, hobby goals | 1.5 wk | Yes — 4 tracks · **runs parallel with S4** |
| **S4 · The Journal Listens** | Theme extraction, intent detection, suggested goals, prompt enrichment | 2 wk | Yes — 5 tracks · **runs parallel with S3** |
| **S5 · Coffee Rewards** | Streak detection, vouchers, reward UI, email, admin partner CRUD | 2 wk | Yes — 5 tracks · **runs parallel with S6** |
| **S6 · First Pour Onboarding** | 6-step onboarding, middleware redirect, persona-aware day-1 generation | 1 wk | Yes — 4 tracks · **runs parallel with S5** |
| **S7 · Launch Readiness** | Privacy page, export, account deletion, final QA, deploy | 1 wk | No — integration-heavy |

**Solo:** 11 weeks. **Two agents in parallel after S0:** ~7 weeks. **Three agents:** ~6 weeks.

---

## 7.2 Dependency / parallelization map

```
                         ┌─────────────┐
                         │  S0 · FOUND │  (sequential)
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │  S1 · BRAND │  (5 parallel tracks)
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │  S2 · DUAL  │  (4 parallel tracks)
                         └──────┬──────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
        ┌───────▼───────┐               ┌──────▼───────┐
        │  S3 · SLOWSIP │               │  S4 · JOURNAL│
        │   (4 tracks)  │               │  (5 tracks)  │
        └───────┬───────┘               └──────┬───────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
        ┌───────▼───────┐               ┌──────▼───────┐
        │  S5 · REWARDS │               │  S6 · ONBOARD│
        │   (5 tracks)  │               │  (4 tracks)  │
        └───────┬───────┘               └──────┬───────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                         ┌──────▼──────┐
                         │  S7 · LAUNCH│
                         └─────────────┘
```

### What sprints are intentionally parallel

- **S3 + S4 in parallel:** Slow Sip features and the journal-magic engine touch different code paths. They only intersect at the LLM prompt, which is owned by exactly one task in each sprint and synchronized at sprint integration.
- **S5 + S6 in parallel:** Onboarding is a self-contained `/welcome` route; rewards is a streak engine + admin route. No file overlap.

### What sprints are intentionally sequential

- **S0 must finish before anything else.** All schema migrations, type contracts, and infra scaffolding consolidate here. Otherwise downstream sprints fight over `prisma/schema.prisma`.
- **S1 → S2 is sequential.** S2's cron and admin pages depend on the renamed/branded surfaces from S1.
- **S2 → S3/S4 is sequential.** S2 ships the new `DailyContent.backupContentJson` precedence that S4's prompt enrichment depends on.

---

## 7.3 Multi-agent protocol — rules of engagement

These rules let multiple agents work concurrently without producing merge conflicts.

### Rule 1 — Explicit file ownership

Every task in [08-tasks-and-issues.md](08-tasks-and-issues.md) declares:

```
OWNS:
  - src/path/to/exclusive/file.ts
  - src/path/to/another.tsx
READS:
  - src/types/something.ts   (read-only context)
DEPENDS ON: S0-T03
```

- **OWNS** = exclusive write access. No other parallel task may modify these files.
- **READS** = the task may read these for context but must not write to them.
- **DEPENDS ON** = the task is blocked until the listed task merges to `main`.

If a task discovers it needs to modify a file outside its OWNS list, it must:
1. Stop work.
2. Either (a) wait for the owning task, or (b) negotiate via the integration channel.

### Rule 2 — Schema migrations consolidate in S0

After S0 ships, **no new migrations until S5**. The S0 migration creates every table
that any sprint will need. Specifically:

- `JournalTheme`, `SuggestedGoal` — used by S4 but added in S0
- `Partner`, `Voucher`, `RewardClaim` — used by S5 but added in S0
- `DailyContent.backupContentJson` etc. — used by S2 but added in S0
- `Pref.hobbies`, `Pref.livesWith`, `Pref.financeMode`, `Pref.prebrewHour`, `Pref.prebrewEnabled` — used by S2/S3/S6 but added in S0
- `Goal.category` — used by S3 but added in S0
- `RefreshLog.phase` — used by S2 but added in S0
- `User.role` — used by S5 admin but added in S0

**Rationale:** Prisma's `schema.prisma` is a single file. Two parallel agents both
adding migrations will conflict on every line. Doing it once in S0 means every
later sprint reads the schema and writes only against existing columns/tables.

### Rule 3 — Type contracts define the boundary

When task A (server) and task B (UI) need to talk, the **type** is defined in S0
and lives in `src/types/`. Both A and B build against the type; they integrate at
the end of the sprint.

Example: `src/types/suggested-goal.ts` defines `SuggestedGoal`. S4-T01 writes the
server action that returns `SuggestedGoal[]`. S4-T03 writes the UI that consumes
`SuggestedGoal[]`. Neither task needs the other to be done first.

### Rule 4 — Branch naming convention

```
feat/sN-tXX-<short-kebab-name>
```

Examples:
- `feat/s1-t01-rename-product-to-daybeans`
- `feat/s2-t03-evening-prebrew-cron`
- `feat/s4-t02-intent-detection-module`

This makes the GitHub issue ↔ branch ↔ PR mapping unambiguous.

### Rule 5 — One PR per task

Each task in [08-tasks-and-issues.md](08-tasks-and-issues.md) is a single PR.
PRs are reviewed and merged independently to `main`. No "stacked" PRs except
where explicitly noted.

### Rule 6 — Sprint integration day

Last day of every sprint is **Integration Day**:

1. All in-flight PRs in the sprint merge to `main` (with conflicts resolved).
2. A staging environment runs the full app. Sprint owner runs the sprint's acceptance criteria.
3. If something's broken, it's a hot-fix PR with `fix/sN-integration-XX` naming.
4. The next sprint doesn't start until integration is green.

### Rule 7 — Conflict escalation

If two agents discover they both need to write to the same file (e.g. both need a new entry in `globals.css`):

1. The task that started later **stops** and posts in the integration channel.
2. The first task continues.
3. The second task rebases on `main` after the first merges and re-attempts.

**Practical heuristic:** the more central a file (e.g. `globals.css`, `layout.tsx`,
`schema.prisma`, `prompts.ts`), the more likely it is owned by at most one task per
sprint. Plan accordingly.

### Rule 8 — Acceptance criteria are testable

Every task lists acceptance criteria as a checklist. Reviewers verify them
mechanically before approving. Subjective criteria ("looks good") are forbidden;
"matches mockup at 1280px in Dawn theme" is allowed.

### Rule 9 — Voice cues come from a single owner

Brand voice copy lives in [01 · Brand Strategy](01-brand-strategy.md) §1.5–§1.7.
Tasks must use the exact phrasing from the strategy doc when one is provided.
If a task needs new copy not yet in the doc, it stops and routes through the
brand owner before shipping.

### Rule 10 — Tests stay green

`npx tsc --noEmit` and the existing test suite must pass before any PR merges.
Tasks that intentionally need to break a test (refactor, schema change) update
the test in the same PR.

---

## 7.4 Per-sprint task counts (preview)

The detailed tasks live in [08 · Tasks & Issues](08-tasks-and-issues.md). Quick
counts so you can preview workload:

| Sprint | Task count | Suggested # of agents | Owner notes |
|---|---|---|---|
| S0 · Foundation | 9 | 1 (sequential) | Sets up everything; one agent does this end-to-end |
| S1 · Brand Pivot | 8 | 2–3 | Each track is independent |
| S2 · Dual-Run | 6 | 1–2 | Mostly server work; UI track can parallel |
| S3 · Slow Sip | 7 | 2 | UI + server pair |
| S4 · Journal Listens | 9 | 2–3 | Algorithm work + UI + prompt updates |
| S5 · Rewards | 9 | 2–3 | Server + UI + email infra |
| S6 · Onboarding | 6 | 2 | Self-contained route + middleware |
| S7 · Launch | 8 | 1–2 | Mostly QA + deploy work |
| **TOTAL** | **62** | | |

---

## 7.5 GitHub-issue mapping

When the **DayBean** fork is created, each task becomes one GitHub issue with:

- **Title:** the task's `title` field, prefixed with the task ID, e.g. `[S1-T03] Rename product to DayBeans across UI`
- **Body:** the full task card from [08-tasks-and-issues.md](08-tasks-and-issues.md) (including OWNS / READS / DEPENDS ON)
- **Labels:**
  - Sprint label: `sprint:0` … `sprint:7`
  - Track label: `track:server`, `track:ui`, `track:infra`, `track:design`, `track:qa`
  - Status label: `status:ready`, `status:blocked`, `status:in-progress`, `status:review`, `status:done`
- **Milestone:** the sprint name (e.g. "S2 · Dual-Run Resilience")
- **Assignee:** the agent (or team member) picking up the task

A separate **GitHub Project board** with these columns:
`Backlog → Ready → In Progress → In Review → Integration → Done`

---

## 7.6 Definition of "Sprint Done"

A sprint is complete when:

1. All tasks in [08-tasks-and-issues.md](08-tasks-and-issues.md) for that sprint have merged to `main`.
2. The sprint integration runs cleanly on a staging environment.
3. The sprint's success metric (called out in the task list intro) is met.
4. No regressions on previous sprints' acceptance criteria.
5. `npx tsc --noEmit` is clean. Existing tests pass. New tests for this sprint pass.

---

## 7.7 What goes wrong if we ignore this protocol

| Mistake | Consequence |
|---|---|
| Two agents both add migrations | Prisma schema conflict on every line; no easy merge |
| Two agents both edit `globals.css` | CSS variable conflicts; theme breakage |
| UI task starts before its server contract exists | UI implements against guesses; rebuild needed at integration |
| Sprint 5 starts before Sprint 2 ships | Streak detection has no `RefreshLog.phase` to query |
| No acceptance criteria | Reviewers debate "is this good?" indefinitely |
| Voice copy invented per task | Brand drift across surfaces; rewrite in QA |

The protocol exists because every one of these has happened on similar projects.
Following it lets 3 agents do the work of 1 in roughly 1/2 the calendar time.
