import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedPublications } from './marimo-publication-diff.mjs';
const source = (entries) => `export const marimoDemos = [${entries}];`;
const draft = '{ slug: "new", title: "Draft" }';
const published = '{ slug: "new", title: "Published", published_url: "https://marimo.edgelesslab.com/new/" }';
test('only probes newly published or changed entries, not unrelated historical outages', () => {
  const existing = '{ slug: "existing", published_url: "https://marimo.edgelesslab.com/existing/" }';
  assert.deepEqual(changedPublications(source(existing), source(`${existing},${published}`)), ['new']);
  assert.deepEqual(changedPublications(source(`${existing},${draft}`), source(`${existing},${published}`)), ['new']);
  assert.deepEqual(changedPublications(source(published), source(published.replace('Published', 'Renamed'))), ['new']);
  assert.deepEqual(changedPublications(source(existing), source(`${existing},${draft}`)), []);
  assert.deepEqual(changedPublications(source(published), source(draft)), []);
  assert.deepEqual(changedPublications(source(published), source(published)), []);
  assert.deepEqual(changedPublications(source(draft), source(published.replace('slug:', '"slug":').replace('published_url:', '"published_url":'))), ['new']);
});
test('rejects dynamic/ambiguous catalogs rather than silently skipping delivery checks', () => {
  for (const bad of ['export const marimoDemos = getCatalog();', source('...other'), source('{ slug: getSlug() }'), source(`${draft},${draft}`), source('{ slug: "new", published_url: getUrl() }'), source('{ slug: "new", ["published_url"]: "url" }'), source('{ slug: "new", slug: "other" }')]) {
    assert.throws(() => changedPublications(source(''), bad));
  }
});
