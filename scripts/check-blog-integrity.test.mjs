import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLive, loadRegistries, parseMarkdown, validate } from './check-blog-integrity.mjs';
import { resolve, join, dirname } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

function registryFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'blog-integrity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'src/lib/blog.ts': 'import { newPosts } from "./blog-new-posts";\nconst allPosts: unknown[] = [...newPosts];\nexport const posts = allPosts;',
    'src/lib/blog-new-posts.ts': 'export const newPosts = [{slug: "one", content: "Hello", date: "2026-01-01"}];',
    'src/app/blog/page.tsx': 'import { posts } from "@/lib/blog";',
    'src/app/blog/[slug]/page.tsx': 'import { posts } from "@/lib/blog";',
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const ROOT = resolve(import.meta.dirname, '..');
const post = (slug, content = '# Hello') => ({ slug, content, title: 'Title', description: 'Description', date: '2026-01-01' });
const md = (slug, content = '# Hello', extra = '') => parseMarkdown(`---\nslug: ${slug}\n${extra}---\n${content}\n`);
const config = (posts = [post('one')], markdownFiles = { one: md('one') }, exceptions = []) => ({
  posts, allPosts: posts, markdownFiles, exceptions,
  patterns: [{ name: 'task ID', regex: '\\bt_[0-9a-f]{8}\\b' }], now: new Date('2026-11-04T12:00:00Z'),
});

test('real route inventory is evaluated, including hidden/deduplicated entries', () => {
  const { posts, allPosts } = loadRegistries(ROOT);
  assert.ok(posts.length > 50);
  assert.ok(allPosts.length >= posts.length);
  assert.equal(new Set(posts.map((p) => p.slug)).size, posts.length);
});

test('additional renderer registries cannot silently bypass inventory', (t) => {
  const root = registryFixture(t);
  assert.equal(loadRegistries(root).posts.length, 1);
  const route = join(root, 'src/app/blog/page.tsx');
  writeFileSync(route, readFileSync(route, 'utf8') + '\nimport { extraPosts } from "@/lib/extra-posts";');
  assert.throws(() => loadRegistries(root), /uninspected.*import/i);
});

test('commented imports cannot impersonate the rendered source', (t) => {
  const root = registryFixture(t);
  writeFileSync(join(root, 'src/app/blog/page.tsx'), '// import { posts } from "@/lib/blog";');
  assert.throws(() => loadRegistries(root), /no longer reads/);
});

test('rendered body/date changes with unchanged slugs fail closed', (t) => {
  const root = registryFixture(t);
  const registry = join(root, 'src/lib/blog.ts');
  writeFileSync(registry, readFileSync(registry, 'utf8').replace('export const posts = allPosts;',
    'export const posts = allPosts.map(p => ({...p, content: "changed", date: "2099-01-01"}));'));
  assert.throws(() => loadRegistries(root), /Rendered posts differ/);
});

test('parity is exact inside body; edge whitespace is ignored only', () => {
  assert.deepEqual(validate(config()), []);
  assert.match(validate(config([post('one', '#  Hello')]))[0], /bodies differ/);
  assert.match(validate(config([post('one')], { one: md('one', '# hello') }))[0], /bodies differ/);
});

test('unknown, stale, and orphan Markdown exceptions fail closed', () => {
  assert.match(validate(config([post('one')], {}))[0], /missing Markdown/);
  assert.match(validate(config([post('one')], {}, ['ghost'])).join(' '), /exception does not name/);
  assert.match(validate(config([post('one')], { one: md('one') }, ['one']))[0], /stale/);
  assert.match(validate(config([post('one')], { one: md('one'), orphan: md('orphan') }))[0], /orphan/);
  assert.match(validate(config([post('one')], { one: md('wrong') }))[0], /frontmatter slug differs/);
});

