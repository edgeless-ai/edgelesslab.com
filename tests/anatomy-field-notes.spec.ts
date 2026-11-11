import { test, expect } from "@playwright/test";

const slug = "kanban-dispatcher";
const held = ["eval-bench", "bid-no-bid", "mechanical-watch", "turbofan", "water-wheel", "windmill", "trebuchet"];

test("curated Anatomy gallery exposes only the publication candidate", async ({ page }) => {
  await page.goto("/field-notes/");
  await page.getByRole("button", { name: /^Curated / }).click();
  await page.getByRole("button", { name: "Anatomy", exact: true }).click();
  const card = page.locator(`a[href="/creative-demos/${slug}/"]`);
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Kanban dependency sorter");
  for (const name of held) {
    await expect(page.locator(`a[href="/creative-demos/${name}/"]`)).toHaveCount(0);
  }
});

for (const filename of ["index.html", "light.html"]) {
  for (const width of [375, 390, 1440]) {
    test(`Anatomy ${slug}/${filename} at ${width}px: built controls and layout`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      const remoteRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== new URL(testInfo.project.use.baseURL!).origin) remoteRequests.push(request.url());
      });
      const response = await page.goto(`/creative-demos/${slug}/${filename}`);
      expect(response?.status()).toBe(200);
      const svg = page.locator(".iso-stage svg");
      await expect(svg).toBeVisible();
      await expect(page.locator(".field-note-nav")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator("html").getAttribute("data-preserve-inline-styles")).not.toBeNull();

      const before = await page.locator("[data-demo-counts]").innerText();
      await page.locator('[data-action="drop"]').click();
      await expect(page.locator("[data-demo-counts]")).not.toHaveText(before);
      await page.locator('[data-action="parent"]').click();
      const poseBefore = await svg.innerHTML();
      await page.locator('[data-action="parent"]').click();
      await expect(page.locator('[data-readout]')).not.toContainText("parents hold");
      expect(await svg.innerHTML()).not.toBe(poseBefore);
      await expect(page.locator('[data-demo-counts]')).toContainText("1 running");
      await page.locator('[data-action="block"]').click();
      await expect(page.locator('[data-demo-counts]')).toContainText("1 blocked");
      await page.locator('[data-action="unblock"]').click();
      await expect(page.locator('[data-demo-counts]')).toContainText("0 blocked");

      await page.locator(".field-note-context > details > summary").click();
      await expect(page.locator(".field-note-context")).toContainText("local illustrative state machine");
      await page.locator(".field-note-context > details > summary").click();
      await page.mouse.move(0, 0);
      await page.screenshot({ path: testInfo.outputPath(`${slug}-${filename}-${width}.png`), fullPage: true });
      expect(errors).toEqual([]);
      expect(remoteRequests).toEqual([]);
    });
  }
}
