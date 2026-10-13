import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Run against a static export built with a synthetic public PostHog test key.
// consent.spec.ts intercepts analytics transport; no test events reach providers.
export default defineConfig({
  ...config,
  testMatch: "consent.spec.ts",
  timeout: 45_000,
  projects: config.projects?.map((project) => ({
    ...project,
    use: {
      ...project.use,
      // PostHog filters HeadlessChrome as well as navigator.webdriver.
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    },
  })),
});