test('raw duplicate fails even when renderer de-duplicates', () => {
  const input = config();
  input.allPosts = [post('one'), post('one')];
  assert.match(validate(input).join(' '), /duplicate registry slug/);
});

test('agent byline in registry and Markdown, author field, and voice ban fail', () => {
  assert.match(validate(config([post('one', 'Written by Scribe')])).join(' '), /agent authorship/);
  assert.match(validate(config([post('one')], { one: md('one', 'Written by Kilo') })).join(' '), /agent authorship/);
  assert.match(validate(config([post('one')], { one: md('one', '# Hello', 'author: Hive\n') })).join(' '), /agent authorship/);
  assert.match(validate(config([{ ...post('one'), author: 'Virgil' }])).join(' '), /agent authorship/);
  assert.match(validate(config([post('one', 'Task t_deadbeef')])).join(' '), /banned voice pattern/);
  assert.match(validate(config([{ ...post('one'), ctaHook: 'Task t_deadbeef' }])).join(' '), /banned voice pattern/);
  assert.match(validate(config([{ ...post('one'), tags: ['Task t_deadbeef'] }])).join(' '), /banned voice pattern/);
});

test('formatted agent attribution and nested author fields fail', () => {
  for (const body of ['**Written by:** Scribe', 'By **Kilo**', 'Written by [Hive](/team)', '<p>Written by <strong>Virgil</strong></p>']) {
    assert.match(validate(config([post('one', body)])).join(' '), /agent authorship/, body);
  }
  assert.match(validate(config([{ ...post('one'), author: { name: 'Scribe' } }])).join(' '), /agent authorship/);
  assert.match(validate(config([post('one')], { one: md('one', '# Hello', 'author:\n  name: Hive\n') })).join(' '), /agent authorship/);
});

test('calendar dates reject invalid, non-ISO and future', () => {
  for (const date of ['2026-02-30', '2026-11-05', '2026-1-1', 'tomorrow']) {
    assert.match(validate(config([{ ...post('one'), date }])).join(' '), /date/, date);
  }
});

test('live index ignores script/comment lookalikes, accepts real anchors, and probes after index failure', async () => {
  for (const html of ['<script>const x = \'href="/blog/one/"\';</script>', '<!-- <a href="/blog/one/">One</a> -->', '<div data-href="/blog/one/">One</div>']) {
    const errors = await checkLive([post('one')], { fetcher: async () => ({ status: 200, text: async () => html }) });
    assert.match(errors.join(' '), /absent from/, html);
  }
  for (const html of ["<a class='card' href='/blog/one/'>One</a>", '<a href="https://edgelesslab.com/blog/one">One</a>']) {
    assert.deepEqual(await checkLive([post('one')], { fetcher: async () => ({ status: 200, text: async () => html }) }), []);
  }
  const calls = [];
  const errors = await checkLive([post('one')], { fetcher: async (url) => {
    calls.push(url);
    return { status: 503, text: async () => '' };
  } });
  assert.equal(calls.length, 2);
  assert.deepEqual(errors, ['/blog/: HTTP 503', 'one: live GET failed (HTTP 503)']);
});

test('live mode GETs every slug, checks actual index anchors and status', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options.method]);
    return { status: url.endsWith('/bad/') ? 404 : 200, text: async () => '<a href="/blog/one/">One</a>' };
  };
  const errors = await checkLive([post('one'), post('bad')], { fetcher });
  assert.deepEqual(errors, ['bad: absent from /blog/ index links', 'bad: live GET failed (HTTP 404)']);
  assert.deepEqual(calls.map(([url]) => url), [
    'https://edgelesslab.com/blog/', 'https://edgelesslab.com/blog/one/', 'https://edgelesslab.com/blog/bad/',
  ]);
  assert.ok(calls.every(([, method]) => method === 'GET'));
  assert.deepEqual(await checkLive([post('one')], { fetcher: async () => { throw new Error('offline'); } }), ['/blog/: offline', 'one: live GET failed (offline)']);
});
