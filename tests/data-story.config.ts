import { defineConfig } from "@playwright/test";
import path from "node:path";
import base from "../playwright.config";

const webServer = base.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Data story tests require the static export server");

export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: "data-story.spec.ts",
  webServer: { ...webServer, cwd: path.resolve(__dirname, "..") },
});
