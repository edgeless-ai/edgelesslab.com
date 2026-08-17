// Engine behavior tests: coverage guarantee, brand suppression (the audited
// "luminous" false-positive), determinism, and the maxSaturatedShare palette
// cap.

import { describe, expect, it } from "vitest";
import { banks } from "../banks";
import { brandWordRe, roll } from "../engine";

const fineArtKeys = Object.keys(banks.INFLUENCE).filter(
  (k) => banks.INFLUENCE[k].domain === "fine-art",
);

describe("coverage guarantee", () => {
  it("surfaces every fine-art influence before any repeats within a wrap", () => {
    expect(fineArtKeys).toHaveLength(32);
    const prompts = roll({ recipe: "influence", n: 40, seed: 5001, theme: "art-history-madlib" });
    expect(prompts).toHaveLength(40);
    const firstWrap = prompts.slice(0, 32).map((p) => p.meta.influenceKey);
    expect(new Set(firstWrap).size).toBe(32);
    expect(new Set(firstWrap)).toEqual(new Set(fineArtKeys));
    // The wrap boundary re-keys, so positions 32..39 stay inside the bank too.
    for (const p of prompts.slice(32)) {
      expect(fineArtKeys).toContain(p.meta.influenceKey);
    }
  });

  it("wraps SUBJECTS_LARGE fairly when n exceeds the bank size", () => {
    // art-history-madlib is unbranded, so subjects with in-text NOUS/HERMES
    // are excluded from the bank before coverage picking.
    const activeBank = banks.SUBJECTS_LARGE.filter((s) => !brandWordRe.test(s));
    const m = activeBank.length;
    expect(m).toBeLessThan(banks.SUBJECTS_LARGE.length);
    const prompts = roll({ recipe: "photo", n: m + 10, seed: 6101, theme: "art-history-madlib" });
    expect(prompts).toHaveLength(m + 10);
    const subjects = prompts.map((p) => p.meta.subject as string);
    // First wrap: every subject in the active bank exactly once.
    const firstWrap = subjects.slice(0, m);
    expect(new Set(firstWrap).size).toBe(m);
    expect(new Set(firstWrap)).toEqual(new Set(activeBank));
    // Second wrap (partial): no repeats within it either.
    const secondWrap = subjects.slice(m);
    expect(new Set(secondWrap).size).toBe(secondWrap.length);
    for (const s of secondWrap) expect(activeBank).toContain(s);
  });
});

describe("brand suppression (word-boundary, not substring)", () => {
  it("excludes NOUS/HERMES/ΝΟΥΣ as words but keeps 'luminous...' entries", () => {
    // This exact false-positive was a real audited bug in the madlib engine:
    // a substring test dropped "a tangle of luminous fungi on a fallen log".
    expect(brandWordRe.test("a tangle of luminous fungi on a fallen log")).toBe(false);
    expect(brandWordRe.test('a monolith inscribed "NOUS" on a fog-bound plain')).toBe(true);
    expect(brandWordRe.test("a marble bust of Hermes wired with neural filaments")).toBe(true);
    expect(brandWordRe.test('a Greek "ΝΟΥΣ" inscription')).toBe(true);
    expect(brandWordRe.test("hermes in lowercase is still a brand word")).toBe(true);

    const activeBank = banks.SUBJECTS_LARGE.filter((s) => !brandWordRe.test(s));
    const prompts = roll({
      recipe: "photo",
      n: activeBank.length,
      seed: 715,
      theme: "art-history-madlib",
    });
    const subjects = prompts.map((p) => p.meta.subject as string);
    // No brand words survive in an unbranded theme's rolled subjects...
    for (const s of subjects) expect(brandWordRe.test(s)).toBe(false);
    // ...but the luminous-fungi entry (substring false-positive) stays usable.
    expect(subjects).toContain("a tangle of luminous fungi on a fallen log");
  });

  it("throws on a recipe with no unbranded variant only when unbranded", () => {
    // All shipped recipes carry an unbranded template, so unbranded themes
    // roll fine; unknown recipes throw.
    expect(() => roll({ recipe: "nope", n: 1, seed: 1 })).toThrow(/unknown recipe/);
  });
});

