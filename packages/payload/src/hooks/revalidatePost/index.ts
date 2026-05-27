import { fetchClient } from "@repo/fetch"
import { createLogger } from "@repo/logger"
import type { CollectionAfterChangeHook } from "payload"
import { match, P } from "ts-pattern"

const log = createLogger({ name: "payload.revalidate-post" })

export const revalidatePost: CollectionAfterChangeHook = async ({ doc }) => {
  await match({
    status: doc._status,
    baseUrl: process.env.BASE_URL,
    secret: process.env.REVALIDATION_SECRET,
  })
    .with(
      { status: "published", baseUrl: P.string, secret: P.string },
      async ({ baseUrl, secret }) => {
        await fetchClient(`${baseUrl}/api/revalidate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}` },
          body: { slug: doc.slug },
        })
      }
    )
    .with({ status: "published" }, () => {
      log.warn(
        "BASE_URL or REVALIDATION_SECRET not configured — skipping revalidation"
      )
    })
    .otherwise(() => undefined)

  return doc
}
