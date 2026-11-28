import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { imageSize, loadPlates } from './lia-plates.mjs';

// 1x1 PNG; fixtures only, never written to content/.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 640"><rect width="1120" height="640" fill="#f3eddd"/></svg>';
const manuscript = readFileSync('content/lia/lia-longform-v2.md', 'utf8');
const chapter = /^### (.+)$/m.exec(manuscript)[1];
const part = /^## (Part [IVX]+:.+)$/m.exec(manuscript)[1];

function fixture(manifests, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lia-plates-'));
  const out = join(root, 'out');
  mkdirSync(join(out, 'lia'), { recursive: true });
  // Copy the reader shell and figures, not any real illustration or plate files.
  cpSync('public/lia/read', join(out, 'lia/read'), { recursive: true, filter: path => !/^public[\\/]lia[\\/]read[\\/](illustrations|plates)([\\/]|$)/.test(path) });
  cpSync('public/lia/index.html', join(out, 'lia/index.html'));
  const content = join(root, 'content');
  mkdirSync(content);
  for (const [name, data] of Object.entries(manifests)) writeFileSync(join(content, name), JSON.stringify(data));
  for (const [path, data] of Object.entries(files)) {
    mkdirSync(join(out, 'lia/read', path, '..'), { recursive: true });
    writeFileSync(join(out, 'lia/read', path), data);
  }
  return { root, out, content };
}

function build({ out, content }) {
  return spawnSync('node', ['scripts/build-lia-longform.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, LIA_OUT_DIR: out, LIA_MANIFEST_DIR: content, LIA_LONGFORM_SOURCE: 'content/lia/lia-longform-v2.md' },
  });
}

const entry = (id, file, extra = {}) => ({ id, file, alt: `Alt ${id}`, caption: `Caption ${id}`, after_heading: chapter, role: 'plate', ...extra });

test('image sizes come from PNG, SVG and WebP headers', () => {
  assert.deepEqual(imageSize(PNG, 'a.png'), { width: 1, height: 1 });
  assert.deepEqual(imageSize(Buffer.from(SVG), 'a.svg'), { width: 1120, height: 640 });
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0, 'latin1'); webp.write('WEBPVP8X', 8, 'latin1');
  webp.writeUIntLE(1599, 24, 3); webp.writeUIntLE(899, 27, 3);
  assert.deepEqual(imageSize(webp, 'a.webp'), { width: 1600, height: 900 });
});

test('no manifest means no plates', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lia-plates-empty-'));
  try {
    assert.deepEqual(loadPlates(dir, dir), []);
    assert.deepEqual(loadPlates(join(dir, 'absent'), dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('manifests render a hero and ordered plates after the first block under a heading', () => {
  const f = fixture({
    'illustrations.json': { illustrations: [entry('I0', 'I0.png', { role: 'hero', after_heading: undefined }), entry('I1', 'I1.png')] },
    'plates-diagrams.json': { plates: [entry('D1', 'D1.svg', { kind: 'diagram' }), entry('D2', 'D2.svg', { kind: 'diagram', after_heading: part })] },
  }, { 'illustrations/I0.png': PNG, 'illustrations/I1.png': PNG, 'plates/D1.svg': SVG, 'plates/D1.png': PNG, 'plates/D2.svg': SVG, 'plates/D2.png': PNG });
  try {
    const result = build(f);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /4 manifest plates \(1 hero, 2 headings\)/);
    const html = readFileSync(join(f.out, 'lia/read/index.html'), 'utf8');
    const at = needle => { const index = html.indexOf(needle); assert.ok(index >= 0, `missing ${needle}`); return index; };
    // Hero sits under the title block, before the reading layout.
    assert.ok(at('</header>\n    <figure class="hero-plate" id="plate-i0">') < at('<div class="reader-layout shell">'));
    assert.match(html, /<img src="illustrations\/I0\.png" alt="Alt I0" width="1" height="1" decoding="async" fetchpriority="high">/);
    // Shared heading: plates follow the heading's first paragraph, in manifest order, in one group.
    const heading = html.indexOf('>', html.indexOf('<h3 id="chapter-p"'));
    const firstParagraphEnd = html.indexOf('</p>', heading);
    const group = at('<div class="plate-group">');
    assert.ok(heading < firstParagraphEnd && firstParagraphEnd < group);
    assert.ok(group < at('id="plate-i1"') && at('id="plate-i1"') < at('id="plate-d1"'));
    assert.ok(at('id="plate-d1"') < at('</figure>\n</div>\n<p>'));
    // Diagrams render the SVG with the PNG as a fallback link.
    assert.match(html, /<img src="plates\/D1\.svg" alt="Alt D1" width="1120" height="640" loading="lazy" decoding="async" data-diagram><\/div>\n  <figcaption><span class="figure-label">Plate D1<\/span><p>Caption D1<\/p><a href="plates\/D1\.png" data-zoom>Open full size<\/a>/);
    // A part heading with no paragraph before its first chapter takes the plate right after the heading.
    assert.ok(html.indexOf('id="plate-d2"') > html.indexOf('<h2 id="part-i"'));
    assert.ok(html.indexOf('id="plate-d2"') < html.indexOf('<h3 id="chapter-i-01"'));
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('broken manifests fail the build loudly', () => {
  const cases = [
    [{ 'illustrations.json': { illustrations: [entry('I1', 'I1.webp')] } }, {}, /image is missing/],
    [{ 'plates-x.json': { plates: [entry('D1', 'D1.svg', { kind: 'diagram' })] } }, { 'plates/D1.svg': SVG }, /needs a PNG fallback/],
    [{ 'plates-x.json': { plates: [entry('D1', 'D1.png', { after_heading: 'No such heading' })] } }, { 'plates/D1.png': PNG }, /after_heading not found/],
    [{ 'plates-x.json': { plates: [entry('D1', 'D1.png', { kind: 'chart' })] } }, { 'plates/D1.png': PNG }, /kind must be/],
    [{ 'plates-x.json': { plates: [entry('D1', '../D1.png')] } }, {}, /relative file path/],
  ];
  for (const [manifests, files, message] of cases) {
    const f = fixture(manifests, files);
    try {
      const result = build(f);
      assert.notEqual(result.status, 0, `expected failure for ${message}`);
      assert.match(result.stderr, message);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  }
});
