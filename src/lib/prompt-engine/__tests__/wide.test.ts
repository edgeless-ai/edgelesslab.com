// Parity + breadth tests for the wide.py port. Fixtures come from
// scripts/export-wide-engine-data.py, which runs the real Python engine: never
// hand-edit fixtures/wide-golden.json or data/wide.json -- regenerate them.

import { describe, expect, it } from "vitest";
import { PyRandom, crc32 } from "../mt";
import {
  WIDE_GRAMMARS,
  enforceBrand,
  normalizeWideState,
  opener,
  rollWide,
  type WideData,
  type WideState,
} from "../wide";
import rawData from "../data/wide.json";
import golden from "./fixtures/wide-golden.json";

const data = rawData as unknown as WideData;

describe("PyRandom matches CPython random.Random", () => {
  it("reproduces random/randint/randrange/choices for every golden seed", () => {
    for (const f of golden.mt) {
      const r = new PyRandom(f.seed);
      expect(Array.from({ length: 6 }, () => r.random())).toEqual(f.random.map(Number));
      expect(Array.from({ length: 6 }, () => r.randint(2, 480))).toEqual(f.randint);
      expect([1, 2, 3, 5, 18, 226, 1719].map((n) => r.randbelow(n))).toEqual(f.choiceIdx);
      const w: [number, number][] = [16, 13, 13, 12, 10, 8, 7, 7, 5, 4, 3, 2].map((x, i) => [i, x]);
      expect(Array.from({ length: 8 }, () => r.weighted(w))).toEqual(f.choices);
    }
  });

  it("reproduces random.Random(salt).sample(range(n), n)", () => {
    for (const f of golden.samples) {
      expect(new PyRandom(f.salt).permutation(f.n)).toEqual(f.perm);
    }
  });

  it("crc32 matches zlib.crc32 on UTF-8 bytes", () => {
    for (const [s, v] of Object.entries(golden.crc32)) expect(crc32(s)).toBe(v);
  });
});

describe("wide engine parity with wide.py", () => {
  it("renders exactly the grammars wide.py exports", () => {
    expect(WIDE_GRAMMARS).toEqual(Object.keys(data.grammars).sort());
  });

  it("enforceBrand matches wide.enforce_brand", () => {
    for (const f of golden.enforceBrand) expect(enforceBrand(f.in, data)).toBe(f.out);
  });

  it("fresh-state rolls are byte-identical to wide.roll()", () => {
    for (const f of golden.rolls) {
      const res = rollWide({ n: f.n, seed: f.seed, brandRate: f.brandRate, draft: f.draft }, data);
      expect(res.generated).toBe(f.generated);
      expect(res.prompts.map((p) => p.text)).toEqual(f.prompts);
    }
  });

  it("three persisted rounds match wide.py, state included", () => {
    let state: WideState = normalizeWideState(undefined);
    for (const f of golden.rounds.rounds) {
      const res = rollWide({ n: golden.rounds.n }, data, state);
      expect(res.seed).toBe(f.seed);
      expect(res.generated).toBe(f.generated);
      expect(res.prompts.map((p) => p.text)).toEqual(f.prompts);
      // round-trip through JSON like the page's localStorage does
      state = normalizeWideState(JSON.parse(JSON.stringify(res.state)));
    }
    expect(state).toEqual(golden.rounds.finalState);
  });

  it("never repeats a subject, sref URL, artist or register across three rounds", () => {
    const rounds = golden.rounds.finalState.rounds;
    for (const key of ["subjects", "srefs", "artists", "registers"] as const) {
      const seen = new Set<string>();
      for (const r of rounds) {
        for (const x of r[key]) expect(seen.has(x), `${key}: ${x}`).toBe(false);
        for (const x of r[key]) seen.add(x);
      }
    }
  });
});

describe("a 60-prompt browser batch passes wide.py's per-block caps", () => {
  // Counted from the rendered TEXT, independently of the engine's feature list.
  const res = rollWide({ n: 60, seed: 20260930 }, data);
  const bodies = res.prompts.map((p) => p.text.split(/\s--/)[0]);
  const count = (xs: string[]) =>
    xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const max = (m: Map<string, number>) => Math.max(0, ...m.values());

  it("returns the full batch", () => {
    expect(res.prompts).toHaveLength(60);
  });

  it("register <= 1, grammar <= 9, opener <= 5, 21:9 <= 1", () => {
    expect(max(count(res.prompts.flatMap((p) => (p.register ? [p.register] : []))))).toBeLessThanOrEqual(1);
    expect(max(count(res.prompts.map((p) => p.grammar)))).toBeLessThanOrEqual(data.caps.grammar);
    expect(max(count(bodies.map(opener)))).toBeLessThanOrEqual(data.caps.opener);
    expect(res.prompts.filter((p) => p.ar === "21:9").length).toBeLessThanOrEqual(data.caps.ar21);
  });

  it("each burrow motif appears in <= 2 prompts and capped phrases in <= 6", () => {
    for (const m of data.burrowMotifs) {
      const re = new RegExp(`\\b${m}\\b`, "i");
      expect(bodies.filter((b) => re.test(b)).length, m).toBeLessThanOrEqual(data.caps.motif);
    }
    for (const p of data.cappedPhrases) {
      expect(bodies.filter((b) => b.toLowerCase().includes(p)).length, p).toBeLessThanOrEqual(data.caps.phrase);
    }
  });

  it("brand is only NOUS RESEARCH / HERMES, always inside quotes, never niche tokens", () => {
    for (const b of bodies) {
      for (const m of b.matchAll(/NOUS RESEARCH|HERMES/g)) {
        expect((b.slice(0, m.index).split('"').length - 1) % 2, b).toBe(1);
      }
      for (const t of data.nicheTokens) expect(b.includes(t), b).toBe(false);
    }
    const branded = bodies.filter((b) => /NOUS RESEARCH|HERMES/.test(b)).length;
    expect(branded).toBeGreaterThan(10);
    expect(branded).toBeLessThan(45);
  });

  it("artist blends are 2-3 names and no bare --no face flag", () => {
    const blends = bodies.flatMap((b) => {
      const m = /in the style of (.+?) —/.exec(b);
      return m ? [m[1].split(" x ")] : [];
    });
    for (const bl of blends) expect(bl.length).toBeGreaterThanOrEqual(2);
    expect(res.prompts.some((p) => p.text.includes("--no face"))).toBe(false);
  });
});

describe("site-only locks", () => {
  const reg = data.registers[3][0];

  it("register lock pins every prompt to that register and lifts its cap", () => {
    const res = rollWide({ n: 20, seed: 5, lock: { register: reg } }, data);
    expect(res.prompts).toHaveLength(20);
    expect(res.prompts.every((p) => p.register === reg)).toBe(true);
  });

  it("grammar lock pins the grammar", () => {
    const res = rollWide({ n: 20, seed: 5, lock: { grammar: "hud" } }, data);
    expect(res.prompts.length).toBeGreaterThan(0);
    expect(res.prompts.every((p) => p.grammar === "hud")).toBe(true);
  });

  it("rejects a register lock on a grammar that has no register, with a clear message", () => {
    expect(() => rollWide({ n: 5, seed: 1, lock: { register: reg, grammar: "hud" } }, data)).toThrow(
      /never renders a register/,
    );
  });

  it("does not mutate the input state", () => {
    const state = normalizeWideState({ offsets: { grammar: 3 }, rounds: [] });
    rollWide({ n: 10, seed: 1 }, data, state);
    expect(state).toEqual({ offsets: { grammar: 3 }, rounds: [] });
  });
});
