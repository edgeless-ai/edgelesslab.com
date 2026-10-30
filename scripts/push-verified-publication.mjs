import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repository = 'https://github.com/edgeless-ai/edgelesslab.com.git';

export function pushVerifiedPublication(run = (command, args, capture = false) => {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}); nothing pushed`);
  return (result.stdout ?? '').trim();
}) {
  const branch = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], true);
  if (!branch || ['main', 'master'].includes(branch)) throw new Error('Use a publication PR branch, never main');
  const assertClean = () => {
    if (run('git', ['status', '--porcelain', '--untracked-files=all'], true)) {
      throw new Error('Commit scoped changes first: refusing to test one tree and push another');
    }
  };
  assertClean();
  const head = run('git', ['rev-parse', 'HEAD'], true);
  // Same production build, unit, smoke and consent suites as CI, then live delivery.
  // Any nonzero exit aborts before the ONLY push below. No --force or failure swallowing.
  run('npm', ['run', 'verify:publication']);
  assertClean();
  if (run('git', ['rev-parse', 'HEAD'], true) !== head ||
      run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], true) !== branch) {
    throw new Error('HEAD/branch changed during verification; nothing pushed');
  }
  // Push the verified object, not a moving HEAD. This does not merge or deploy.
  run('git', ['push', repository, `${head}:refs/heads/${branch}`]);
  return { branch, head };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { branch, head } = pushVerifiedPublication();
    console.log(`Verified publication pushed: ${branch}@${head}; require exact-head PR checks before merge`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
