# Security Posture

This document is the source of truth for how DayBeans handles secrets, authentication, and threat surfaces. It is reviewed at the end of every phase that touches the trust boundary (auth, LLM keys, scheduler, web fetch).

## Trust Boundaries

```
┌───────────────────────────────────────────────┐
│  Browser (untrusted)                          │
│  - Renders UI, holds sticky session cookie    │
│  - Never sees plaintext API keys              │
│  - Never sees other users' data               │
└────────────────────┬──────────────────────────┘
                     │  HTTPS (Railway) / HTTP (local)
┌────────────────────┴──────────────────────────┐
│  Next.js server (trusted)                     │
│  - Server actions = the only mutation surface │
│  - Holds APP_ENCRYPTION_KEY in memory         │
│  - Decrypts API keys per-request only         │
│  - Owns DB connection                         │
└────────────────────┬──────────────────────────┘
                     │
┌────────────────────┴──────────────────────────┐
│  DB (trusted, but storage-encrypted)          │
│  - SQLite (local) or Postgres (Railway)       │
│  - Per-user rows; no cross-tenant queries     │
│  - LlmCredential.encryptedKey is AES-256-GCM  │
└───────────────────────────────────────────────┘
```

## Secret Inventory

| Secret | Location | Lifetime | Rotation |
|---|---|---|---|
| `APP_ENCRYPTION_KEY` | Env var, server memory | Forever (rotation = re-encrypt all `LlmCredential` rows) | Annual or on suspected compromise |
| `AUTH_SECRET` (Auth.js) | Env var | Forever | Annual |
| `CRON_SECRET` | Env var, sent as `Authorization: Bearer` header from Railway cron | Forever | Per deploy if leaked |
| User API keys (OpenAI, Anthropic, etc.) | DB column `LlmCredential.encryptedKey` (AES-256-GCM) | Until user deletes | User-controlled |
| User passwords (`AUTH_MODE=simple` or `full`) | DB column `User.passwordHash` (Argon2id) | Until user changes | User-controlled |
| OAuth tokens | DB column `Account.access_token` (Auth.js managed; encrypted at column level via Prisma extensions in Phase 14) | Until user revokes | Auth.js handles refresh |

**Never logged. Never returned by GET endpoints. Never displayed in full** (settings UI shows last-4 only for API keys; password hashes are write-only).

## Authentication Modes

See master roadmap §2.1 for the full table. Boot guard rules:

```ts
if (DEPLOY_TARGET === "railway" && AUTH_MODE !== "full") {
  throw new Error("Railway deployments must use AUTH_MODE=full");
}
if (!APP_ENCRYPTION_KEY || Buffer.from(APP_ENCRYPTION_KEY, "base64").length !== 32) {
  throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64)");
}
if (DEPLOY_TARGET === "railway" && !CRON_SECRET) {
  throw new Error("CRON_SECRET required on Railway");
}
```

## API Key Encryption (AES-256-GCM)

Phase 8 implements `src/server/crypto.ts` with this contract:

```ts
encrypt(plaintext: string, userId: string): string  // returns base64( iv | ciphertext | tag )
decrypt(encoded: string, userId: string): string
```

- IV is random per encryption (12 bytes).
- Per-user subkey via HKDF: `subkey = HKDF(APP_ENCRYPTION_KEY, salt=userId, info='llm-cred')`.
- Authenticated encryption — tampering throws.
- Plaintext is never written to logs; tests assert this with a log spy.

## Rate Limits & Abuse Prevention

| Surface | Limit | Phase |
|---|---|---|
| Manual content refresh | 3 / user / day | 8 |
| Login attempts (`AUTH_MODE=simple` / `full`) | 10 / IP / 15 min, then exponential backoff | 7 |
| Web fetch (article body) | 30 / user / hour, 1 MB body cap, 8s timeout | 8 |
| Cron endpoint (`/api/cron/*`) | Bearer-token gate; ignores body; returns 200 even on duplicate | 10 |

## SSRF Guard for Web Fetch

`src/server/fetch.ts` (Phase 8) refuses URLs where:
- Scheme isn't `https:` (or `http:` only when `DEPLOY_TARGET=local`)
- Resolved host is private (RFC 1918, link-local, loopback, IPv6 ULA/multicast)
- Host is `metadata.google.internal`, `169.254.169.254`, etc.
- Final response `Content-Type` is not `text/html`
- Any redirect violates the above rules

## Content Security Policy

Set in Phase 14 via `next.config.ts` headers:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:1234;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
```

Plus `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on Railway.

## Threat Model — STRIDE quick pass

| Threat | Mitigation |
|---|---|
| **Spoofing** (an attacker authenticating as another user) | Auth.js v5 with secure cookies (`HttpOnly`, `Secure`, `SameSite=Lax`); password hash via Argon2id with per-user salt |
| **Tampering** (modifying another user's goals/journal) | Every server action resolves `userId` from the session — NEVER from the request body. Prisma queries scoped by `userId`. |
| **Repudiation** (user denying an action) | `AuditLog` table records mutations with `userId`, `action`, `targetId`, `at`, `ip`. Phase 14. |
| **Info disclosure** (API keys, journal text leaking) | Encrypted at rest; never logged; settings UI returns redacted. Server actions return only the user's own data. |
| **DoS** (cron flooding, LLM cost bombing) | Rate limits per §"Rate Limits"; LLM call concurrency cap; refresh idempotency on `(userId, iso)`. |
| **Elevation of privilege** (user becoming admin) | No admin role in v1. Single-tenant Railway. Multi-tenant team mode is out of scope. |

## Dependency & Supply Chain

- `pnpm audit` runs in CI — `high` or `critical` blocks the PR.
- Dependabot enabled on the repo (security + version updates, weekly).
- CodeQL enabled with `javascript-typescript` pack on `main`, PRs, and weekly cron.
- Lockfile (`pnpm-lock.yaml`) committed; CI uses `pnpm install --frozen-lockfile`.

## Logging Hygiene

- Application logs use `pino`; never log full request bodies, never log decrypted secrets.
- Log levels: `error`, `warn`, `info`, `debug`. Production runs at `info`.
- Phase 14 adds a `logSafe()` helper that redacts known-sensitive keys (`password`, `apiKey`, `encryptedKey`, `authorization`, `cookie`).

## Incident Response (one-page)

1. Identify scope: what data could have leaked? which users?
2. Contain: rotate `APP_ENCRYPTION_KEY` and `AUTH_SECRET`; expire all sessions; force-rotate user-level API keys (mark `LlmCredential.compromisedAt`, send "please re-enter" message in UI).
3. Notify: if any user data may have been exposed, email affected users within 72 hours.
4. Postmortem: blameless review, file under `docs/postmortems/YYYY-MM-DD-<slug>.md`.
