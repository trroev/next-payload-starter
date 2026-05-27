import { fetchClient } from "@repo/fetch"
import { createLogger } from "@repo/logger"
import type { GlobalAfterChangeHook } from "payload"
import { match, P } from "ts-pattern"

const log = createLogger({ name: "payload.revalidate-homepage" })

export const revalidateHomepage: GlobalAfterChangeHook = async ({ doc }) => {
  await match({
    baseUrl: process.env.BASE_URL,
    secret: process.env.REVALIDATION_SECRET,
  })
    .with(
      { baseUrl: P.string, secret: P.string },
      async ({ baseUrl, secret }) => {
        await fetchClient(`${baseUrl}/api/revalidate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}` },
          body: { tag: "homepage" },
        })
      }
    )
    .otherwise(() => {
      log.warn(
        "BASE_URL or REVALIDATION_SECRET not configured — skipping revalidation"
      )
    })

  return doc
}
