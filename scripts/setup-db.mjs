#!/usr/bin/env node
//
// Select the database backend for a freshly-cloned starter. The runtime decides
// MongoDB vs Postgres from whichever of MONGODB_URI / DATABASE_URL is set (see
// packages/env/src/database.ts), so "selecting" a backend is just activating one
// URL and commenting out the other across the committed env files. This script
// performs that flip — driven by an argument (`pnpm db:select postgres`) or,
// with no argument, an interactive prompt.
//
// Pass `--prune` to also remove the unused adapter branch entirely: strips the
// dead import + match arm from payload.config.ts / auth/index.ts, drops the
// unused package.json deps, removes the orphaned docker-compose service, cleans
// up orphaned catalog entries in pnpm-workspace.yaml, and re-runs pnpm install.
// Pruning requires a clean git working tree so the diff is reviewable.

import { execSync } from "node:child_process"
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
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

const USAGE = "Usage: pnpm db:select <mongodb|postgres> [--prune]\n"

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

// ---------------------------------------------------------------------------
// Prune helpers
// ---------------------------------------------------------------------------

const checkCleanWorkingTree = () => {
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
    cwd: repoRoot,
  })
  if (status.trim()) {
    process.stderr.write(
      "Working tree is dirty. Commit or stash your changes before pruning so the\n" +
        "resulting diff is reviewable in isolation.\n"
    )
    process.exit(1)
  }
}

const removeLine = (content, line) =>
  content
    .split("\n")
    .filter((l) => l !== line)
    .join("\n")

const collapseBlankLines = (content) => content.replace(/\n{3,}/g, "\n\n")

const prunePayloadConfig = (backend) => {
  const filePath = join(
    repoRoot,
    "packages",
    "payload",
    "src",
    "payload.config.ts"
  )
  let content = readFileSync(filePath, "utf8")

  // Common: remove DB_DRIVERS from the env/database import
  content = content.replace(
    'import { DB_DRIVERS, resolveDatabase } from "@repo/env/database"',
    'import { resolveDatabase } from "@repo/env/database"'
  )
  // Common: remove the ts-pattern import (only used for the db match)
  content = removeLine(content, 'import { match } from "ts-pattern"')

  // Replace the multi-line db: match(...).exhaustive(), block
  const dbMatchRegex =
    /    db: match\(resolveDatabase\(\)\)[\s\S]*?\.exhaustive\(\),/

  if (backend === "postgres") {
    content = removeLine(
      content,
      'import { mongooseAdapter } from "@payloadcms/db-mongodb"'
    )
    content = content.replace(
      dbMatchRegex,
      [
        "    db: postgresAdapter({",
        "      idType: \"uuid\",",
        "      migrationDir: path.resolve(dirname, \"migrations\"),",
        "      pool: { connectionString: resolveDatabase().url },",
        "    }),",
      ].join("\n")
    )
  } else {
    content = removeLine(
      content,
      'import { postgresAdapter } from "@payloadcms/db-postgres"'
    )
    content = content.replace(
      dbMatchRegex,
      "    db: mongooseAdapter({ url: resolveDatabase().url }),"
    )
  }

  writeFileSync(filePath, content)
}

const pruneAuthConfig = (backend) => {
  const filePath = join(repoRoot, "packages", "auth", "src", "index.ts")
  let content = readFileSync(filePath, "utf8")

  // Common: remove DB_DRIVERS from env/database import
  content = content.replace(
    'import { DB_DRIVERS, resolveDatabase } from "@repo/env/database"',
    'import { resolveDatabase } from "@repo/env/database"'
  )
  // Common: remove ts-pattern import
  content = removeLine(content, 'import { match } from "ts-pattern"')

  // Replace the full createDatabaseAdapter function
  const adapterFnRegex =
    /const createDatabaseAdapter = \(\): BetterAuthOptions\["database"\] =>[\s\S]*?\.exhaustive\(\)/

  if (backend === "postgres") {
    content = removeLine(
      content,
      'import { mongodbAdapter } from "better-auth/adapters/mongodb"'
    )
    content = removeLine(content, 'import { MongoClient } from "mongodb"')
    content = content.replace(
      adapterFnRegex,
      [
        'const createDatabaseAdapter = (): BetterAuthOptions["database"] => {',
        "  const db = drizzle({",
        "    client: new Pool({ connectionString: resolveDatabase().url }),",
        "    schema,",
        "  })",
        '  return drizzleAdapter(db, { provider: "pg", schema })',
        "}",
      ].join("\n")
    )
  } else {
    content = removeLine(
      content,
      'import { drizzleAdapter } from "better-auth/adapters/drizzle"'
    )
    content = removeLine(content, 'import { drizzle } from "drizzle-orm/node-postgres"')
    content = removeLine(content, 'import { Pool } from "pg"')
    content = removeLine(
      content,
      'import { account, session, user, verification } from "./schema"'
    )
    content = removeLine(
      content,
      "const schema = { account, session, user, verification }"
    )
    content = content.replace(
      adapterFnRegex,
      [
        'const createDatabaseAdapter = (): BetterAuthOptions["database"] =>',
        "  mongodbAdapter(new MongoClient(resolveDatabase().url).db(), { transaction: false })",
      ].join("\n")
    )
    content = collapseBlankLines(content)
  }

  writeFileSync(filePath, content)
}

