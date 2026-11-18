import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const notebook = '<!doctype html><html><head><style>.save-button{color:red}.filename-input{display:block}</style></head><body><h1>Notebook</h1></body></html>\r\n';
const files = {
  'slug/index.html': notebook,
  'slug/nested/help.html': notebook,
  'slug/assets/empty.css': '',
  'slug/assets/runtime.js': Buffer.from([0, 255, 13, 10]),
  'slug/assets/runtime.js.map': '{"version":3}',
  'slug/.nojekyll': '',
  'slug/.assets/retained.bin': Buffer.from([1, 2, 3]),
};
async function put(root, files) {
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
}
async function fixture(t) {
  const dir = await mkdtemp(path.join(await realpath(os.tmpdir()), 'immutable-marimo-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'scripts'));
  for (const name of ['run-critters.mjs', 'critters-font-preloads.mjs', 'preserve-standalone.sh', 'verify-immutable-marimo.mjs', 'archive-pages.mjs']) {
    try { await cp(path.join(repo, 'scripts', name), path.join(dir, 'scripts', name)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await symlink(path.join(repo, 'node_modules'), path.join(dir, 'node_modules'));
  await put(path.join(dir, 'public/marimo'), files);
  await cp(path.join(dir, 'public/marimo'), path.join(dir, 'out/marimo'), { recursive: true });
  await put(dir, {
    'out/ordinary/index.html': '<!doctype html><html><head><link rel="stylesheet" href="/_next/page.css"></head><body><div class="used">ordinary</div></body></html>',
    'out/_next/page.css': '.used{color:blue}.unused{color:red}',
    'public/lab/pen-plotter-autoresearch/index.html': '<h1>dashboard</h1>',
    'out/.well-known/ai-catalog.json': '{}',
    'out/.private': 'must not ship',
    'out/other/.private': 'must not ship',
  });
  for (const name of ['pen-plotter', 'tartanism', 'total-serialism']) await mkdir(path.join(dir, name));
  return dir;
}
function run(dir, script, args = []) {
  return spawnSync(script.endsWith('.sh') ? 'bash' : process.execPath, [path.join(dir, 'scripts', script), ...args], { cwd: dir, encoding: 'utf8' });
}
function passed(result) { assert.equal(result.status, 0, result.stdout + result.stderr); }
async function exact(dir) {
  for (const [name, bytes] of Object.entries(files)) assert.deepEqual(await readFile(path.join(dir, 'out/marimo', name)), Buffer.from(bytes), name);
}

test('real Critters leaves nested marimo HTML and empty CSS byte-identical while optimizing ordinary pages', async t => {
  const dir = await fixture(t);
  passed(run(dir, 'run-critters.mjs'));
  await exact(dir);
  const ordinary = await readFile(path.join(dir, 'out/ordinary/index.html'), 'utf8');
  assert.match(ordinary, /<style>.*\.used/);
  assert.doesNotMatch(ordinary, /<style>[^<]*\.unused/);
});

test('postbuild restoration repairs missing/changed bundle files including maps and dotfiles', async t => {
  const dir = await fixture(t);
  await rm(path.join(dir, 'out/marimo/slug/assets/runtime.js.map'));
  await put(dir, { 'out/marimo/slug/index.html': 'rewritten' });
  passed(run(dir, 'preserve-standalone.sh', ['restore']));
  await exact(dir);
});

test('manifest gate rejects missing, changed and unexpected payloads; absence is allowed only on both sides', async t => {
  const dir = await fixture(t);
  passed(run(dir, 'verify-immutable-marimo.mjs'));
  for (const [name, bytes] of [['slug/index.html', 'changed'], ['extra.txt', 'unexpected']]) {
    await put(path.join(dir, 'out/marimo'), { [name]: bytes });
    assert.notEqual(run(dir, 'verify-immutable-marimo.mjs').status, 0);
    await rm(path.join(dir, 'out/marimo'), { recursive: true });
    await cp(path.join(dir, 'public/marimo'), path.join(dir, 'out/marimo'), { recursive: true });
  }
  await rm(path.join(dir, 'out/marimo/slug/.nojekyll'));
  assert.notEqual(run(dir, 'verify-immutable-marimo.mjs').status, 0);
  await rm(path.join(dir, 'public/marimo'), { recursive: true });
  assert.notEqual(run(dir, 'verify-immutable-marimo.mjs').status, 0);
  await rm(path.join(dir, 'out/marimo'), { recursive: true });
  passed(run(dir, 'verify-immutable-marimo.mjs'));
});

test('actual Pages archive retains all bundle bytes/dotfiles, .well-known and ordinary output, not unrelated hidden files', async t => {
  const dir = await fixture(t);
  const archive = path.join(dir, 'artifact.tar');
  passed(run(dir, 'archive-pages.mjs', [archive]));
  const listing = spawnSync('tar', ['-tf', archive], { encoding: 'utf8' });
  passed(listing);
  for (const name of Object.keys(files)) assert.equal(listing.stdout.split('\n').filter(entry => entry === './marimo/' + name).length, 1, name);
  const extracted = path.join(dir, 'extracted');
  await mkdir(extracted);
  const result = spawnSync('tar', ['-xf', archive, '-C', extracted], { encoding: 'utf8' });
  passed(result);
  for (const [name, bytes] of Object.entries(files)) assert.deepEqual(await readFile(path.join(extracted, 'marimo', name)), Buffer.from(bytes), name);
  assert.equal(await readFile(path.join(extracted, '.well-known/ai-catalog.json'), 'utf8'), '{}');
  assert.match(await readFile(path.join(extracted, 'ordinary/index.html'), 'utf8'), /ordinary/);
  for (const name of ['.private', 'other/.private']) await assert.rejects(readFile(path.join(extracted, name)), { code: 'ENOENT' });
  await put(dir, { 'out/marimo/slug/index.html': 'drift before packaging' });
  assert.notEqual(run(dir, 'archive-pages.mjs', [archive]).status, 0);
});

test('production commands run final integrity verification and the tested archive implementation', async () => {
  const pkg = JSON.parse(await readFile(path.join(repo, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.postbuild, /&& node scripts\/verify-immutable-marimo\.mjs$/);
  assert.match(pkg.scripts['test:font-preloads'], /immutable-marimo\.test\.mjs/);
  const workflow = await readFile(path.join(repo, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(workflow, /node scripts\/archive-pages\.mjs "\$RUNNER_TEMP\/artifact\.tar"/);
});
