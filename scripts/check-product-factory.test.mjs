import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function redirect(search = '', response = {}, networkError = false) {
  const html = await readFile(new URL('../public/product-factory/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script, 'missing redirect script');
  const navigations = [];
  const fetches = [];
  const context = vm.createContext({ URLSearchParams, encodeURIComponent, AbortSignal,
    window: { location: { search, replace: url => navigations.push(url) } },
    fetch: async (url, options) => {
      fetches.push({ url, options });
      if (networkError) throw new Error('offline');
      return { ok: response.ok ?? true, json: async () => response };
    },
  });
  await vm.runInContext(script, context);
  return { navigations, fetches, html };
}
test('dynamic gallery keeps runtime card and action styles through postbuild', async () => {
  const html = await readFile(new URL('../public/creative-demos/index.html', import.meta.url), 'utf8');
  assert.match(html, /<html\b[^>]*data-preserve-inline-styles/);
  assert.doesNotMatch(html, /product-factory|\bSTORE_URL\b|\bbuyLink\b/);
});
const home = 'https://shop.edgelesslab.com/';
const listing = { slug: 'real-art', available: true, sold_out: false };
test('base immediately retires to shop without a network dependency', async () => {
  const result = await redirect();
  assert.deepEqual(result.navigations, [home]);
  assert.equal(result.fetches.length, 0);
  assert.match(result.html, /noindex/);
  assert.match(result.html, /<noscript>[\s\S]*http-equiv="refresh"/);
  assert.doesNotMatch(result.html, /data-sku=|mailto:|isn['’]t listed|id="grid"/i);
});
test('an actual available catalog slug redirects to its canonical listing', async () => {
  const result = await redirect('?sku=real-art', { designs: [listing] });
  assert.deepEqual(result.navigations, [home + 'd/real-art/']);
  assert.equal(result.fetches[0].url, home + 'catalog.json');
  assert.equal(result.fetches[0].options.credentials, 'omit');
});
for (const [name, response] of [
  ['unknown demo', { designs: [listing] }],
  ['missing catalog', {}],
  ['malformed catalog', { designs: 'not an array' }],
  ['empty catalog', { designs: [] }],
  ['unavailable', { designs: [{ ...listing, available: false }] }],
  ['sold out', { designs: [{ ...listing, sold_out: true }] }],
  ['HTTP failure', { ok: false, designs: [listing] }],
]) test(`${name} falls back to the real shop, never a dead listing`, async () => {
  const result = await redirect('?sku=' + (name === 'unknown demo' ? 'missing-demo' : 'real-art'), response);
  assert.deepEqual(result.navigations, [home]);
});
test('offline/timeout response fails safely to shop home', async () => {
  assert.deepEqual((await redirect('?sku=real-art', {}, true)).navigations, [home]);
});
for (const sku of ['https://evil.invalid/', '//evil.invalid', '../evil', '<script>', 'x'.repeat(201), '']) {
  test(`rejects untrusted/invalid SKU ${sku.slice(0, 40)}`, async () => {
    const result = await redirect('?sku=' + encodeURIComponent(sku) + '&next=https://evil.invalid');
    assert.deepEqual(result.navigations, [home]);
    assert.equal(result.fetches.length, 0);
  });
}
test('a catalog-controlled URL cannot choose another origin', async () => {
  const result = await redirect('?sku=real-art', { designs: [{ ...listing, url: 'https://evil.invalid' }] });
  assert.deepEqual(result.navigations, [home + 'd/real-art/']);
});
