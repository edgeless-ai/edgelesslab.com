// PREVIEW ONLY. Tunnel this loopback port, never the shared runtime itself.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { TOOLS, TOOL_CHOICE, MAX_OUTPUT, limitedJSON, validateTools, validateCompletion, validateAdmission } from './protocol.mjs';
export function createRelay({key,runtimeKey,policy,fetchImpl=fetch}) {
  if(!key||key.length<32||!runtimeKey)throw Error('Missing scoped relay credentials');
  function authorized(value=''){const a=Buffer.from(value),b=Buffer.from('Bearer '+key);return a.length===b.length&&timingSafeEqual(a,b);}
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const fail=(status,code)=>{res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify({error:code}));};
    if(req.method!=='POST'||req.url!=='/v1/chat/completions'||!authorized(req.headers.authorization)){fail(403,'denied');return;}
    // Never send to the unsafe shared route or trust a post-call cost===0 check.
    // Activation requires the separately implemented + independently reviewed runtime policy.
    if(policy!=='ask-edgeless-v1'){fail(503,'runtime_policy_disabled');return;}
    try {
      let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>70000)throw Error('large');chunks.push(part);}
      const text=Buffer.concat(chunks).toString('utf8'),b=JSON.parse(text);
      if(b.model!=='auto'||b.stream!==false||b.max_tokens!==MAX_OUTPUT)throw Error('invalid');
      validateTools(b.tools,b.tool_choice);
      const reservation=Buffer.byteLength(text)+1024+MAX_OUTPUT;
      const r=await fetchImpl('http://127.0.0.1:3001/v1/ask-edgeless/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+runtimeKey,'Content-Type':'application/json'},body:JSON.stringify({...b,tools:TOOLS,tool_choice:TOOL_CHOICE}),signal:AbortSignal.timeout(40000)});
      if(!r.ok){await r.body?.cancel();fail(503,'runtime_unavailable');return;}
      const output=await limitedJSON(r);
      const valid=validateCompletion(output,reservation);
      const admission=validateAdmission(output,reservation);
      res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({choices:valid.choices,usage:valid.usage,ask_admission:admission}));
    }catch{fail(502,'invalid_runtime_response');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  createRelay({key:process.env.RELAY_KEY,runtimeKey:process.env.FREELLMAPI_KEY,policy:process.env.ASK_RUNTIME_POLICY}).listen(Number(process.env.PORT??8797),'127.0.0.1',()=>console.log('Preview relay listening on loopback; counts only.'));
}
