// PREVIEW ONLY. Bind loopback, tunnel this port, never tunnel the gateway itself.
// Requires a distinct random RELAY_KEY, not the gateway/provider credential.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
const {RELAY_KEY,FREELLMAPI_KEY}=process.env;
if(!RELAY_KEY || RELAY_KEY.length<32 || !FREELLMAPI_KEY) throw new Error('Missing scoped relay credentials');
function authorized(value='') { const a=Buffer.from(value),b=Buffer.from('Bearer '+RELAY_KEY);return a.length===b.length&&timingSafeEqual(a,b); }
let reserved=0, day=new Date().toISOString().slice(0,10);
http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'||!authorized(req.headers.authorization)){res.writeHead(403).end();return;}
  try {
    let text=''; for await(const part of req){text+=part;if(Buffer.byteLength(text)>70000)throw new Error('large');}
    const b=JSON.parse(text);if(b.model!=='auto'||b.stream!==false||b.max_tokens!==1024)throw new Error('invalid');
    const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;reserved=0;}
    const cost=Buffer.byteLength(text)+2048;if(reserved+cost>1000000){res.writeHead(429).end();return;}reserved+=cost;
    const r=await fetch('http://127.0.0.1:3001/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+FREELLMAPI_KEY,'Content-Type':'application/json'},body:text,signal:AbortSignal.timeout(40000)});
    if(!r.ok){res.writeHead(503).end();return;}
    const d=await r.json();if(d.usage?.cost!==0 || !Number.isSafeInteger(d.usage?.total_tokens))throw new Error('unmetered route unproven');
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:d.choices,usage:d.usage}));
  }catch{res.writeHead(503).end();}
}).listen(Number(process.env.PORT??8797),'127.0.0.1',()=>console.log('Preview relay listening on loopback; counts only, no request logging.'));
