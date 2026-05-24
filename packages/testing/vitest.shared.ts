import { defineConfig } from "vitest/config"

export const sharedConfig = defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
})
