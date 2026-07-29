import { promises as fs } from "node:fs";
import path from "node:path";

const publicDir = path.resolve(process.cwd(), "public");
const scriptTag = '<script src="/art-only-mode.js" defer></script>';
const canvasPattern = /<canvas\b|createCanvas\s*\(|WebGLRenderer\s*\(/i;
const checkOnly = process.argv.includes("--check");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(absolute);
    }
  }

  return files;
}

const htmlFiles = await walk(publicDir);
const canvasFiles = [];
const missing = [];
let injected = 0;

for (const file of htmlFiles) {
  const html = await fs.readFile(file, "utf8");
  if (!canvasPattern.test(html)) continue;

  canvasFiles.push(file);
  if (html.includes(scriptTag)) continue;

  missing.push(file);
  if (checkOnly) continue;

  const insertionPoint = html.lastIndexOf("</body>");
  const updated =
    insertionPoint >= 0
      ? `${html.slice(0, insertionPoint)}  ${scriptTag}\n${html.slice(insertionPoint)}`
      : `${html}\n${scriptTag}\n`;

  await fs.writeFile(file, updated);
  injected += 1;
}

if (checkOnly && missing.length > 0) {
  console.error(
    `${missing.length} of ${canvasFiles.length} canvas pages are missing art-only mode:`
  );
  for (const file of missing) {
    console.error(`- ${path.relative(process.cwd(), file)}`);
  }
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`Art-only mode is present on all ${canvasFiles.length} canvas pages.`);
} else {
  console.log(
    `Injected art-only mode into ${injected} page${injected === 1 ? "" : "s"}. ` +
      `${canvasFiles.length} canvas pages are covered.`
  );
}
