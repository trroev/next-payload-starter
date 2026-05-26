import { randomBytes } from "node:crypto"

const RUN_ID_ENV = "E2E_RUN_DB_NAME"
const TEST_URI_ENV = "E2E_MONGODB_URI"
const BASE_URL_ENV = "E2E_BASE_URL"

const buildTestDbName = (): string => {
  const suffix = randomBytes(4).toString("hex")
  return `e2e_test_${Date.now()}_${suffix}`
}

const buildTestMongoUri = ({
  baseUri,
  dbName,
}: {
  readonly baseUri: string
  readonly dbName: string
}): string => {
  const url = new URL(baseUri)
  url.pathname = `/${dbName}`
  return url.toString()
}

export const getOrInitTestEnv = (): {
  readonly dbName: string
  readonly mongoUri: string
  readonly baseUrl: string
} => {
  const existingDbName = process.env[RUN_ID_ENV]
  const existingUri = process.env[TEST_URI_ENV]
  if (existingDbName && existingUri) {
    return {
      dbName: existingDbName,
      mongoUri: existingUri,
      baseUrl: process.env[BASE_URL_ENV] ?? "http://localhost:3000",
    }
  }

  const baseUri = process.env.MONGODB_URI
  if (!baseUri) {
    throw new Error(
      "MONGODB_URI is required to run the E2E suite. Set it in your shell or .env.local."
    )
  }
  const dbName = buildTestDbName()
  const mongoUri = buildTestMongoUri({ baseUri, dbName })
  const baseUrl = process.env[BASE_URL_ENV] ?? "http://localhost:3000"

  process.env[RUN_ID_ENV] = dbName
  process.env[TEST_URI_ENV] = mongoUri
  process.env[BASE_URL_ENV] = baseUrl
  process.env.MONGODB_URI = mongoUri

  return { dbName, mongoUri, baseUrl }
}
