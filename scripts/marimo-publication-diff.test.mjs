import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedPublications, legacyPublicationEntries, publicationEntries } from './marimo-publication-diff.mjs';

const entry = (slug, extra = {}) => JSON.stringify({
  slug, title: slug, description: `${slug} demo`, category: 'Research', tags: ['test'], ...extra,
});
const published = (slug) => entry(slug, { published_url: `https://marimo.edgelesslab.com/${slug}/` });
/** `{ filename: jsonText }` map, the shape the registry directory produces. */
const catalog = (entries) => publicationEntries(new Map(entries.map(([slug, text]) => [`${slug}.json`, text])));

test('only probes newly published or changed entries, not unrelated historical outages', () => {
  const existing = ['existing', published('existing')];
  assert.deepEqual(changedPublications(catalog([existing]), catalog([existing, ['new', published('new')]])), ['new']);
  assert.deepEqual(changedPublications(catalog([existing, ['new', entry('new')]]), catalog([existing, ['new', published('new')]])), ['new']);
  assert.deepEqual(changedPublications(catalog([['new', published('new')]]), catalog([['new', entry('new', { title: 'Renamed', published_url: 'https://marimo.edgelesslab.com/new/' })]])), ['new']);
  assert.deepEqual(changedPublications(catalog([existing]), catalog([existing, ['new', entry('new')]])), []);
  assert.deepEqual(changedPublications(catalog([['new', published('new')]]), catalog([['new', entry('new')]])), []);
  assert.deepEqual(changedPublications(catalog([['new', published('new')]]), catalog([['new', published('new')]])), []);
});

test('the legacy array and the per-file JSON registry fingerprint identically', () => {
  const fields = (slug, extra = {}) => JSON.stringify({
    slug, title: slug.toUpperCase(), description: 'd', category: 'Research', tags: ['t'], ...extra,
  });
  const url = 'https://marimo.edgelesslab.com/a/';
  const legacy = legacyPublicationEntries(`export const marimoDemos = [
    { slug: "a", title: "A", description: "d", category: "Research", tags: ["t"], published_url: "${url}" },
    { slug: "b", title: "B", description: "d", category: "Research", tags: ["t"] },
    { slug: "c", title: "C", description: "d", category: "Research", tags: ["t"], published_url: null },
  ];`);
  const files = catalog([
    ['a', fields('a', { published_url: url })],
    ['b', fields('b')],
    ['c', fields('c')],
  ]);
  assert.deepEqual([...legacy.keys()], ['a', 'b', 'c']);
  assert.deepEqual(changedPublications(legacy, files), []);
});

test('rejects dynamic/ambiguous catalogs rather than silently skipping delivery checks', () => {
  const malformed = [
    new Map([['new.json', 'not json']]),
    new Map([['new.json', JSON.stringify([1, 2])]]),
    new Map([['new.json', JSON.stringify({ title: 'no slug' })]]),
    new Map([['other.json', published('new')]]),
    new Map([['new.json', entry('new', { published_url: 42 })]]),
  ];
  for (const files of malformed) {
    assert.throws(() => changedPublications(new Map(), publicationEntries(files)), `accepted ${JSON.stringify([...files])}`);
  }
  for (const source of [
    'export const marimoDemos = getCatalog();',
    'export const marimoDemos = [...other];',
    'export const marimoDemos = [{ slug: getSlug() }];',
    'export const marimoDemos = [{ slug: "new", published_url: getUrl() }];',
    'export const marimoDemos = [{ slug: "new" }, { slug: "new" }];',
    'export const marimoDemos = [{ slug: "new", ["published_url"]: "url" }];',
    'export const marimoDemos = [{ slug: "new", slug: "other" }];',
  ]) {
    assert.throws(() => legacyPublicationEntries(source), `accepted ${source}`);
  }
});
