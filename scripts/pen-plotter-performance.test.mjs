import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('public/pen-plotter/index.html', root), 'utf8');
const css = readFileSync(new URL('public/pen-plotter/fonts.css', root), 'utf8');

test('standalone plotter preserves dynamic CSS and defers noncritical resources', () => {
  assert.match(html, /<html[^>]*data-preserve-inline-styles/);
  assert.match(html, /<script src="assets\/stats.js" defer>/);
  assert.match(html, /href="fonts.css"[^>]*media="print"[^>]*onload=/);
  assert.match(html, /<noscript><link href="fonts.css" rel="stylesheet"><\/noscript>/);
  assert.doesNotMatch(html, /href="https:\/\/(api.fontshare.com|fonts.googleapis.com)/);
  assert.match(html, /href="fonts\/jetbrains-mono-11.woff2" as="font"/);
});

test('font declarations retain styles, weights, subsets and local licensed files', () => {
  assert.equal((css.match(/@font-face/g) || []).length, 18);
  assert.equal((css.match(/font-display: swap/g) || []).length, 18);
  assert.equal((css.match(/font-weight: 400 700/g) || []).length, 6);
  for (const [, file] of css.matchAll(/url\((fonts\/[^)]+)\)/g)) {
    const bytes = readFileSync(new URL(`public/pen-plotter/${file}`, root));
    assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
  }
  assert.ok(existsSync(new URL('public/pen-plotter/fonts/OFL.txt', root)));
});

test('static art reserves dimensions and keeps the lead image eager', () => {
  const images = [...html.matchAll(/<img\b[^>]*src="[^"]+"[^>]*>/g)].map(m => m[0]);
  assert.equal(images.length, 21);
  images.forEach((image, index) => {
    assert.match(image, /width="\d+" height="\d+"/);
    if (index === 0) assert.doesNotMatch(image, /loading="lazy"/);
    else assert.match(image, /loading="lazy" decoding="async"/);
  });
});

test('static export retains catalog state styles and local fonts', {skip: !existsSync(new URL('out/pen-plotter/index.html', root))}, () => {
  const output = readFileSync(new URL('out/pen-plotter/index.html', root), 'utf8');
  assert.match(output, /\.cat-tile\s*\{/);
  assert.match(output, /\.lightbox\.is-open/);
  assert.ok(existsSync(new URL('out/pen-plotter/fonts/jetbrains-mono-11.woff2', root)));
});
