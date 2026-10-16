// Port of generated/nous-mj-overnight/wide.py -- the open-ended MJ prompt
// engine (18 sentence grammars, 226 registers, persistent per-axis coverage,
// over-generate-then-cap). wide.py is the SOURCE OF TRUTH; its banks and
// corpora arrive as data/wide.json (scripts/export-wide-engine-data.py) and the
// golden rolls in __tests__/fixtures/wide-golden.json pin this port to it
// BYTE-FOR-BYTE. That parity rests on two things: PyRandom reproduces CPython's
// random stream exactly, and every renderer below consumes RNG draws in the
// same order as the Python f-strings (left to right, list literal before the
// choice that indexes it). Reordering an expression breaks parity.
//
// Not ported: the optional --llm voice pass (needs a model; the browser can't
// call one) and `measure` (run wide.py measure on exported prompts instead).

import { wrapIndex } from "./coverage";
import { PyRandom, crc32 } from "./mt";

type Pair = [string, string];

export interface WideData {
  sourceHash: string;
  block: number;
  caps: Record<string, number>;
  cappedPhrases: string[];
  stop: string[];
  maxSubjectRounds: number;
  grammars: Record<string, string[]>;
  registers: Pair[];
  textObjects: string[];
  brandTokens: string[];
  nicheTokens: string[];
  modes: Pair[];
  processes: string[];
  formats: string[];
  compositions: string[];
  palettes: string[];
  textures: string[];
  arWeights: [string, number][];
  stylizeWeights: [number, number][];
  burrowMotifs: string[];
  places: string[];
  verbs: string[];
  corpora: { curated: string[]; museum: string[]; artists: string[]; srefs: string[] };
}

export interface WideRound {
  seed: number;
  n: number;
  generated: number;
  subjects: string[];
  srefs: string[];
  artists: string[];
  registers: string[];
}

/** wide.py's .wide_state.json: coverage cursors + the last 12 rounds. */
export interface WideState {
  offsets: Record<string, number>;
  rounds: WideRound[];
}

export interface WideOptions {
  n: number;
  /** undefined = wide.py default: len(state.rounds) + 1. */
  seed?: number;
  brandRate?: number;
  draft?: boolean;
  /**
   * Site-only extension (wide.py has no locks). Locking an axis pins it and
   * lifts that axis's per-block cap; a register lock also restricts the walk
   * to grammars that render a register. Unlocked rolls keep exact parity.
   */
  lock?: { register?: string; grammar?: string };
}

export interface WidePrompt {
  text: string;
  grammar: string;
  subject: string;
  register?: string;
  mode?: string;
  format?: string;
  palette?: string;
  ar: string;
}

export interface WideResult {
  prompts: WidePrompt[];
  seed: number;
  generated: number;
  /** The advanced state to persist (the input state is never mutated). */
  state: WideState;
}

export const WIDE_STATE_ROUNDS = 12;

// ------------------------------------------------------------------ coverage

/** wide.py Walker: fixed per-axis salt + fixed-salt shuffle over _wrap_index. */
class Walker {
  readonly off: Record<string, number>;
  private perms = new Map<string, number[]>();

  constructor(offsets: Record<string, number>) {
    this.off = { ...offsets };
  }

  pick<T>(axis: string, pool: readonly T[]): T {
    const k = this.off[axis] ?? 0;
    this.off[axis] = k + 1;
    const salt = crc32(axis);
    const key = `${axis}\u0000${pool.length}`;
    let perm = this.perms.get(key);
    if (!perm) {
      perm = new PyRandom(salt).permutation(pool.length);
      this.perms.set(key, perm);
    }
    return pool[perm[wrapIndex(k, pool.length, salt)]];
  }
}

// ------------------------------------------------------------------ grammars

interface Cand {
  subject: string;
  grammar: string;
  register?: string;
  regText?: string;
  mode?: string;
  look?: string;
  process?: string;
  format?: string;
  composition?: string;
  palette?: string;
  texture?: string;
  artists?: string[];
  brand?: string;
  text: string;
  ar: string;
  stylize: number;
  sref: string[];
  features: string[];
}

type R = PyRandom;
type Render = (b: Cand, r: R, d: WideData) => string;

const an = (p: string) => ("aeiou".includes(p.slice(0, 1).toLowerCase()) ? "an " : "a ") + p;
const cap = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);
const j = (sep: string, ...parts: string[]) => parts.filter(Boolean).join(sep);
const num = (r: R) => r.randint(2, 480);
const roman = (r: R) =>
  r.choice(["II", "IV", "VII", "IX", "XII", "XIV", "XIX", "XXIII", "XXXI", "XLII"]);
