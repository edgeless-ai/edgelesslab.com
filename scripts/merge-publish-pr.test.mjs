import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertChecksGreen, checkMatches, mergePublishPr } from './merge-publish-pr.mjs';

const view = (over = {}) => ({ number: 12, state: 'OPEN', isDraft: false, headRefName: 'publish/fixture', headRefOid: 'head-a', ...over });
const green = (...names) => names.map((name) => ({ name, state: 'SUCCESS', bucket: 'pass' }));
const allGreen = green('frontend-tests', 'e2e-tests', 'build');

function harness({ views = [view(), view()], checksJson = allGreen, checksFail = false } = {}) {
  const calls = [];
  let viewReads = 0;
  const run = (cmd, args) => {
    calls.push([cmd, args]);
    if (args[0] === 'pr' && args[1] === 'view') return JSON.stringify(views[Math.min(viewReads++, views.length - 1)]);
    if (args[0] === 'pr' && args[1] === 'checks') {
      if (args.includes('--watch') && checksFail) throw new Error('a check failed while watching');
      return JSON.stringify(checksJson);
    }
    return '';
  };
  return { calls, run };
}
const merges = (calls) => calls.filter(([cmd, args]) => cmd === 'gh' && args[0] === 'pr' && args[1] === 'merge');

test('merges only the exact head commit, after the checks have been watched', () => {
  const { calls, run } = harness();
  assert.deepEqual(mergePublishPr(12, { run }), { pr: 12, head: 'head-a', checks: 3 });
  assert.deepEqual(merges(calls), [['gh', ['pr', 'merge', '12', '--repo', 'edgeless-ai/edgelesslab.com',
    '--squash', '--match-head-commit', 'head-a']]]);
  assert.equal(calls.filter(([, args]) => args.includes('--watch')).length, 1);
  assert.ok(calls.findIndex(([, args]) => args.includes('--watch')) < calls.findIndex(([, args]) => args[1] === 'merge'));
  assert.equal(calls.at(-1)[1][1], 'merge');
});

test('accepts the bare job name and the "Workflow / job" label', () => {
  assert.equal(checkMatches('e2e-tests', 'e2e-tests'), true);
  assert.equal(checkMatches('E2E Tests / e2e-tests', 'e2e-tests'), true);
  assert.equal(checkMatches('frontend-tests (pull_request)', 'frontend-tests'), true);
  assert.equal(checkMatches('build', 'e2e-tests'), false);
});

for (const [label, options] of [
  ['a check that fails while watching', { checksFail: true }],
  ['a red check bucket', { checksJson: [{ name: 'e2e-tests', state: 'FAILURE', bucket: 'fail' }] }],
  ['a pending check', { checksJson: [{ name: 'e2e-tests', state: 'PENDING', bucket: 'pending' }] }],
  ['a cancelled check', { checksJson: [{ name: 'e2e-tests', state: 'CANCELLED', bucket: 'cancel' }] }],
  ['no checks at all', { checksJson: [] }],
  ['a required check that never ran', { checksJson: green('frontend-tests', 'build') }],
  ['a closed PR', { views: [view({ state: 'MERGED' })] }],
  ['a draft PR', { views: [view({ isDraft: true })] }],
  ['a main head', { views: [view({ headRefName: 'main' })] }],
  ['a head that moved mid-run', { views: [view(), view({ headRefOid: 'head-b' })] }],
]) {
  test(`never merges with ${label}`, () => {
    const { calls, run } = harness(options);
    assert.throws(() => mergePublishPr(12, { run }));
    assert.deepEqual(merges(calls), []);
  });
}

test('assertChecksGreen names the offending check', () => {
  assert.throws(() => assertChecksGreen(green('e2e-tests', 'build')),
    /required checks never ran \(frontend-tests\)/);
  assert.throws(() => assertChecksGreen([...green('frontend-tests', 'e2e-tests'), { name: 'build', state: 'FAILURE', bucket: 'fail' }]),
    /build=fail/);
});
