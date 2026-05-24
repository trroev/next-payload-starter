import type { GlobalAfterChangeHook } from "payload"
import { match, P } from "ts-pattern"

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
            console.error(
              `[revalidateHomepage] Revalidation failed: ${res.status} ${res.statusText}`
            )
          }
        } catch (error) {
          console.error(
            "[revalidateHomepage] Revalidation request failed:",
            error
          )
        }
      }
    )
    .otherwise(() => {
      console.warn(
        "[revalidateHomepage] BASE_URL or REVALIDATION_SECRET not configured — skipping revalidation"
      )
    })

  return doc
}
