import fs from 'fs';
import path from 'path';

type Edit = { before: string; after: string };

function edit(rel: string, edit: Edit) {
  const full = path.join('src', rel);
  const html = fs.readFileSync(full, 'utf8');
  if (!html.includes(edit.before)) return;
  fs.writeFileSync(full, html.replace(edit.before, edit.after));
  console.log(`patched src/${rel}`);
}

edit('app/page.tsx', {
  before: `    <link rel="preconnect" href="https://gumroad.com">\n    <link rel="preconnect" href="https://gumroad.com" crossorigin>\n    <link rel="preload" as="image" href="/og-image.png">`,
  after: '',
});

edit('app/layout.tsx', {
  before: `    <link rel="preconnect" href="https://gumroad.com">\n    <link rel="preconnect" href="https://gumroad.com" crossorigin>`,
  after: '    // Gumroad preconnect removed globally per EDGA-5399; products page loads it on demand.',
});

console.log('done');