const pad2 = (x: number) => String(x).padStart(2, "0");

function br(b: Cand, r: R, d: WideData, native = true): string {
  if (!b.brand) return "";
  const obj = native && b.regText !== undefined ? b.regText : r.choice(d.textObjects);
  return obj.replaceAll("{T}", b.brand);
}

// Field access below uses `!`: each renderer only reads the axes its grammar
// declares in data/wide.json (checked by the golden test).
const RENDER: Record<string, Render> = {
  wall_label: (b, r, d) =>
    j(", ", `${cap(b.register!)}. ${cap(b.subject)}, c. ${r.randint(1480, 1998)}. ${cap(b.process!)}`,
      br(b, r, d)) + ".",
  fig_caption: (b, r, d) =>
    j("; ",
      r.choice([`Fig. ${r.randint(2, 48)}${r.choice([..."abcd"])} —`, `Plate ${roman(r)} —`,
        `Figure ${r.randint(2, 48)}:`, `Ill. ${r.randint(2, 99)}.`, `Tab. ${roman(r)}:`])
        + ` ${b.subject}, drawn as ${an(b.register!)} ${b.composition}`,
      b.palette!, br(b, r, d)),
  lot: (b, r, d) =>
    j(", with ",
      r.choice([`Lot ${r.randint(101, 1999)}:`, `Sale ${r.randint(11, 99)}, lot ${num(r)} —`,
        "Estate lot:", `Unsold lot ${num(r)} —`, "Bin-end lot:"])
        + ` ${b.format} carrying ${an(b.register!)} image of ${b.subject}, ${b.texture}`,
      br(b, r, d)),
  field_note: (b, r, d) =>
    j("; ",
      r.choice([`field note, ${pad2(r.randint(0, 23))}:${pad2(r.randint(0, 59))}, ${r.choice(d.places)} —`,
        `${pad2(r.randint(0, 23))}:${pad2(r.randint(0, 59))}, ${r.choice(d.places)}.`,
        `logbook, day ${r.randint(2, 90)}:`, `survey sheet ${r.randint(2, 60)}:`,
        `notebook entry, ${r.choice(d.places)} —`])
        + ` ${b.subject}, recorded as ${b.mode}, ${b.look}, ${b.texture}`,
      br(b, r, d, false)),
  imperative: (b, r, d) =>
    j(". Add ",
      `${r.choice(d.verbs)} ${b.subject} as ${an(b.register!)}, ${b.composition}, in ${b.palette}`,
      br(b, r, d)),
  printer: (b, r, d) =>
    j("; ",
      r.choice(["Instructions to the printer:", "Note to the print shop:", `Press run ${num(r)}:`,
        "Job ticket:", "For the pressman:"])
        + ` ${b.process}; ${b.subject}; keep it to ${b.palette}; leave the ${b.texture}`,
      br(b, r, d, false)) + ".",
  fragment: (b, r, d) =>
    j(" ", `${cap(b.subject)}. ${cap(b.register!)}. ${cap(b.palette!)}.`,
      b.brand ? cap(br(b, r, d)) + "." : ""),
  run_on: (b, r, d) =>
    j(" and ",
      `${cap(b.register!)} of ${b.subject} `
        + r.choice(["and all of it done in", "worked entirely in", "made, stubbornly, in",
          "hand-finished in", "then remade in"])
        + ` ${b.process} with ${b.texture} and ${b.palette} and nothing else`,
      br(b, r, d)),
  style_blend: (b, r, d) =>
    j(", ", `in the style of ${b.artists!.join(" x ")} — ${b.subject} as ${an(b.register!)}, ${b.palette}`,
      br(b, r, d)),
  collision: (b, r, d) =>
    j(", ",
      `${cap(b.register!)} `
        + r.choice(["crossed with", "fused with", "mistaken for", "overlaid on", "leaking into"])
        + ` ${b.mode}: ${b.subject}, ${b.look}`,
      br(b, r, d)),
  artifact: (b, r, d) =>
    j(", ", `${cap(b.format!)} made in ${b.process} after ${b.artists!.join(" and ")}: ${b.subject}`,
      br(b, r, d, false)),
  catalogue: (b, r, d) =>
    j(". ",
      r.choice([`Cat. no. ${num(r)}.`, `Inv. ${r.randint(1900, 1999)}.${num(r)}.`,
        `Checklist item ${num(r)}:`, `Object ${r.randint(2, 40)} of ${r.randint(41, 90)}:`,
        `Accession ${r.randint(1900, 1999)}.${num(r)}.`])
        + ` ${cap(b.subject)}. ${cap(b.process!)}, ${b.composition}, `
        + `${r.randint(1500, 1995)}. ${r.randint(9, 120)} x ${r.randint(9, 120)} cm`,
      cap(br(b, r, d, false))),
  hud: (b, r, d) =>
    j(" // ",
      `${b.mode!.replace(/^an? /, "")} // ${b.subject} // T+${r.randint(1, 999)}s // ${b.look}`,
      br(b, r, d, false)),
  found: (b, r, d) =>
    j(", ",
      r.choice(["found in", "recovered from", "left behind in", "bought for a dollar in", "unearthed in"])
        + ` ${r.choice(d.places)}: ${b.format} showing ${b.subject} in the manner of `
        + `${an(b.register!)}, ${b.texture}`,
      br(b, r, d)),
  commission: (b, r, d) =>
    j("; must carry ",
      r.choice(["commission brief —", "art order:", "brief for the illustrator:", "cover request —",
        "spec sheet:"])
        + ` ${b.subject} for ${b.format}; ${b.register} energy; ${b.palette}`,
      br(b, r, d)),
  three_ways: (b, r, d) =>
    j(", ",
      r.choice([
        `${cap(b.subject)} seen three ways: as ${b.mode}, as ${b.process}, as ${an(b.register!)}`,
        `Triptych of ${b.subject}: ${b.mode} | ${b.process} | ${an(b.register!)}`,
        `${cap(b.subject)} in three states — first ${b.mode}, then ${b.process}, then ${an(b.register!)}`,
        `${cap(b.subject)}, three times over: ${b.mode}; ${b.process}; ${an(b.register!)}`]),
      br(b, r, d)),
  exhibit: (b, r, d) =>
    j(", ",
      `${cap(b.register!)}, `
        + r.choice(["from the circle of", "after", "channelling", "a pastiche of",
          "in the workshop manner of"])
        + ` ${b.artists!.slice(0, -1).join(", ")} and ${b.artists![b.artists!.length - 1]}: `
        + `${b.subject}, ${b.composition}`,
      br(b, r, d)),
  how_to: (b, r, d) =>
    j(", sign it with ",
      r.choice([`How to draw ${b.subject}`, `Lesson ${r.randint(2, 30)}: ${b.subject}`,
        `Exercise ${r.randint(2, 30)} — ${b.subject}`, `Tutorial: ${b.subject}`])
        + ` in ${b.process}, step ${r.randint(2, 6)} of ${r.randint(7, 12)}, ${b.palette} only`,
      br(b, r, d, false)),
};

