import { expect, test, type Page } from "@playwright/test";

const CONSENT_KEY = "edgeless.analytics-consent.v1";
const trackingHost = /https:\/\/(?:[^/]+\.)?posthog\.com\//;

async function analyticsStorage(page: Page) {
  return page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => /^(ph_|__ph_|edgeless\.analytics-id)/.test(key)),
    session: Object.keys(sessionStorage).filter((key) => /^(ph_|__ph_)/.test(key)),
    cookies: document.cookie.split(";").map((cookie) => cookie.trim()).filter((cookie) => /^(ph_|__ph_)/.test(cookie)),
  }));
}

test("no optional analytics before choice, after rejection, or after navigation", async ({ page, context }) => {
  const requests: string[] = [];
  // Regression tests observe attempted transport but never publish test analytics.
  await context.route(trackingHost, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: { status: "Ok" } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Analytics & cookies" })).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("Tab");
  await page.waitForTimeout(9000); // Covers the former 8-second unconditional startup.
  expect(requests).toEqual([]);
  expect(await analyticsStorage(page)).toEqual({ local: [], session: [], cookies: [] });
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Analytics & cookies" })).toHaveCount(0);
  await page.goto("/about/");
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("rejected");
  expect(requests).toEqual([]);
  expect(await analyticsStorage(page)).toEqual({ local: [], session: [], cookies: [] });
  const settings = page.getByRole("button", { name: "Analytics settings", exact: true });
  await settings.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Analytics & cookies" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
});

test("accepted analytics, failed-request revocation, and fresh reacceptance", async ({ page, context }) => {
  const requests: string[] = [];
  let fail = true;
  await context.route(trackingHost, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: fail ? 503 : 200, json: { status: fail ? "error" : "Ok" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  // This check deliberately requires the build's existing PostHog project key.
  await expect.poll(() => requests.length, { timeout: 12_000 }).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Analytics settings", exact: true }).click();
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page.getByRole("button", { name: "Revoke analytics consent", exact: true }).click(),
  ]);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("rejected");
  const afterRevoke = requests.length;
  await page.waitForTimeout(9000); // Covers SDK failed-request retries after opt-out.
  expect(requests.length).toBe(afterRevoke);
  expect(await analyticsStorage(page)).toEqual({ local: [], session: [], cookies: [] });
  fail = false;
  await page.getByRole("button", { name: "Analytics settings", exact: true }).click();
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(afterRevoke);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("accepted");
});

test("existing unconsented identifiers are cleared and mobile controls fit", async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await context.addInitScript(() => {
    localStorage.setItem("ph_old_project_posthog", "legacy");
    sessionStorage.setItem("ph_old_project_posthog", "legacy");
    localStorage.setItem("edgeless.analytics-id.v1", "old-identifier");
    document.cookie = "ph_old_project_posthog=legacy; path=/";
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Reject analytics", exact: true })).toBeVisible();
  expect(await analyticsStorage(page)).toEqual({ local: [], session: [], cookies: [] });
  for (const name of ["Accept analytics", "Reject analytics"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
