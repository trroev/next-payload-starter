import { env } from "@repo/env/auth"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { MongoClient } from "mongodb"

const client = new MongoClient(env.MONGODB_URI)

export function createAuth(
  extraOptions?: Readonly<Partial<BetterAuthOptions>>
) {
  return betterAuth({
    database: mongodbAdapter(client.db(), { transaction: false }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    ...extraOptions,
  })
}

export const auth = createAuth()

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