describe("determinism", () => {
  it("same opts + seed produce an identical batch", () => {
    const a = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded", texture: true });
    const b = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded", texture: true });
    expect(a.map((p) => p.text)).toEqual(b.map((p) => p.text));
    expect(a.map((p) => p.meta)).toEqual(b.map((p) => p.meta));
  });

  it("a different seed produces a different batch", () => {
    const a = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded" });
    const b = roll({ recipe: "collision", n: 12, seed: 43, theme: "nous-branded" });
    expect(a.map((p) => p.text)).not.toEqual(b.map((p) => p.text));
  });
});

describe("maxSaturatedShare", () => {
  it("caps the pop-palette share of the batch and stays deterministic", () => {
    const opts = {
      recipe: "influence",
      n: 30,
      seed: 909,
      theme: "nous-branded",
      maxSaturatedShare: 0.2,
    };
    const a = roll(opts);
    expect(a).toHaveLength(30);
    const popCount = a.filter((p) => p.meta.paletteCategory === "pop").length;
    expect(popCount).toBeLessThanOrEqual(6); // 20% of 30
    const b = roll(opts);
    expect(a.map((p) => p.text)).toEqual(b.map((p) => p.text));
  });

  it("does not cap when undefined", () => {
    // Sanity: the same seed without a cap is allowed to exceed the share.
    const a = roll({ recipe: "influence", n: 30, seed: 909, theme: "nous-branded" });
    expect(a).toHaveLength(30);
  });
});

describe("girl slots", () => {
  it("prepends the bare ref URL and swaps flags on girl prompts", () => {
    const prompts = roll({ recipe: "influence", n: 6, seed: 303, theme: "nous-branded", girlRate: 3 });
    for (const p of prompts) {
      if (p.meta.girl) {
        expect(p.text.startsWith(`${banks.GIRL.ref} `)).toBe(true);
        expect(p.text).toContain(`--iw ${banks.GIRL.iw}`);
        expect(p.text.endsWith(`[GIRL/iw ${banks.GIRL.iw}]`)).toBe(true);
      } else {
        expect(p.text).not.toContain(banks.GIRL.ref);
      }
    }
    expect(prompts.filter((p) => p.meta.girl).map((p) => p.meta.index)).toEqual([0, 3]);
  });

  it("girlRate 4 marks every 4th prompt, not every prompt", () => {
    const prompts = roll({ recipe: "influence", n: 9, seed: 303, theme: "nous-branded", girlRate: 4 });
    expect(prompts.filter((p) => p.meta.girl).map((p) => p.meta.index)).toEqual([0, 4, 8]);
  });

  it("rejects fractional girl rates (idx % 0.25 === 0 would mark EVERY prompt)", () => {
    // Regression: the dashboard once passed a 0..1 fraction (0.25 meaning
    // "25%") straight through; since idx % 0.25 === 0 for every integer idx,
    // that silently made the whole batch girl prompts. The contract is
    // blender.py's integer --girl-rate N ("every Nth prompt").
    for (const bad of [0.25, 0.5, 0.3, -1, 1.5]) {
      expect(() =>
        roll({ recipe: "influence", n: 4, seed: 303, theme: "nous-branded", girlRate: bad }),
      ).toThrow(/girlRate must be a non-negative integer/);
    }
  });
});

describe("sref modes", () => {
  it("random-stacked appends --sref random ... with pool-driven counts", () => {
    const prompts = roll({ recipe: "photo", n: 10, seed: 4001, theme: "off-brief-random" });
    for (const p of prompts) {
      const m = p.text.match(/--sref((?: random)+)$/);
      expect(m).not.toBeNull();
      const count = (m as RegExpMatchArray)[1].trim().split(" ").length;
      expect([1, 2, 3]).toContain(count);
    }
  });

  it("museum mode degrades to no sref without a srefIndex", () => {
    const prompts = roll({ recipe: "influence", n: 5, seed: 4103, theme: "art-history-madlib" });
    for (const p of prompts) expect(p.text).not.toContain("--sref");
  });
});
