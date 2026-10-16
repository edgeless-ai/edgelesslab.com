import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const policy = layout.match(/httpEquiv="Content-Security-Policy" content="([^"]+)"/)[1];
const directives = new Map(policy.split(';').filter(s => s.trim()).map(s => {
  const [name, ...sources] = s.trim().split(/\s+/);
  return [name, sources];
}));

test('Gumroad loader bundle, overlay styles and fonts have explicit asset permissions', () => {
  for (const name of ['script-src', 'style-src', 'font-src']) {
    assert.ok(directives.get(name).includes('https://assets.gumroad.com'), name);
    assert.ok(!directives.get(name).includes('*'), 'do not allow arbitrary hosts');
  }
});

test('overlay iframe permits the catalog merchant, not just the apex domain', () => {
  const data = readFileSync(new URL('../src/lib/data.ts', import.meta.url), 'utf8');
  const hosts = new Set([...data.matchAll(/https:\/\/([^/]+\.gumroad\.com)\/l\//g)].map(m => m[1]));
  assert.ok(hosts.size > 0, 'test must exercise real catalog URLs');
  for (const host of hosts) assert.ok(directives.get('frame-src').includes(`https://${host}`), host);
});

test('unrelated policy restrictions and ingestion permissions remain intact', () => {
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('font-src'), ["'self'", 'https://assets.gumroad.com']);
  assert.ok(directives.get('connect-src').includes('https://edgeless-ingest.djm-claude-assistant.workers.dev'));
  assert.ok(directives.get('script-src').includes('us-assets.i.posthog.com'));
});
