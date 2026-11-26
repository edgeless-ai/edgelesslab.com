import { test, expect } from "@playwright/test";
import { marimoDemos } from "../src/lib/marimo-demos";
import { validateMarimoCatalog } from "../src/lib/marimo-gallery-contract";

const published = validateMarimoCatalog(marimoDemos);

for (const width of [1440, 390]) {
  test(`gallery static cards never boot notebooks at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const workers: string[] = [];
    const frames: string[] = [];
    const consoleErrors: string[] = [];
    const runtimeRequests: string[] = [];
    const pageErrors: string[] = [];
    const resourceFailures: string[] = [];
    page.on("worker", (worker) => workers.push(worker.url()));
    page.context().on("serviceworker", (worker) => workers.push(worker.url()));
    page.on("frameattached", (frame) => frames.push(frame.url()));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => resourceFailures.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on("request", (request) => {
      const url = new URL(request.url());
      const notebook = published.some((demo) => {
        const target = new URL(demo.published_url);
        const sameOrigin = target.origin === "https://edgelesslab.com"
          ? url.origin === new URL(page.url()).origin : url.origin === target.origin;
        return sameOrigin && url.pathname.startsWith(target.pathname);
      });
      if (notebook || /pyodide|\.wasm(?:$|\?)/i.test(request.url())) {
        runtimeRequests.push(request.url());
      }
    });
    await page.goto("/lab/marimo/");
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    await expect(page.locator("main a:has(h3)")).toHaveCount(published.length);
    for (const demo of published) {
      const card = page.locator("main a:has(h3)").filter({
        has: page.getByRole("heading", { name: demo.title, exact: true }),
      });
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await card.focus();
      await expect(card).toHaveAttribute("href", demo.published_url);
      await expect(card).toHaveAttribute("target", "_blank");
      await expect(card).toHaveAttribute("rel", "noopener noreferrer");
      await expect(card).toContainText(demo.description);
      await expect(card.locator('[aria-hidden="true"]')).toContainText("Open notebook");
      await expect(page.locator("iframe")).toHaveCount(0);
    }
    // Exceed the former 20s RPC deadline after every card has been visited.
    await page.waitForTimeout(21_000);
    await test.info().attach("gallery-diagnostics", {
      body: JSON.stringify({ workers, frames, runtimeRequests, pageErrors, consoleErrors, resourceFailures }, null, 2),
      contentType: "application/json",
    });
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(frames).toEqual([]);
    expect(workers).toEqual([]);
    expect(runtimeRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
    // Retain unrelated navigation/prefetch aborts; this regression gates removal
    // of automatic notebook traffic, not global health of catalog destinations.

    expect(resourceFailures.filter((failure) => failure.includes("ERR_INSUFFICIENT_RESOURCES"))).toEqual([]);
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
