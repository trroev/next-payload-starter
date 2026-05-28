import { createEnv } from "@t3-oss/env-nextjs"
import { match, P } from "ts-pattern"
import { z } from "zod"

const TRAILING_SLASH = /\/$/

const resolvedBase = match({
  base: process.env.BASE_URL,
  vercel: process.env.VERCEL_URL,
})
  .with({ base: P.string.startsWith("http") }, ({ base }) => base)
  .with(
    { base: P.string },
    ({ base }) => `https://${base.replace(TRAILING_SLASH, "")}`
  )
  .with(
    { base: P.nullish, vercel: P.string },
    ({ vercel }) => `https://${vercel}`
  )
  .with({ base: P.nullish, vercel: P.nullish }, () => undefined)
  .exhaustive()

if (resolvedBase !== undefined) {
  process.env.BASE_URL = resolvedBase
}

const env = createEnv({
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  server: {
    BASE_URL: z.string().url(),
    REVALIDATION_SECRET: z.string(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV,
  },
})

export { env }
