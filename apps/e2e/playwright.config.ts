import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"
import { getOrInitTestEnv } from "./src/fixtures/test-env"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const { mongoUri, baseUrl } = getOrInitTestEnv()

const isCi = !!process.env.CI

export default defineConfig({
  testDir: "./src/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [["github"], ["list"]] : "list",
  globalSetup: path.resolve(dirname, "global-setup.ts"),
  globalTeardown: path.resolve(dirname, "global-teardown.ts"),
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    cwd: path.resolve(dirname, "../web"),
    url: baseUrl,
    timeout: 240_000,
    reuseExistingServer: !isCi,
    env: { MONGODB_URI: mongoUri },
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
})
