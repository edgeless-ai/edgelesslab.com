import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{Budget,upstreamURL,limitedJSON} from './worker.mjs';
import {refusal,findSources,filterProducts,allowedURL,productSources,OFF_SITE,sourceExcerpt} from './policy.mjs';
function memoryBudget() {
  const values=new Map(); let queue=Promise.resolve();
  const storage={get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>values.clear()};
  storage.transaction=fn=>{const next=queue.then(()=>fn(storage));queue=next.catch(()=>{});return next;};
  const object=new Budget({storage});
  return {object,values,call:d=>object.fetch(new Request('https://budget/',{method:'POST',body:JSON.stringify(d)}))};
}
const source={type:'blog',title:'Stop switches',description:'A safety pattern',content:'Stops halt an agent',url:'https://edgelesslab.com/blog/stop-switches/',path:'/blog/stop-switches/'};
const request=(body={},origin='https://preview.workers.dev',url='https://preview.workers.dev/api/ask-edgeless/v1/chat/completions')=>new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({question:'find stop switches',pagePath:'/blog/',messages:[{role:'user',content:'find stop switches'}],...body})});
function env() {const b=memoryBudget();return {ASK_ENABLED:'preview',PREVIEW_ORIGINS:'https://preview.workers.dev',IP_SALT:'unit-test-only-salt',RELAY_KEY:'unit-test-only-key',RELAY_URL:'https://relay.trycloudflare.com/v1/chat/completions',ASSETS:{fetch:async()=>Response.json([source])},BUDGET:{idFromName:n=>n,get:()=>b.object},b};}
test('rolling per-IP rate: 30 allowed, 31st returns 429; another IP independent',async()=>{
 const b=memoryBudget();for(let i=0;i<30;i++)assert.equal((await b.call({ip:'a',reserve:1})).status,200);
 const last=await b.call({ip:'a',reserve:1});assert.equal(last.status,429);assert.equal((await last.json()).error,'rate_limit');assert.equal((await b.call({ip:'b',reserve:1})).status,200);
});
test('concurrent reservations cannot overshoot hard daily 1M cap',async()=>{
 const b=memoryBudget();const result=await Promise.all(Array.from({length:30},(_,i)=>b.call({ip:String(i),reserve:50000})));assert.equal(result.filter(r=>r.status===200).length,20);assert.equal(b.values.get('counts').reserved,1000000);
});
test('failed requests do not refund reservations; measured tokens count separately',async()=>{const b=memoryBudget();await b.call({ip:'a',reserve:999999});await b.call({op:'usage',tokens:12});assert.equal((await b.call({ip:'b',reserve:2})).status,429);assert.equal(b.values.get('counts').measured,12);});
test('UTC day rollover discards prior day counts without storing conversations',async()=>{const b=memoryBudget();b.values.set('counts',{day:'2000-01-01',reserved:200000,measured:200000,requests:99,ips:{}});await b.call({ip:'a',reserve:5});assert.equal(b.values.get('counts').reserved,5);assert.deepEqual(Object.keys(b.values.get('counts')).sort(),['day','ips','measured','requests','reserved']);});
test('allowed URLs must be exact index members; checkout, external origins and schemes denied',()=>{assert.equal(allowedURL(source.url,[source]),source);for(const url of ['javascript:alert(1)','https://evil.test/','https://shop.edgelesslab.com/checkout','https://edgelesslab.com/blog/stop-switches/?admin=1'])assert.throws(()=>allowedURL(url,[source]));});
test('catalog prices and availability come directly from source; exclusive price ceiling',()=>{const p=productSources({designs:[{slug:'real-source-fixture',title:'Fixture',kind:'poster',price_usd:28,currency:'USD',available:false}]});assert.equal(p[0].price,28);assert.equal(p[0].available,false);assert.equal(filterProducts(p,'poster',30).length,1);assert.equal(filterProducts(p,'poster',28).length,0);});
test('off-topic does not inherit section context; current field note can be summarized',()=>{assert.equal(findSources([source,{type:'section',path:'/blog/',title:'Blog',description:''}],'quantum gardening weather','/blog/').length,0);assert.equal(findSources([source],'summarize this field note',source.path)[0],source);});
test('directory redirects preserve current field-note grounding',()=>{
 const note={...source,type:'field-note',path:'/creative-demos/flow/index.html'};
 assert.equal(findSources([note],'summarize this field note','/creative-demos/flow/')[0],note);
});
test('stop-switch synonyms rank and excerpt real deep content instead of irrelevant headings',()=>{
 const actual={...source,title:'Infrastructure',content:'Unrelated heading. '.repeat(160)+'A kill switch prevents runaway actions.'};
 const distractor={...source,title:'Switching techniques',content:'Moving between patterns.'};
 assert.equal(findSources([distractor,actual],'find the post about stop switches')[0],actual);
 assert.match(sourceExcerpt(actual,'find stop switches'),/kill switch prevents runaway actions/);
 assert(sourceExcerpt(actual,'find stop switches').length<=1500);
});
test('personal data, cart and purchase refusals',()=>{for(const p of ['buy this for me','add this to cart','submit checkout','fill this form with my shipping address'])assert.match(refusal(p),/can.t buy/);assert.equal(refusal('find stop switches'),null);});
test('only admitted https relay endpoint is possible, no metered/public provider substitution',()=>{assert.match(upstreamURL('https://x.trycloudflare.com/v1/chat/completions'),/trycloudflare/);for(const s of ['http://x.trycloudflare.com/v1/chat/completions','https://api.openai.com/v1/chat/completions','https://x.trycloudflare.com/other','https://x.trycloudflare.com.evil.test/v1/chat/completions'])assert.throws(()=>upstreamURL(s));});
test('request streaming byte cap is enforced even with no Content-Length',async()=>{await assert.rejects(limitedJSON(new Request('https://x',{method:'POST',body:'x'.repeat(50)}),49),/large/);});
test('prod, default-off and wrong origins fail closed without provider fetch',async()=>{const e=env();assert.equal((await worker.fetch(request(),{...e,ASK_ENABLED:undefined})).status,404);assert.equal((await worker.fetch(request({},'https://preview.workers.dev','https://edgelesslab.com/api/ask-edgeless/v1/chat/completions'),e)).status,404);assert.equal((await worker.fetch(request({},'https://evil.test'),e)).status,403);});
test('CORS preflight accepts only exact preview origins',async()=>{const r=await worker.fetch(new Request('https://preview.workers.dev/api/ask-edgeless/v1/chat/completions',{method:'OPTIONS',headers:{Origin:'https://preview.workers.dev'}}),env());assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://preview.workers.dev');});
test('model/max_tokens/url from browser are ignored; no prompts stored',async(t)=>{
 const e=env();let called;
 t.mock.method(globalThis,'fetch',async(url,init)=>{if(String(url).includes('catalog.json'))return Response.json({designs:[]});called={url,body:JSON.parse(init.body)};return Response.json({choices:[{message:{role:'assistant',content:'OK'}}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}});});
 const r=await worker.fetch(request({model:'paid',max_tokens:999999,url:'https://evil.test'}),e);assert.equal(r.status,200);assert.equal(called.body.model,'auto');assert.equal(called.body.max_tokens,1024);assert.equal(called.body.stream,false);assert.match(called.url,/relay.trycloudflare.com/);assert.doesNotMatch(JSON.stringify(e.b.values.get('counts')),/stop switches/);
});
test('missing usage or failed upstream fails closed; no alternate route call',async(t)=>{let calls=0;t.mock.method(globalThis,'fetch',async url=>{if(String(url).includes('catalog.json'))return Response.json({designs:[]});calls++;return Response.json({choices:[]});});assert.equal((await worker.fetch(request(),env())).status,502);assert.equal(calls,1);});
test('off-site and purchase request return exact deterministic refusals at zero tokens',async(t)=>{t.mock.method(globalThis,'fetch',async url=>{assert.match(String(url),/catalog.json/);return Response.json({designs:[]});});for(const [question,expected] of [['quantum gardening weather',OFF_SITE],['buy this for me',refusal('buy this for me')]]){const r=await worker.fetch(request({question}),env());assert.equal(r.status,200);const d=await r.json();assert.equal(d.refusal,expected);assert.equal(d.usage.total_tokens,0);}});
test('unsafe built-in tools are rejected before any upstream call',async()=>{assert.equal((await worker.fetch(request({tools:[{function:{name:'execute_javascript'}}]}),env())).status,400);});
