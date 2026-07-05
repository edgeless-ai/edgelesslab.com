import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Smoke tests against the static export (out/), served by a plain file server.
 * See playwright.config.ts — no Next server involved, mirroring GitHub Pages.
 */

test.describe("static site smoke", () => {
  test("home page responds with nav and hero", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page).toHaveTitle(/edgeless/i);
  });

  test("/lab/marimo/ lists 25 marimo.edgelesslab.com demos", async ({ page }) => {
    const response = await page.goto("/lab/marimo/");
    expect(response?.status()).toBe(200);
    const links = page.locator('a[href^="https://marimo.edgelesslab.com/"]');
    await expect(links.first()).toBeVisible();
    const hrefs = await links.evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href")),
    );
    const unique = new Set(hrefs);
    expect(unique.size).toBeGreaterThanOrEqual(25);
  });

  test("/creative/ renders demo cards", async ({ page }) => {
    const response = await page.goto("/creative/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const cards = page.locator('a[href^="/creative-demos/"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(10);
  });

  test("home page has no severe console errors", async ({ page }) => {
    // Known pre-existing issues (2026-07-05), filtered so this test only
    // catches NEW severe errors. Remove entries as the underlying bugs get fixed:
    //  - X-Frame-Options via <meta> is ignored by browsers (should be an HTTP header)
    //  - React error #418 = hydration mismatch on the home page
    const KNOWN_ISSUES = /X-Frame-Options may only be set via an HTTP header|Minified React error #418/;
    const errors: string[] = [];
    const record = (entry: string) => {
      if (!KNOWN_ISSUES.test(entry)) errors.push(entry);
    };
    page.on("pageerror", (err) => record(`pageerror: ${err.message}`));
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // Benign in the static-file-server context: analytics/beacon endpoints
      // don't exist here, and 404s for optional resources are not app bugs.
      if (/posthog|favicon|Failed to load resource|net::ERR_/i.test(text)) return;
      record(`console.error: ${text}`);
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(errors).toEqual([]);
  });
});
