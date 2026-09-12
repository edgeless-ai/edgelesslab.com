import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { adapterSource, adapterCss } from './adapter.mjs';
import { validateCatalog } from './check.mjs';
const base = new URL('../../src/components/design-system/', import.meta.url);
const catalog = validateCatalog(JSON.parse(await readFile(new URL('tokens.json', base), 'utf8')));
for (const [name, content] of [['primitives.tsx', adapterSource(catalog)], ['primitives.module.css', adapterCss(catalog)]]) {
  await writeFile(new URL(name, base), content);
  console.log(`Generated ${fileURLToPath(new URL(name, base))}`);
}
