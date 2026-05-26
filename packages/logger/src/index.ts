// This file is intentionally not the package's runtime entry. Runtime selection
// happens via `exports` conditions in package.json, which point directly at
// ./logger/node.ts, ./logger/browser.ts, or ./logger/edge.ts. This barrel exists
// so the package has a typecheck-friendly root and downstream tooling that
// resolves to `src/index.ts` (e.g. some IDE jumps) still gets the Node surface.
export * from "./logger"
