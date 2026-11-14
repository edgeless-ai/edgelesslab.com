import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRelay} from './preview-relay.mjs';
import worker,{Budget} from './worker.mjs';
import {TOOLS,TOOL_CHOICE,MAX_RESPONSE_BYTES,validateTools,validateMessages,validateAction,validateCompletion,validateAdmission,limitedJSON} from './protocol.mjs';
const clone=structuredClone;
const source={type:'blog',title:'Stop switches',content:'Stop switches halt agents',description:'Safety',url:'https://edgelesslab.com/blog/stop-switches/',path:'/blog/stop-switches/'};
const completion=()=>({choices:[{index:0,finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'AgentOutput',arguments:JSON.stringify({action:{done:{success:true,text:'Source-backed answer'}}})}}]}}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12},ask_admission:{policy_version:1,attempts:1,reserved_tokens:100,measured_tokens:12,free_only:true,counts_only:true}});
const body=()=>({model:'auto',stream:false,max_tokens:1024,question:'find stop switches',pagePath:'/blog/',messages:[{role:'system',content:'guide'},{role:'user',content:'find stop switches'}],tools:TOOLS,tool_choice:TOOL_CHOICE});
function setup(){
 const values=new Map();let q=Promise.resolve();const storage={get:async k=>clone(values.get(k)),put:async(k,v)=>values.set(k,clone(v)),setAlarm:async()=>{}};
 storage.transaction=fn=>{const n=q.then(()=>fn(storage));q=n.catch(()=>{});return n;};const budget=new Budget({storage});
 return {values,env:{ASK_ENABLED:'preview',PREVIEW_ORIGINS:'https://preview.workers.dev',IP_SALT:'test-only',RELAY_URL:'https://safe.trycloudflare.com/v1/chat/completions',RELAY_KEY:'test-only',BUDGET:{idFromName:n=>n,get:()=>budget},ASSETS:{fetch:async()=>Response.json([source])}}};
}
const request=b=>new Request('https://preview.workers.dev/api/ask-edgeless/v1/chat/completions',{method:'POST',headers:{Origin:'https://preview.workers.dev','Content-Type':'application/json'},body:JSON.stringify(b)});
const badTools=[[],null,[{type:'function',function:{name:'charge_payment'}}],[{type:'function',function:{name:'AgentOutput',parameters:{}}}], [...TOOLS,{type:'function',function:{name:'done'}}]];
for(const [i,tools] of badTools.entries())test(`positive request schema rejects variant ${i} before network`,async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('no network permitted');});
 assert.throws(()=>validateTools(tools,TOOL_CHOICE));assert.equal((await worker.fetch(request({...body(),tools}),setup().env)).status,400);
});
test('exact canonical tool schema + choice pass, changed descriptions/properties fail',()=>{validateTools(clone(TOOLS),clone(TOOL_CHOICE));const a=clone(TOOLS);a[0].function.parameters.additionalProperties=true;assert.throws(()=>validateTools(a,TOOL_CHOICE));assert.throws(()=>validateTools(TOOLS,'auto'));});
for(const action of [
 {charge_payment:{amount:5}},{},{filter:{},done:{success:true,text:'ok'}},{scroll:{pixels:2001}},
 {scroll:{pixels:1.1}},{scroll:{pixels:'1'}},{filter:{maxPrice:-1}},{filter:{maxPrice:10001}},
 {filter:{maxPrice:null}},{filter:{kind:'secret'}},{filter:{selector:'button'}},
 {navigate:{url:'x',script:'x'}},{done:{success:true}},{done:{success:'true',text:'ok'}},
 {done:{success:true,text:'x'.repeat(1201)}},
])test(`positive output action rejects ${JSON.stringify(action).slice(0,80)}`,()=>assert.throws(()=>validateAction({action})));
test('every allowed action is accepted; extra macro fields and unsafe URLs fail',()=>{
 for(const action of [{done:{success:true,text:'ok'}},{search:{query:'switch'}},{navigate:{url:source.url}},{open_product:{url:'https://shop.edgelesslab.com/?d=real-source-fixture'}},{filter:{kind:'poster',maxPrice:30}},{filter:{}},{scroll:{pixels:-500}}])assert.doesNotThrow(()=>validateAction({action}));
 assert.throws(()=>validateAction({action:{filter:{}},arbitrary:'value'}));
 assert.throws(()=>validateAction({action:{navigate:{url:'https://evil.test/'}}},[source]));
 assert.throws(()=>validateAction({action:{open_product:{url:source.url}}},[source]));
});
for(const [name,mutate] of [
 ['empty choices',d=>d.choices=[]],['multiple choices',d=>d.choices.push(clone(d.choices[0]))],
 ['unknown tool',d=>d.choices[0].message.tool_calls[0].function.name='charge_payment'],
 ['multiple calls',d=>d.choices[0].message.tool_calls.push(clone(d.choices[0].message.tool_calls[0]))],
 ['empty calls',d=>d.choices[0].message.tool_calls=[]],['bad args JSON',d=>d.choices[0].message.tool_calls[0].function.arguments='{'],
 ['multi action',d=>d.choices[0].message.tool_calls[0].function.arguments=JSON.stringify({action:{filter:{},done:{success:true,text:'ok'}}})],
 ['free text',d=>d.choices[0].message.content='ignored arbitrary content'],['length',d=>d.choices[0].finish_reason='length'],
 ['missing finish',d=>delete d.choices[0].finish_reason],['stop',d=>d.choices[0].finish_reason='stop'],['content filter',d=>d.choices[0].finish_reason='content_filter'],
 ['negative prompt',d=>d.usage.prompt_tokens=-1],['missing prompt',d=>delete d.usage.prompt_tokens],['missing completion',d=>delete d.usage.completion_tokens],
 ['inconsistent total',d=>d.usage.total_tokens=13],['fractional',d=>d.usage.completion_tokens=1.5],['excess output',d=>{d.usage.completion_tokens=1025;d.usage.total_tokens=1035;}],
 ['extra tool key',d=>d.choices[0].message.tool_calls[0].execute='script'],
 ['wrong role',d=>d.choices[0].message.role='user'],
])test(`completion ${name} rejected by validator AND Worker (no raw forwarding)`,async t=>{
 const d=completion();mutate(d);assert.throws(()=>validateCompletion(d,100000,[source]));
 const {env,values}=setup();let calls=0;
 t.mock.method(globalThis,'fetch',async url=>String(url).includes('catalog.json')?Response.json({designs:[]}):(calls++,Response.json(d)));
 const r=await worker.fetch(request(body()),env);assert.equal(r.status,502);const out=await r.json();assert.equal(out.choices,undefined);assert.equal(out.terminal_status,name==='length'?'truncated':'failed');assert.equal(calls,1);assert(values.get('counts').reserved>0);assert.equal(values.get('counts').measured,['negative prompt','missing prompt','missing completion','inconsistent total','fractional','excess output'].includes(name)?0:12);
});
test('stream cap cancels oversized completion without Content-Length before JSON parse',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_RESPONSE_BYTES+1));},cancel(){cancelled=true;}});
 await assert.rejects(limitedJSON(new Response(stream)),/body_too_large/);assert(cancelled);
});
test('Worker oversized upstream remains reserved and returns sanitized fixed error',async t=>{
 const {env,values}=setup();t.mock.method(globalThis,'fetch',async url=>String(url).includes('catalog.json')?Response.json({designs:[]}):new Response('x'.repeat(MAX_RESPONSE_BYTES+1)));
 const r=await worker.fetch(request(body()),env);assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'body_too_large',terminal_status:'failed'});assert(values.get('counts').reserved>0);
});
test('packed action history is preserved; overlength or unsupported standalone history rejected, never sliced',()=>{
 const messages=[{role:'system',content:'system'},{role:'user',content:'task\n[history] prior filter succeeded'}];assert.equal(validateMessages(messages),messages[1].content);
 assert.throws(()=>validateMessages([...messages,{role:'tool',content:'prior action'}]));
 assert.throws(()=>validateMessages([messages[0],{...messages[1],tool_calls:[]}]));
 assert.throws(()=>validateMessages([{role:'system',content:'system'},{role:'user',content:'x'.repeat(24001)}]));
});
for(const [name,mutate] of [['extra',d=>d.ask_admission.prompt='must not be forwarded'],['missing',d=>delete d.ask_admission],['retry',d=>d.ask_admission.attempts=2],['paid',d=>d.ask_admission.free_only=false],['logs',d=>d.ask_admission.counts_only=false],['underreserved',d=>d.ask_admission.reserved_tokens=1],['mismatch',d=>d.ask_admission.measured_tokens=10],['widened',d=>d.ask_admission.reserved_tokens=1000001]])test(`admission ${name} fails closed`,()=>{const d=completion();mutate(d);assert.throws(()=>validateAdmission(d,100000));});
test('relay default disabled calls ZERO runtime endpoints',async t=>{
 let calls=0;const key='x'.repeat(32);const server=createRelay({key,runtimeKey:'test-only',fetchImpl:async()=>{calls++;throw Error('must not call');}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const r=await fetch(`http://127.0.0.1:${server.address().port}/v1/chat/completions`,{method:'POST',headers:{Authorization:'Bearer '+key},body:JSON.stringify(body())});assert.equal(r.status,503);assert.equal(calls,0);
});
test('relay uses scoped endpoint only, requires receipt; unknown usage is not zero',async t=>{
 let mode='missing';const calls=[];const key='x'.repeat(32);const server=createRelay({key,runtimeKey:'test-only',policy:'ask-edgeless-v1',fetchImpl:async(url)=>{calls.push(url);const d=completion();if(mode==='missing')delete d.ask_admission;return Response.json(d);}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const call=()=>fetch(`http://127.0.0.1:${server.address().port}/v1/chat/completions`,{method:'POST',headers:{Authorization:'Bearer '+key},body:JSON.stringify(body())});
 assert.equal((await call()).status,502);mode='valid';assert.equal((await call()).status,200);assert.deepEqual(calls,['http://127.0.0.1:3001/v1/ask-edgeless/chat/completions','http://127.0.0.1:3001/v1/ask-edgeless/chat/completions']);
});
