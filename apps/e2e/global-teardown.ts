import { MongoClient } from "mongodb"

const globalTeardown = async (): Promise<void> => {
  const uri = process.env.E2E_MONGODB_URI
  const dbName = process.env.E2E_RUN_DB_NAME
  if (!(uri && dbName)) {
    return
  }
  const client = new MongoClient(uri)
  try {
    await client.connect()
    await client.db(dbName).dropDatabase()
  } finally {
    await client.close()
  }
}

export default globalTeardown
