import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('LIA generated pages reproduce checked-in public sources without drift', () => {
  const paths = ['public/lia/index.html', 'public/lia/building-an-instrument-that-can-say-no/index.html'];
  const before = paths.map(path => readFileSync(path, 'utf8'));
  const result = spawnSync('python3', ['scripts/build-lia.py'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (let i = 0; i < paths.length; i++) assert.equal(readFileSync(paths[i], 'utf8'), before[i], `Regenerate ${paths[i]} from content/lia before committing`);
});
