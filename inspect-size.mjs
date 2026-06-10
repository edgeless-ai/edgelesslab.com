import { createRequire } from 'module'
const fs = require('fs')
const path = require('path')
// crude JS-only size stats for server/client/routes
const root = '.next/server/app'
let total=0; let dirs=0; let chunks=[]; let files=0
function walk(dir){
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name)
    if(ent.isDirectory()){
      walk(p)
    } else {
      const s=fs.statSync(p).size
      const rel=p.replace(/^\.next\/server\//,'')
      if(/\.js$/.test(p)){total+=s;files++;chunks.push([s,rel])}
    }
  }
}
walk(root)
chunks.sort((a,b)=>b[0]-a[0])
console.log('js-file count',files,'totalMB',(total/1024/1024).toFixed(2))
for (const [s,rel] of chunks.slice(0,15)){
  console.log((s/1024).toFixed(1).padStart(9), 'KB', rel)
}
