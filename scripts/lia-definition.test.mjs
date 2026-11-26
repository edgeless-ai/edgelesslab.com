import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('LIA definition stays cross-field in hero, intro, metadata and agent index', () => {
  const landing = readFileSync('public/lia/index.html', 'utf8');
  const canonicalDef = 'Latent Information Archaeology is the systematic identification, reconstruction, and validation of previously unrecognized information, relationships, implications, and opportunities latent within existing informational artifacts.';
  const heroDef = 'Latent Information Archaeology studies the intersections between fields: useful, defensible connections across bodies of knowledge.';
  // Hero deck uses the cross-field framing
  assert.ok(landing.includes(`<h1>Latent Information<br><em>Archaeology.</em></h1><p class="deck">${heroDef}</p>`));
  // Intro section uses David's canonical definition with supporting text
  assert.ok(landing.includes(`<h2 id="what-is-lia">What is LIA?</h2>\n<p><strong>${canonicalDef}</strong></p>`));
  // Metadata descriptions reference intersections/cross-field work
  assert.match(landing, /name="description" content="[^"]*Latent Information Archaeology is the systematic/ );
  assert.match(landing, /property="og:description" content="[^"]*systematic identification, reconstruction/ );
  // No artifact-form text in the rendered page
  assert.doesNotMatch(landing, /the way that content takes form|What the artifact says|How it takes form|content, realization, observation/i);
  assert.match(landing, /<h3>Methods note<\/h3>/);
  assert.match(readFileSync('src/app/llms.txt/route.ts', 'utf8'), /intersections between fields/);
  const og = readFileSync('scripts/build-lia-og.mjs', 'utf8');
  assert.match(og, /Intersections between fields/);
  assert.doesNotMatch(og, /<section>(Content|Realization|Observation)<\/section>/);
  assert.match(landing, /LIA seeks to discover what is effectively already known by civilization, but not known by any individual within it\./);
  assert.doesNotMatch(landing, /not confirmed discoveries|not a discovery to announce|not an announcement|exploratory only|not empirical validation|not research results/i);
  assert.match(landing, /href="\/lia\/founding-text\/"/);
});

test('founding Markdown is an unmodified copy of David’s canonical v0.1', () => {
  const source = readFileSync('content/lia/LIA.md');
  // Compared byte-for-byte with the authorized LIA.md source on 2026-11-25.
  assert.equal(createHash('sha256').update(source).digest('hex'), '78ef5ce9ddd3c7fbffa2288a00f3ea57ce410a750b7726a9ed7ca465ec5f8a4c');
  assert.deepEqual(readFileSync('public/lia/founding-text/LIA.md'), source);
});