# next-payload-starter — Claude Working Guide

## Project Overview

This is a Turborepo monorepo starter for content-driven web apps. It bundles the tooling, conventions, and architecture decisions used in production projects so a new repo can skip the first two weeks of setup. The `posts` collection and `/posts` routes are a skeletal example demonstrating the feature-folder layout — adapt or replace per project.

**Stack:** Next.js 16 (App Router) + PayloadCMS 3 (embedded) · MongoDB · better-auth · Tailwind v4 · Base UI · TanStack Form · Turborepo + pnpm workspaces · Biome · Vitest · Storybook

---

## Tooling

- **Formatter/Linter:** Biome (extends `ultracite/biome/core|react|next`). Run `pnpm lint` and `pnpm format` from root. Lint is a single-pass root Biome invocation — intentionally *not* a turbo task, so no package defines a `lint` script and there is no `lint` entry in `turbo.json`.
- **Type checking:** `pnpm typecheck` from root. In `turbo.json`, `typecheck` depends on a `transit` node (`{ "dependsOn": ["^transit"] }`) rather than `^typecheck`: `tsc --noEmit` on a JIT consumer reads dependency *source*, not built output, so typechecks run in parallel while dependency-source changes still bust the cache.
- **Tests:** Vitest via `pnpm test`. Shared config in `packages/testing`.
- **Coverage:** `pnpm coverage` from root runs `turbo run coverage` across all packages that define the script. CI runs the same command and uploads each package's `lcov.info` to Codecov. The gate that fails CI lives in `codecov.yml` at the repo root — currently `patch: 80%` (lines changed in a PR must be ≥80% covered) and `project: auto` (total coverage may not drop by more than 1%). Adjust those rules in `codecov.yml`, not in `vitest.config.ts`. New packages opt in by adding a `coverage` script + a `coverage` block to their vitest config, then a new `flags`/upload step in `tooling/github/ci/coverage/action.yml`.
- **Package manager:** pnpm. Always use `pnpm add`, never `npm install`.

---

## Conventions

### Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/). Group changes logically and atomically — one concern per commit.

```
feat(utils): add formatDate helper
fix(web): correct ISR revalidation path for post detail
chore(deps): install ts-pattern in packages/utils
```

A Husky pre-commit hook runs `biome check --write` on staged `.ts`/`.tsx`/`.json` files via lint-staged, followed by `turbo run typecheck --affected`. **Never bypass the hook with `git commit --no-verify`** — fix the underlying lint or type error instead.

### TypeScript
Full conventions are loaded via the `typescript-conventions` skill (`~/.claude/skills/typescript-conventions/`). Key rules enforced by Biome:

| Rule | Enforcement |
|---|---|
| `type` not `interface` | Biome error |
| No `enum` — use `as const satisfies` | Biome error |
| `Array<T>` not `T[]` | Biome error |
| `import type` for type-only imports | Biome error |
| Named exports only | Biome error (Next.js App Router files exempted) |
| No `@ts-ignore` — use `@ts-expect-error` with description | Biome error |

Conventions that require discipline (not auto-enforced): readonly preference, boolean naming prefixes (`is`, `has`, `should`…), explicit return types on exports, `as const satisfies` for constants, null vs undefined semantics, generic `T` prefix, single-object argument pattern, prefer ts-pattern over `switch`/chained `if-else`.

### Package structure
- Types: PascalCase subdirectories — `src/HeaderAuth/`, `src/ActionResult/`
- Utils: camelCase subdirectories with an `index.ts` entry — `src/formatDate/index.ts`, `src/utils/cn/index.ts`
- Components (in `packages/ui`, `packages/chrome`, `apps/web/src/components`, `apps/web/src/features/*/components`): one PascalCase directory per component containing kebab-case files and a barrel — `src/components/Button/{button.tsx, button.variants.ts, index.ts}`. The `tailwind-variants` config lives in a sibling `<name>.variants.ts` only when the component has variants. Each directory is exposed via the package's wildcard exports (`./components/*` → `./src/components/*/index.ts`).
- Cross-directory imports use the package's TS path alias (e.g. `@repo/ui/utils/cn`); siblings inside the same directory use relative `./` imports.

**Filename casing is enforced by Biome's `useFilenamingConvention` rule** (per-package overrides in `biome.json`, all set to `kebab-case`). Directory casing (PascalCase for components/types, camelCase for utils) is documented above but not auto-enforced — Biome only checks filenames.

