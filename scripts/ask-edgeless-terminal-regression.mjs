// Deterministic browser fault injection against the ACTUAL bundle. NOT live model acceptance.
import {chromium} from '@playwright/test';
import http from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {TOOLS,TOOL_CHOICE,validateTools} from '../workers/ask-edgeless/protocol.mjs';
import {assertTerminal} from '../workers/ask-edgeless/acceptance.mjs';
const bundle=await readFile('public/ask-edgeless.js');
const source={type:'blog',title:'Stop switches (synthetic test fixture)',url:'https://edgelesslab.com/blog/stop-switches/',path:'/blog/stop-switches/',description:'Stop switch testing',content:'A stop switch halts automated execution.'};
const catalog={designs:[{slug:'synthetic-fixture',title:'Synthetic poster fixture (not customer data)',kind:'poster',price_usd:20,currency:'USD',available:false}]};
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/ask-edgeless.js'?'text/javascript':'text/html');res.end(req.url==='/ask-edgeless.js'?bundle:'<html><body><h1>Local synthetic Ask Edgeless regression harness</h1><div id="rack"></div></body></html>');});
server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();const results=[];
try{
 for(const fault of ['length','truncated-error','empty-choices','wrong-tool','bad-args','state-overflow','complete']){
  const context=await browser.newContext();const page=await context.newPage();let calls=0,filterApplied=false;const terminal=[];
  await page.exposeFunction('__recordTerminal',v=>terminal.push(v));
  await page.route('**/ask-edgeless-index.json',r=>r.fulfill({json:[source]}));
  await page.route('**/catalog.json',r=>r.fulfill({json:catalog}));
  await page.route('**/api/ask-edgeless/v1/chat/completions',async route=>{
   calls++;const req=route.request().postDataJSON();validateTools(req.tools,req.tool_choice);assert.deepEqual(req.tools,TOOLS);assert.deepEqual(req.tool_choice,TOOL_CHOICE);
   if(calls>1)assert.match(req.messages[1].content,/filterComplete|filter|Showing/,'packed history not lost');
   const action=calls===1?{filter:{kind:'poster',maxPrice:30}}:{done:{success:true,text:'Showing source-backed posters under $30.'}};
   const d={choices:[{index:0,finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:'call_'+calls,type:'function',function:{name:'AgentOutput',arguments:JSON.stringify({action})}}]}}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12},terminal_status:'validated'};
   if(calls>1){
    if(fault==='length')d.choices[0].finish_reason='length';
    if(fault==='empty-choices')d.choices=[];
    if(fault==='wrong-tool')d.choices[0].message.tool_calls[0].function.name='charge_payment';
    if(fault==='bad-args')d.choices[0].message.tool_calls[0].function.arguments='{';
    if(fault==='truncated-error'){await route.fulfill({status:502,json:{error:'truncated',terminal_status:'truncated'}});return;}
   }
   await route.fulfill({json:d});
  });
  await page.goto(base+'/');
  await page.evaluate(async ({base,fault})=>{
   window.addEventListener('ask-edgeless:terminal',e=>window.__recordTerminal(e.detail));
   window.addEventListener('ask-edgeless:filter',()=>{document.querySelector('#rack').dataset.filtered='true';if(fault==='state-overflow'){// Fault injection into the next page-agent packed state, no network inference.
     const parse=JSON.parse;JSON.parse=function(text,...args){const value=parse(text,...args);if(value?.model==='auto'&&value?.messages?.[1])value.messages[1].content='x'.repeat(24001);return value;};
   }});
   window.__ASK_EDGELESS_CONFIG__={enabled:true,endpoint:base+'/api/ask-edgeless/v1/chat/completions',siteBase:base,shopBase:base};await import('/ask-edgeless.js');
  },{base,fault});
  await page.locator('#ask-edgeless #toggle').click();
  await page.locator('#ask-edgeless #prompt').fill('Show me posters under $30.');
  await page.locator('#ask-edgeless #send').click();
  await page.locator('#ask-edgeless[data-state="idle"]').waitFor({timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#ask-edgeless')?.dataset.terminal!=='running');
  filterApplied=await page.locator('#rack').getAttribute('data-filtered')==='true';assert(filterApplied,'first action really executed');
  const status=await page.locator('#ask-edgeless').getAttribute('data-terminal');
  const answer=await page.locator('#ask-edgeless .assistant').last().innerText();
  if(fault==='complete'){assert.equal(status,'complete');assertTerminal(terminal.at(-1),'complete');}
  else{assert.notEqual(status,'complete');assert.throws(()=>assertTerminal(terminal.at(-1),'complete'),'real acceptance predicate must reject applied-action + failed-model');assert.match(answer,/did not finish|unavailable/);}
  assert.equal(calls,fault==='state-overflow'?1:2,'browser LLM retries disabled and state overflow rejected before HTTP');
  if(fault==='state-overflow')assert.equal(status,'state_overflow');
  results.push({fault,filterApplied,status,calls,acceptance:status==='complete'?'accept':'reject'});await context.close();
 }
 console.log(JSON.stringify({synthetic:true,liveInferenceCalls:0,pass:true,results},null,2));
}finally{await browser.close();server.close();}
