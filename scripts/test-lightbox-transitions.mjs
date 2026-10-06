// Run: node scripts/test-lightbox-transitions.mjs
// Requires: npm ci && npx playwright install chromium firefox webkit
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    assert.ok(path.startsWith(root + '/'));
    const body = await readFile(path);
    res.setHeader('Content-Type', { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp' }[extname(path)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const sample = await readFile(resolve(root, 'pen-plotter/assets/manifest.json'), 'utf8');
const records = JSON.parse(sample).slice(0, 2); // Real archive records, bounded test grid.
const getCSS = html => html.slice(html.indexOf('.lightbox {'), html.indexOf('.lightbox__inner {'));
for (const file of ['index.html', 'addendum.html']) {
  const source = await readFile(resolve(root, 'pen-plotter', file), 'utf8');
  const served = await readFile(resolve(root, 'public/pen-plotter', file), 'utf8');
  assert.equal(getCSS(source), getCSS(served), `${file}: source/served CSS must match`);
  for (const html of [source, served]) {
    const handlers = html.slice(html.indexOf('function openLightbox'), html.indexOf("lbClose.addEventListener"));
    assert.doesNotMatch(handlers, /offsetHeight|offsetWidth|getBoundingClientRect|requestAnimationFrame|setTimeout|transitionend/);
    assert.match(html, /aria-hidden="true" inert/);
    assert.match(handlers, /lightbox.inert = false/);
    assert.match(handlers, /lightbox.inert = true/);
  }
}

const state = page => page.locator('#lightbox').evaluate(el => {
  const s = getComputedStyle(el);
  return { display: s.display, opacity: Number(s.opacity), inert: el.inert, hidden: el.getAttribute('aria-hidden'), duration: s.transitionDuration, behavior: s.transitionBehavior, animations: el.getAnimations().map(a => a.transitionProperty) };
});
const nextFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
// Sample at the midpoint with WAAPI: headless engines can throttle 250ms frames.
const sampleTransition = (page, action) => page.evaluate(({ action }) => {
  const el = document.getElementById('lightbox');
  if (action === 'open') document.querySelector('.cat-tile, .full-tile').click();
  else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  void getComputedStyle(el).opacity; // Test-only flush, never in production handlers.
  for (const a of el.getAnimations()) { a.pause(); a.currentTime = 125; }
}, { action });
const finishTransitions = page => page.locator('#lightbox').evaluate(el => {
  for (const a of el.getAnimations()) a.finish();
});
let passed = 0;
try {
  const engines = process.env.LIGHTBOX_BROWSER === 'chrome' ? { chrome: chromium } : { chromium, firefox, webkit };
  for (const [name, engine] of Object.entries(engines)) {
    if (process.env.LIGHTBOX_BROWSER && process.env.LIGHTBOX_BROWSER !== name) continue;
    console.log(`Launching ${name}`);
    const browser = await engine.launch({ timeout: 15000, ...(name === 'chrome' ? { channel: 'chrome' } : {}) });
    try {
      for (const file of ['index.html', 'addendum.html']) {
        for (const mode of ['native', 'reduced-motion', 'unsupported']) {
          const context = await browser.newContext({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference' });
          context.setDefaultTimeout(10000);
          context.setDefaultNavigationTimeout(10000);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', e => errors.push(e.message));
          // External fonts/analytics are not relevant to the lightbox contract.
          await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== base) return route.abort();
            if (/\/assets\/manifest(?:-full)?\.json$/.test(url.pathname)) return route.fulfill({ json: records });
            // The addendum preflight tests an archive file not included in a clean clone.
            if (route.request().method() === 'HEAD' && url.pathname.endsWith('/thumbs-full/moire-0005.webp')) return route.fulfill({ status: 200 });
            if (mode === 'unsupported' && url.pathname.endsWith('.html')) {
              const response = await route.fetch();
              const html = (await response.text()).replace('@supports (transition-behavior: allow-discrete)', '@supports (test-unsupported-property: unsupported)');
              return route.fulfill({ response, body: html });
            }
            return route.continue();
          });
          await page.goto(`${base}/public/pen-plotter/${file}`);
          if (file === 'addendum.html') await page.locator('#gate-continue').click();
          const tile = page.locator(file === 'index.html' ? '.cat-tile' : '.full-tile').first();
          await tile.waitFor();
          assert.equal((await state(page)).display, 'none');
          assert.equal((await state(page)).inert, true);
          await sampleTransition(page, 'open');
          let opening = await state(page);
          assert.equal(opening.display, 'flex');
          assert.equal(opening.inert, false);
          assert.equal(opening.hidden, 'false');
          if (mode === 'native') {
            assert.ok(opening.opacity > 0 && opening.opacity < 1, JSON.stringify(opening));
            assert.ok(opening.animations.includes('opacity'));
          } else { assert.equal(opening.opacity, 1); assert.equal(opening.animations.length, 0); }
          await finishTransitions(page);
          assert.equal((await state(page)).opacity, 1);
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('#lightbox-img').getAttribute('alt'), records[1].id);
          await sampleTransition(page, 'close');
          let closing = await state(page);
          assert.equal(closing.inert, true);
          assert.equal(closing.hidden, 'true');
          if (mode === 'native' && name !== 'firefox') {
            assert.equal(closing.display, 'flex', `${name} ${file}: ${JSON.stringify(closing)}`);
            assert.ok(closing.opacity > 0 && closing.opacity < 1, JSON.stringify(closing));
            assert.ok(closing.animations.includes('display'));
          } else {
            // Firefox supports @starting-style/allow-discrete but not display
            // transitions: entry fades, exit safely falls back to instant hide.
            assert.equal(closing.display, 'none');
          }
          await finishTransitions(page);
          assert.equal((await state(page)).display, 'none');
          // Reopen immediately during exit: no stale JS timer can hide it later.
          await tile.evaluate(el => el.click());
          await page.waitForFunction(() => {
            const el = document.getElementById('lightbox');
            return getComputedStyle(el).opacity === '1' && el.getAnimations().length === 0;
          });
          await page.locator('#lightbox-close').evaluate(el => el.click());
          await nextFrames(page);
          await tile.evaluate(el => el.click());
          await page.waitForFunction(() => {
            const el = document.getElementById('lightbox');
            return getComputedStyle(el).opacity === '1' && el.getAnimations().length === 0;
          });
          assert.equal((await state(page)).display, 'flex');
          assert.equal((await state(page)).opacity, 1);
          assert.equal((await state(page)).inert, false);
          await page.locator('#lightbox').evaluate(el => el.click());
          await page.waitForFunction(() => getComputedStyle(document.getElementById('lightbox')).display === 'none');
          assert.equal((await state(page)).display, 'none');
          assert.deepEqual(errors, []);
          console.log(`PASS ${name} ${browser.version()} ${file} ${mode}: entry, exit, navigation, reopen, inert`);
          passed++;
          await context.close();
        }
      }
    } finally { await browser.close(); }
  }
  assert.ok(passed > 0, 'LIGHTBOX_BROWSER must be chrome, chromium, firefox, or webkit');
  console.log(`PASS ${passed} browser/page/mode scenarios; four source/served contracts`);
} finally { await new Promise(resolve => server.close(resolve)); }
