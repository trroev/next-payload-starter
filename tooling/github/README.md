# `tooling/github`

GitHub Actions composite actions used by [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
The workflow file itself is intentionally thin — each job calls one composite
action so the steps for that job live next to the script they run.

## Layout

```
tooling/github/
├── setup/                  # Common: pnpm + Node + frozen-lockfile install
└── ci/
    ├── generate-types/     # payload generate:types + git diff --exit-code
    ├── lint/               # pnpm lint, boundaries, catalog:check
    ├── typecheck/          # pnpm typecheck --affected
    ├── test/               # pnpm test --affected
    ├── coverage/           # pnpm coverage --affected + dynamic Codecov upload
    └── e2e/                # Playwright against a built apps/web
```

## `setup/`

`uses: ./tooling/github/setup` — pinned `pnpm/action-setup` + `setup-node`
(reads `.nvmrc`, pnpm cache) + `pnpm install --frozen-lockfile`. Every CI job
calls this first so installs and Node versions stay identical across jobs.

## `ci/generate-types/`

Runs `payload generate:types` and asserts the result matches the checked-in
file. A stale file fails the build with:

> Payload types are stale. Run `pnpm generate:types` and commit the result.

This pairs with the design in
[`packages/payload/README.md`](../../packages/payload/README.md): generated
types are committed; CI is the gate that keeps them honest.

## `ci/lint/`

Three checks in one job:

- `pnpm lint` — Biome (via ultracite) across the repo.
- `pnpm boundaries` — Turborepo's `turbo boundaries`, catching imports of
  packages **not declared** in a `package.json`. Complements Biome's
  `noRestrictedImports` directional rules.
- `pnpm catalog:check` — fails if any committed `package.json` pins a
  literal version for a dependency listed in `pnpm-workspace.yaml`'s
  `catalog:`.

## `ci/typecheck/`, `ci/test/`, `ci/coverage/`

All three call `--affected` so they only re-run packages whose source (or
dependency source) changed since the merge base. `SKIP_ENV_VALIDATION=true`
is set for the typecheck job so steps that touch the Payload config don't
need real credentials. The coverage job discovers `packages/*/coverage/lcov.info`
dynamically and uploads each as a Codecov flag derived from the package
directory name — adding a new package never requires editing this action.

## `ci/e2e/`

Caches Playwright browsers by `pnpm-lock.yaml` hash, regenerates Payload
types, then runs `@repo/e2e` against `apps/web`. See
[`apps/e2e/README.md`](../../apps/e2e/README.md) for the suite layout.

## Remote caching

The workflow propagates `TURBO_TOKEN` (secret) and `TURBO_TEAM` (variable) so
turbo can use Vercel Remote Cache when configured. Both are optional — when
absent, turbo logs "Remote caching disabled" and falls back to local caching.
See the root README's "Remote caching" section for setup steps.
