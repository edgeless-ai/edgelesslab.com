import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// No text decoding, extension filters or hidden-file exclusions at this boundary.
export async function manifest(directory, prefix = '') {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT' && !prefix) return null; throw error; }
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = prefix + entry.name;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(result, await manifest(file, name + '/'));
    else if (entry.isFile()) result[name] = createHash('sha256').update(await readFile(file)).digest('hex');
    else throw new Error(`Immutable marimo payload must contain only regular files/directories: ${file}`);
  }
  return result;
}

export async function verifyMarimo(destination = path.join(project, 'out/marimo')) {
  const source = await manifest(path.join(project, 'public/marimo'));
  const target = await manifest(destination);
  if (source === null && target === null) return 0;
  if (source === null || target === null) throw new Error('Immutable marimo source/export boundary missing');
  const names = new Set([...Object.keys(source), ...Object.keys(target)]);
  const drift = [...names].filter(name => source[name] !== target[name]);
  if (drift.length) throw new Error(`Immutable marimo file drift (${drift.length}): ${drift.slice(0, 20).join(', ')}`);
  return names.size;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Immutable marimo: ${await verifyMarimo()} files byte-identical`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
