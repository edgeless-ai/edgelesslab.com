import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../public/ask-edgeless-loader.js',import.meta.url),'utf8');
async function load(hostname,enabled,surface='site',pathname='/blog/') {
  let requests=0; const scripts=[]; const window={};
  await vm.runInNewContext(source,{
    location:{hostname,pathname},window,
    fetch:async()=>{requests++;return {ok:true,json:async()=>({enabled})};},
    document:{documentElement:{dataset:{askEdgelessSurface:surface}},createElement:()=>({}),head:{append:s=>scripts.push(s)}},
  });
  return {requests,scripts,window};
}
test('production loader cannot mount even with an accidentally enabled config',async()=>{
  for(const hostname of ['edgelesslab.com','shop.edgelesslab.com','preview.workers.dev.evil.test']) {
    const result=await load(hostname,true);assert.equal(result.requests,0);assert.equal(result.scripts.length,0);
  }
});
test('preview disabled flag fetches only config and never imports the agent',async()=>{
  const result=await load('ask-preview.workers.dev',false);assert.equal(result.requests,1);assert.equal(result.scripts.length,0);
});
test('enabled preview mounts one same-origin bundle and passes its config',async()=>{
  const result=await load('ask-preview.workers.dev',true);assert.equal(result.requests,1);assert.equal(result.scripts.length,1);assert.equal(result.scripts[0].src,'/ask-edgeless.js');assert.equal(result.window.__ASK_EDGELESS_CONFIG__.enabled,true);
});
test('unsupported routes stay inert; shop root and local development are supported',async()=>{
  assert.equal((await load('ask-preview.workers.dev',true,'site','/privacy/')).requests,0);
  assert.equal((await load('ask-preview.workers.dev',true,'shop','/')).scripts.length,1);
  assert.equal((await load('localhost',true,'site','/lab/')).scripts.length,1);
});
