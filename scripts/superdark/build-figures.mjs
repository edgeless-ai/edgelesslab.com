import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import * as k from './vendor/iso-kit.mjs';

// Anatomy kit, MIT, Ryan / wheresryan22 (pinned dbf697a). See vendor/LICENSE.txt.
// The bench is a metaphor: these dimensions are drawing units, not measured telemetry.
// Parts: 4 feet + 4 pads; foundation + inset + 4 bolts; 2 rails + 4 end stops;
// 4 module plinths + 16 screws + 4 housings + 4 caps + 4 spindles + 4 dials;
// 16 dial fasteners + 4 needles; charter knob + 20 knurl strokes + 2 rule plates.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const images = resolve(root, 'public/images/blog/superdark-factory');
const figures = resolve(root, 'public/figures/superdark-factory');
mkdirSync(images, { recursive: true });
mkdirSync(figures, { recursive: true });
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const source = 'Based on The Superdark Factory · Antikythera · Chapter II';
const svg = (w,h,title,body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">Original Edgeless explanatory illustration. ${source}. A conceptual diagram, not observed performance.</desc><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#24384d" stroke-width=".6"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#dfbd7f" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="#0e1a27"/><rect width="100%" height="100%" fill="url(#grid)"/><style>text{font-family:system-ui,sans-serif;fill:#e8edf1} .muted{fill:#afc2d1}.accent{fill:#dfbd7f}.mono{font-family:ui-monospace,monospace} .edge{fill:none;stroke:#dfbd7f;stroke-width:2;marker-end:url(#arrow)}</style>${body}</svg>`;
const txt = (x,y,s,size=26,cls='') => `<text x="${x}" y="${y}" font-size="${size}" class="${cls}">${esc(s)}</text>`;
const lines = (x,y,ss,size=25,cls='muted') => ss.map((s,i)=>txt(x,y+i*36,s,size,cls)).join('');
const box = (x,y,w,h,stroke='#5d7890') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#122235" stroke="${stroke}" stroke-width="2"/>`;
const foot = (y,which='Chapter II') => txt(40,y,`EDGELESS LAB / Interpretation · superdark.antikythera.org / ${which}`,18,'muted mono');

let b=txt(40,60,'THE DARK STACK',38)+txt(40,104,'Four principles. One foundational constraint.',25,'muted');
const cards=[['01 / PRIMITIVES','Compose learning-capable parts.',['Define inputs, outputs, memory,','actions and attributable feedback.']],['02 / VERSIONING','Identify persistent behavior.',['Keep code provenance; watch','what the system actually does.']],['03 / EVALUATIONS','Observe consequences.',['Challenge results and judges;','look beyond one fixed test.']],['04 / CHARTER','Negotiate governing terms.',['Revisable rules coordinate','the factory across timescales.']]];
cards.forEach(([a,c,ss],i)=>{const x=40+i%2*460,y=150+Math.floor(i/2)*236;b+=box(x,y,420,208)+txt(x+22,y+38,a,23,'accent mono')+txt(x+22,y+84,c,24)+lines(x+22,y+132,ss,22);});
b+=`<rect x="20" y="130" width="920" height="704" rx="7" fill="none" stroke="#dfbd7f" stroke-width="2"/>`+txt(40,630,'Shared foundation: the kernel constrains all four principles.',22,'accent')+box(40,652,880,164,'#dfbd7f')+txt(64,690,'CONSTITUTIONAL KERNEL',25,'accent mono')+lines(64,734,['Hard casts: commitments costly to break.','Soft casts: revisable commitments. Kernel: foundational rules.'],23)+txt(40,858,'Paper: immutable kernel. Edgeless: retains operator intervention.',23,'accent')+foot(904);
writeFileSync(resolve(images,'dark-stack.svg'),svg(960,930,'Four principles and the constitutional kernel',b));

b=txt(40,62,'WHO GETS TO SET THE GOAL?',36)+txt(40,105,'Light → dark → superdark: an explanatory ladder',24,'muted');
const ladder=[['LIGHT','People prescribe the work.',['A tool follows a specified procedure.','People inspect and revise the plan.']],['DARK','The system optimizes an assigned goal.',['More work proceeds unattended.','The objective still comes from outside.']],['SUPERDARK','The system helps form its own goals.',['Objectives emerge through interaction.','This is the paper’s speculative horizon.']]];
ladder.forEach(([a,c,ss],i)=>{const y=148+i*216;b+=box(40,y,880,180,i===2?'#dfbd7f':'#5d7890')+txt(64,y+38,a,24,'accent mono')+txt(64,y+82,c,30)+lines(64,y+122,ss,24);if(i<2)b+=`<path class="edge" d="M480 ${y+186}V${y+207}"/>`;});
b+=txt(40,828,'Not a maturity score or a literal mapping to the paper’s classes.',23,'muted')+foot(874,'Chapter I');
writeFileSync(resolve(images,'autonomy-ladder.svg'),svg(960,900,'Light, dark and superdark autonomy compared',b));

b=txt(32,52,'AUTONOMY INSIDE A LANE',29)+lines(32,90,['Edgeless’s design adaptation, not a rollout report.'],19);
const flow=[['CONTRACT','Inputs, output, permitted effects, stop rule'],['ELIGIBLE WORKER','Capability does not grant blanket authority'],['EXACT ARTIFACT','A retained result, not just a pass message'],['INDEPENDENT REVIEW','Rerun checks; bind approval to this revision'],['OUTCOME RECORD','Trace a later verdict to the actual decision']];
flow.forEach(([a,c],i)=>{const y=132+i*124;b+=box(32,y,576,94,i===3?'#dfbd7f':'#5d7890')+txt(50,y+33,a,22,'accent mono')+txt(50,y+66,c,20);if(i<4)b+=`<path class="edge" d="M320 ${y+98}V${y+117}"/>`;});
b+=lines(32,790,['Missing evidence → pause. Review backlog → slow down.','More autonomy never bypasses authorization.'],21,'accent')+txt(32,888,'EDGELESS LAB / Adoption decision record / 2026-11-07',17,'muted mono');
writeFileSync(resolve(images,'bounded-loop.svg'),svg(640,916,'Edgeless bounded lane and independent review loop',b));

const W=940,H=500;
const plate={x:-202,y:-62,w:404,d:124,r:6};
const P=k.fitProjection([...k.boxCorners(plate,-24,0),[-180,-48,90],[190,45,90]],W,H,{pad:62,azimuth:57,elevation:32});
const at=p=>k.iso(p,P);
const S=(p,opts={})=>k.solidSvg(p,opts);
const L=(d,opts={})=>k.lineSvg(d,opts);
const slab=(p,z,h,opts={})=>S(k.slabOf(p,z,h,P,6,.7),opts);
const cyl=(x,y,r,z,h,opts={})=>S(k.cylinder(x,y,r,z,h,P,40,.4),opts);
let machine='';
const feet=k.corners(plate,18).sort((a,b)=>k.depthOf([...a,0],P)-k.depthOf([...b,0],P));
for(const [x,y] of feet) machine+=cyl(x,y,9,-24,4,{tone:'lo'})+cyl(x,y,6,-20,7,{tone:'mid'});
machine+=`<g id="kernel">${slab(plate,-13,13,{tone:'mid'})}${L(k.planOutline(k.insetPlan(plate,5),0,P),{tone:'lo'})}`;
for(const [x,y] of k.corners(plate,11))machine+=L(k.ring(x,y,2.8,0,P,24),{tone:'mid'})+k.dotsSvg([at([x,y,0])],{size:1});
machine+='</g>';
for(const y of [-38,33]){machine+=slab({x:-188,y,w:376,d:5,r:1},0,4);for(const x of [-192,186])machine+=slab({x,y:y-3,w:6,d:11,r:1},0,8);}
const modules=[{id:'primitive',title:'01 / Primitive',detail:'The input fixture: a defined interface makes a part composable. Learning needs memory, choices and attributable feedback.'},{id:'version',title:'02 / Versioning',detail:'The gauge: identify persistent input–output behavior. A stable score is not necessarily a good score; retain provenance.'},{id:'evaluation',title:'03 / Evaluations',detail:'The independent probe: evaluate consequences and challenge the evaluator. Edgeless rejects deliberately manufactured real catastrophes.'},{id:'charter',title:'04 / Charter',detail:'The adjustable control: governing terms can change. Move the knob below; the anchored kernel does not move.'}];
const sorted=modules.map((m,i)=>({...m,x:-172+i*100})).sort((a,b)=>k.depthOf([a.x,0,0],P)-k.depthOf([b.x,0,0],P));
for(const m of sorted){const x=m.x;let out=slab({x:x-24,y:-25,w:48,d:50,r:3},0,10);
for(const [dx,dy] of [[-18,-19],[18,-19],[-18,19],[18,19]])out+=L(k.ring(x+dx,dy,1.7,10,P),{tone:'mid'});
out+=slab({x:x-19,y:-19,w:38,d:38,r:4},10,26)+cyl(x,0,14,36,4)+cyl(x,0,4,40,13)+cyl(x,0,19,53,5,{tone:'hi'});
out+=L(k.ring(x,0,15,58,P,60),{tone:'mid'});
for(const [dx,dy] of [[-12,0],[12,0],[0,-12],[0,12]])out+=L(k.ring(x+dx,dy,1.1,58,P,16),{tone:'lo'});
const needle=k.lineOnTop([x,0],[x+10,-7],59,P);
out+=`<path ${m.id==='charter'?'id="soft-needle"':''} class="iso-line" data-tone="hi" d="${needle}"/>`+k.dotsSvg([at([x,0,59])],{size:1.7,tone:'hi'});
if(m.id==='charter')out+=cyl(x,27,5,0,10,{tone:'hi'})+L(k.knurl(x,27,5,0,10,20,P),{tone:'mid'});
machine+=`<g id="${m.id}" class="module" data-selected="${m.id==='primitive'}">${out}</g>`;}

const art=k.figureSvg({width:W,height:H,label:'A precision bench with four gauge modules on rails, a bolted foundation, and an adjustable charter control.',body:machine});
const css=`${k.ISO_CSS}\n*{box-sizing:border-box}body{margin:0;background:#101b28;color:#edf1f4;font:15px/1.5 system-ui,sans-serif}main{max-width:1040px;margin:auto;padding:22px}.heading{display:flex;justify-content:space-between;gap:12px;font:12px ui-monospace,monospace;letter-spacing:.06em;color:#c4cfd9}.iso{--anatomy-paper:#142235;--anatomy-top:#2b3c50;--anatomy-face:#293d51;--anatomy-shade-0:#101b28;--anatomy-shade-1:#172537;--anatomy-shade-2:#1c2d41;--anatomy-shade-3:#243449;--anatomy-hi:#c1cfda;--anatomy-mid:#7893a9;--anatomy-lo:#526b80;--anatomy-faint:#3a5063;--anatomy-lit:#dfbd7f}.module[data-selected=true] .iso-edge{stroke:#dfbd7f;stroke-width:1.4}svg{display:block;width:100%;height:auto}button{font:inherit;border:1px solid #637c91;background:#162638;color:#edf1f4;min-height:44px;padding:9px 13px;cursor:pointer}button[aria-pressed=true]{border-color:#dfbd7f;color:#dfbd7f}button:focus-visible,input:focus-visible{outline:3px solid #dfbd7f;outline-offset:3px}nav{display:flex;gap:8px;flex-wrap:wrap}.detail{min-height:94px;padding:14px 0;color:#c4d2de}strong{color:#dfbd7f}label{display:block;margin-top:8px}input{width:min(300px,100%);accent-color:#dfbd7f;min-height:32px}footer{border-top:1px solid #40566a;padding-top:12px;color:#b3c3d0;font-size:13px}a{color:#dfbd7f}.bare nav,.bare .detail,.bare .controls{display:none}.iso[data-theme=light]{--anatomy-paper:#d6dfe2;--anatomy-top:#f3f1e9;--anatomy-face:#d5dfe3;--anatomy-shade-0:#7f939f;--anatomy-shade-1:#98aab4;--anatomy-shade-2:#b2c0c7;--anatomy-shade-3:#c8d3d8;--anatomy-hi:#233d50;--anatomy-mid:#405d70;--anatomy-lo:#617c8c;--anatomy-faint:#7c929f;--anatomy-lit:#73511d;background:#eeeae0;color:#17283a}[data-theme=light] .heading,[data-theme=light] .detail,[data-theme=light] footer{color:#384e60}[data-theme=light] strong,[data-theme=light] a{color:#73511d}[data-theme=light] .module[data-selected=true] .iso-edge{stroke:#73511d}@media(max-width:500px){main{padding:14px}.heading{font-size:11px}.detail{min-height:148px}button{font-size:13px;padding:7px 9px}}`;
const body=`<main><div class="heading"><span>FIG 01 / THE DARK STACK</span><span>A MECHANICAL METAPHOR</span></div>${art}<nav aria-label="Inspect a stack component">${modules.map(m=>`<button type="button" data-part="${m.id}" aria-pressed="${m.id==='primitive'}">${m.title}</button>`).join('')}<button type="button" data-part="kernel" aria-pressed="false">05 / Kernel</button></nav><div class="detail" aria-live="polite"><strong id="part-title">${modules[0].title}</strong><div id="part-detail">${modules[0].detail}</div></div><div class="controls"><label for="soft-rule">Global control: revisable charter (illustrative, not a performance metric)</label><input id="soft-rule" type="range" min="0" max="100" value="50"/><span id="setting">50 / 100</span></div><p><button type="button" id="hide" aria-expanded="true">Hide controls</button> <button type="button" id="theme">Light theme</button></p><footer>Bolted base = foundational commitments. Adjustable dial = revisable terms. Paper: immutable kernel; Edgeless retains operator intervention. No learning or deployment is simulated. <a href="https://superdark.antikythera.org/chapter-ii-the-dark-stack" target="_blank" rel="noopener noreferrer">Read Chapter II</a>. Figure built with <a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noopener noreferrer">Anatomy</a> (MIT).</footer></main>`;
const script=`const parts=${JSON.stringify([...modules,{id:'kernel',title:'05 / Constitutional kernel',detail:'The bolted foundation: the paper’s foundational, immutable commitments. Hard casts are costly-to-break commitments; soft casts are revisable. Edgeless adapts the distinction but retains emergency intervention.'}])};
for(const b of document.querySelectorAll('[data-part]'))b.addEventListener('click',()=>{const p=parts.find(p=>p.id===b.dataset.part);document.getElementById('part-title').textContent=p.title;document.getElementById('part-detail').textContent=p.detail;for(const other of document.querySelectorAll('[data-part]'))other.setAttribute('aria-pressed',String(other===b));for(const m of document.querySelectorAll('.module'))m.dataset.selected=String(m.id===p.id);document.getElementById('kernel').style.opacity=p.id==='kernel'?'1':'.8';});
const dialCenter=${JSON.stringify(at([128,0,59]))},dialX=${JSON.stringify(at([140,0,59]))},dialY=${JSON.stringify(at([128,12,59]))};
const input=document.getElementById('soft-rule');input.addEventListener('input',()=>{const angle=(-35+(Number(input.value)-50)*1.4)*Math.PI/180;const tip=dialCenter.map((v,i)=>v+(dialX[i]-v)*Math.cos(angle)+(dialY[i]-v)*Math.sin(angle));document.getElementById('soft-needle').setAttribute('d','M'+dialCenter.join(' ')+'L'+tip.join(' '));document.getElementById('setting').textContent=input.value+' / 100';});
document.getElementById('hide').addEventListener('click',e=>{const hidden=document.body.classList.toggle('bare');e.currentTarget.textContent=hidden?'Show controls':'Hide controls';e.currentTarget.setAttribute('aria-expanded',String(!hidden));});document.getElementById('theme').addEventListener('click',e=>{const light=document.body.dataset.theme!=='light';document.body.dataset.theme=light?'light':'dark';e.currentTarget.textContent=light?'Dark theme':'Light theme';});`;
for(const theme of ['dark','light']) writeFileSync(resolve(figures,theme==='dark'?'dark-stack.html':'dark-stack-light.html'),`<!doctype html><html lang="en" data-preserve-inline-styles><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The dark stack — interactive anatomy | Edgeless Lab</title><meta name="description" content="Four dark-stack principles on a precision bench: select a module and adjust a revisable rule. An explanatory metaphor, not measured telemetry."><style>${css}</style></head><body class="iso" data-theme="${theme}">${body}<script>${script}</script></body></html>`);
writeFileSync(resolve(images,'anatomy-static.svg'),art.replace('<svg ',`<svg style="background:#101b28" `).replace('><g',`><style>${css}</style><g`).replace('class="iso-svg"','class="iso iso-svg"'));
writeFileSync(resolve(figures,'diagrams.html'),`<!doctype html><html lang="en" data-preserve-inline-styles><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Superdark Factory — diagram sheets</title><style>body{margin:0;background:#0e1a27;color:#e8edf1;font:16px system-ui}main{max-width:960px;margin:auto;padding:24px}img{width:100%;height:auto}a{color:#dfbd7f}</style></head><body><main><h1>The Superdark Factory / diagram sheets</h1><p>Original Edgeless explanatory diagrams. <a href="https://superdark.antikythera.org/">Source: The Superdark Factory, Antikythera</a>.</p>${['dark-stack','autonomy-ladder','bounded-loop'].map(n=>`<img src="/images/blog/superdark-factory/${n}.svg" alt="${n.replaceAll('-',' ')}"/>`).join('')}</main></body></html>`);
console.log('Built three blueprint diagrams, interactive dark/light bench, static bench SVG, and diagram sheets.');
