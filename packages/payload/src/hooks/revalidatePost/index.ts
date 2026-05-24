import type { CollectionAfterChangeHook } from "payload"
import { match, P } from "ts-pattern"

export const revalidatePost: CollectionAfterChangeHook = async ({ doc }) => {
  await match({
    status: doc._status,
    baseUrl: process.env.BASE_URL,
    secret: process.env.REVALIDATION_SECRET,
  })
    .with(
      { status: "published", baseUrl: P.string, secret: P.string },
      async ({ baseUrl, secret }) => {
        try {
          const res = await fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({ slug: doc.slug }),
          })
          if (!res.ok) {
            console.error(
              `[revalidatePost] Revalidation failed: ${res.status} ${res.statusText}`
            )
          }
        } catch (error) {
          console.error("[revalidatePost] Revalidation request failed:", error)
        }
      }
    )
    .with({ status: "published" }, () => {
      console.warn(
        "[revalidatePost] BASE_URL or REVALIDATION_SECRET not configured — skipping revalidation"
      )
    })
    .otherwise(() => undefined)

  return doc
}
