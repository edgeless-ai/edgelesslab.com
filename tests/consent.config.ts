import { defineConfig } from "@playwright/test";
import path from "node:path";
import base from "../playwright.config";

const webServer = base.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Consent tests require the static export server");

export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: "consent.spec.ts",
  timeout: 45_000,
  webServer: { ...webServer, cwd: path.resolve(__dirname, "..") },
  // Full Chromium keeps a normal UA client-hint identity. The separate headless
  // shell is classified as a bot by PostHog and suppresses the transport under test.
  use: { ...base.use, channel: "chromium", launchOptions: { args: ["--disable-blink-features=AutomationControlled"] } },
});
