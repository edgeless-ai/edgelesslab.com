import { defineConfig } from "@playwright/test";

// Explicit publisher preflight, NOT part of offline CI (no flaky live dependency).
export default defineConfig({
  testDir: ".", testMatch: "publication.spec.ts", timeout: 60_000,
  workers: 2, retries: 0, reporter: "list",
});