/** Grammar names the TS port can render (must equal data.grammars' keys). */
export const WIDE_GRAMMARS = Object.keys(RENDER).sort();

// ------------------------------------------------------------------ features + caps

const tokenCache = new WeakMap<WideData, Set<string>>();
function stopSet(d: WideData): Set<string> {
  let s = tokenCache.get(d);
  if (!s) tokenCache.set(d, (s = new Set(d.stop)));
  return s;
}

function tokens(s: string, d: WideData): string[] {
  const stop = stopSet(d);
  return (s.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).filter((w) => !stop.has(w) && w.length > 2);
}

export function opener(text: string): string {
  const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w !== "a" && w !== "an" && w !== "the",
  );
  return words[0] ?? "";
}

const FEATURE_AXES = ["process", "texture", "format", "palette", "composition", "register", "mode"] as const;

/** Everything the caps count, for one candidate, as "kind\0value" keys. */
function features(b: Cand, d: WideData): string[] {
  const text = b.text.toLowerCase();
  const burrow = new Set(d.burrowMotifs);
  const motifs = new Set(tokens(b.subject, d));
  for (const t of tokens(text, d)) if (burrow.has(t)) motifs.add(t);
  const f = [...motifs].map((t) => `motif\u0000${t}`);
  for (const a of b.artists ?? []) f.push(`artist\u0000${a}`);
  f.push(`opener\u0000${opener(b.text)}`);
  for (const ax of FEATURE_AXES) if (b[ax] !== undefined) f.push(`${ax}\u0000${b[ax]}`);
  f.push(`grammar\u0000${b.grammar}`);
  if (b.ar === "21:9") f.push("ar21\u000021:9");
  for (const p of d.cappedPhrases) if (text.includes(p)) f.push(`phrase\u0000${p}`);
  return f;
}

