import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLive, loadRegistries, parseMarkdown, validate } from './check-blog-integrity.mjs';
import { resolve } from 'node:path';

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

test('parity is exact inside body; edge newlines are ignored only', () => {
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
});

test('calendar dates reject invalid, non-ISO and future', () => {
  for (const date of ['2026-02-30', '2026-11-05', '2026-1-1', 'tomorrow']) {
    assert.match(validate(config([{ ...post('one'), date }])).join(' '), /date/, date);
  }
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
  assert.deepEqual(await checkLive([post('one')], { fetcher: async () => { throw new Error('offline'); } }), ['/blog/: offline']);
});
