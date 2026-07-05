import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.SMOKE_PORT || "8877";

/**
 * Smoke tests run against the STATIC export in out/ (next.config output: "export").
 * There is no Next server in production — GitHub Pages serves out/ as plain files —
 * so we serve out/ with a dumb static file server and assert against that.
 *
 * Run `corepack pnpm@11 build` (or `npm run build`) first to produce out/.
 */
export default defineConfig({
  testDir: "tests",
  testMatch: "smoke.spec.ts",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `python3 -m http.server ${PORT} --directory out --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
