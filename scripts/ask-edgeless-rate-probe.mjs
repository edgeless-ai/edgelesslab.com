// Live rate boundary, zero inference spend: deterministic off-site requests still count.
import assert from 'node:assert/strict';
const base=process.argv[2];
if(!base||!new URL(base).hostname.endsWith('.workers.dev'))throw Error('Preview URL required');
const statuses=[],start=Date.now();
let last;
for(let n=1;n<=31;n++){
 const r=await fetch(base+'/api/ask-edgeless/v1/chat/completions',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({question:'What is the weather on Jupiter tomorrow?',pagePath:'/blog/',messages:[{role:'user',content:'What is the weather on Jupiter tomorrow?'}]})});
 last=await r.json();statuses.push(r.status);
 if(n<=30){assert.equal(r.status,200,`request ${n}: wait 60 seconds after other probes before retrying`);assert.equal(last.usage?.total_tokens,0);}
}
assert(Date.now()-start<60000,'probe must fit one rolling minute');
assert.equal(statuses[30],429);assert.equal(last.error,'rate_limit');
console.log(JSON.stringify({pass:true,requests:31,allowed:statuses.filter(s=>s===200).length,request31:statuses[30],error:last.error,measuredTokens:0,elapsedMs:Date.now()-start,statuses},null,2));
