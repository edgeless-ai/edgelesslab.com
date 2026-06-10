const fs=require('fs'),path=require('path');
const manifest=JSON.parse(fs.readFileSync('.next/build-manifest.json','utf8'));
const app=manifest.pages['/']||{};
const ssr=app.initial||[];
const pages=[];
function walk(dir){ for(const ent of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,ent.name); if(ent.isDirectory()) walk(p); else pages.push([fs.statSync(p).size, p.replace(/^\.next[/\\]/,'')]); } }
walk('.next/static/chunks');
const initChunks=new Set(ssr.flatMap(x=>x.files?x.files:[]));
const pageClient=ssr.find(x=>/page_client-reference-manifest\.js$/.test(x.file));
const pageClientChunks=pageClient?new Set(pageClient.files||[]):new Set();
console.log('app initial count', ssr.length);
console.log('page client ref manifest exists', !!pageClient);
pages.sort((a,b)=>b[0]-a[0]);
console.log('largest 20 chunks:');
for (const [sz,rel] of pages.slice(0,20)) console.log((sz/1024).toFixed(1).padStart(9), 'KB', rel);
let initialBytes=0, pageClientBytes=0;
for(const [sz,rel] of pages){
 if(initChunks.has(rel)) initialBytes+=sz;
 if(pageClientChunks.has(rel)) pageClientBytes+=sz;
}
console.log('initial bytes', (initialBytes/1024/1024).toFixed(2), 'MB');
console.log('page client bytes', (pageClientBytes/1024/1024).toFixed(2), 'MB');