const kindOf = (f: string) => f.slice(0, f.indexOf("\u0000"));

// ------------------------------------------------------------------ candidates

interface Ctx {
  d: WideData;
  walk: Walker;
  rng: PyRandom;
  brandRate: number;
  grammars: string[];
  lock: NonNullable<WideOptions["lock"]>;
  lockedRegister?: Pair;
}

function makeCandidate(x: Ctx): Cand {
  const { d, walk, rng } = x;
  const c = d.corpora;
  const grammar = x.lock.grammar ?? walk.pick("grammar", x.grammars);
  const src = rng.random() < 0.45 ? "museum" : "curated";
  const b = { subject: walk.pick("subject:" + src, c[src]), grammar } as Cand;
  for (const ax of d.grammars[grammar]) {
    if (ax === "artists") {
      const n = rng.choice([2, 2, 3]); // David: blend 2-3, never a lone artist
      const picks: string[] = [];
      for (let i = 0; i < n; i++) picks.push(walk.pick("artist", c.artists));
      b.artists = [...new Set(picks)];
    } else if (ax === "register") {
      [b.register, b.regText] = x.lockedRegister ?? walk.pick("register", d.registers);
    } else if (ax === "mode") {
      [b.mode, b.look] = walk.pick("mode", d.modes);
    } else {
      const pool = { process: d.processes, format: d.formats, composition: d.compositions,
        palette: d.palettes, texture: d.textures }[ax];
      if (!pool) throw new Error(`wide: grammar ${grammar} uses unknown axis ${ax}`);
      b[ax as "process"] = walk.pick(ax, pool);
    }
  }
  if (rng.random() < x.brandRate) b.brand = rng.choice(d.brandTokens);
  b.text = RENDER[grammar](b, rng, d);
  b.ar = rng.weighted(d.arWeights);
  b.stylize = rng.weighted(d.stylizeWeights);
  const roll = rng.random();
  if (roll < 0.4 && c.srefs.length) {
    const k = rng.choice([2, 2, 3]);
    const urls: string[] = [];
    for (let i = 0; i < k; i++) urls.push(walk.pick("sref", c.srefs));
    b.sref = rng.random() < 0.3 ? [...urls, "random"] : urls;
  } else if (roll < 0.85) {
    b.sref = Array<string>(rng.choice([1, 2, 2, 3])).fill("random");
  } else {
    b.sref = [];
  }
  b.features = features(b, d);
  return b;
}

// ------------------------------------------------------------------ brand + finalize

const BRAND_RE = /NOUS RESEARCH|HERMES/g;
const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Niche Nous tokens -> the two primaries; any brand word not already quoted
 * gets quoted as a physical text object (dangling unquoted wordmarks do not
 * render -- r40).
 */
export function enforceBrand(text: string, d: WideData): string {
  d.nicheTokens.forEach((tok, i) => {
    text = text.replace(new RegExp(`\\b${reEscape(tok)}\\b`, "g"), i % 2 === 0 ? "NOUS RESEARCH" : "HERMES");
  });
  const src = text;
  return src.replace(BRAND_RE, (m, offset: number) =>
    (src.slice(0, offset).split('"').length - 1) % 2 === 1 ? m : `the words "${m}"`,
  );
}

function finalize(b: Cand, d: WideData, draft: boolean): string {
  let flags = `--ar ${b.ar} --s ${b.stylize}` + (draft ? " --draft" : "");
  if (b.sref.length) flags += " --sref " + b.sref.join(" ");
  return `${enforceBrand(b.text, d)} ${flags}`;
}

// ------------------------------------------------------------------ roll

export function emptyWideState(): WideState {
  return { offsets: {}, rounds: [] };
}

/** Coerce anything read back from storage into a usable state (never throws). */
export function normalizeWideState(raw: unknown): WideState {
  const o = (raw ?? {}) as Partial<WideState>;
  const offsets: Record<string, number> = {};
  if (o.offsets && typeof o.offsets === "object") {
    for (const [k, v] of Object.entries(o.offsets)) {
      if (Number.isInteger(v) && (v as number) >= 0) offsets[k] = v as number;
    }
  }
  const strs = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []);
  const rounds = (Array.isArray(o.rounds) ? o.rounds : []).map((r) => ({
    seed: Number(r?.seed) || 0,
    n: Number(r?.n) || 0,
    generated: Number(r?.generated) || 0,
    subjects: strs(r?.subjects),
    srefs: strs(r?.srefs),
    artists: strs(r?.artists),
    registers: strs(r?.registers),
  }));
  return { offsets, rounds: rounds.slice(-WIDE_STATE_ROUNDS) };
}

