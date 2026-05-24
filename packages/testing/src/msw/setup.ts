import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./index"

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
