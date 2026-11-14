// Authoritative wire policy shared by browser, Worker and preview relay.
// Deliberately not the agent library's permissive/repairable macro schema.
import { allowedURL } from './policy.mjs';
export const MAX_OUTPUT = 1024;
export const MAX_RESPONSE_BYTES = 16384;
export const MAX_PACKED_MESSAGE = 24000;
const object = (properties, required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const string = maxLength => ({type:'string',minLength:1,maxLength});
const kinds = ['poster','tee','sticker','mug','hoodie','tote','cap','print','enamel','embroidery','bucket','cc-tee'];
const actions = {
  navigate:object({url:string(500)}),
  search:object({query:string(200)}),
  filter:object({kind:{type:'string',enum:kinds},maxPrice:{type:'number',exclusiveMinimum:0,maximum:10000}},[]),
  scroll:object({pixels:{type:'integer',minimum:-2000,maximum:2000}}),
  open_product:object({url:string(500)}),
  done:object({success:{type:'boolean'},text:string(1200)}),
};
const parameters=object({
  evaluation_previous_goal:{type:'string',maxLength:1000},
  memory:{type:'string',maxLength:1000},
  next_goal:{type:'string',maxLength:1000},
  action:{oneOf:Object.entries(actions).map(([name,schema])=>object({[name]:schema}))},
},['action']);
export const TOOLS=Object.freeze([{type:'function',function:{name:'AgentOutput',description:'Exactly one read-only site action, or done with a source-grounded answer.',parameters}}]);
export const TOOL_CHOICE=Object.freeze({type:'function',function:{name:'AgentOutput'}});
const canonical=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function validateTools(tools,choice) {
  if(canonical(tools)!==canonical(TOOLS)||canonical(choice)!==canonical(TOOL_CHOICE))throw Error('invalid_tools');
}
// Small closed-schema validator: supports only the above vocabulary. No arbitrary schema input.
function conforms(value,schema) {
  if(schema.oneOf)return schema.oneOf.filter(s=>conforms(value,s)).length===1;
  if(schema.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>Object.hasOwn(schema.properties,k))&&schema.required.every(k=>Object.hasOwn(value,k))&&Object.entries(value).every(([k,v])=>conforms(v,schema.properties[k]));
  if(schema.type==='string')return typeof value==='string'&&(!schema.minLength||value.length>=schema.minLength)&&value.length<= (schema.maxLength??Infinity)&&(!schema.enum||schema.enum.includes(value));
  if(schema.type==='boolean')return typeof value==='boolean';
  if(schema.type==='number'||schema.type==='integer')return typeof value==='number'&&Number.isFinite(value)&&(schema.type!=='integer'||Number.isSafeInteger(value))&&(schema.minimum===undefined||value>=schema.minimum)&&(schema.exclusiveMinimum===undefined||value>schema.exclusiveMinimum)&&(schema.maximum===undefined||value<=schema.maximum);
  return false;
}
export function validateAction(value,sources) {
  if(!conforms(value,parameters))throw Error('invalid_action');
  const [name]=Object.keys(value.action), input=value.action[name];
  if(sources&&['navigate','open_product'].includes(name)){
    const source=allowedURL(input.url,sources);
    if(name==='open_product'&&source.type!=='product')throw Error('invalid_action');
  }
  return name;
}
export function validateMessages(messages) {
  // PageAgentCore packs task + action history in ONE user message, preceded by system.
  // Separate tool/assistant clients are explicitly unsupported, never silently discarded.
  if(!Array.isArray(messages)||messages.length!==2||messages[0]?.role!=='system'||messages[1]?.role!=='user'||messages.some(m=>!m||Object.keys(m).some(k=>!['role','content'].includes(k))||typeof m.content!=='string'||m.content.length>MAX_PACKED_MESSAGE)||!messages[1].content.trim())throw Error('invalid_messages');
  return messages[1].content;
}
export async function limitedJSON(message,max=MAX_RESPONSE_BYTES) {
  const reader=message.body?.getReader();if(!reader)throw Error('invalid_json');
  let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('body_too_large');}chunks.push(value);}
  const all=new Uint8Array(size);let at=0;for(const part of chunks){all.set(part,at);at+=part.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{throw Error('invalid_json');}
}
export function validateUsage(u,reservation) {
  if(!u||['prompt_tokens','completion_tokens','total_tokens'].some(k=>!Number.isSafeInteger(u[k])||u[k]<0)||u.total_tokens!==u.prompt_tokens+u.completion_tokens||u.total_tokens>reservation||u.completion_tokens>MAX_OUTPUT)throw Error('invalid_upstream_usage');
  return {prompt_tokens:u.prompt_tokens,completion_tokens:u.completion_tokens,total_tokens:u.total_tokens};
}
export function validateCompletion(output,reservation,sources) {
  const u=validateUsage(output?.usage,reservation);
  if(!Array.isArray(output.choices)||output.choices.length!==1)throw Error('invalid_completion');
  const choice=output.choices[0];
  if(choice.finish_reason==='length')throw Error('truncated');
  if(choice.finish_reason!=='tool_calls'||choice.index!==0||choice.message?.role!=='assistant')throw Error('invalid_completion');
  const m=choice.message;
  if(m.content!==null&&m.content!==undefined&&m.content!=='')throw Error('invalid_completion');
  if(!Array.isArray(m.tool_calls)||m.tool_calls.length!==1)throw Error('invalid_action');
  const call=m.tool_calls[0];
  if(call.type!=='function'||typeof call.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(call.id)||call.function?.name!=='AgentOutput'||typeof call.function.arguments!=='string'||call.function.arguments.length>6000||Object.keys(call).some(k=>!['id','type','function'].includes(k))||Object.keys(call.function).some(k=>!['name','arguments'].includes(k)))throw Error('invalid_action');
  let args;try{args=JSON.parse(call.function.arguments);}catch{throw Error('invalid_action');}
  const action=validateAction(args,sources);
  return {action,args,choices:[{index:0,finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:call.id,type:'function',function:{name:'AgentOutput',arguments:JSON.stringify(args)}}]}}],usage:{prompt_tokens:u.prompt_tokens,completion_tokens:u.completion_tokens,total_tokens:u.total_tokens}};
}
export function validateAdmission(output,reservation) {
  const r=output?.ask_admission;
  if(!r||Object.keys(r).some(k=>!['policy_version','attempts','reserved_tokens','measured_tokens','free_only','counts_only'].includes(k))||r.policy_version!==1||r.attempts!==1||r.free_only!==true||r.counts_only!==true||!Number.isSafeInteger(r.reserved_tokens)||r.reserved_tokens<=0||r.reserved_tokens>reservation||!Number.isSafeInteger(r.measured_tokens)||r.measured_tokens!==output.usage?.total_tokens||r.measured_tokens>r.reserved_tokens)throw Error('runtime_admission_unproven');
  return r;
}
