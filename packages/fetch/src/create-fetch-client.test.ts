import { HttpResponse, http, server } from "@repo/testing/msw"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { createFetchClient, fetchClient } from "./create-fetch-client"

const BASE_URL = "https://api.test"

const makeClient = () =>
  createFetchClient({ baseURL: BASE_URL, retry: 0, timeout: 1000 })

describe("createFetchClient", () => {
  it("exposes a pre-configured client and a factory for fresh clients", () => {
    expect(typeof fetchClient).toBe("function")
    expect(typeof createFetchClient).toBe("function")
    expect(makeClient()).not.toBe(makeClient())
  })

  it("validates a successful response against a Zod output schema", async () => {
    server.use(
      http.get(`${BASE_URL}/widget`, () =>
        HttpResponse.json({ id: "w1", name: "Widget" })
      )
    )
    const widgetSchema = z.object({ id: z.string(), name: z.string() })

    const { data, error } = await makeClient()("/widget", {
      output: widgetSchema,
    })

    expect(error).toBeNull()
    expect(data).toEqual({ id: "w1", name: "Widget" })
  })

  it("returns a typed error on a non-OK response instead of throwing", async () => {
    server.use(
      http.get(`${BASE_URL}/widget`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    )

    const { data, error } = await makeClient()("/widget")

    expect(data).toBeNull()
    expect(error?.status).toBe(500)
  })

  it("serializes a JSON body and forwards the Authorization header", async () => {
    let captured: { auth: string | null; body: unknown } | undefined
    server.use(
      http.post(`${BASE_URL}/revalidate`, async ({ request }) => {
        captured = {
          auth: request.headers.get("authorization"),
          body: await request.json(),
        }
        return HttpResponse.json({ revalidated: true })
      })
    )

    const { data, error } = await makeClient()("/revalidate", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
      body: { slug: "hello-world" },
    })

    expect(error).toBeNull()
    expect(data).toEqual({ revalidated: true })
    expect(captured?.auth).toBe("Bearer secret")
    expect(captured?.body).toEqual({ slug: "hello-world" })
  })

  it("retries a failed request per the configured retry strategy", async () => {
    let calls = 0
    server.use(
      http.get(`${BASE_URL}/flaky`, () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json({ error: "transient" }, { status: 500 })
        }
        return HttpResponse.json({ ok: true })
      })
    )

    const retryingClient = createFetchClient({
      baseURL: BASE_URL,
      retry: { type: "linear", attempts: 2, delay: 1 },
    })
    const { data, error } = await retryingClient("/flaky")

    expect(calls).toBe(2)
    expect(error).toBeNull()
    expect(data).toEqual({ ok: true })
  })
})
