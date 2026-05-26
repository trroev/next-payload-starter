# next-payload-starter

A Turborepo monorepo starter for content-driven web apps. Bundles Next.js 16, PayloadCMS 3, better-auth, MongoDB, Tailwind v4, Vitest, Storybook, and Biome — all wired up with the conventions, import boundaries, and CI scaffolding that make a fresh project usable in minutes instead of weeks.

The `posts` collection and `/posts` routes are a deliberately skeletal example demonstrating the feature-folder layout — adapt or replace per project.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| CMS | PayloadCMS 3 (embedded) + `@payloadcms/plugin-seo` + live preview |
| Database | MongoDB (local Docker or hosted Atlas) |
| Auth | better-auth |
| Images | Cloudinary (custom Payload storage adapter) |
| Styling | TailwindCSS v4 |
| Headless UI | Base UI |
| Forms | TanStack Form |
| Validation | Zod |
| Pattern matching | ts-pattern |
| Linting / formatting | Biome (via ultracite) |
| Component workshop | Storybook |
| Testing | Vitest |
| Hosting | Vercel (single deployment, Payload embedded) |

---

## Getting started

Spin up a new repo from this template:

```sh
gh repo create my-app --template trroev/next-payload-starter --public
cd my-app
pnpm install
cp .env.local.example .env.local       # fill in MONGODB_URI + secrets
docker compose up -d                   # local MongoDB on :27017
pnpm dev                               # app at :3000, admin at /admin
```

### Prerequisites

- Node.js ≥ 24
- pnpm (managed via corepack — `corepack enable`)
- Docker (for local MongoDB)

### Environment

The `apps/web/.env.{production,development,development.local}` files are shipped with their keys but no values. Fill them in for the environments you need, then encrypt them:

```sh
cd apps/web
dotenvx encrypt -f .env.development
```

This generates `apps/web/.env.keys` (the private decryption key, gitignored) and rewrites the env file in-place with encrypted secrets. Commit the encrypted env file; **never commit `.env.keys`** — keep it in your password manager.

To add or update a secret later:

```sh
dotenvx set SOME_SECRET "value" -f .env.development
```

For local-only work, `.env.local` (gitignored) at the repo root is the simplest path — no encryption, no `.env.keys`.

### MongoDB

Local dev uses the Docker container in `docker-compose.yml`. For a hosted database, see [`docs/atlas-setup.md`](./docs/atlas-setup.md) for the full Atlas provisioning runbook (cluster, network access, per-database users).

---

## Repository structure

```
next-payload-starter/
├── apps/
│   ├── web/                # Next.js 16 + PayloadCMS (single deployment)
│   └── storybook/          # Component workshop for @repo/ui
├── packages/
│   ├── auth/               # better-auth configuration
│   ├── chrome/             # App shell (header, nav, user menu)
│   ├── env/                # Shared env loading + zod schema
│   ├── logger/             # Isomorphic structured logger (LogLayer + pino)
│   ├── payload/            # Payload collections, hooks, adapters
│   ├── storybook-config/   # Shared Storybook config
│   ├── tailwind/           # Tailwind v4 preset + design tokens
│   ├── testing/            # Shared Vitest config + MSW handlers + factories
│   ├── tsconfig/           # Shared TypeScript configs
│   ├── types/              # Shared TypeScript types
│   ├── ui/                 # Shared React components (Base UI wrappers)
│   └── utils/              # Pure helpers (formatDuration, validateExternalUrl, …)
├── tooling/
│   └── github/             # Composite GitHub Actions for CI
└── docs/                   # Setup runbooks
```

### Import boundaries

Layered dependencies are enforced by Biome's `noRestrictedImports` rule in `biome.json`:

- `packages/{utils,types,env,logger}` may not import from `packages/{ui,chrome,payload,auth}`
- `packages/ui` may not import from `packages/{chrome,payload}` or any app
- `packages/chrome` may not import from any app
- `apps/web/src/features/<a>` may not import from `apps/web/src/features/<b>` or from `~/app/**`

**Every new feature requires adding its zone to `biome.json`** — duplicate an existing `apps/web/src/features/<name>/**` override and list the sibling features in the `group` patterns.

---

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Check linting and formatting (Biome via ultracite) |
| `pnpm lint:fix` | Auto-fix lint and formatting issues |
| `pnpm format` | Check formatting only |
| `pnpm format:fix` | Auto-fix formatting |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run test suite |
| `pnpm coverage` | Run tests with coverage |
| `pnpm generate:types` | Regenerate Payload-generated TS types |

---

## ISR revalidation

Post pages are statically rendered and revalidated on demand. The Payload `Posts` collection has an `afterChange` hook that POSTs to the app's revalidation endpoint whenever a post is published or updated.

`POST /api/revalidate`

- **Header:** `Authorization: Bearer $REVALIDATION_SECRET`
- **Body:** `{ "slug": "<post-slug>" }` or `{ "tag": "<cache-tag>" }`
- **Effect (slug):** revalidates `/`, `/posts`, `/posts/<slug>`, and the `post:<slug>` tag

Revalidation failures are logged but don't fail the Payload save — the page just stays on its old static copy until the next time-based or manual revalidate.

---

## Logging

`@repo/logger` is the shared logging primitive — `console.*` is banned by Biome's `noConsole` rule. Built on [LogLayer](https://loglayer.dev) with pino on Node (JSON in production, pino-pretty in dev) and `ConsoleTransport` on edge/browser, selected via package.json `exports` conditions.

```ts
import { createLogger, logger } from "@repo/logger"

const log = createLogger({ name: "payload.revalidate-post" })

log.withMetadata({ status: 502 }).error("revalidation failed")
log.withContext({ requestId }).info("handled")  // returns a fresh child
```

`withContext` returns a new child logger so per-request context can't leak onto the long-lived root. Sensitive keys (`password`, `token`, `authorization`, `cookie`, `set-cookie`, `secret`) are redacted by default; pass `createLogger({ redact: ["apiKey"] })` to extend the list. Level is controlled by `LOG_LEVEL` (`trace` | `debug` | `info` | `warn` | `error` | `fatal`) — defaults to `info` in production, `debug` otherwise.

---

## CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`. The composite actions in `tooling/github/ci/` enforce:

- Clean lockfile (`pnpm install --frozen-lockfile`)
- Fresh Payload types (`payload generate:types` + `git diff --exit-code`)
- Lint, type-check, tests, and a successful build
- Codecov upload — patch coverage gate at 80% (configured in `codecov.yml`)

`SKIP_ENV_VALIDATION=true` is set for the entire job so steps that touch the Payload config don't require real credentials.

---

## Deployment

The app deploys as a single Vercel project. Payload's embedded architecture means no separate server process.

```sh
turbo run build --filter=web
```

See `apps/web/vercel.json` for the build command Vercel uses.