const prunePackageJson = (pkgPath, { deps = [], devDeps = [], scripts = [] }) => {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  for (const key of deps) {
    delete pkg.dependencies?.[key]
  }
  for (const key of devDeps) {
    delete pkg.devDependencies?.[key]
  }
  for (const key of scripts) {
    delete pkg.scripts?.[key]
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

const pruneDockerCompose = (service) => {
  const filePath = join(repoRoot, "docker-compose.yml")
  let content = readFileSync(filePath, "utf8")

  if (service === "mongodb") {
    content = content.replace(
      /  mongodb:\n    image: mongo:8\n    ports:\n      - "27017:27017"\n    volumes:\n      - mongodb_data:\/data\/db\n\n/,
      ""
    )
    content = content.replace("  mongodb_data:\n", "")
  } else {
    content = content.replace(
      /  postgres:\n    image: postgres:17\n    ports:\n      - "5432:5432"\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: starter\n    volumes:\n      - postgres_data:\/var\/lib\/postgresql\/data\n\n/,
      ""
    )
    content = content.replace("  postgres_data:\n", "")
  }

  writeFileSync(filePath, content)
}

const pruneOrphanedCatalogEntries = () => {
  const workspacePath = join(repoRoot, "pnpm-workspace.yaml")
  const workspaceContent = readFileSync(workspacePath, "utf8")

  // Collect all package.json files in apps/* and packages/*
  const packageJsonPaths = []
  for (const dir of ["apps", "packages"]) {
    const base = join(repoRoot, dir)
    if (!existsSync(base)) continue
    for (const name of readdirSync(base)) {
      const pkgPath = join(base, name, "package.json")
      if (existsSync(pkgPath)) packageJsonPaths.push(pkgPath)
    }
  }

  // Collect all dep names referenced as "catalog:" in remaining package.json files
  const referencedKeys = new Set()
  for (const pkgPath of packageJsonPaths) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    for (const section of [
      pkg.dependencies,
      pkg.devDependencies,
      pkg.peerDependencies,
    ]) {
      if (!section) continue
      for (const [key, value] of Object.entries(section)) {
        if (typeof value === "string" && value.startsWith("catalog")) {
          referencedKeys.add(key)
        }
      }
    }
  }

  // Remove entries from the `catalog:` block only (not `catalogs:` sub-blocks).
  // Track which YAML block we're in by watching for the top-level `catalog:` key.
  const lines = workspaceContent.split("\n")
  let inCatalogBlock = false
  const filtered = lines.filter((line) => {
    if (/^catalog:/.test(line)) {
      inCatalogBlock = true
      return true
    }
    // Any non-blank, non-comment line at column-0 exits the catalog block
    if (inCatalogBlock && /^[a-zA-Z]/.test(line)) {
      inCatalogBlock = false
    }
    if (!inCatalogBlock) return true

    // Inside catalog block: check if this 2-space-indented entry is still used
    const entryMatch = line.match(/^  ['"]?([^'":\s]+)['"]?\s*:/)
    if (!entryMatch) return true
    return referencedKeys.has(entryMatch[1])
  })

  const result = filtered.join("\n")
  if (result !== workspaceContent) {
    writeFileSync(workspacePath, result)
  }
}

const deleteIfExists = (filePath) => {
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true, recursive: true })
  }
}

const runInstall = () => {
  execSync("pnpm install", { stdio: "inherit", cwd: repoRoot })
}

const pruneBackend = (backend) => {
  process.stdout.write("Pruning payload.config.ts...\n")
  prunePayloadConfig(backend)

  process.stdout.write("Pruning auth/index.ts...\n")
  pruneAuthConfig(backend)

  process.stdout.write("Updating package.json files...\n")
  if (backend === "postgres") {
    prunePackageJson(join(repoRoot, "packages", "payload", "package.json"), {
      deps: ["@payloadcms/db-mongodb"],
    })
    prunePackageJson(join(repoRoot, "apps", "web", "package.json"), {
      deps: ["@payloadcms/db-mongodb"],
    })
    prunePackageJson(join(repoRoot, "packages", "auth", "package.json"), {
      deps: ["mongodb"],
    })
  } else {
    prunePackageJson(join(repoRoot, "packages", "payload", "package.json"), {
      deps: ["@payloadcms/db-postgres"],
    })
    prunePackageJson(join(repoRoot, "packages", "auth", "package.json"), {
      deps: ["drizzle-orm", "pg"],
      devDeps: ["drizzle-kit", "@types/pg"],
      scripts: ["db:generate", "db:push", "db:migrate"],
    })
  }

  process.stdout.write("Updating docker-compose.yml...\n")
  pruneDockerCompose(backend === "postgres" ? "mongodb" : "postgres")

  if (backend === "mongodb") {
    process.stdout.write("Removing Drizzle/Postgres-specific files...\n")
    deleteIfExists(join(repoRoot, "packages", "auth", "src", "schema.ts"))
    deleteIfExists(join(repoRoot, "packages", "auth", "drizzle.config.ts"))
    deleteIfExists(join(repoRoot, "packages", "auth", "drizzle"))
  }

  process.stdout.write("Removing orphaned catalog entries...\n")
  pruneOrphanedCatalogEntries()

  process.stdout.write("Running pnpm install...\n")
  runInstall()

  process.stdout.write(
    `\nPrune complete. The ${BACKENDS[backend].label} adapter is now the only backend installed.\n` +
      "Review the diff with `git diff` before committing.\n"
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2)
  const prune = args.includes("--prune")
  const backendArg = args.find((a) => !a.startsWith("--"))

  let backend = resolveBackend(backendArg)

  if (!backend) {
    if (backendArg) {
      process.stderr.write(`Unknown backend "${backendArg}".\n${USAGE}`)
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

  if (prune) {
    process.stdout.write("Checking working tree is clean...\n")
    checkCleanWorkingTree()
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

  if (prune) {
    pruneBackend(backend)
  } else {
    process.stdout.write(`\n${nextSteps(backend)}\n`)
  }
}

main()
