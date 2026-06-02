import { DB_DRIVERS } from "@repo/env/database"
import { MongoClient } from "mongodb"
import { Client } from "pg"
import { TEST_ENV_KEYS } from "./src/fixtures/test-env"

const dropMongoDatabase = async ({
  uri,
  dbName,
}: {
  readonly uri: string
  readonly dbName: string
}): Promise<void> => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    await client.db(dbName).dropDatabase()
  } finally {
    await client.close()
  }
}

const dropPostgresDatabase = async ({
  adminUri,
  dbName,
}: {
  readonly adminUri: string
  readonly dbName: string
}): Promise<void> => {
  const client = new Client({ connectionString: adminUri })
  await client.connect()
  try {
    // Drop any lingering sessions first so DROP DATABASE isn't blocked by
    // connections the web server left open (e.g. after a failed run).
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [dbName]
    )
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`)
  } finally {
    await client.end()
  }
}

const globalTeardown = async (): Promise<void> => {
  const driver = process.env[TEST_ENV_KEYS.driver]
  const dbName = process.env[TEST_ENV_KEYS.dbName]
  const dbUri = process.env[TEST_ENV_KEYS.dbUri]
  if (!(driver && dbName && dbUri)) {
    return
  }

  if (driver === DB_DRIVERS.postgres) {
    const adminUri = process.env[TEST_ENV_KEYS.adminUri]
    if (!adminUri) {
      return
    }
    await dropPostgresDatabase({ adminUri, dbName })
    return
  }

  await dropMongoDatabase({ uri: dbUri, dbName })
}

export default globalTeardown
