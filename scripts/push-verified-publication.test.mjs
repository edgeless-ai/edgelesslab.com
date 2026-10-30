import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushVerifiedPublication } from './push-verified-publication.mjs';

function harness({ dirty = false, fail = false, moved = false, switched = false, branch = 'publish/fixture' } = {}) {
  const calls = [];
  let reads = 0;
  let branchReads = 0;
  const run = (cmd, args) => {
    calls.push([cmd, args]);
    if (args[0] === 'symbolic-ref') return switched && branchReads++ ? 'publish/other' : branch;
    if (args[0] === 'status') return dirty ? ' M tests/smoke.spec.ts' : '';
    if (args[0] === 'rev-parse') return moved && reads++ ? 'changed-head' : 'verified-head';
    if (cmd === 'npm' && fail) throw new Error('verification failed');
    return '';
  };
  return { calls, run };
}
const pushes = (calls) => calls.filter(([cmd, args]) => cmd === 'git' && args[0] === 'push');

test('pushes only the verified commit to the canonical repo after the complete gate', () => {
  const { calls, run } = harness();
  assert.deepEqual(pushVerifiedPublication(run), { branch: 'publish/fixture', head: 'verified-head' });
  assert.deepEqual(calls.find(([cmd]) => cmd === 'npm'), ['npm', ['run', 'verify:publication']]);
  assert.deepEqual(pushes(calls), [['git', ['push', 'https://github.com/edgeless-ai/edgelesslab.com.git', 'verified-head:refs/heads/publish/fixture']]]);
  assert.equal(calls.at(-1)[1][0], 'push');
});
for (const options of [{ dirty: true }, { fail: true }, { moved: true }, { switched: true }, { branch: 'main' }]) {
  test(`never pushes unsafe or failed publication: ${JSON.stringify(options)}`, () => {
    const { calls, run } = harness(options);
    assert.throws(() => pushVerifiedPublication(run));
    assert.deepEqual(pushes(calls), []);
  });
}
