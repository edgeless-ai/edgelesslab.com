#!/usr/bin/env node
/** Native-resolution headless captures of existing gallery art; no uploads/publication.
 * Usage: node scripts/render-gallery-posters.mjs /absolute/output/directory
 * 1200×1800 CSS pixels at deviceScaleFactor=3 → 3600×5400 = 12×18 inches at 300 DPI.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const output = path.resolve(process.argv[2] || 'reports/gallery-posters');
await mkdir(output, { recursive: true });
const sources = [
  { slug: 'flow-field-calligraphy', title: 'Flow Field Calligraphy', hide: '#info', frames: 240 },
  { slug: 'lunar-flow-cartography', title: 'Lunar Flow Cartography', hide: '#hud-overlay, #controls, #info', frames: 240 },
];
const server = createServer(async (req, res) => {
  const source = sources.find(item => req.url === `/${item.slug}/`);
  if (!source) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end(await readFile(`public/creative-demos/${source.slug}/index.html`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const manifest = [];
try {
  for (const source of sources) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1800 }, deviceScaleFactor: 3 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let seed = 7497410;
      Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    });
    await page.route(/(?:p5(?:\.min)?\.js)(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      const library = await response.text();
      await route.fulfill({ response, body: library + `\np5.prototype.registerMethod('beforeSetup', function() { this.randomSeed(7497410); this.noiseSeed(7497410); });\np5.prototype.registerMethod('post', function() { if (this.frameCount >= ${source.frames}) { this.noLoop(); window.__printFrame = this.frameCount; } });` });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/${source.slug}/`, { waitUntil: 'load' });
    await page.addStyleTag({ content: `${source.hide} { display: none !important; }` });
    await page.waitForFunction(frame => window.__printFrame === frame, source.frames, { timeout: 180000 });
    if (errors.length) throw new Error(`${source.slug}: ${errors.join('; ')}`);
    const canvas = await page.locator('canvas').first().evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    if (canvas.width !== 3600 || canvas.height !== 5400) throw new Error(`Wrong native canvas size ${JSON.stringify(canvas)}`);
    const file = path.join(output, source.slug + '.png');
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
    const bytes = await readFile(file);
    const sourceBytes = await readFile(`public/creative-demos/${source.slug}/index.html`);
    manifest.push({ ...source, file: path.basename(file), source: `https://edgelesslab.com/creative-demos/${source.slug}/`, source_sha256: createHash('sha256').update(sourceBytes).digest('hex'), sha256: createHash('sha256').update(bytes).digest('hex'), width_px: 3600, height_px: 5400, print_width_inches: 12, print_height_inches: 18, effective_dpi: 300, seed: 7497410, native_canvas: canvas, private_only: true });
    console.log(`PASS ${source.slug}: native ${canvas.width}x${canvas.height}, frame ${source.frames}, ${bytes.length} bytes`);
    await page.close();
  }
  await writeFile(path.join(output, 'masters.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
