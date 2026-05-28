# `@repo/env`

Per-subsystem environment validation built on [`@t3-oss/env-nextjs`](https://env.t3.gg/). Each consumer imports only the subpath it needs — e.g. `@repo/env/auth`, `@repo/env/fetch` — and validates only those keys at first access.

## Layout

| Subpath | Owns |
|---|---|
| `@repo/env/app` | `BASE_URL` (required), `REVALIDATION_SECRET`, Sentry keys, `NODE_ENV` |
| `@repo/env/auth` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_URI` |
| `@repo/env/cloudinary` | `CLOUDINARY_*` |
| `@repo/env/fetch` | `BASE_URL` (optional) |
| `@repo/env/logger` | `LOG_LEVEL`, `NODE_ENV` (with default) |
| `@repo/env/payload` | `PAYLOAD_*` |
| `./shared` (internal) | `baseEnvOptions`, `baseUrlSchema`, `nodeEnvSchema`, `resolveBaseUrl()` |

`shared.ts` is the single source of truth for cross-cutting concerns: the `createEnv` options every module spreads (`emptyStringAsUndefined`, `skipValidation`), the `NODE_ENV` and `BASE_URL` Zod schemas, and the `resolveBaseUrl()` helper that normalises `BASE_URL`/`VERCEL_URL` into a fully-qualified URL on `process.env`.

## Decision log

### 2026-05-28 — Keep the split, add a shared base (closes #28)

**Context.** The original layout was six independent `createEnv()` calls (`app`, `auth`, `cloudinary`, `fetch`, `logger`, `payload`). The split bought lazy per-subsystem validation — importing `@repo/fetch` did not force `PAYLOAD_SECRET` to exist — but it had drifted: `BASE_URL` was defined in two files, and `app.ts` was the only module missing `emptyStringAsUndefined`, which crashed `pnpm dev` on a blank `NEXT_PUBLIC_SENTRY_DSN`.

**Options considered.**

1. **Consolidate to one `env.ts`.** Easier to scan, but importing a foundation package like `@repo/fetch` or `@repo/logger` would then validate `PAYLOAD_SECRET`, `BETTER_AUTH_SECRET`, `CLOUDINARY_*`, etc. That breaks the foundation-package contract (`packages/fetch` is allowed to be pulled into contexts where higher-layer secrets simply don't exist).
2. **Keep as-is, document rationale.** Leaves the `BASE_URL` duplication and re-opens the drift bug class the next time someone adds a module.
3. **Keep the split, add a shared base.** ← chosen.

**Outcome.** `packages/env/src/shared.ts` now owns `baseEnvOptions`, `baseUrlSchema`, `nodeEnvSchema`, and `resolveBaseUrl()`. Every module spreads `baseEnvOptions`, eliminating the missing-flag drift class. `BASE_URL` is defined exactly once (in `shared.ts`); `app.ts` uses it required, `fetch.ts` chains `.optional()` at the call site, which keeps the intentional semantic difference visible in one line without duplicating the URL schema.

**What did not change.** Six subpath exports, lazy per-consumer validation, the public API of every module. `@repo/env` remains a foundation package — `shared.ts` has no runtime dependency on any other workspace package.
