import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Optional here (unlike the required BASE_URL in `@repo/env/app`) so importing
// `@repo/fetch` never throws when BASE_URL is unset.
const env = createEnv({
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {},
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  server: {
    BASE_URL: z.string().url().optional(),
  },
})

export { env }
