// Independent live verification of the 2610.26942-repair-elbow R slider.
// Navigates to the LIVE published URL and proves R=1 -> R=3 mutates both the
// heading text and the SVG chart, with zero console/page errors.
import { chromium } from "playwright";
import { createHash } from "node:crypto";

const URL = "https://marimo.edgelesslab.com/2610.26942-repair-elbow/";
function log(name, val) { console.log(`${name}: ${JSON.stringify(val)}`); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") {
    const t = msg.text();
    if (!/posthog|favicon|Failed to load resource|net::ERR_|Loading Pygments|Loaded Pygments|secure context|interrupts are not/i.test(t)) errors.push(`console.error: ${t}`);
  }
});

try {
  const resp = await page.goto(URL, { waitUntil: "networkidle" });
  log("navigate_status", resp?.status());
  if (resp?.status() !== 200) { console.error("FAIL: live URL did not return 200"); process.exit(1); }

  await page.waitForSelector("[data-chart='repair-elbow']", { timeout: 30000 });
  // Wait for the wasm kernel + first render to settle.
  await page.waitForFunction(() => !document.querySelector(".marimo-cell-loading, .loading, .cell-loading"), { timeout: 30000 }).catch(() => {});

  const svg = page.locator("svg[data-chart='repair-elbow']");

  // --- R=1 baseline ---
  const round1Attr = await svg.getAttribute("data-round");
  const heading1 = await page.locator("h2").filter({ hasText: /Operating point/ }).first().textContent();
  const svg1 = await svg.evaluate((el) => el.innerHTML);
  const hash1 = createHash("sha256").update(svg1).digest("hex");
  log("R=1 data-round", round1Attr);
  log("R=1 heading", heading1?.trim());
  log("R=1 svg_hash", hash1.slice(0, 16));
  if (round1Attr !== "1") { console.error("FAIL: initial R is not 1"); process.exit(1); }

  // --- Geometry for dragging the thumb to R=3 (max stop=3, step=1) ---
  const geo = await page.evaluate(() => {
    const s = document.querySelector("marimo-slider");
    const sr = s && s.shadowRoot;
    const thumb = sr && sr.querySelector("span[role='slider']");
    const track = sr && sr.querySelector("span.relative");
    return { thumb: thumb?.getBoundingClientRect(), track: track?.getBoundingClientRect() };
  });
  log("geo", geo);
  const t = geo.thumb, tr = geo.track;
  const thumbCx = t.x + t.width / 2;
  const thumbCy = t.y + t.height / 2;
  // R=3 -> rightmost stop: thumb center near (track.right - thumb.width/2).
  // Drag a little past the right edge so the slider clamps/snaps to max=3.
  const targetX = tr.right - t.width / 2 + 3;
  log("drag thumb center", { fromX: thumbCx, toX: targetX });

  await page.mouse.move(thumbCx, thumbCy);
  await page.mouse.down();
  await page.mouse.move(targetX, thumbCy, { steps: 12 });
  await page.mouse.up();

  // Wait for the kernel to re-run the reactive cell (chart data-round -> 3).
  await page.waitForFunction(
    () => document.querySelector("svg[data-chart='repair-elbow']")?.getAttribute("data-round") === "3",
    { timeout: 45000 },
  ).catch((e) => { console.error("FAIL: slider did not reach R=3:", e.message); process.exit(1); });
  await page.waitForTimeout(1000);

  // --- R=3 captured ---
  const round3Attr = await svg.getAttribute("data-round");
  const heading3 = await page.locator("h2").filter({ hasText: /Operating point/ }).first().textContent();
  const svg3 = await svg.evaluate((el) => el.innerHTML);
  const hash3 = createHash("sha256").update(svg3).digest("hex");
  log("R=3 data-round", round3Attr);
  log("R=3 heading", heading3?.trim());
  log("R=3 svg_hash", hash3.slice(0, 16));

  // Expected R=3 heading from source arithmetic:
  //   _added_mean_s[3]=285.1, _net[3]=80 -> _minutes_per_net[3]=285.1*1990/(80*60)=118.2
  //   _mean_s[3]=485.7
  // (157.6 is _fleet_hours[3]=285.1*1990/3600, which renders in the cost chart bar, NOT the heading.)
  const headingOk =
    !!heading3 &&
    heading3.includes("3 repair rounds") &&
    heading3.includes("+80 net theorems vs R=0") &&
    heading3.includes("485.7") &&
    heading3.includes("118.2");
  const chartMutated = hash1 !== hash3 && round3Attr === "3";
  const headingMutated = heading1?.trim() !== heading3?.trim();

  log("heading_mutated", headingMutated);
  log("chart_mutated", chartMutated);
  log("heading_exact_match", headingOk);
  log("errors", errors);

  const ok = round3Attr === "3" && chartMutated && headingMutated && headingOk && errors.length === 0;
  log("VERDICT", ok ? "PASS" : "FAIL");
  if (!ok) process.exit(1);
} finally {
  await browser.close();
}
