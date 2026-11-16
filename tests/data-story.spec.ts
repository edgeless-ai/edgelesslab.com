import { expect, test } from "@playwright/test";

const route = "/blog/kanban-crash-wave/";

test("scrubbing and playback change the SVG geometry; pause holds it", async ({ page }) => {
  await page.goto(route);
  const chart = page.getByTestId("data-story-chart");
  await expect(chart).toBeVisible();
  await expect(page.getByText("8 / 195 runs")).toBeVisible();
  const path = page.getByTestId("crash-path");
  const mark = page.getByTestId("selected-mark");
  const firstPath = await path.getAttribute("d");
  const firstX = await mark.getAttribute("cx");
  await page.getByRole("slider", { name: "Select UTC start day" }).fill("3");
  await expect(page.getByText("657 / 958 runs")).toBeVisible();
  expect(await path.getAttribute("d")).not.toBe(firstPath);
  expect(await mark.getAttribute("cx")).not.toBe(firstX);
  const scrubbed = await path.getAttribute("d");
  await page.getByRole("button", { name: "Play data story" }).click();
  await expect.poll(() => path.getAttribute("d"), { timeout: 3500 }).not.toBe(scrubbed);
  await page.getByRole("button", { name: "Pause data story" }).click();
  const paused = await path.getAttribute("d");
  await page.waitForTimeout(1300);
  expect(await path.getAttribute("d")).toBe(paused);
});

test("mobile fallback, controls, and reduced-motion poster fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await page.goto(route);
  await expect(page.getByTestId("data-story-chart")).toBeVisible();
  await expect(page.getByRole("region", { name: "Crash status by UTC start day", exact: true }).locator("picture")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Animated preview (GIF)" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Select UTC start day" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.route("**/data-stories/kanban-crash-wave/daily.json", (request) => request.fulfill({ status: 503, body: "Unavailable" }));
  await page.reload();
  const fallback = page.getByAltText("Daily crash-status chart while aggregates are unavailable");
  await expect(fallback).toBeVisible();
  await expect.poll(() => fallback.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("preview.gif");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => fallback.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("poster.png");
});

test("no-JavaScript poster and dataset link remain available", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.getByAltText("Daily crash-status chart preview")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the daily aggregates" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Run the notebook (.py)" })).toBeVisible();
  await context.close();
});

test("failed data request shows a poster without inventing data or hiding source links", async ({ page }) => {
  await page.route("**/data-stories/kanban-crash-wave/daily.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto(route);
  await expect(page.getByRole("alert").filter({ hasText: "Data story unavailable:" })).toContainText("HTTP 503");
  await expect(page.getByAltText("Daily crash-status chart while aggregates are unavailable")).toBeVisible();
  await expect(page.getByTestId("data-story-chart")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Run the notebook (.py)" })).toBeVisible();
});
