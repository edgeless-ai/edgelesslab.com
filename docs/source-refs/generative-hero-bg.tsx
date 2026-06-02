"use client";

import { useRef, useEffect, useCallback } from "react";

/\\*\\*
 \\* Fully procedural hero background — unique every visit.
 \\*
 \\* 600 particles flow through one of 4 attractor algorithms (Lorenz, Rossler,
 \\* Spiral, Flow) with randomized parameters. Rendered as connected trail lines
 \\* with soft glow, producing organic flowing structures. Zero network cost.
 \*/

type AttractorType = "lorenz" \| "rossler" \| "spiral" \| "flow";

interface Particle {
 x: number;
 y: number;
 prevX: number;
 prevY: number;
 vx: number;
 vy: number;
 life: number;
 maxLife: number;
 hueOffset: number;
}

function mulberry32(a: number) {
 return () => {
 a \|= 0;
 a = (a + 0x6d2b79f5) \| 0;
 let t = Math.imul(a ^ (a >>> 15), 1 \| a);
 t = (t + Math.imul(t ^ (t >>> 7), 61 \| t)) ^ t;
 return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

const ATTRACTOR\_TYPES: AttractorType\[\] = \["lorenz", "rossler", "spiral", "flow"\];

// Color palettes — each is \[hue, saturation\] pairs that blend well
const PALETTES: \[number, number\]\[\] = \[\
 \[235, 85\], // indigo\
 \[160, 70\], // green/teal\
 \[270, 75\], // purple\
 \[210, 80\], // blue\
 \[330, 65\], // rose\
 \[180, 60\], // cyan\
\];

interface SimState {
 particles: Particle\[\];
 type: AttractorType;
 seed: number;
 rng: () => number;
 cx1: number;
 cy1: number;
 cx2: number;
 cy2: number;
 cx3: number;
 cy3: number;
 strength: number;
 baseHue: number;
 baseSat: number;
 hueRange: number;
 trailFade: number;
 time: number;
}

function createParticles(
 count: number,
 width: number,
 height: number,
 rng: () => number
): Particle\[\] {
 return Array.from({ length: count }, () => {
 const x = rng() \* width;
 const y = rng() \* height;
 return {
 x,
 y,
 prevX: x,
 prevY: y,
 vx: (rng() - 0.5) \* 2,
 vy: (rng() - 0.5) \* 2,
 life: Math.floor(rng() \* 250) + 80,
 maxLife: 330,
 hueOffset: (rng() - 0.5) \* 40,
 };
 });
}

function stepParticle(
 p: Particle,
 state: SimState,
 width: number,
 height: number
) {
 p.prevX = p.x;
 p.prevY = p.y;

 let ax = 0,
 ay = 0;
 const { type, cx1, cy1, cx2, cy2, cx3, cy3, strength, time } = state;

 switch (type) {
 case "lorenz": {
 const dx1 = cx1 - p.x, dy1 = cy1 - p.y;
 const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
 const d1 = Math.sqrt(dx1 \* dx1 + dy1 \* dy1) + 1;
 const d2 = Math.sqrt(dx2 \* dx2 + dy2 \* dy2) + 1;
 // Third attractor adds asymmetry
 const dx3 = cx3 - p.x, dy3 = cy3 - p.y;
 const d3 = Math.sqrt(dx3 \* dx3 + dy3 \* dy3) + 1;
 ax = (dx1 / d1 - dy2 / d2 + dx3 / d3 \* 0.3) \* strength;
 ay = (dy1 / d1 + dx2 / d2 - dy3 / d3 \* 0.3) \* strength;
 break;
 }
 case "rossler": {
 const dx = cx1 - p.x, dy = cy1 - p.y;
 const d = Math.sqrt(dx \* dx + dy \* dy) + 1;
 const drift = Math.sin(time \* 0.002) \* 0.005;
 ax = (-dy / d + dx \* (0.008 + drift)) \* strength;
 ay = (dx / d + dy \* (0.008 + drift)) \* strength;
 // Perturb with second center
 const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
 const d2 = Math.sqrt(dx2 \* dx2 + dy2 \* dy2) + 1;
 ax += (dy2 / d2) \* strength \* 0.2;
 ay -= (dx2 / d2) \* strength \* 0.2;
 break;
 }
 case "spiral": {
 const dx = cx1 - p.x, dy = cy1 - p.y;
 const d = Math.sqrt(dx \* dx + dy \* dy) + 1;
 const angle = Math.atan2(dy, dx) + 0.3 + Math.sin(time \* 0.001) \* 0.2;
 ax = (Math.cos(angle) / d) \* strength \* 8;
 ay = (Math.sin(angle) / d) \* strength \* 8;
 // Second spiral center creates interference
 const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
 const d2 = Math.sqrt(dx2 \* dx2 + dy2 \* dy2) + 1;
 const angle2 = Math.atan2(dy2, dx2) - 0.5;
 ax += (Math.cos(angle2) / d2) \* strength \* 3;
 ay += (Math.sin(angle2) / d2) \* strength \* 3;
 break;
 }
 case "flow": {
 // Perlin-like flow field with time evolution
 const scale = 0.002 + Math.sin(time \* 0.0005) \* 0.0005;
 const n1 = Math.sin(p.x \* scale + time \* 0.001) \* Math.cos(p.y \* scale \* 0.7);
 const n2 = Math.cos(p.x \* scale \* 0.8 - time \* 0.0008) \* Math.sin(p.y \* scale);
 ax = n1 \* strength \* 1.5;
 ay = n2 \* strength \* 1.5;
 // Gentle pull toward center to prevent drift
 ax += (width \* 0.5 - p.x) \* 0.00001;
 ay += (height \* 0.5 - p.y) \* 0.00001;
 break;
 }
 }

 p.vx += ax;
 p.vy += ay;
 p.vx \*= 0.982;
 p.vy \*= 0.982;
 p.x += p.vx;
 p.y += p.vy;
 p.life--;

 // Respawn
 if (p.life <= 0) {
 p.x = state.rng() \* width;
 p.y = state.rng() \* height;
 p.prevX = p.x;
 p.prevY = p.y;
 p.vx = (state.rng() - 0.5) \* 2;
 p.vy = (state.rng() - 0.5) \* 2;
 p.life = Math.floor(state.rng() \* 250) + 80;
 p.hueOffset = (state.rng() - 0.5) \* 40;
 }

 // Soft boundary — bounce with damping instead of hard wrap
 const margin = 20;
 if (p.x < -margin) { p.x = -margin; p.vx \*= -0.5; }
 if (p.x > width + margin) { p.x = width + margin; p.vx \*= -0.5; }
 if (p.y < -margin) { p.y = -margin; p.vy \*= -0.5; }
 if (p.y > height + margin) { p.y = height + margin; p.vy \*= -0.5; }
}

export function GenerativeHeroBackground() {
 const canvasRef = useRef(null);
 const animRef = useRef(0);
 const stateRef = useRef(null);

 const init = use

[Content truncated — showing first 5,000 of 8,267 chars. LLM summarization timed out. To fix: increase auxiliary.web_extract.timeout in config.yaml, or use a faster auxiliary model. Use browser_navigate for the full page.]