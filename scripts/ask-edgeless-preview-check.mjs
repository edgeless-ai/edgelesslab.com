// Real browser + real model on preview; never installs mocks or routes provider calls.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const [site,shop,out]=process.argv.slice(2);
if(!site||!shop||!out)throw Error('usage: node scripts/ask-edgeless-preview-check.mjs SITE_PREVIEW SHOP_PREVIEW ARTIFACT_DIR');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];const direct=[];const mutations=[];const errors=[];
const index=await fetch(site+'/ask-edgeless-index.json').then(r=>r.json());
const blog=index.find(s=>s.type==='blog'&&/kill.switch|stop.switch/i.test(s.title+' '+s.content));
assert(blog,'source blog about stop switches exists');
const note=index.find(s=>s.type==='field-note');assert(note);
async function run(name,base,path,prompt,check,screenshot){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 let proxyCalls=0;let usage={prompt_tokens:0,completion_tokens:0,total_tokens:0};
 page.on('request',r=>{const u=new URL(r.url());if(/openai|openrouter|nousresearch|cerebras|groq|together|trycloudflare|localhost|127\.0\.0\.1/.test(u.hostname))direct.push(u.origin);if(/checkout|payment-intents|\/cart\b/.test(u.pathname)&&r.method()==='POST')mutations.push(u.pathname);if(u.pathname==='/api/ask-edgeless/v1/chat/completions'&&r.method()==='POST')proxyCalls++;});
 page.on('response',async r=>{if(r.url().includes('/api/ask-edgeless/')&&r.request().method()==='POST'){try{const d=await r.json();for(const k of Object.keys(usage))usage[k]+=d.usage?.[k]??0;}catch{}}});
 page.on('pageerror',e=>errors.push({name,error:e.message}));
 await page.goto(base+path,{waitUntil:'domcontentloaded'});
 await page.locator('#ask-edgeless').getByRole('button',{name:'Ask Edgeless ↗',exact:true}).click();
 await page.locator('#ask-edgeless').getByRole('textbox',{name:'Ask a question'}).fill(prompt);
 await page.locator('#ask-edgeless').getByRole('button',{name:'Ask',exact:true}).click();
 try { await check(page,blog,note); } catch(e) { console.error('FAILED CASE',name,'URL',page.url(),'THREAD',await page.locator('#ask-edgeless #thread').innerText().catch(()=>''),'SOURCES',await page.locator('#ask-edgeless #sources').innerText().catch(()=>'')); await page.screenshot({path:out+'/failed-'+name.replaceAll(' ','-')+'.png'}); throw e; }
 if(screenshot){await page.locator('#ask-edgeless #toggle').waitFor();if(await page.locator('#ask-edgeless #panel').isHidden())await page.locator('#ask-edgeless #toggle').click();await page.locator('#ask-edgeless #panel').waitFor({state:'visible'});await page.screenshot({path:out+'/'+screenshot,animations:'disabled'});}
 const answer=await page.locator('#ask-edgeless #thread').innerText().catch(()=>'(navigated)');
 results.push({name,prompt,url:page.url(),proxyCalls,usage,answer});
 await context.close();
}
try{
 await run('blog find',site,'/blog/','Find the post about stop switches and open it.',async(page)=>{await page.waitForURL(u=>u.pathname===blog.path,{timeout:150000});},'ask-edgeless-blog.png');
 await run('field note summary',site,note.path,'Summarize this field note.',async page=>{await page.locator('#ask-edgeless[data-state="idle"]').waitFor({timeout:150000});const answer=await page.locator('#ask-edgeless .assistant').last().innerText();assert(answer.length>30);assert(!/unavailable|could not complete|not on this site/i.test(answer));await page.locator('#ask-edgeless #sources').getByRole('link',{name:note.title,exact:true}).waitFor();});
 await run('shop filter',shop,'/','Show me posters under $30.',async page=>{await page.locator('[data-ask-filter]').waitFor({timeout:150000});await page.locator('#ask-edgeless[data-state="idle"]').waitFor({timeout:150000});const u=new URL(page.url());assert.equal(u.searchParams.get('ask_kind'),'poster');assert.equal(u.searchParams.get('ask_under'),'30');const cards=await page.locator('.rackCard').evaluateAll(nodes=>nodes.map(n=>({kind:n.dataset.productKind,price:Number(n.dataset.productPrice)})));assert(cards.length>0);assert(cards.every(c=>c.kind==='poster'&&c.price<30));assert(!/InvokeError|truncated|unavailable|could not complete/i.test(await page.locator('#ask-edgeless .assistant').last().innerText()));},'ask-edgeless-shop.png');
 await run('off topic',site,'/blog/','What is the weather on Jupiter tomorrow?',async page=>{await page.locator('#ask-edgeless[data-state="idle"]').waitFor({timeout:30000});assert.match(await page.locator('#ask-edgeless .assistant').last().innerText(),/not on this site/i);});
 await run('purchase refusal',shop,'/','Buy this for me.',async page=>{await page.locator('#ask-edgeless[data-state="idle"]').waitFor({timeout:30000});assert.match(await page.locator('#ask-edgeless .assistant').last().innerText(),/can.t buy/i);});
 assert.equal(direct.length,0,'browser must never contact an LLM host or private relay');assert.equal(mutations.length,0,'no checkout/cart mutation');
 assert(results.slice(0,3).every(r=>r.proxyCalls>0),'first three prompts must exercise real proxy/model');
 assert(results.slice(3).every(r=>r.proxyCalls===0),'refusals do not consume model tokens');
 assert.equal(errors.length,0,'clean browser console/page errors');
 console.log(JSON.stringify({pass:true,results,directLLMCalls:direct,mutations,errors},null,2));
 await writeFile(out+'/preview-results.json',JSON.stringify({pass:true,results,directLLMCalls:direct,mutations,errors},null,2));
}catch(error){
 await writeFile(out+'/preview-results.json',JSON.stringify({pass:false,error:error.message,results,directLLMCalls:direct,mutations,errors},null,2));
 throw error;
}finally{await browser.close();}
