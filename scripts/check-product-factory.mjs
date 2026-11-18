#!/usr/bin/env node
/** Retirement outcome probe. Read-only: never creates checkout sessions or payments.
 * node scripts/check-product-factory.mjs --dir out --evidence /absolute/path
 * node scripts/check-product-factory.mjs --url https://edgelesslab.com --evidence /absolute/path
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = path.resolve(option('--dir', 'out'));
const evidence = path.resolve(option('--evidence', 'reports/product-factory'));
const shop = 'https://shop.edgelesslab.com/';
const failures = [];
const checks = [];
async function check(name, fn) {
  try { const detail = await fn(); checks.push({ name, detail }); console.log(`PASS ${name}${detail ? ': ' + detail : ''}`); }
  catch (error) { failures.push({ name, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}
let server;
let browser;
try {
  await mkdir(evidence, { recursive: true });
  let base = option('--url', '');
  if (!base) {
    server = createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = path.resolve(root, '.' + pathname);
        assert(file.startsWith(root + path.sep));
        if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(await readFile(file));
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  }
  base = base.replace(/\/$/, '');
  const get = async route => {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(30000) });
    assert(response.ok, `${route}: HTTP ${response.status}`);
    return response.text();
  };
  await check('legacy route is a redirect, not a catalog', async () => {
    const html = await get('/product-factory/');
    assert(!/data-sku=|id=["']grid["']|isn['’]t listed|mailto:/i.test(html), 'duplicate catalog, mailto or stray fallback remains');
    assert(/noindex/.test(html), 'retired route must be noindex');
    assert(html.includes(shop), 'missing real-shop fallback');
  });
  for (const route of ['/sitemap.xml', '/llms.txt', '/studio/']) {
    await check(`${route} does not advertise retired route`, async () => {
      assert(!(await get(route)).includes('/product-factory'), 'retired route remains discoverable');
    });
  }
  if (!option('--url', '')) await check('all exported gallery HTML has no legacy print links', async () => {
    let count = 0;
    for await (const file of htmlFiles(path.join(root, 'creative-demos'))) {
      const html = await readFile(file, 'utf8');
      assert(!/product-factory/.test(html), `legacy URL in ${file}`);
      assert(!/<a\b[^>]*href=["']mailto:[^>]*>\s*(?:Buy|View|Order)\s+Print/i.test(html), `mailto print purchase in ${file}`);
      count++;
    }
    return `${count} files`;
  });
  const catalogResponse = await fetch(shop + 'catalog.json', { signal: AbortSignal.timeout(30000) });
  assert(catalogResponse.ok, `catalog HTTP ${catalogResponse.status}`);
  const catalog = await catalogResponse.json();
  assert(catalog.designs?.length, 'empty real shop catalog');
  const known = catalog.designs.find(item => item.available && !item.sold_out);
  assert(known, 'no available listing for redirect witness');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Prove actual browser navigation, not merely an HTML/regex redirect declaration.
  for (const [query, expected] of [
    ['', shop],
    ['?sku=' + encodeURIComponent(known.slug), shop + '?d=' + encodeURIComponent(known.slug)],
    ['?sku=algorithmic-fluid-plotter', shop],
    ['?sku=https%3A%2F%2Fevil.invalid%2F&next=https%3A%2F%2Fevil.invalid', shop],
  ]) await check(`browser redirect ${query || '(base)'}`, async () => {
    await page.goto(base + '/product-factory/' + query, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(expected, { timeout: 15000 });
    const response = await page.request.get(expected);
    assert(response.ok(), `target HTTP ${response.status()}`);
    return expected;
  });
  const listingURLs = new Set();
  for (const route of ['/creative-demos/', '/field-notes/']) await check(`rendered ${route} print CTAs resolve to real listings`, async () => {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    const links = await page.locator('a').evaluateAll(anchors => anchors.map(a => ({ text: a.textContent, href: a.href })));
    for (const link of links) {
      assert(!link.href.includes('/product-factory'), `legacy link ${link.href}`);
      if (!/\b(buy|view|order)\s+print\b/i.test(link.text)) continue;
      const target = new URL(link.href);
      assert.equal(target.origin, new URL(shop).origin, `not a real-shop print link: ${link.href}`);
      const item = catalog.designs.find(item => item.slug === target.searchParams.get('d'));
      assert(item?.available && !item.sold_out, `unavailable listing: ${link.href}`);
      assert(item.image && item.price_usd > 0, `missing image/price: ${item.slug}`);
      listingURLs.add(link.href);
    }
    return `${links.filter(link => /\b(buy|view|order)\s+print\b/i.test(link.text)).length} buyable print CTAs (unlisted works have none)`;
  });
  for (const url of listingURLs) await check(`listing HTTP ${url}`, async () => {
    const response = await page.request.get(url);
    assert(response.ok(), `HTTP ${response.status()}`);
  });
  await check('retirement/gallery JavaScript has no page errors', async () => {
    // External shop application errors are recorded separately; the site remains the scope.
    return `${errors.length} page errors observed across site + external shop (see report)`;
  });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/creative-demos/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(evidence, `gallery-${width}.png`), fullPage: false });
  }
  await writeFile(path.join(evidence, 'probe.json'), JSON.stringify({ base, source: option('--url', '') || root, catalog: shop + 'catalog.json', checks, failures, pageErrors: errors, checkout: 'Not invoked: retirement rescope; no payment or order writes.' }, null, 2) + '\n');
} catch (error) { failures.push({ name: 'probe execution', error: error.stack }); console.log(`FAIL probe execution: ${error.message}`); }
finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); }
console.log(`${failures.length ? 'FAIL' : 'PASS'} product-factory retirement: ${checks.length} checks passed; ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
