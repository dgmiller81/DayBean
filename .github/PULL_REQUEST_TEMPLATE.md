<!-- Title: <type>(<scope>): <subject> — Conventional Commits -->

## What
<!-- one-paragraph summary of the change -->

## Why
<!-- the motivation; link the Issue: Closes #N -->
Closes #

## How
<!-- key implementation notes a reviewer would need to know; mention any new env vars, migrations, or schema changes -->

## Phase / Epic
<!-- e.g. Phase 1 — Foundation, Task 4 (Prisma schema) -->

## Tests
- [ ] Unit tests added or updated
- [ ] Manual smoke run locally (`pnpm dev`)
- [ ] CI green (lint, typecheck, test, build, audit, codeql)

## Security checklist (delete if N/A)
- [ ] No secrets in code or logs
- [ ] No new dependency with known high/critical CVEs (`pnpm audit`)
- [ ] Server actions check `userId` from session, not from request
- [ ] If touching auth/crypto/llm/fetch, reviewed against `docs/security.md`

## Screenshots / Notes
<!-- optional -->
