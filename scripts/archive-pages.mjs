import { spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { project, verifyMarimo } from './verify-immutable-marimo.mjs';

const output = path.join(project, 'out');
const archive = path.resolve(process.argv[2] || 'artifact.tar');
if (archive === output || archive.startsWith(output + path.sep)) throw new Error('Archive must be outside out/');
function tar(args, capture = false) {
  const result = spawnSync('tar', args, {
    encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Pages tar failed (${result.status}): ${result.stderr || ''}`);
  return result.stdout;
}
async function exists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

await verifyMarimo();
await access(path.join(output, '.well-known/ai-catalog.json'));
await mkdir(path.dirname(archive), { recursive: true });
// Linux CI uses the same hard-link dereferencing as upload-pages-artifact.
// BSD tar on macOS has no --hard-dereference; local exports use regular files.
const flags = ['--dereference', ...(process.platform === 'darwin' ? [] : ['--hard-dereference']), '--directory', output];
// Pass visible root entries, not '.', which BSD tar's dotfile glob also
// excludes. Descendant hidden files stay excluded outside approved boundaries.
const ordinary = (await readdir(output)).filter(name => !name.startsWith('.') && name !== 'marimo');
tar(['-cf', archive, ...flags, '--exclude=.git', '--exclude=.github', '--exclude=.[!/]*', '-T', '/dev/null', '--', ...ordinary]);
// Keep the established .well-known allowlist. Approved marimo is a separate
// whole-tree boundary: append it once, WITH hidden files (not just index.html).
tar(['-rf', archive, ...flags, './.well-known']);
const hasMarimo = await exists(path.join(output, 'marimo'));
if (hasMarimo) tar(['-rf', archive, ...flags, './marimo']);
// Query only the required ordinary member; full exports can exceed spawnSync's
// listing buffer. The entire marimo payload is verified by extracted bytes below.
const entries = tar(['-tf', archive, './.well-known/ai-catalog.json'], true).split('\n');
if (!entries.includes('./.well-known/ai-catalog.json')) throw new Error('Pages artifact lost ai-catalog.json');
if (hasMarimo) {
  const extracted = await mkdtemp(path.join(os.tmpdir(), 'pages-marimo-'));
  try {
    tar(['-xf', archive, '-C', extracted, './marimo']);
    console.log(`Pages artifact: ${await verifyMarimo(path.join(extracted, 'marimo'))} marimo files byte-identical`);
  } finally { await rm(extracted, { recursive: true, force: true }); }
}
console.log(`Pages archive verified: ${archive}`);
