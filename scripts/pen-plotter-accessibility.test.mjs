import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const targets = ['public/pen-plotter/index.html'];
if (process.env.PLOTTER_TEST_EXPORT === '1') targets.push('out/pen-plotter/index.html');

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

for (const target of targets) {
  const html = readFileSync(new URL(target, root), 'utf8');
  test(`${target}: one main landmark contains the editorial sections, not the header or overlay`, () => {
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<\/main>/g) || []).length, 1);
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.ok(main);
    for (const section of ['hero', 'method', 'reveal', 'catalog', 'colophon']) {
      assert.match(main, new RegExp(`<section class="${section}"`));
    }
    assert.doesNotMatch(main, /<header class="meta-strip"|id="lightbox"/);
  });

  test(`${target}: small VIEW ALL label meets WCAG AA contrast on ink`, () => {
    const declaration = html.match(/\.cat-cta__cta\s*\{([^}]+)\}/)?.[1];
    assert.match(declaration, /color:\s*var\(--paper\)/);
    assert.match(html.match(/\.cat-cta\s*\{([^}]+)\}/)?.[1], /background:\s*var\(--ink\)/);
    const paper = html.match(/--paper:\s*(#[a-f\d]{6})/i)?.[1];
    const ink = html.match(/--ink:\s*(#[a-f\d]{6})/i)?.[1];
    const values = [luminance(paper), luminance(ink)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(ratio >= 4.5, `VIEW ALL contrast ${ratio.toFixed(2)}:1 must be >= 4.5:1`);
  });
}
