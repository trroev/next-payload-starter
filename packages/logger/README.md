# @repo/logger

Sanctioned logging primitive for the monorepo. Built on [LogLayer](https://loglayer.dev)
with [pino](https://getpino.io) as the underlying transport, default secret
redaction, and a `LOG_LEVEL`-driven level pulled from `@repo/env/logger`.

`console.*` is banned by Biome's `noConsole` rule across the repo — this package
is the replacement.

## Usage

```ts
import { createLogger, logger } from "@repo/logger"

// Per-module sub-logger — the `name` becomes a structured field.
const log = createLogger({ name: "payload.revalidate-post" })

log.withMetadata({ status: 502 }).error("revalidation failed")
log.withError(err).error("request failed")
```

Defaults redact `password`, `token`, `authorization`, `cookie`, `set-cookie`,
`secret` at the top level and one nested level. Pass
`createLogger({ redact: ["apiKey"] })` to extend.

## Investigation: how light should this package be? (#27)

This package is intentionally a thin layer. Below is the recorded outcome of
investigation issue #27, which weighed shrinking the package further against
keeping its current shape.

### Decision

**Collapse to a single Node/pino implementation behind the existing
`createLogger` / `logger` API.** Implementation tracked in #37.

Concretely, the follow-up will:

- Keep the `createLogger` / `logger` public API and their LogLayer return type
  so the three current call sites (`packages/payload/src/hooks/revalidate*`,
  `packages/fetch/src/create-fetch-client.ts`) do not change.
- Keep the secret-redaction defaults and the `LOG_LEVEL` wiring through
  `@repo/env/logger`.
- Delete `src/logger/edge.ts`, `src/logger/browser.ts`, the per-runtime
  `package.json` `exports` conditions, the `makeImmutable` wrapper, and the
  `./test-transport` subpath export (inlining its capture transport into the
  one test that uses it).
- Update the root `CLAUDE.md` Logging section so it no longer promises
  `.withContext()` returns a fresh child — call sites that need a child
  logger will use `.child()` explicitly, or pass `context` at `createLogger`
  time.

### Rationale

Three of the four runtime transports plus the immutability wrapper plus the
custom test transport are all defending against problems that no current
consumer has:

| Surface | Current consumers |
| --- | --- |
| `src/logger/edge.ts` | 0 |
| `src/logger/browser.ts` | 0 |
| `makeImmutable` (defends `.withContext` from mutating the root) | 0 — `.withContext` is not called anywhere outside docs |
| `./test-transport` subpath export | 1 — the logger's own `build.test.ts` |
| `createLogger` / `logger` + `.withMetadata` / `.withError` / `.warn` / `.error` | 3 call sites |

For a starter that most forkers will deploy server-only, ~250 LOC across nine
files exists to ship logs to runtimes nothing currently targets. The
abstraction also obscures that this is, in the end, pino.

Collapsing to a single pino-backed implementation keeps every behavior the
codebase actually depends on (sanctioned `console.*` replacement, structured
JSON in prod, pino-pretty in dev, centralized redaction, the
`createLogger`/`logger` API) while removing dead code and one bespoke piece
of cleverness (`makeImmutable`).

If edge or browser logging is needed later, the path forward is to add a
runtime-specific entry back behind an `exports` condition — the same shape
that exists today, but driven by a concrete consumer instead of a guess.

### Architectural invariants preserved

- `@repo/logger` remains a foundation package — no imports from `ui`,
  `chrome`, `payload`, or `auth`.
- The `console.*` Biome ban (`noConsole`) keeps a sanctioned replacement
  (`createLogger` / `logger`) with the same import path.
- Secret-redaction defaults are unchanged.
