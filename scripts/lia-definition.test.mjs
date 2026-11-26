import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

test('LIA definition stays cross-field in hero, intro, metadata and agent index', () => {
  const landing = readFileSync('public/lia/index.html', 'utf8');
  const definition = 'Latent Information Archaeology studies the intersections between fields: useful, defensible connections across bodies of knowledge.';
  assert.ok(landing.includes(`<h1>Latent Information<br><em>Archaeology.</em></h1><p class="deck">${definition}</p>`));
  assert.ok(landing.includes(`<h2 id="what-is-lia">What is LIA?</h2>\n<p>${definition}</p>`));
  assert.match(landing, /name="description" content="[^"]*intersections between fields/);
  assert.match(landing, /property="og:description" content="[^"]*intersections between fields/);
  assert.doesNotMatch(landing, /the way that content takes form|What the artifact says|How it takes form|content, realization, observation/i);
  assert.match(landing, /<h3>Methods note<\/h3>/);
  assert.match(readFileSync('src/app/llms.txt/route.ts', 'utf8'), /intersections between fields/);
  const og = readFileSync('scripts/build-lia-og.mjs', 'utf8');
  assert.match(og, /Intersections between fields/);
  assert.doesNotMatch(og, /<section>(Content|Realization|Observation)<\/section>/);
});
