// Deterministic, seed-based swarm simulation — pure logic, no tldraw/DOM.
// Same seed → identical run (so a URL can reproduce a specimen exactly).

export type Role = "explorer" | "optimizer" | "caretaker" | "opportunist";
export const ROLES: Role[] = ["explorer", "optimizer", "caretaker", "opportunist"];

export interface Agent {
  id: number;
  role: Role;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number; // 0..100
  alive: boolean;
  arrived: boolean; // reached the beacon
  mode: "goal" | "resource"; // hysteresis so agents commit instead of oscillating
  trail: { x: number; y: number }[];
}
export interface Resource {
  id: number;
  x: number;
  y: number;
  amount: number; // remaining tokens
  max: number;
}
export interface SimEvent {
  tick: number;
  kind: "arrive" | "expire" | "resource_out" | "coordination" | "complete";
  agent?: number;
  text: string;
}
export interface SimState {
  seed: number;
  tick: number;
  agents: Agent[];
  beacon: { x: number; y: number };
  resources: Resource[];
  events: SimEvent[];
  settled: boolean;
}

export const FIELD = { w: 1000, h: 640 };
const ARRIVE_R = 52;
const RES_R = 34;
const TRAIL = 26;
const SEEK_RESOURCE = 34; // energy below this → break for a resource

// mulberry32 — tiny deterministic PRNG
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initState(seed: number, agentCount = 7): SimState {
  const r = rng(seed);
  const beacon = { x: FIELD.w * 0.5, y: FIELD.h * 0.28 };
  const resources: Resource[] = Array.from({ length: 3 }, (_, i) => {
    const max = 40 + Math.floor(r() * 40);
    return {
      id: i,
      x: 120 + r() * (FIELD.w - 240),
      y: FIELD.h * 0.55 + r() * (FIELD.h * 0.35),
      amount: max,
      max,
    };
  });
  const agents: Agent[] = Array.from({ length: agentCount }, (_, i) => ({
    id: i,
    role: ROLES[Math.floor(r() * ROLES.length)],
    x: 120 + r() * (FIELD.w - 240),
    y: FIELD.h - 40 - r() * 90,
    vx: 0,
    vy: 0,
    energy: 74 + r() * 26,
    alive: true,
    arrived: false,
    mode: "goal",
    trail: [],
  }));
  return { seed, tick: 0, agents, beacon, resources, events: [], settled: false };
}

function nearestResource(a: Agent, res: Resource[]): Resource | null {
  let best: Resource | null = null;
  let bd = Infinity;
  for (const rr of res) {
    if (rr.amount <= 0) continue;
    const d = (rr.x - a.x) ** 2 + (rr.y - a.y) ** 2;
    if (d < bd) { bd = d; best = rr; }
  }
  return best;
}

// Role tuning: [wander, resourcePull, beaconPull, separation]
const BIAS: Record<Role, [number, number, number, number]> = {
  explorer: [0.9, 0.5, 0.7, 0.5],
  optimizer: [0.2, 1.2, 1.0, 0.3],
  caretaker: [0.4, 0.9, 0.8, 0.9],
  opportunist: [0.6, 1.3, 0.6, 0.2],
};

