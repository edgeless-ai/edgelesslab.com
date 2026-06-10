import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'out');
if (!fs.existsSync(OUT)) {
  console.error('Missing out/. Run after next build.');
  process.exit(1);
}

const GUMROAD_ORIGIN = 'gumroad.com';
const GUMROAD_GLOBALS = /gumroad\.com\/(js\/gumroad\.js|_\/cart)/i;

type Edit = { file: string; before: string; after: string };

const edits: Edit[] = [];

function editHtml(relPath: string, replacer: (html: string) => string) {
  const full = path.join(OUT, relPath);
  const html = fs.readFileSync(full, 'utf8');
  const next = replacer(html);
  if (next !== html) fs.writeFileSync(full, next);
}

// 1) Global Gumroad preconnect — only keep in product pages
editHtml('index.html', (html) => {
  if (!GUMROAD_GLOBALS.test(html)) return html;
  return html
    .replace(`<link rel="preconnect" href="https://${GUMROAD_ORIGIN}">`, '<!-- gumroad preconnect removed globally per EDGA-5399 -->')
    .replace(`<link rel="preconnect" href="https://${GUMROAD_ORIGIN}" crossorigin>`, '<!-- gumroad preconnect removed globally per EDGA-5399 -->');
});

for (const slug of ['products', 'agents', 'lab', 'knowledge', 'blog']) {
  editHtml(`${slug}/index.html`, (html) => html.replace(/<link rel="preconnect" href="https:\/\/gumroad\.com">/g, '').replace(/<link rel="preconnect" href="https:\/\/gumroad\.com" crossorigin>/g, ''));
}

// 2) Defer og-image preload outside product pages
editHtml('index.html', (html) => {
  const rx = /<link rel="preload" as="image" href="\/og-image.png"[^>]*>/;
  if (!rx.test(html)) return html;
  return html.replace(rx, '<!-- og-image preload deferred per EDGA-5399 -->');
});

// 3) Strip gumroad script from non-product pages (next build will regenerate from source later)
for (const relPath of ['index.html', 'about/index.html', 'blog/index.html', 'knowledge/index.html']) {
  editHtml(relPath, (html) => html.replace(/\n?<script src="https:\/\/[^"]*gumroad[^"]*"><\/script>/g, ''));
}

console.log('Cleanup complete.');
