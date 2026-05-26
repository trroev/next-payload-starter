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
        try {
          const res = await fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({ tag: "homepage" }),
          })
          if (!res.ok) {
            log
              .withMetadata({ status: res.status, statusText: res.statusText })
              .error("revalidation failed")
          }
        } catch (error) {
          log.withError(error).error("revalidation request failed")
        }
      }
    )
    .otherwise(() => {
      log.warn(
        "BASE_URL or REVALIDATION_SECRET not configured — skipping revalidation"
      )
    })

  return doc
}
