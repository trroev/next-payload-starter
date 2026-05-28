# @repo/fetch

> **Status: investigation closed — this package will be removed.** See the
> [outcome below](#investigation-does-this-package-earn-its-keep-30) and the
> implementation tracked in #40. New code should use
> [Better Fetch](https://better-fetch.vercel.app/docs) directly. Plain `fetch`
> is also fine.

A thin wrapper around [Better Fetch](https://better-fetch.vercel.app/docs)
adding a `baseURL` from `@repo/env/fetch`, a 10s timeout, linear retry,
`throw: false` tuple returns, and a shared `onError` hook that logs through
`@repo/logger`.

## Usage (until #40 lands)

```ts
import { createFetchClient, fetchClient } from "@repo/fetch"
import { z } from "zod"

// Pre-configured singleton — baseURL from @repo/env/fetch, linear retry
// (2 attempts), 10s timeout, throw: false, logger-integrated onError.
const widgetSchema = z.object({ id: z.string(), name: z.string() })

const { data, error } = await fetchClient("/api/widget", {
  output: widgetSchema,
})

if (error) {
  // The shared onError hook has already logged through @repo/logger.
  // Branch on the tuple instead of try/catch.
  return
}

// `data` is typed as `z.infer<typeof widgetSchema>`.
console.log(data.name)

// Per-caller overrides — returns a fresh, independent client (no shared state).
const client = createFetchClient({
  baseURL: "https://api.example.com",
  retry: 0,
})
```

## Investigation: does this package earn its keep? (#30)

This package was always a thin layer over an already-thin library. Below is
the recorded outcome of investigation issue #30, which weighed three options:
(a) keep as-is, (b) keep the package but relax the global-`fetch` ban, or
(c) drop the package entirely and document Better Fetch as the default.

### Decision

**Drop `@repo/fetch`. Remove the `noRestrictedGlobals` ban on `fetch`.
Document Better Fetch as the repo's recommended (but not enforced) HTTP
client.** Implementation tracked in #40.

Concretely, the follow-up will:

- Delete `packages/fetch/` (source, tests, `package.json`, coverage wiring).
- Remove the `fetch` entry from `biome.json`'s `noRestrictedGlobals` and the
  package-level `noRestrictedGlobals: off` override that exempted this
  package from its own rule.
- Remove the `packages/fetch` entries from the layered-import
  `noRestrictedImports` rules in `biome.json`.
- Rewrite the two existing call sites
  (`packages/payload/src/hooks/revalidatePost`, `revalidateHomepage`) to
  call `@better-fetch/fetch` directly. Failures continue to be logged once
  through `@repo/logger`; no double-logging.
- Add `@better-fetch/fetch` to `packages/payload/package.json` and drop
  `@repo/fetch` from it.
- Rewrite the root `CLAUDE.md` HTTP/fetch section as a soft recommendation:
  Better Fetch is the repo's default HTTP client because it is a typed
  `fetch` with Standard Schema validation via `output`, but plain `fetch`
  is acceptable for anything that does not need either.

### Rationale

The wrapper's headline features — `output` Standard Schema validation, the
`{ data, error }` tuple, configurable retry, configurable timeout — are
**not used by any current call site**:

| Surface | Current consumers |
| --- | --- |
| `output` schema validation (the one thing Better Fetch adds over `fetch`) | 0 |
| `{ data, error }` tuple branching | 0 — both call sites discard the return value |
| Per-call `retry` / `timeout` overrides | 0 |
| `createFetchClient` for a per-caller client | 0 |
| `fetchClient` + shared `onError → @repo/logger` | 2 (`packages/payload/src/hooks/revalidate{Post,Homepage}`) |

Both consumers are Payload `afterChange` hooks doing a server-to-server
`POST /api/revalidate` with a bearer token. They `await` and discard the
result. The wrapper's actual delivered value at the call site reduces to
"`baseURL` defaulting + one log line on failure," and both of those are a
few lines of inline code.

Meanwhile, the cost is real for a starter:

- **Wrapper-on-a-wrapper tax.** Better Fetch is already a thin typed
  `fetch`. We add a thin layer on top, then ban the underlying primitive.
  A forker has to learn three layers (`fetch` → Better Fetch →
  `@repo/fetch`) before making an HTTP call.
- **The `noRestrictedGlobals` ban is the highest friction-to-value rule in
  the repo.** A forker who writes `fetch(...)` in their first feature
  gets a red squiggle and a doc trip for a wrapper they don't need.
  Starters should bias toward platform primitives.
- **Coupling to `@repo/logger`.** The `onError` hook ties this package to
  another investigation outcome (#27 / #37) that is itself slimming down.

This mirrors the precedent set by the logger investigation in #27: when a
wrapper's value-add features have zero in-repo demand, the right move is to
drop the abstraction and re-introduce it behind a concrete consumer if one
ever appears. The path forward, if a feature later wants typed responses
with schema validation, is to import Better Fetch at that call site — the
recommendation will already be documented.

### Why Better Fetch as the recommendation

It is the smallest credible upgrade over native `fetch`: a typed `fetch`
that accepts an `output` Standard Schema and infers the response type from
it. Recommending it costs nothing (it is already a transitive dependency
through `better-auth`) and gives forkers a clear default the moment they
need response validation. Recommending — not enforcing — lets the two
existing Payload hooks use it without forcing every future call site
through the same library.

### Architectural invariants preserved

- The two existing Payload hooks continue to log failures exactly once,
  through `@repo/logger`.
- No new wrapper package is introduced. Better Fetch is consumed directly
  at the call site.
- Layered-import rules in `biome.json` continue to apply; the
  `packages/fetch` entries simply disappear with the package.
