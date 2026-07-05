import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only unit tests under src/. Playwright specs live in tests/ and must
    // never be picked up by vitest (they import @playwright/test).
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
