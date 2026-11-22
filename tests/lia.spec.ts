import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { researchFieldNotes } from '../src/lib/research-field-notes';

const note = researchFieldNotes[0];
test('LIA cleared artifacts, registry, privacy and navigation', async ({ page, request }) => {
  expect((await request.get('/lia/')).status()).toBe(200);
  await page.goto('/lia/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Archaeology');
  const indexed = await page.locator('[data-lia-index] a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')!));
  expect(indexed).toEqual([note.href, '/creative-demos/code-as-a-field-of-relation/', '/creative-demos/the-rule-and-the-machine/']);
  for (const href of indexed) expect((await request.get(href)).status()).toBe(200);
  await page.locator(`[data-lia-index] a[href="${note.href}"]`).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(note.title);
  const citationHrefs = await page.locator('article a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')));
  const original = readFileSync('content/lia/field-note-public-draft-v0.3.md', 'utf8');
  expect(citationHrefs).toEqual([...original.matchAll(/\]\((https:[^)]+)\)/g)].map(m => m[1]));
  expect(citationHrefs).toHaveLength(11);
  const headingLinks = await page.locator('.toc a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')!));
  for (const href of headingLinks) await expect(page.locator(href)).toHaveCount(1);
  for (const route of ['/lia/', note.href]) {
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
  await expect(page.locator(`[data-editorial-note] a[href="${note.href}"]`)).toHaveCount(1);
  await page.locator('footer a[href="/lia/"]').click();
  await expect(page).toHaveURL(/\/lia\/$/);
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`https://edgelesslab.com${note.href}`);
  expect(await (await request.get('/llms.txt')).text()).toContain(`https://edgelesslab.com${note.href}`);
  expect((await request.get('/lia/og-image.png')).status()).toBe(200);
});
