#!/usr/bin/env node
//
// Enforce the pnpm catalog convention: any dep that the catalog owns must be
// referenced as `catalog:` / `catalog:peers` in a workspace package.json, never
// pinned to a literal version. #22 centralized the most-shared external deps
// into a catalog so their versions live in one place; without this check a new
// package (or a careless edit) could re-declare `"react": "^19.2.0"` and
// silently reintroduce the per-package drift the catalog exists to eliminate —
// and it would pass CI today.
//
// The set of catalogued dep names is read straight from pnpm-workspace.yaml, so
// the check tracks catalog changes automatically. We only need the dep *names*
// (the keys), so a focused scanner is enough — no YAML dependency required.
// pnpm's native `catalogMode: strict` is deliberately not used: it would force
// *every* dep into a catalog, where the convention targets only the catalog's
// own keys.

import { globSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

// A `catalog:` reference is the bare protocol; a named catalog adds the catalog
// name (e.g. `catalog:peers`). Both are valid; a literal semver string is not.
const CATALOG_REFERENCE = /^catalog:/

/**
 * Collect every dep name owned by the catalog from pnpm-workspace.yaml.
 *
 * Structure:
 *   catalog:            # default catalog — dep keys at indent 2
 *     react: ^19.2.0
 *   catalogs:           # named catalogs — group keys at indent 2, deps at 4
 *     peers:
 *       react: ^19.0.0
 *
 * Returns the union of dep names across the default and all named catalogs.
 */
const readCatalogDepNames = () => {
  const yaml = readFileSync(join(repoRoot, "pnpm-workspace.yaml"), "utf8")
  const lines = yaml.split("\n")
  const names = new Set()

  let section = null // "catalog" | "catalogs" | null

  for (const rawLine of lines) {
    if (rawLine.trim() === "" || rawLine.trimStart().startsWith("#")) {
      continue
    }

    const indent = rawLine.length - rawLine.trimStart().length

    // A top-level key (indent 0) opens or closes a section.
    if (indent === 0) {
      const key = rawLine.split(":")[0].trim()
      section = key === "catalog" || key === "catalogs" ? key : null
      continue
    }

    // Default catalog: dep names sit one level in (indent 2).
    if (section === "catalog" && indent === 2) {
      names.add(stripKey(rawLine))
      continue
    }

    // Named catalogs: indent 2 is the catalog group name (skip), indent 4 is a
    // dep name within that group.
    if (section === "catalogs" && indent === 4) {
      names.add(stripKey(rawLine))
    }
  }

  return names
}

/** Extract the key from a `  "key": value` line, dropping any wrapping quotes. */
const stripKey = (line) => {
  const key = line.split(":")[0].trim()
  return key.replace(/^["']|["']$/g, "")
}

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"]

const main = () => {
  const catalogDeps = readCatalogDepNames()

  const packageFiles = globSync("**/package.json", {
    cwd: repoRoot,
    exclude: (path) => path.includes("node_modules"),
  })

  const violations = []

  for (const relativePath of packageFiles) {
    const pkg = JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"))
    const name = pkg.name ?? relativePath

    for (const field of DEP_FIELDS) {
      const deps = pkg[field]
      if (!deps) {
        continue
      }

      for (const [dep, version] of Object.entries(deps)) {
        if (catalogDeps.has(dep) && !CATALOG_REFERENCE.test(version)) {
          violations.push({ name, field, dep, version })
        }
      }
    }
  }

  if (violations.length > 0) {
    for (const { name, field, dep, version } of violations) {
      process.stderr.write(
        `${name}: "${dep}": "${version}" in ${field} must be "catalog:" (or "catalog:<name>")\n`
      )
    }
    process.stderr.write(
      `\n${violations.length} catalog violation(s) found. Replace the literal version with a catalog reference.\n`
    )
    process.exit(1)
  }

  process.stdout.write(
    `Catalog check passed: ${catalogDeps.size} catalogued dep(s), no literal overrides.\n`
  )
}

main()
