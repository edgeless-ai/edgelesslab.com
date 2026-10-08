// Mirror the installed SDK's exact font assets. Run intentionally on SDK upgrades.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const version = JSON.parse(await readFile("node_modules/tldraw/package.json", "utf8")).version;
const source = await readFile("node_modules/tldraw/src/lib/utils/static-assets/assetUrls.ts", "utf8");
const entries = [...source.matchAll(/(tldraw_\w+): `\$\{getDefaultCdnBaseUrl\(\)\}\/fonts\/([^`]+)`/g)];
if (entries.length !== 16) throw new Error("Review SDK font manifest before upgrading");
const directory = `public/tldraw/${version}/fonts`;
await mkdir(directory, { recursive: true });
const fonts = {};
for (const [, key, filename] of entries) {
  const sourceUrl = `https://cdn.tldraw.com/${version}/fonts/${filename}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${sourceUrl}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.subarray(0, 4).toString() !== "wOF2") throw new Error(`Not WOFF2: ${sourceUrl}`);
  await writeFile(`${directory}/${filename}`, bytes);
  fonts[key] = { url: `/tldraw/${version}/fonts/${filename}`, sourceUrl, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
}
// Tldraw also preloads these UI images even with hideUi=true.
const definitions = await readFile("node_modules/tldraw/src/lib/defaultEmbedDefinitions.ts", "utf8");
const iconSource = await readFile("node_modules/tldraw/src/lib/ui/icon-types.ts", "utf8");
const icons = Object.fromEntries([...iconSource.matchAll(/\| '([^']+)'/g)].map(([, name]) => [name, `/tldraw/${version}/icons/icon/0_merged.svg#${name}`]));
const embedIcons = {};
const images = [];
for (const relative of ["translations/en.json", "icons/icon/0_merged.svg", ...[...definitions.matchAll(/\btype: '([^']+)'/g)].map(([, type]) => `embed-icons/${type}.png`)]) {
  const sourceUrl = `https://cdn.tldraw.com/${version}/${relative}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${sourceUrl}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const url = `/tldraw/${version}/${relative}`;
  await mkdir(`public${url.substring(0, url.lastIndexOf('/'))}`, { recursive: true });
  await writeFile(`public${url}`, bytes);
  images.push({ url, sourceUrl, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
  if (relative.endsWith(".png")) embedIcons[relative.split('/')[1].replace('.png', '')] = url;
}
await writeFile(`public/tldraw/${version}/manifest.json`, JSON.stringify({ version, fonts, images, icons, embedIcons }, null, 2) + "\n");
console.log(`Vendored ${entries.length} original tldraw ${version} fonts`);
