#!/usr/bin/env node
// Boska is permitted for self-hosting on our own website, not redistribution
// through a font repository. Fetch official, unchanged bytes at build time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fonts = JSON.parse(await readFile(new URL('./pen-plotter-boska.json', import.meta.url), 'utf8'));
const directory = new URL('../public/pen-plotter/fonts/', import.meta.url);
await mkdir(directory, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const font of fonts) {
  const destination = new URL(font.file, directory);
  const cached = await readFile(destination).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (cached && digest(cached) === font.sha256) continue;
  let bytes;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(font.url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Fontshare returned ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (digest(bytes) !== font.sha256) throw new Error(`Publisher bytes changed for ${font.file}`);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  await writeFile(destination, bytes);
}
console.log(`plotter fonts: ${fonts.length} official Boska files verified`);
