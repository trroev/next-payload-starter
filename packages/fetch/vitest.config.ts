import { sharedConfig } from "@repo/testing/vitest.shared"
import { mergeConfig } from "vitest/config"

export default mergeConfig(sharedConfig, {
  test: {
    // Vite reserves BASE_URL as its public base path and injects "/" into
    // process.env, which fails `@repo/env/fetch`'s URL schema. Blank it so
    // emptyStringAsUndefined treats it as unset; tests pass baseURL explicitly.
    env: { BASE_URL: "" },
    setupFiles: ["@repo/testing/msw/setup"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
  },
})
