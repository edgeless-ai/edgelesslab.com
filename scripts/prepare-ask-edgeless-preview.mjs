// Stage isolated preview assets. NEVER enable the checked-in production config.
// Usage: node scripts/prepare-ask-edgeless-preview.mjs SITE_URL SHOP_URL SHOP_CHECKOUT OUTPUT_DIR
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const [site,shop,shopRepo,out]=process.argv.slice(2);
if(!site||!shop||!shopRepo||!out)throw Error('Expected site URL, shop URL, shop checkout, output directory');
for(const u of [site,shop])if(new URL(u).protocol!=='https:'||!new URL(u).hostname.endsWith('.workers.dev'))throw Error('Preview URLs only');
if((JSON.parse(await readFile('public/ask-edgeless-config.json','utf8'))).enabled!==false)throw Error('Production must stay disabled');
await mkdir(out,{recursive:true});
// The standalone Marimo archives alone contain >20,000 assets (Cloudflare Free limit).
// Leave those FULL original archives untouched in out/ and omit them ONLY from this
// scoped Ask Edgeless preview. No production source or standalone artifact is replaced.
await cp('out',path.join(out,'site'),{recursive:true,filter:source=>!path.relative('out',source).split(path.sep).some(s=>s.startsWith('marimo'))});
await cp(path.join(shopRepo,'merch-demo/dist'),path.join(out,'shop'),{recursive:true});
for(const surface of ['site','shop']) {
  const dest=path.join(out,surface);
  for(const name of ['ask-edgeless.js','ask-edgeless-loader.js'])await cp(path.join('public',name),path.join(dest,name));
  await writeFile(path.join(dest,'ask-edgeless-config.json'),JSON.stringify({enabled:true,endpoint:site+'/api/ask-edgeless/v1/chat/completions',siteBase:site,shopBase:shop}));
  await writeFile(path.join(dest,'robots.txt'),'User-agent: *\nDisallow: /\n');
  await writeFile(path.join(dest,'_headers'),'/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n');
}
await cp(path.join(out,'site/ask-edgeless-index.json'),path.join(out,'shop/ask-edgeless-index.json'));
// Actual public catalog snapshot, not hand-written products or prices.
const catalog=await fetch('https://shop.edgelesslab.com/catalog.json');if(!catalog.ok)throw Error('Catalog unavailable');
const catalogText=await catalog.text();JSON.parse(catalogText);
await writeFile(path.join(out,'shop/catalog.json'),catalogText);
await writeFile(path.join(out,'site/catalog.json'),catalogText);
// Standalone creative notes do not inherit Next layout. Inject ONLY the flag loader
// into preview COPIES, leaving artwork and all original scripts intact.
const notes=JSON.parse(await readFile(path.join(out,'site/ask-edgeless-index.json'),'utf8'));
for(const note of notes.filter(s=>s.type==='field-note')) {
 const p=path.join(out,'site',note.path);let html=await readFile(p,'utf8');
 if(!html.includes('/ask-edgeless-loader.js')){html=html.replace(/<\/body>/i,'<script defer src="/ask-edgeless-loader.js"></script>\n</body>');await writeFile(p,html);}
}
async function count(dir){let n=0;for(const e of await readdir(dir,{withFileTypes:true})){n+=e.isDirectory()?await count(path.join(dir,e.name)):1;}return n;}
console.log(JSON.stringify({siteAssets:await count(path.join(out,'site')),shopAssets:await count(path.join(out,'shop')),catalogSource:'https://shop.edgelesslab.com/catalog.json',productionEnabled:false}));
