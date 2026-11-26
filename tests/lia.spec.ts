import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { researchFieldNotes } from '../src/lib/research-field-notes';

const note = researchFieldNotes[0];
test('LIA cleared artifacts, registry, privacy and navigation', async ({ page, request }) => {
  expect((await request.get('/lia/')).status()).toBe(200);
  await page.goto('/lia/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Archaeology');
  const heroDef = 'Latent Information Archaeology studies the intersections between fields: useful, defensible connections across bodies of knowledge.';
  await expect(page.locator('.hero .deck')).toHaveText(heroDef);
  // Intro section uses David's canonical definition with supporting paragraphs
  const canonicalDef = 'Latent Information Archaeology is the systematic identification, reconstruction, and validation of previously unrecognized information, relationships, implications, and opportunities latent within existing informational artifacts.';
  await expect(page.locator('.intro p strong')).toHaveText(canonicalDef);
  await expect(page.locator('.intro')).toContainText('LIA seeks to discover what is effectively already known by civilization, but not known by any individual within it.');
  await expect(page.locator('main')).not.toContainText('not confirmed discoveries');
  await expect(page.locator('main')).not.toContainText('not a discovery to announce');
  await expect(page.locator('main')).not.toContainText('the way that content takes form');
  await expect(page.getByRole('heading', { name: 'Methods note', exact: true })).toBeVisible();
  // The complete founding text is served on-site.
  await expect(page.getByRole('heading', { name: 'Founding text', exact: true })).toBeVisible();
  const indexed = await page.locator('[data-lia-index] a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')!));
  expect(indexed).toEqual([note.href, '/lia/founding-text/', '/creative-demos/code-as-a-field-of-relation/', '/creative-demos/the-rule-and-the-machine/']);
  for (const href of indexed) expect((await request.get(href)).status()).toBe(200);
  await page.locator(`[data-lia-index] a[href="${note.href}"]`).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(note.title);
  const citationHrefs = await page.locator('article a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')));
  const original = readFileSync('content/lia/field-note-public-draft-v0.3.md', 'utf8');
  expect(citationHrefs).toEqual([...original.matchAll(/\]\((https:[^)]+)\)/g)].map(m => m[1]));
  expect(citationHrefs).toHaveLength(11);
  const headingLinks = await page.locator('.toc a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')!));
  for (const href of headingLinks) await expect(page.locator(href)).toHaveCount(1);
  for (const route of ['/lia/', '/lia/founding-text/', note.href]) {
    await page.goto(route);
    expect(await page.locator('main').innerText()).not.toMatch(/\/Users\/|research\/|audits\/|D-0\d\d|t_[a-f0-9]{8}|\b[a-f0-9]{40,64}\b/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://edgelesslab.com/lia/og-image.png');
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.goto('/field-notes/');
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const schema = schemas.map(value => JSON.parse(value)).find(s => s['@type'] === 'CollectionPage');
  expect(schema.numberOfItems).toBe(schema.itemListElement.length);
  expect(schema.itemListElement.filter((n: {url: string}) => n.url === `https://edgelesslab.com${note.href}`)).toHaveLength(1);
  await expect(page.locator(`[data-editorial-note] a[href="${note.href}"]`)).toBeVisible();
  const liaRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/lia/')) liaRequests.push(request.url());
  });
  await page.locator('footer a[href="/lia/"]').click();
  await expect(page).toHaveURL(/\/lia\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Archaeology');
  expect(liaRequests.some(url => /__next\.|index\.txt|_rsc=/.test(url))).toBe(false);
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`https://edgelesslab.com${note.href}`);
  expect(await (await request.get('/llms.txt')).text()).toContain(`https://edgelesslab.com${note.href}`);
  expect((await request.get('/lia/og-image.png')).status()).toBe(200);
});

test('founding text navigation, attribution and complete source prose', async ({ page, request }) => {
  await page.goto('/lia/');
  await page.locator('[data-lia-index] a[href="/lia/founding-text/"]').click();
  await expect(page).toHaveURL(/\/lia\/founding-text\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latent Information Archaeology (LIA)');
  await expect(page.getByText('Originated by David Murray', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'CC BY 4.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  await expect(page.getByRole('link', { name: 'Canonical version on GitHub' })).toHaveAttribute('href', 'https://github.com/thedavidmurray/latent-information-archaeology/blob/main/LIA.md');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://edgelesslab.com/lia/founding-text/');
  const source = readFileSync('content/lia/LIA.md', 'utf8');
  expect(await (await request.get('/lia/founding-text/LIA.md')).text()).toBe(source);
  // Independent text oracle: strip Markdown syntax, not prose. Preserve fenced
  // diagrams/YAML verbatim; compare every word, not just selected quotations.
  const plain = source.split(/```[^\n]*\n([\s\S]*?)\n```/g).map((part, index) => {
    if (index % 2) return part;
    return part.split('\n').filter(line => !/^\|[ -]+\|[ -]+\|$/.test(line) && line !== '---').map(line =>
      /^#{1,3} /.test(line) ? line.replace(/^#{1,3} /, '') : line.replace(/^(?:\d+\. |- )/, '').replace(/^\| | \|$/g, '').replace(/ \| /g, ' ').replace(/[*`]/g, '')
    ).join('\n');
  }).join('\n');
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  expect(normalize(await page.locator('article').innerText())).toBe(normalize(plain));
  await expect(page.locator('article h2')).toHaveCount(14);
  await expect(page.locator('article pre')).toHaveCount(3);
  await expect(page.locator('article tbody tr')).toHaveCount(5);
  await page.setViewportSize({ width: 375, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/lia-founding-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/lia-founding-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'LIA index', exact: true }).click();
  await expect(page).toHaveURL(/\/lia\/$/);
});