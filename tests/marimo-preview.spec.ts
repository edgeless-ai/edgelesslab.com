import { test, expect } from "@playwright/test";
import { marimoDemos } from "../src/lib/marimo-demos";
import { validateMarimoCatalog } from "../src/lib/marimo-gallery-contract";

const published = validateMarimoCatalog(marimoDemos);

for (const width of [1440, 390]) {
  test(`gallery previews use registered URLs and pass frame CSP (offline fixtures) at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    const violations: string[] = [];
    await page.exposeFunction("recordPreviewDenial", (url: string) => violations.push(url));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        if (event.effectiveDirective === "frame-src") {
          (window as unknown as { recordPreviewDenial: (url: string) => void }).recordPreviewDenial(event.blockedURI);
        }
      });
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      // Next prefetches /feed.xml/__next.* while scrolling the footer;
      // that unrelated static-export 404 is not a notebook/CSP failure.
      if (message.type() === "error" && !/\/feed\.xml\/__next\./.test(message.location().url)) {
        errors.push(message.text());
      }
    });
    // Explicit offline fixture: exercise actual browser CSP without Pyodide/CDN
    // availability. Real notebook rendering is a separate publication probe.
    const urls = new Set(published.map((demo) => demo.published_url));
    await page.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const canonical = url.origin.startsWith("http://127.0.0.1:")
        ? `https://edgelesslab.com${url.pathname}` : request.url();
      if (request.isNavigationRequest() && urls.has(canonical)) {
        return route.fulfill({ contentType: "text/html", body: "<!doctype html><p>Offline notebook preview fixture</p>" });
      }
      return route.continue();
    });
    await page.goto("/lab/marimo/");
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    for (const demo of published) {
      const card = page.locator("main a:has(h3)").filter({
        has: page.getByRole("heading", { name: demo.title, exact: true }),
      });
      await card.scrollIntoViewIfNeeded();
      const frame = card.locator("iframe");
      const url = new URL(demo.published_url);
      const expected = url.origin === "https://edgelesslab.com"
        ? `${url.pathname}${url.search}${url.hash}` : demo.published_url;
      await expect(frame).toHaveAttribute("src", expected);
      await expect(frame.contentFrame().locator("body")).toHaveText("Offline notebook preview fixture");
    }
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`gallery CSP blocks unrelated and lookalike iframe hosts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const blocked = [
      "https://notebooks.example.invalid/",
      "https://other.edgelesslab.com/",
      "https://marimo.edgelesslab.com.evil.example/",
      "http://marimo.edgelesslab.com/",
    ];
    const requests: string[] = [];
    const violations: string[] = [];
    await page.exposeFunction("recordFrameDenial", (url: string) => violations.push(url));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        if (event.effectiveDirective === "frame-src") {
          (window as unknown as { recordFrameDenial: (url: string) => void }).recordFrameDenial(event.blockedURI);
        }
      });
    });
    await page.route("**/*", (route) => {
      if (blocked.includes(route.request().url())) {
        requests.push(route.request().url());
        return route.fulfill({ contentType: "text/html", body: "Forbidden fixture must never load" });
      }
      // Do not boot neighboring Pyodide notebooks during this offline denial
      // check. CSP still runs before route interception, including the probes.
      if (route.request().isNavigationRequest() && route.request().frame().parentFrame()) {
        return route.fulfill({ contentType: "text/html", body: "Non-target notebook fixture" });
      }
      return route.continue();
    });
    await page.goto("/lab/marimo/");
    await page.evaluate((urls) => {
      for (const url of urls) {
        const frame = document.createElement("iframe");
        frame.src = url;
        document.body.append(frame);
      }
    }, blocked);
    await expect.poll(() => [...violations].sort()).toEqual(blocked.map((url) => new URL(url).origin).sort());
    expect(requests).toEqual([]);
  });
}
