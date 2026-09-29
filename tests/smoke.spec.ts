import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Smoke tests against the static export (out/), served by a plain file server.
 * See playwright.config.ts — no Next server involved, mirroring GitHub Pages.
 */

test.describe("static site smoke", () => {
  test("creative-loop study is discoverable without implying a built demo", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/field-notes/");
    await page.getByRole("button", { name: /^Curated / }).click();
    await page.getByRole("searchbox", { name: "Search Field Notes" }).fill("Borrow the creative loop");
    const card = page.locator('a[href="/creative-demos/borrow-the-creative-loop/"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText("Not built");
    await card.hover();
    await expect(card.locator("iframe")).toHaveCount(0);
    await card.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Borrow the creative loop, not the artwork");
    await expect(page.getByText("Status: a design study, not a working instrument.", { exact: true })).toBeVisible();
    await expect(page.locator("canvas, iframe")).toHaveCount(0);
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /Download the prototype acceptance card/ }).click();
    expect((await download).suggestedFilename()).toBe("acceptance-card.md");
    const cardResponse = await page.request.get("/creative-demos/borrow-the-creative-loop/acceptance-card.md");
    expect(cardResponse.status()).toBe(200);
    expect(await cardResponse.text()).toContain("all instrument tests NOT RUN");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("creative-loop study is indexed by site search", async ({ page }) => {
    await page.goto("/blog/");
    await page.getByRole("button", { name: /Search/ }).click();
    const searchInput = page.getByRole("textbox", { name: "Search site content" });
    // Opening resets the query and focuses on the next animation frame.
    await expect(searchInput).toBeFocused();
    await searchInput.fill("Borrow the creative loop");
    await expect(searchInput).toHaveValue("Borrow the creative loop");
    await expect(page.locator("[data-index]").filter({ hasText: /Borrow the creative loop/i }).first()).toBeVisible({ timeout: 10_000 });
  });

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

  test("/field-notes/ renders the featured studies", async ({ page }) => {
    // Match the canonical trailing-slash route emitted by the static export.
    const response = await page.goto("/field-notes/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Field Notes" })).toBeVisible();
    const cards = page.locator('a[href^="/creative-demos/"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
  });

  test("command palette opens and searches without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/blog/");
    await page.getByRole("button", { name: /Search/ }).click();

    const searchInput = page.getByRole("textbox", { name: "Search site content" });
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Total Serialism");
    await expect(
      page.locator("[data-index]").filter({ hasText: /Total Serialism/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test("/lab/prompt-engine/ loads and generates a batch", async ({ page }) => {
    const response = await page.goto("/lab/prompt-engine/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Prompt Engine" })).toBeVisible();

    // Default batch size is 24; generating may lazy-fetch the museum sref pack.
    await page.getByRole("button", { name: /^Generate/ }).click();
    const cards = page.locator("[data-prompt-card]");
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    expect(await cards.count()).toBeGreaterThanOrEqual(12);
    await expect(page.locator("[data-copy-prompt]").first()).toBeVisible();
  });

  test("/lab/prompt-engine/ generates with a custom-taste subject", async ({ page }) => {
    await page.goto("/lab/prompt-engine/");
    await expect(page.getByRole("heading", { name: "Prompt Engine" })).toBeVisible();

    // This flow customizes the TAGGED subject bank, so pick the theme that reads
    // from it. As of the r30 bank refresh the default (Nous Branded) draws from
    // the wide subject bank, where these tagged entries never surface.
    await page.getByRole("button", { name: /Colorist Typography/ }).click();

    // Open the Customize (bring-your-own-taste) drawer.
    await page.getByRole("button", { name: /Customize banks/ }).click();

    // Expand the tagged Subjects axis and add a distinctive custom subject.
    const SUBJECT = "a quokka wearing a brass monocle";
    await page.getByRole("button", { name: /Subjects \(tagged bank\)/ }).click();
    await page.getByLabel("Subject text").fill(SUBJECT);
    await page.getByRole("button", { name: "Add subject" }).click();

    // Replace so ONLY the custom subject can be picked — makes the effect of
    // the custom bank deterministic in the generated batch.
    await page
      .getByRole("switch", { name: /Replace \(use only my entries/ })
      .click();

    // Generate a real batch; it must roll with the resolved custom banks.
    await page.getByRole("button", { name: /^Generate/ }).click();
    const cards = page.locator("[data-prompt-card]");
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });

    // The custom subject must surface in the real generated output.
    await expect(
      cards.filter({ hasText: SUBJECT }).first(),
    ).toBeVisible({ timeout: 20_000 });
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

// The publishable architecture is an independent public document, not a view
// into operational data. Exercise its real controls in the static export.
test("public swarm Field Note is discoverable and interactive", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/field-notes/");
  const link = page.locator('a[href="/creative-demos/connected-learning-swarm/"]');
  await expect(link).toContainText("The Return Path");
  await link.click();
  await expect(page.getByRole("heading", { name: "The Return Path", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play walkthrough" }).click();
  await expect(page.locator("#trace-counter")).toHaveText("Handoff 1 / 11");
  await expect(page.locator("#packet-layer animateMotion")).toHaveCount(1);
  await expect(page.locator(".graph-edge.active .wire")).toHaveCSS("stroke", "rgb(198, 242, 78)");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Work engine", exact: true }).click();
  await page.getByLabel("Follow a scenario", { exact: true }).selectOption("failure");
  await page.getByRole("button", { name: "Next handoff" }).click();
  await page.getByRole("button", { name: "Next handoff" }).click();
  await expect(page.locator("#trace-counter")).toHaveText("Handoff 2 / 5");
  await page.getByRole("button", { name: "Inspect Bounded recovery", exact: true }).click();
  await expect(page.locator("#detail-title")).toHaveText("Bounded recovery");
  await page.getByRole("button", { name: "Field sheet", exact: true }).click();
  await expect(page.locator("#architecture-svg")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.getByRole("button", { name: "Hide guide", exact: true }).click();
  await expect(page.locator(".walkthrough")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".walkthrough")).toBeVisible();
  expect(errors).toEqual([]);
});

test("public swarm Field Note fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/creative-demos/connected-learning-swarm/");
  await expect(page.getByRole("heading", { name: "The Return Path", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play walkthrough" })).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("#zoom-label")).toHaveText("125%");
});
