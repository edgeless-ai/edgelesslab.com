import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../public/tldraw/3.15.6/manifest.json";

test("Swarm Specimen uses real local fonts under CSP and exports its ecology", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const violations: unknown[] = [];
  const requests: string[] = [];
  const fontResponses: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  page.on("response", response => {
    if (response.url().includes("/tldraw/") && response.ok()) fontResponses.push(response.url());
  });
  await page.exposeFunction("recordViolation", (value: unknown) => violations.push(value));
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", event => {
    void (window as unknown as { recordViolation: (value: unknown) => Promise<void> }).recordViolation({
      directive: event.effectiveDirective, blockedURI: event.blockedURI,
    });
  }));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const homeRequests = [...requests];
  requests.length = 0;
  await page.goto("/lab/swarm-specimen/?seed=1");
  await expect(page.getByRole("button", { name: "▶ Run", exact: true })).toBeVisible();
  await expect(page.locator(".ss-stats")).toContainText("t0");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.locator(".ss-stats")).not.toContainText("t0 ·");
  await page.getByRole("button", { name: "❚❚ Pause", exact: true }).click();
  await page.getByRole("button", { name: "↺ Reset", exact: true }).click();
  await expect(page.locator(".ss-stats")).toContainText("t0");
  await expect(page.getByText("seed 1", { exact: true })).toBeVisible();
  const before = await page.locator(".ss-stats").textContent();
  const total = Number(before!.match(/\/(\d+) alive/)![1]);
  await page.getByRole("button", { name: "＋ Add agent", exact: true }).click();
  // Click the actual SVG field, not an SDK chrome/control surface.
  await page.locator('.ss-canvas svg[viewBox="0 0 1000 640"]').click();
  await expect(page.locator(".ss-stats")).toContainText(`/${total + 1} alive`);
  // Exercise every supplied font, including styles not used by the custom shape.
  await page.evaluate(async fonts => {
    for (const [key, asset] of Object.entries(fonts)) {
      const face = new FontFace(key, `url("${asset.url}")`);
      await face.load();
      document.fonts.add(face);
      if (face.status !== "loaded") throw new Error(`Font not loaded: ${key}`);
    }
    await document.fonts.ready;
  }, manifest.fonts);
  for (const asset of Object.values(manifest.fonts)) {
    expect(fontResponses.some(url => url.endsWith(asset.url))).toBe(true);
    const response = await page.request.get(asset.url);
    expect(response.status()).toBe(200);
    expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(asset.sha256);
  }
  for (const asset of manifest.images) {
    const response = await page.request.get(asset.url);
    expect(response.status()).toBe(200);
    expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(asset.sha256);
  }
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Export", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("swarm-specimen-1.png");
  const path = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.length).toBeGreaterThan(10000);
  // Inspect decoded pixels: this is a scene export, not merely a blank PNG.
  const image = await page.evaluate(async base64 => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(img, 0, 0);
    const data = context.getImageData(0, 0, img.width, img.height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 30) colored++;
    }
    return { width: img.width, height: img.height, colored };
  }, bytes.toString("base64"));
  expect(image.colored).toBeGreaterThan(1000);
  await page.waitForLoadState("networkidle");
  const jsRequests = requests.filter(url => /\/_next\/.*\.js$/.test(url));
  const tldrawChunks: string[] = [];
  for (const url of jsRequests) {
    const content = await (await page.request.get(url)).text();
    if (content.includes("tldraw")) tldrawChunks.push(url);
  }
  expect(tldrawChunks.length).toBeGreaterThan(0);
  expect(homeRequests.filter(url => tldrawChunks.includes(url))).toEqual([]);
  expect(requests.filter(url => url.includes("cdn.tldraw.com"))).toEqual([]);
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
  await testInfo.attach("browser-evidence", { body: JSON.stringify({ errors, violations, fontResponses, tldrawChunks, homeTldrawRequests: [], agentTotal: total + 1, export: { filename: download.suggestedFilename(), bytes: bytes.length, ...image } }, null, 2), contentType: "application/json" });
  await testInfo.attach("export", { path, contentType: "image/png" });
});
