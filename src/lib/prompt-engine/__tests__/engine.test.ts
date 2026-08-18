// Engine behavior tests: coverage guarantee, brand suppression (the audited
// "luminous" false-positive), determinism, and the maxSaturatedShare palette
// cap.

import { describe, expect, it } from "vitest";
import { banks } from "../banks";
import { brandWordRe, roll, stripOperatorAnnotations } from "../engine";

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

describe("saturatedBudget (shared mutable pop-palette ledger)", () => {
  it("a fresh budget of share * n reproduces maxSaturatedShare prompt-for-prompt", () => {
    const byShare = roll({
      recipe: "influence",
      n: 30,
      seed: 909,
      theme: "nous-branded",
      maxSaturatedShare: 0.2,
    });
    const byBudget = roll({
      recipe: "influence",
      n: 30,
      seed: 909,
      theme: "nous-branded",
      saturatedBudget: { remaining: 0.2 * 30 },
    });
    expect(byBudget.map((p) => p.text)).toEqual(byShare.map((p) => p.text));
    expect(byBudget.map((p) => p.meta)).toEqual(byShare.map((p) => p.meta));
  });

  it("the ENGINE debits the ledger in place: remaining drops by exactly the pops emitted", () => {
    const budget = { remaining: 5 };
    const batch = roll({
      recipe: "influence",
      n: 30,
      seed: 909,
      theme: "nous-branded",
      saturatedBudget: budget,
    });
    const pops = batch.filter((p) => p.meta.paletteCategory === "pop").length;
    expect(pops).toBeLessThanOrEqual(5);
    expect(budget.remaining).toBe(5 - pops);
    expect(budget.remaining).toBeGreaterThanOrEqual(0);
  });

  it("an exhausted ledger forbids pop palettes entirely", () => {
    const batch = roll({
      recipe: "influence",
      n: 20,
      seed: 909,
      theme: "nous-branded",
      saturatedBudget: { remaining: 0 },
    });
    expect(batch.filter((p) => p.meta.paletteCategory === "pop")).toHaveLength(0);
  });

  it("ONE ledger threaded through roll-wide slices enforces the BATCH cap, not a per-slice floor", () => {
    // The dashboard's roll-wide path: share 0.35 over a 24-prompt batch is an
    // 8.4-pop budget for the WHOLE batch. Per-slice maxSaturatedShare would
    // floor each n=4 slice to 1 pop (max 6 — a hard 25% ceiling the slider
    // never promised). Passing the SAME object to every slice lets pops land
    // wherever the rolls want them while the batch total honors the slider.
    const seed = 7207;
    const recipes = ["influence", "poster", "spectral", "oldschool", "ephemera", "collision"];
    const budget = { remaining: 0.35 * 24 };
    const batch = recipes.flatMap((recipe, i) =>
      roll({
        recipe,
        n: 4,
        seed: seed + i,
        theme: "nous-branded",
        indexOffset: i * 4,
        coverageSeed: seed,
        saturatedBudget: budget,
      }),
    );
    expect(batch).toHaveLength(24);
    const pops = batch.filter((p) => p.meta.paletteCategory === "pop").length;
    expect(pops).toBeLessThanOrEqual(Math.floor(0.35 * 24));
    expect(budget.remaining).toBeCloseTo(0.35 * 24 - pops, 10);
    expect(budget.remaining).toBeGreaterThanOrEqual(0);
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

describe("batch-global positioning (roll-wide's indexOffset + coverageSeed)", () => {
  it("defaults reproduce single-roll behavior exactly", () => {
    const base = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded", texture: true });
    const explicit = roll({
      recipe: "collision",
      n: 12,
      seed: 42,
      theme: "nous-branded",
      texture: true,
      indexOffset: 0,
      coverageSeed: 42,
    });
    expect(explicit.map((p) => p.text)).toEqual(base.map((p) => p.text));
    expect(explicit.map((p) => p.meta)).toEqual(base.map((p) => p.meta));
  });

  it("slices sharing a coverageSeed walk ONE permutation: full batch-level influence coverage", () => {
    // Simulates the dashboard's roll-wide over art-history-madlib (recipes
    // influence + photo, both with the influence axis, 32 fine-art keys):
    // per-slice RNG seeds differ (seed, seed+1) exactly like the client, but
    // the shared coverageSeed + contiguous indexOffset keep the coverage
    // picker on one batch-wide permutation — all 32 influences appear across
    // the 32-prompt batch with zero repeats. With independent per-slice
    // restarts (the old behavior) this test fails with cross-slice repeats.
    const seed = 5001;
    const a = roll({
      recipe: "influence",
      n: 16,
      seed,
      theme: "art-history-madlib",
      indexOffset: 0,
      coverageSeed: seed,
    });
    const b = roll({
      recipe: "photo",
      n: 16,
      seed: seed + 1,
      theme: "art-history-madlib",
      indexOffset: a.length,
      coverageSeed: seed,
    });
    const keys = [...a, ...b].map((p) => p.meta.influenceKey);
    expect(keys).toHaveLength(32);
    expect(new Set(keys).size).toBe(32);
    expect(new Set(keys)).toEqual(new Set(fineArtKeys));
  });

  it("girl slots follow the batch-global index, not the slice-local one", () => {
    // Slice starting at batch position 2 with rate 4: girl fires at global
    // index 4 → local meta.index 2 (and NOT at the slice's first prompt).
    const prompts = roll({
      recipe: "influence",
      n: 6,
      seed: 303,
      theme: "nous-branded",
      girlRate: 4,
      indexOffset: 2,
    });
    expect(prompts.filter((p) => p.meta.girl).map((p) => p.meta.index)).toEqual([2]);
  });

  it("keeps the advertised girl share across a simulated wide batch", () => {
    // 24 prompts across 6 slices of 4, rate 8 → exactly 3 girls (~13%), not
    // one per slice (25%) as the per-slice restart produced.
    const seed = 7207;
    const recipes = ["influence", "poster", "spectral", "oldschool", "ephemera", "collision"];
    const batch = recipes.flatMap((recipe, i) =>
      roll({
        recipe,
        n: 4,
        seed: seed + i,
        theme: "nous-branded",
        girlRate: 8,
        indexOffset: i * 4,
        coverageSeed: seed,
      }),
    );
    expect(batch).toHaveLength(24);
    expect(batch.filter((p) => p.meta.girl)).toHaveLength(3);
  });

  it("rejects fractional or negative indexOffset", () => {
    for (const bad of [-1, 0.5, 2.25]) {
      expect(() =>
        roll({ recipe: "influence", n: 2, seed: 1, theme: "nous-branded", indexOffset: bad }),
      ).toThrow(/indexOffset must be a non-negative integer/);
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

describe("stripOperatorAnnotations (MJ clipboard path)", () => {
  it("removes the trailing [GIRL/iw N] marker from girl prompts", () => {
    const batch = roll({
      recipe: "influence",
      n: 8,
      seed: 6001,
      theme: "nous-branded",
      girlRate: 2,
    });
    const girls = batch.filter((p) => p.meta.girl);
    expect(girls.length).toBeGreaterThan(0);
    for (const p of girls) {
      expect(p.text).toMatch(/ \[GIRL\/iw [\d.]+\]$/); // engine text keeps parity
      const copied = stripOperatorAnnotations(p.text);
      expect(copied).not.toContain("[GIRL");
      expect(p.text.startsWith(copied)).toBe(true); // strips ONLY the tail
    }
  });

  it("leaves non-girl prompts byte-identical", () => {
    const batch = roll({ recipe: "influence", n: 6, seed: 6002, theme: "nous-branded" });
    for (const p of batch) {
      expect(p.meta.girl).toBe(false);
      expect(stripOperatorAnnotations(p.text)).toBe(p.text);
    }
  });
});
