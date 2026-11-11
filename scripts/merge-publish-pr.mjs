import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Merge a publication PR only after every check on its exact head commit has
 * finished green.
 *
 * `main` has no required status checks, so nothing on the server side stops a
 * lane from merging a red PR (PR #92 merged ~11s after its checks started and
 * reverted two gallery entries). This is the merge gate the lanes must use:
 * wait for the checks, re-read the head, merge that exact commit.
 *
 *   npm run publish:merge -- --pr 123
 */

export const DEFAULT_REPOSITORY = 'edgeless-ai/edgelesslab.com';
export const REQUIRED_CHECKS = ['frontend-tests', 'e2e-tests'];

const GREEN = new Set(['pass', 'skipping']);

/** `gh pr checks --json name` may be the job name or a "Workflow / job" label. */
export function checkMatches(name, required) {
  return name === required || name.endsWith(`/ ${required}`) || name.startsWith(`${required} `);
}

/** Refuse anything that is not an open, non-draft, non-main PR at a known head. */
export function assertMergeable(view, expectedHead) {
  if (!view || view.state !== 'OPEN') throw new Error(`PR ${view?.number ?? '?'} is not open (${view?.state ?? 'unknown'})`);
  if (view.isDraft) throw new Error(`PR ${view.number} is still a draft`);
  if (['main', 'master'].includes(view.headRefName)) throw new Error('Refusing to merge a publication PR whose head is main');
  if (!view.headRefOid) throw new Error('PR head commit is unknown');
  if (expectedHead && view.headRefOid !== expectedHead) {
    throw new Error(`PR head moved from ${expectedHead} to ${view.headRefOid}; refusing to merge an unverified commit`);
  }
  return view.headRefOid;
}

/** Every check must be finished and green, and the named publication checks present. */
export function assertChecksGreen(checks, required = REQUIRED_CHECKS) {
  if (!checks || !checks.length) throw new Error('No checks reported: refusing to merge an untested PR');
  const failed = checks.filter((check) => !GREEN.has(check.bucket ?? check.state));
  if (failed.length) {
    throw new Error(`Refusing to merge: ${failed.map((check) => `${check.name}=${check.bucket ?? check.state}`).join(', ')}`);
  }
  const missing = required.filter((name) => !checks.some((check) => checkMatches(check.name, name)));
  if (missing.length) throw new Error(`Refusing to merge: required checks never ran (${missing.join(', ')})`);
  return checks.length;
}

export function mergePublishPr(pr, {
  repository = DEFAULT_REPOSITORY,
  required = REQUIRED_CHECKS,
  run = (command, args, capture = false) => {
    const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}); nothing merged`);
    return (result.stdout ?? '').trim();
  },
} = {}) {
  const view = JSON.parse(run('gh', ['pr', 'view', String(pr), '--repo', repository,
    '--json', 'number,state,isDraft,headRefName,headRefOid'], true));
  const head = assertMergeable(view);
  // Waits for in-flight checks; a failing check aborts here, before the merge.
  run('gh', ['pr', 'checks', String(pr), '--repo', repository, '--watch', '--fail-fast', '--interval', '10']);
  const count = assertChecksGreen(
    JSON.parse(run('gh', ['pr', 'checks', String(pr), '--repo', repository, '--json', 'name,state,bucket'], true)),
    required,
  );
  assertMergeable(JSON.parse(run('gh', ['pr', 'view', String(pr), '--repo', repository,
    '--json', 'number,state,isDraft,headRefName,headRefOid'], true)), head);
  run('gh', ['pr', 'merge', String(pr), '--repo', repository, '--squash', '--match-head-commit', head]);
  return { pr: view.number, head, checks: count };
}

function parseArgs(argv) {
  const options = { pr: null, repository: DEFAULT_REPOSITORY, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--pr') options.pr = argv[++i];
    else if (arg === '--repo') options.repository = argv[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (/^\d+$/.test(arg)) options.pr = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.pr) throw new Error('Usage: npm run publish:merge -- --pr <number> [--repo owner/name] [--dry-run]');
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { pr, repository, dryRun } = parseArgs(process.argv.slice(2));
    if (dryRun) {
      const run = (command, args, capture = false) => {
        const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
        return (result.stdout ?? '').trim();
      };
      const view = JSON.parse(run('gh', ['pr', 'view', String(pr), '--repo', repository,
        '--json', 'number,state,isDraft,headRefName,headRefOid'], true));
      const head = assertMergeable(view);
      const count = assertChecksGreen(JSON.parse(run('gh', ['pr', 'checks', String(pr), '--repo', repository,
        '--json', 'name,state,bucket'], true)));
      console.log(`dry-run: PR ${view.number} ${head} would merge (${count} checks green)`);
    } else {
      const { head, checks } = mergePublishPr(pr, { repository });
      console.log(`Publication PR merged at ${head} after ${checks} green checks`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