/**
 * Port of wide.roll(): over-generate up to n*12 candidates and greedily keep
 * those that clear every per-BLOCK cap and skip anything (subject, sref URL,
 * artist) used in the last maxSubjectRounds rounds of `state`.
 */
export function rollWide(opts: WideOptions, d: WideData, state: WideState = emptyWideState()): WideResult {
  const { n, brandRate = 0.45, draft = true, lock = {} } = opts;
  const seed = opts.seed ?? state.rounds.length + 1;

  let grammars = WIDE_GRAMMARS;
  let lockedRegister: Pair | undefined;
  const caps = { ...d.caps };
  if (lock.register !== undefined) {
    lockedRegister = d.registers.find(([phrase]) => phrase === lock.register);
    if (!lockedRegister) throw new Error(`Unknown register "${lock.register}".`);
    grammars = grammars.filter((g) => d.grammars[g].includes("register"));
    caps.register = Infinity;
  }
  if (lock.grammar !== undefined) {
    if (!grammars.includes(lock.grammar)) {
      throw new Error(
        RENDER[lock.grammar]
          ? `The "${lock.grammar}" grammar never renders a register -- unlock the register or pick another grammar.`
          : `Unknown grammar "${lock.grammar}".`,
      );
    }
    caps.grammar = Infinity;
  }

  const x: Ctx = {
    d, walk: new Walker(state.offsets), rng: new PyRandom(seed), brandRate, grammars, lock, lockedRegister,
  };
  const recentRounds = state.rounds.slice(-d.maxSubjectRounds);
  const recent = {
    subjects: new Set(recentRounds.flatMap((r) => r.subjects)),
    srefs: new Set(recentRounds.flatMap((r) => r.srefs)),
    artists: new Set(recentRounds.flatMap((r) => r.artists)),
  };

  // select(): greedy over-generate-then-cap; caps reset each BLOCK of output.
  const out: Cand[] = [];
  let counts = new Map<string, number>();
  let block = 0;
  let generated = 0;
  // wide.py pulls the next candidate from its generator BEFORE testing
  // len(out) >= n, so a full roll generates (and walks coverage for) one
  // candidate past the last kept one. Kept for byte parity of the state.
  for (let i = 0; i < n * 12; i++) {
    const b = makeCandidate(x);
    generated++;
    if (out.length >= n) break;
    if (Math.floor(out.length / d.block) !== block) {
      block = Math.floor(out.length / d.block);
      counts = new Map();
    }
    if (recent.subjects.has(b.subject) || b.sref.some((u) => recent.srefs.has(u))) continue;
    if ((b.artists ?? []).some((a) => recent.artists.has(a))) continue;
    if (b.features.some((f) => (counts.get(f) ?? 0) >= caps[kindOf(f)])) continue;
    for (const f of b.features) counts.set(f, (counts.get(f) ?? 0) + 1);
    out.push(b);
  }

  const sortedSet = (xs: string[]) => [...new Set(xs)].sort();
  const round: WideRound = {
    seed, n: out.length, generated,
    subjects: out.map((b) => b.subject),
    srefs: sortedSet(out.flatMap((b) => b.sref.filter((u) => u !== "random"))),
    artists: sortedSet(out.flatMap((b) => b.artists ?? [])),
    registers: sortedSet(out.flatMap((b) => (b.register !== undefined ? [b.register] : []))),
  };
  return {
    prompts: out.map((b) => ({
      text: finalize(b, d, draft),
      grammar: b.grammar,
      subject: b.subject,
      ar: b.ar,
      ...(b.register !== undefined ? { register: b.register } : {}),
      ...(b.mode !== undefined ? { mode: b.mode } : {}),
      ...(b.format !== undefined ? { format: b.format } : {}),
      ...(b.palette !== undefined ? { palette: b.palette } : {}),
    })),
    seed,
    generated,
    state: { offsets: x.walk.off, rounds: [...state.rounds, round].slice(-WIDE_STATE_ROUNDS) },
  };
}
