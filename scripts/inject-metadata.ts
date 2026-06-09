import fs from 'fs';
import path from 'path';

const JSON_LD_ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Edgeless Lab',
  url: 'https://edgelesslab.com/',
  logo: 'https://edgelesslab.com/og-image.png',
  sameAs: []
};

const OG_TITLE = 'Edgeless Lab — AI-native tools, autonomous agents, and shipped systems';
const OG_DESCRIPTION = 'Edgeless Lab builds autonomous agents, MCP servers, and generative art systems for production. Open-source infrastructure for solo operators.';
const OG_IMAGE = 'https://edgelesslab.com/og-image.png';

const SCRIPT = `
(function () {
  try {
    var existing = document.querySelector('script[type="application/ld+json"]');
    if (!existing) {
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(__JSON_LD__);
      document.head.appendChild(script);
    }
    var ogs = [{property:'og:title',content:__OG_TITLE__},{property:'og:description',content:__OG_DESCRIPTION__},{property:'og:image',content:__OG_IMAGE__},{property:'og:type',content:'website'},{name:'description',content:__OG_DESCRIPTION__}];
    ogs.forEach(function(tag){
      var attr = tag.property ? 'property' : 'name';
      var el = document.querySelector('meta['+attr+'="'+tag[attr]+'"]');
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, tag[attr]); document.head.appendChild(el); }
      el.setAttribute('content', tag.content);
    });
  } catch (e) {}
})();
`;

export function build() {
  const out = path.join(process.cwd(), 'out');
  if (!fs.existsSync(out)) {
    console.error('Missing out/ directory. Run this after `next build`.');
    process.exit(1);
  }
  const jsonLd = JSON.stringify(JSON_LD_ORG);
  const finalScript = SCRIPT
    .replace('__JSON_LD__', jsonLd)
    .replace('__OG_TITLE__', OG_TITLE)
    .replace('__OG_DESCRIPTION__', OG_DESCRIPTION)
    .replace('__OG_IMAGE__', OG_IMAGE);

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  };
  walk(out);

  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const insertAt = html.lastIndexOf('</head>');
    const snippet = `<script>${finalScript}</script>`;
    if (insertAt === -1 || html.includes(snippet)) continue;
    fs.writeFileSync(file, html.slice(0, insertAt) + snippet + html.slice(insertAt));
  }
  console.log('Injected structured data + Open Graph tags into', files.length, 'HTML files.');
}

if (require.main === module) build();
