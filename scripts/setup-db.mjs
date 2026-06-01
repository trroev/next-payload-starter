#!/usr/bin/env node
//
// Select the database backend for a freshly-cloned starter. The runtime decides
// MongoDB vs Postgres from whichever of MONGODB_URI / DATABASE_URL is set (see
// packages/env/src/database.ts), so "selecting" a backend is just activating one
// URL and commenting out the other across the committed env files. This script
// performs that flip — driven by an argument (`pnpm db:select postgres`) or,
// with no argument, an interactive prompt.
//
// Scope is deliberately env-only: both the Payload and Better Auth adapters stay
// installed and the unused branch is dead but harmless. Removing the unused
// adapter is a separate, heavier step — it requires editing the static imports
// in payload.config.ts / auth/index.ts — and is tracked as a follow-up.

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const webDir = join(repoRoot, "apps", "web")

// Each backend names the env var that activates it; the other var is commented.
const BACKENDS = {
  mongodb: { label: "MongoDB", envKey: "MONGODB_URI" },
  postgres: { label: "Postgres", envKey: "DATABASE_URL" },
}

// Accepted argument spellings, normalized to a BACKENDS key.
const ALIASES = {
  mongo: "mongodb",
  mongodb: "mongodb",
  pg: "postgres",
  postgre: "postgres",
  postgres: "postgres",
  postgresql: "postgres",
}

// Every env file dotenvx may load. Per-machine *.local files win over the
// committed defaults, so flip them too when present to avoid a stale override
// reactivating the other backend.
const ENV_FILES = [
  ".env.development",
  ".env.development.local",
  ".env.local",
  ".env.production",
  ".env.production.local",
]

const USAGE = "Usage: pnpm db:select <mongodb|postgres>\n"

/**
 * Comment or uncomment the first line declaring `key` in `content`, preserving
 * indentation and the existing value. Returns the rewritten content and whether
 * a matching line was found.
 */
const setKeyState = ({ content, key, active }) => {
  const pattern = new RegExp(`^(\\s*)(#\\s*)?(${key}=.*)$`, "m")
  if (!pattern.test(content)) {
    return { content, found: false }
  }
  const next = content.replace(pattern, (_match, indent, _hash, assignment) =>
    active ? `${indent}${assignment}` : `${indent}# ${assignment}`
  )
  return { content: next, found: true }
}

const applyBackendToFile = ({ filePath, backend }) => {
  const original = readFileSync(filePath, "utf8")
  let content = original
  const missing = []

  for (const [name, { envKey }] of Object.entries(BACKENDS)) {
    const active = name === backend
    const result = setKeyState({ content, key: envKey, active })
    content = result.content
    if (active && !result.found) {
      missing.push(envKey)
    }
  }

  const changed = content !== original
  if (changed) {
    writeFileSync(filePath, content)
  }
  return { changed, missing }
}

const resolveBackend = (value) => {
  if (!value) {
    return
  }
  return ALIASES[value.trim().toLowerCase()]
}

const promptForBackend = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    process.stdout.write(
      "Select a database backend:\n  1) MongoDB (default)\n  2) Postgres\n"
    )
    const answer = (await rl.question("> ")).trim().toLowerCase()
    if (answer === "") {
      return "mongodb"
    }
    return resolveBackend(answer) ?? { 1: "mongodb", 2: "postgres" }[answer]
  } finally {
    rl.close()
  }
}

const nextSteps = (backend) =>
  backend === "postgres"
    ? [
        "Next steps for Postgres:",
        "  1. docker compose up -d postgres                 # local Postgres on :5432",
        "  2. pnpm --filter @repo/auth db:push              # create the Better Auth tables (needs DATABASE_URL set)",
        "  3. pnpm dev                                      # Payload auto-pushes its own schema in dev",
      ].join("\n")
    : [
        "Next steps for MongoDB:",
        "  1. docker compose up -d mongodb                  # local MongoDB on :27017",
        "  2. pnpm dev",
      ].join("\n")

const main = async () => {
  const arg = process.argv[2]
  let backend = resolveBackend(arg)

  if (!backend) {
    if (arg) {
      process.stderr.write(`Unknown backend "${arg}".\n${USAGE}`)
      process.exit(1)
    }
    if (!process.stdin.isTTY) {
      process.stderr.write(`No backend given (not a TTY).\n${USAGE}`)
      process.exit(1)
    }
    backend = await promptForBackend()
  }

  if (!backend) {
    process.stderr.write(`No valid backend selected.\n${USAGE}`)
    process.exit(1)
  }

  const { label, envKey } = BACKENDS[backend]
  const updated = []
  const warnings = []

  for (const file of ENV_FILES) {
    const filePath = join(webDir, file)
    if (!existsSync(filePath)) {
      continue
    }
    const { changed, missing } = applyBackendToFile({ filePath, backend })
    if (changed) {
      updated.push(file)
    }
    for (const key of missing) {
      warnings.push(
        `${file}: no ${key} line found — add one manually for the ${label} backend.`
      )
    }
  }

  process.stdout.write(
    `\nDatabase backend set to ${label} (${envKey} active).\n`
  )
  process.stdout.write(
    updated.length > 0
      ? `Updated: ${updated.join(", ")}\n`
      : "No env files needed changes.\n"
  )
  for (const warning of warnings) {
    process.stderr.write(`Warning: ${warning}\n`)
  }

  process.stdout.write(`\n${nextSteps(backend)}\n`)
}

main()
