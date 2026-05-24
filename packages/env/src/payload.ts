import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const env = createEnv({
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  server: {
    PAYLOAD_ADMIN_EMAIL: z.email().nullish(),
    PAYLOAD_ADMIN_PASSWORD: z.string().nullish(),
    PAYLOAD_ADMIN_PREFILL_ONLY: z.stringbool().default(false),
    PAYLOAD_SECRET: z.string(),
  },
})

export { env }
