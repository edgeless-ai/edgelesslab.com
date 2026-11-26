import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against the static export first, then the custom domain after deployment.
const base = process.argv[2] || 'http://127.0.0.1:8877';
const dest = process.argv[3] || 'evidence/lia';
await mkdir(dest, { recursive: true });
const browser = await chromium.launch();
const results = { base, routes: [], citations: [], screenshots: [], errors: [] };
const check = (ok, message) => { if (!ok) results.errors.push(message); };
try {
  const page = await browser.newPage();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(`${base}/lia/`);
    check(response.status() === 200, '/lia/ must return 200');
    await page.screenshot({ path: `${dest}/lia-${width}.png`, fullPage: true });
    results.screenshots.push(`lia-${width}.png`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Landing overflow at ${width}`);
  }
  const links = await page.locator('[data-lia-index] a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  check(links.length === 3, 'Index must contain exactly three cleared artifacts');
  for (const href of links) {
    const response = await page.request.get(`${base}${href}`);
    results.routes.push({ href, status: response.status() });
    check(response.status() === 200, `Indexed route failed: ${href}`);
  }
  const note = '/lia/building-an-instrument-that-can-say-no/';
  await page.goto(`${base}${note}`);
  check(await page.locator('h1').innerText() === 'Building an Instrument That Can Say No', 'Field note heading missing');
  const citations = await page.locator('article a[href^="https:"]').evaluateAll(nodes => nodes.map(n => n.href));
  check(citations.length === 11, 'Expected eleven cleared citation links');
  for (const href of citations) {
    try {
      const response = await page.request.get(href, { timeout: 45000 });
      results.citations.push({ href, status: response.status(), finalUrl: response.url() });
      check(response.ok(), `Citation returned ${response.status()}: ${href}`);
    } catch (error) {
      results.citations.push({ href, error: String(error) });
      check(false, `Citation request failed: ${href}`);
    }
  }
  for (const route of ['/lia/', note]) {
    await page.goto(`${base}${route}`);
    const text = await page.locator('main').innerText();
    check(!/\/Users\/|research\/|audits\/|D-0\d\d|t_[a-f0-9]{8}|\b[a-f0-9]{40,64}\b/.test(text), `Private provenance leaked: ${route}`);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${route} at ${width}`);
      if (route === note) {
        await page.screenshot({ path: `${dest}/field-note-${width}.png`, fullPage: true });
        results.screenshots.push(`field-note-${width}.png`);
      }
    }
  }
  await page.goto(`${base}/field-notes/`);
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  const collection = schema.map(JSON.parse).find(s => s['@type'] === 'CollectionPage');
  check(collection.itemListElement.some(item => item.url === `https://edgelesslab.com${note}`), 'Field note absent from archive registry');
  check(collection.numberOfItems === collection.itemListElement.length, 'Schema count must match registry');
  check(await page.locator(`[data-editorial-note] a[href="${note}"]`).count() === 1, 'Field note missing from archive DOM');
} finally {
  await browser.close();
  await writeFile(`${dest}/probe.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
if (results.errors.length) process.exitCode = 1;
