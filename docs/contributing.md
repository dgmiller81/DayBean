# Contributing — Branch / Commit / PR Strategy

This is a single-author repo for v1, but the workflow is set up like a team repo so we get good habits, clean history, and easy auditability.

## Branch Strategy

- **`main`** — protected. Always green. Every commit on `main` is a deployable state.
- **`feat/<phase>-<short-slug>`** — feature work for a phase. One branch per Issue (or per small group of related Issues in the same Phase).
- **`fix/<short-slug>`** — bugfix branches.
- **`chore/<short-slug>`** — tooling, deps, CI, docs.
- **`security/<short-slug>`** — security-relevant changes; reviewed extra carefully and labeled `security` on the PR.

Phase numbers come from [`docs/superpowers/plans/2026-05-02-master-roadmap.md`](superpowers/plans/2026-05-02-master-roadmap.md).

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/) — short, lowercase type + optional scope + imperative subject.

```
<type>(<scope>): <subject>

<body — optional, wrapped at ~72 cols, explains *why*>

<footer — optional: "Closes #123", "BREAKING CHANGE: ..." >
```

Types we use: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `security`, `build`, `ci`.

Scopes match the source layout: `auth`, `db`, `llm`, `panel`, `goals`, `tasks`, `scripture`, `journal`, `theme`, `scheduler`, `onboarding`, `settings`, `sec`, `ci`, `infra`.

**Examples**

```
feat(auth): add simple-password mode with Argon2id hashing
fix(scheduler): debounce duplicate cron ticks for same iso/user
security(crypto): rotate IV per encryption; add tamper test
test(goals): cover streak rollover at month boundary
chore(deps): bump prisma to 5.20
```

**Commit early and often.** Small commits make review and bisect easy. The plan files are written assuming one commit per Task — match that pace.

## Pull Request Workflow

Every change lands via PR — no direct pushes to `main`.

### Lifecycle

1. Open Issue (or pick one from the milestone). Confirm the Issue's "Closes when…" criteria are clear.
2. Create branch from `main`: `git checkout -b feat/01-prisma-schema`.
3. Work the plan tasks. Commit per task. Push frequently — `git push -u origin <branch>` early so CI runs.
4. Open the PR as **Draft** if work is in progress; mark **Ready for review** when CI is green and self-review is done.
5. PR title uses the Conventional Commits format. PR body uses the template (`.github/PULL_REQUEST_TEMPLATE.md`).
6. Self-review the diff before requesting review. Use the GitHub review UI; comment on anything non-obvious.
7. CI must be green: lint, typecheck, unit tests, build, `pnpm audit` (no high/critical), CodeQL (no new findings on changed files).
8. Squash-merge to `main`. Delete the branch. The squash subject = Conventional Commits format.

### PR sizing

- Aim for **<400 lines changed** per PR. If a Task in the plan would produce >400 lines, split into stacked PRs (PR-2 depends on PR-1).
- Plan delivery PRs are exempt (planning docs are review-by-skim).

### Required CI checks (branch-protected)

| Check | Workflow | Phase |
|---|---|---|
| `lint` | `.github/workflows/ci.yml` | 1 |
| `typecheck` | `.github/workflows/ci.yml` | 1 |
| `test` | `.github/workflows/ci.yml` | 1 |
| `build` | `.github/workflows/ci.yml` | 1 |
| `audit` (`pnpm audit --audit-level=high`) | `.github/workflows/security.yml` | 1 |
| `codeql` | `.github/workflows/codeql.yml` | 1 |
| `e2e` (Playwright) | `.github/workflows/e2e.yml` | 14 |

## Issue → PR Mapping

- Issues are sourced from the plan files — each `Task N` (or smaller, when it makes sense) becomes one Issue.
- Each Issue has labels: `phase-N`, `area:<scope>`, optionally `type:security` / `type:test`.
- One Milestone per Phase — closing all Issues in the milestone closes the phase.
- PR description uses `Closes #<issue>` so merge auto-closes.

## Local Dev Loop

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev          # http://localhost:4111

# Before committing
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm test
pnpm build
```

Pre-commit hook (Phase 1, via `simple-git-hooks` + `lint-staged`) runs `eslint --fix` on staged files only.

## Security-Sensitive Changes

PRs touching any of: `src/server/auth.ts`, `src/server/crypto.ts`, `src/server/llm/`, `src/server/fetch.ts`, `prisma/schema.prisma`, `next.config.ts` (CSP), or `.github/workflows/` get the `security` label automatically (Phase 14 adds this via PR labeler) and require a deliberate self-review against [`docs/security.md`](security.md) before merging.

## When in Doubt

Read the plan file for the active phase. If the plan is wrong, fix the plan first (in its own commit) — don't fix the wrong thing well.