### Logging
`@repo/logger` is the only sanctioned logging primitive — `console.*` is banned by Biome's `noConsole` rule. Import the shared singleton or create a named sub-logger:

```ts
import { createLogger, logger } from "@repo/logger"

// Per-module sub-logger — the name becomes a structured `name` field.
const log = createLogger({ name: "payload.revalidate-post" })

log.withMetadata({ status: 502 }).error("revalidation failed")
log.withError(err).error("request failed")
log.withContext({ requestId }).info("handled")   // returns a fresh child
```

Built on [LogLayer](https://loglayer.dev) with pino on Node (JSON in prod, pino-pretty in dev) and `ConsoleTransport` on edge/browser, selected via package.json `exports` conditions. `withContext` returns a new child logger — context never leaks onto the long-lived root. Default redact paths cover `password`, `token`, `authorization`, `cookie`, `set-cookie`, `secret` (top level and one nested level); pass `createLogger({ redact: ["apiKey"] })` to add more. Level comes from `LOG_LEVEL` in `@repo/env/logger` (defaults: `info` in prod, `debug` in dev).

### HTTP / fetch
[Better Fetch](https://better-fetch.vercel.app/docs) is the repo's recommended HTTP client — a typed `fetch` wrapper with Standard Schema runtime validation via `output`. Recommended, not enforced: plain `fetch` is acceptable for calls that don't need typed responses. There is no global-`fetch` ban.

```ts
import { betterFetch } from "@better-fetch/fetch"
import { z } from "zod"

const widgetSchema = z.object({ id: z.string(), name: z.string() })

const { data, error } = await betterFetch("/api/widget", {
  output: widgetSchema,
  throw: false,
})

// `data` is typed as `z.infer<typeof widgetSchema>` when `error` is null.
```

Pass `throw: false` to branch on the returned `{ data, error }` tuple rather than try/catch. Log failures once at the call site through `@repo/logger` — there is no shared `onError` hook. The two Payload `afterChange` hooks in `packages/payload/src/hooks/revalidate{Post,Homepage}` are the in-repo example, including the `retry` / `timeout` pattern used for fire-and-forget server-to-server calls.

Use Better Fetch when you want typed response validation, a `{ data, error }` tuple, or built-in retry/timeout. Use plain `fetch` when you don't.

### ts-pattern
Install per-package as needed (`pnpm add ts-pattern --filter <package>`). Use `match(...).exhaustive()` wherever possible to get compile-time exhaustiveness checking.

### Next.js App Router
Default exports are required for `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `route.ts`, etc. These files are exempted from the `noDefaultExport` rule. All other files use named exports.

### CSRF / server actions
Server actions (`signOutAction`, `uploadAvatar`, etc.) rely on Next.js 16's built-in same-origin / `Origin`-header CSRF check — the framework rejects action invocations whose `Origin` does not match the host. Do not add a custom CSRF token layer on top unless a same-origin assumption changes (e.g. exposing actions to a third-party origin, embedding in an iframe on a different domain).

### Import boundaries
Layered architecture is enforced by Biome's `noRestrictedImports` in `biome.json`:

- `packages/{utils,types,env,logger}` → may not import from `packages/{ui,chrome,payload,auth}`
- `packages/ui` → may not import from `packages/{chrome,payload}` or any app
- `packages/chrome` → may not import from any app
- `apps/web/src/features/**` → may not import via the `~/features/*` alias at all, and may not import from `~/app/**`

**Adding a new feature requires zero `biome.json` edits.** A single override targeting `apps/web/src/features/**` bans the `~/features/*` alias outright. This enforces two invariants in one rule:
- **No cross-feature imports** — feature B cannot reach into feature A via `~/features/a/...`.
- **Intra-feature imports use relative paths** (`./`, `../`) only — even your own feature is not reachable via `~/features/<self>/...`. Each feature stays a self-contained module accessed from the outside only through its public barrel.

`pnpm boundaries` (Turborepo's experimental `turbo boundaries`, run in the CI lint job) is a complement, not a replacement: it catches imports of packages **not declared** in a package's `package.json` dependencies — the one gap Biome's directional rules don't cover. We deliberately **do not** use its tag-based isolation rules: those would duplicate the Biome layering above, and the tagging feature is still experimental. Revisit tags only if `turbo boundaries` graduates from experimental and we want a single source of truth for layering.