export function step(s: SimState): SimState {
  if (s.settled) return s;
  const r = rng(s.seed + s.tick * 2654435761);
  const tick = s.tick + 1;
  const alive = s.agents.filter((a) => a.alive);

  for (const a of s.agents) {
    if (!a.alive) continue;
    const [wander, resPull, beaconPull, sep] = BIAS[a.role];
    let ax = 0, ay = 0;

    // hysteresis: commit to refuel below SEEK_RESOURCE, commit back to the goal once topped up.
    // Without this, agents oscillate at the boundary and never reach the beacon (they stall).
    if (!a.arrived) {
      if (a.energy < SEEK_RESOURCE) a.mode = "resource";
      else if (a.energy > 66) a.mode = "goal";
    }
    const seekRes = !a.arrived && a.mode === "resource" && nearestResource(a, s.resources) !== null;
    const target = a.arrived
      ? s.beacon
      : seekRes
        ? (nearestResource(a, s.resources) as { x: number; y: number })
        : s.beacon;
    const dx = target.x - a.x, dy = target.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = seekRes ? resPull : a.arrived ? 0.5 : beaconPull;
    ax += (dx / dist) * pull;
    ay += (dy / dist) * pull;

    // separation from neighbours (keeps the ecology legible)
    for (const b of alive) {
      if (b === a) continue;
      const bx = a.x - b.x, by = a.y - b.y;
      const d2 = bx * bx + by * by;
      if (d2 < 60 * 60 && d2 > 0) {
        const d = Math.sqrt(d2);
        ax += (bx / d) * sep * (1 - d / 60);
        ay += (by / d) * sep * (1 - d / 60);
      }
    }
    ax += (r() - 0.5) * wander * 1.6;
    ay += (r() - 0.5) * wander * 1.6;

    // integrate (light inertia)
    a.vx = a.vx * 0.82 + ax;
    a.vy = a.vy * 0.82 + ay;
    if (a.arrived) { a.vx *= 0.55; a.vy *= 0.55; } // settle onto the beacon
    const sp = Math.hypot(a.vx, a.vy);
    const MAX = 3.8;
    if (sp > MAX) { a.vx = (a.vx / sp) * MAX; a.vy = (a.vy / sp) * MAX; }
    a.x = Math.max(24, Math.min(FIELD.w - 24, a.x + a.vx));
    a.y = Math.max(24, Math.min(FIELD.h - 24, a.y + a.vy));

    // trail (temporal ghost)
    a.trail.push({ x: a.x, y: a.y });
    if (a.trail.length > TRAIL) a.trail.shift();

    // energy: moving costs; agents holding at the beacon barely burn
    a.energy -= a.arrived ? 0.05 : 0.24 + sp * 0.09;

    // collect from a resource
    for (const rr of s.resources) {
      if (rr.amount <= 0) continue;
      if (Math.hypot(rr.x - a.x, rr.y - a.y) < RES_R) {
        const take = Math.min(rr.amount, 1.1);
        rr.amount -= take;
        a.energy = Math.min(100, a.energy + take * 2.4);
        if (rr.amount <= 0)
          s.events.push({ tick, kind: "resource_out", text: `Resource ${rr.id + 1} exhausted.` });
      }
    }

    // caretaker shares with a failing neighbour
    if (a.role === "caretaker" && a.energy > 40) {
      for (const b of alive) {
        if (b !== a && b.energy < 20 && Math.hypot(b.x - a.x, b.y - a.y) < 70) {
          const give = 0.6; a.energy -= give; b.energy += give * 1.4;
        }
      }
    }

    // reached the beacon
    if (!a.arrived && Math.hypot(s.beacon.x - a.x, s.beacon.y - a.y) < ARRIVE_R) {
      a.arrived = true;
      s.events.push({ tick, kind: "arrive", agent: a.id, text: `Agent ${pad(a.id)} reached the beacon.` });
    }

    // expiration
    if (a.energy <= 0) {
      a.alive = false; a.energy = 0;
      s.events.push({ tick, kind: "expire", agent: a.id, text: `Agent ${pad(a.id)} expired.` });
    }
  }

  // coordination emerges when a majority co-locate at the beacon
  const arrived = s.agents.filter((a) => a.arrived).length;
  if (arrived >= Math.ceil(s.agents.length / 2) &&
      !s.events.some((e) => e.kind === "coordination")) {
    s.events.push({ tick, kind: "coordination", text: `Coordination emerged at tick ${tick}.` });
  }

  // settle: mission complete (majority arrived) or ecology collapsed (all dead)
  const stillAlive = s.agents.filter((a) => a.alive).length;
  const missionDone = arrived >= Math.ceil(s.agents.length / 2);
  let settled = s.settled;
  if (!settled && (missionDone || stillAlive === 0 || tick > 700)) {
    settled = true;
    s.events.push({
      tick, kind: "complete",
      text: missionDone ? "Mission complete." : stillAlive === 0 ? "Ecology collapsed." : "Simulation timed out.",
    });
  }

  return { ...s, tick, settled };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// Deterministic postmortem "lab note" assembled from the event log.
export function labNote(s: SimState): string[] {
  const lines: string[] = [];
  const coord = s.events.find((e) => e.kind === "coordination");
  const arrived = s.agents.filter((a) => a.arrived).length;
  const alive = s.agents.filter((a) => a.alive).length;
  const expired = s.agents.length - alive;

  lines.push(coord ? coord.text : "Coordination never emerged.");

  // bottleneck = last agent to arrive, or the one that expired latest
  const arrivals = s.events.filter((e) => e.kind === "arrive");
  if (arrivals.length) {
    const last = arrivals[arrivals.length - 1];
    lines.push(`Agent ${String(last.agent).padStart(2, "0")} was the bottleneck.`);
  } else {
    const exp = s.events.filter((e) => e.kind === "expire");
    if (exp.length) lines.push(`Agent ${String(exp[0].agent).padStart(2, "0")} failed first.`);
  }

  const missionDone = arrived >= Math.ceil(s.agents.length / 2);
  if (missionDone && expired > 0)
    lines.push("The mission completed, but the ecology did not survive it.");
  else if (missionDone)
    lines.push("The mission completed, and the ecology held.");
  else if (alive === 0)
    lines.push("The ecology collapsed before the mission resolved.");
  else
    lines.push("The system stalled — neither success nor collapse.");
  return lines;
}
