// Bring-Your-Own-Taste engine-layer tests: resolveBanks merge semantics
// (extend / replace / disable, per axis incl. INFLUENCE record + tagged
// SUBJECTS), purity (defaults never mutated), custom theme merge + use by
// roll(), roll() emitting added entries and never disabled ones, determinism
// with custom banks, the default-path parity guard, and validateTastePack.

import { describe, expect, it } from "vitest";
import { banks } from "../banks";
import {
  BLANK_CANVAS,
  CustomBanks,
  EDGELESS_DEFAULT,
  PRESETS,
  resolveBanks,
  validateTastePack,
} from "../custom-banks";
import { roll } from "../engine";
import type { ThemeDef } from "../types";

describe("resolveBanks — string axes", () => {
  it("extends: defaults + add", () => {
    const r = resolveBanks(banks, { LEXICON: { add: ["ZZZBRAND"] } });
    expect(r.LEXICON).toEqual([...banks.LEXICON, "ZZZBRAND"]);
  });

  it("replaces: only add", () => {
    const r = resolveBanks(banks, { LEXICON: { replace: true, add: ["ONLY"] } });
    expect(r.LEXICON).toEqual(["ONLY"]);
  });

  it("disables: defaults minus disabled entry", () => {
    const victim = banks.SUBJECTS_LARGE[0];
    const r = resolveBanks(banks, { SUBJECTS_LARGE: { disable: [victim] } });
    expect(r.SUBJECTS_LARGE).not.toContain(victim);
    expect(r.SUBJECTS_LARGE).toHaveLength(banks.SUBJECTS_LARGE.length - 1);
  });
});

describe("resolveBanks — tagged SUBJECTS (identity = text)", () => {
  it("disables by text and adds a tagged subject", () => {
    const victim = banks.SUBJECTS[0].text;
    const added = { text: "a hand-forged iron key on linen", tags: ["object", "singular"] };
    const r = resolveBanks(banks, { SUBJECTS: { disable: [victim], add: [added] } });
    expect(r.SUBJECTS.map((s) => s.text)).not.toContain(victim);
    expect(r.SUBJECTS.map((s) => s.text)).toContain(added.text);
    expect(r.SUBJECTS).toHaveLength(banks.SUBJECTS.length - 1 + 1);
  });
});

describe("resolveBanks — INFLUENCE record (identity = key)", () => {
  it("extends the record with a new key", () => {
    const r = resolveBanks(banks, {
      INFLUENCE: { add: { newk: { name: "NEWK", domain: "fine-art", move: "a NEWK move" } } },
    });
    expect(r.INFLUENCE.newk).toEqual({ name: "NEWK", domain: "fine-art", move: "a NEWK move" });
    expect(Object.keys(r.INFLUENCE)).toHaveLength(Object.keys(banks.INFLUENCE).length + 1);
  });

  it("disables an influence by key", () => {
    const victim = Object.keys(banks.INFLUENCE)[0];
    const r = resolveBanks(banks, { INFLUENCE: { disable: [victim] } });
    expect(r.INFLUENCE[victim]).toBeUndefined();
    expect(Object.keys(r.INFLUENCE)).toHaveLength(Object.keys(banks.INFLUENCE).length - 1);
  });

  it("replaces the whole influence record", () => {
    const only = { solo: { name: "SOLO", domain: "fine-art", move: "a SOLO move" } };
    const r = resolveBanks(banks, { INFLUENCE: { replace: true, add: only } });
    expect(Object.keys(r.INFLUENCE)).toEqual(["solo"]);
  });
});

describe("resolveBanks — structured PALETTE/MODE (identity = text/phrase)", () => {
  it("disables a palette by text and adds one", () => {
    const victim = banks.PALETTE[0].text;
    const r = resolveBanks(banks, {
      PALETTE: { disable: [victim], add: [{ text: "sea green on chalk", category: "muted" }] },
    });
    expect(r.PALETTE.map((p) => p.text)).not.toContain(victim);
    expect(r.PALETTE.map((p) => p.text)).toContain("sea green on chalk");
  });

  it("disables a mode by phrase", () => {
    const victim = banks.MODE[0].phrase;
    const r = resolveBanks(banks, { MODE: { disable: [victim] } });
    expect(r.MODE.map((m) => m.phrase)).not.toContain(victim);
  });
});

describe("resolveBanks — purity (never mutates defaults)", () => {
  it("leaves the defaults object deeply unchanged", () => {
    const before = structuredClone(banks);
    const r = resolveBanks(banks, {
      SUBJECTS: { disable: [banks.SUBJECTS[0].text], add: [{ text: "x", tags: ["y"] }] },
      INFLUENCE: { replace: true, add: { z: { name: "Z", domain: "d", move: "m" } } },
      LEXICON: { add: ["EXTRA"] },
      themes: {
        mine: {
          recipes: ["influence"],
          lexicon: "LEXICON",
          subjects: "SUBJECTS",
          influenceDomain: null,
          srefMode: null,
          coverage: false,
          modifiers: false,
          markStyle: "wordmark",
        },
      },
      brandWordRe: "\\bZ\\b",
    });
    // defaults untouched...
    expect(banks).toEqual(before);
    // ...and the result is a genuinely new object with new arrays.
    expect(r).not.toBe(banks);
    expect(r.SUBJECTS).not.toBe(banks.SUBJECTS);
    expect(r.LEXICON).not.toBe(banks.LEXICON);
  });

  it("no-op overlay still returns a fresh Banks (arrays not aliased)", () => {
    const r = resolveBanks(banks, EDGELESS_DEFAULT);
    expect(r).not.toBe(banks);
    expect(r.SUBJECTS).not.toBe(banks.SUBJECTS);
    expect(r.SUBJECTS).toEqual(banks.SUBJECTS);
    expect(r.INFLUENCE).toEqual(banks.INFLUENCE);
  });
});

describe("resolveBanks — custom theme merge + roll() use", () => {
  it("merges a custom theme and roll(opts, resolved) generates with it", () => {
    const theme: ThemeDef = {
      recipes: ["influence"],
      lexicon: "LEXICON",
      subjects: "SUBJECTS",
      influenceDomain: null,
      srefMode: null,
      coverage: false,
      modifiers: false,
      markStyle: "wordmark",
    };
    const resolved = resolveBanks(banks, { themes: { "my-house-style": theme } });
    expect(resolved.THEMES["my-house-style"]).toEqual(theme);
    const prompts = roll(
      { recipe: "influence", n: 5, seed: 1234, theme: "my-house-style" },
      resolved,
    );
    expect(prompts).toHaveLength(5);
    expect(prompts.every((p) => p.meta.theme === "my-house-style")).toBe(true);
  });

  it("a custom theme wins on a name clash with a default", () => {
    const overridden: ThemeDef = { ...banks.THEMES["nous-branded"], recipes: ["photo"] };
    const resolved = resolveBanks(banks, { themes: { "nous-branded": overridden } });
    expect(resolved.THEMES["nous-branded"].recipes).toEqual(["photo"]);
  });
});

describe("roll(opts, resolved) — emits added, never disabled", () => {
  it("EMITS an added influence and NEVER emits a disabled one over a big roll", () => {
    const victim = "fisk"; // a real default influence key
    const resolved = resolveBanks(banks, {
      INFLUENCE: {
        disable: [victim],
        add: { mynew: { name: "MYNEW", domain: "typography", move: "a MYNEW distinctive move" } },
      },
    });
    // Use a domain that includes both the added (typography) and default keys.
    const prompts = roll(
      { recipe: "poster", n: 120, seed: 77, theme: "nous-branded", domain: "typography" },
      resolved,
    );
    const keys = new Set(prompts.map((p) => p.meta.influenceKey));
    expect(keys.has("mynew")).toBe(true); // added entry surfaces
    expect(keys.has(victim)).toBe(false); // disabled entry never surfaces
  });

  it("a replaced SUBJECTS_LARGE bank confines every rolled subject to the seed set", () => {
    const resolved = resolveBanks(banks, {
      SUBJECTS_LARGE: { replace: true, add: ["a lone cypress", "a cracked bell", "a paper lantern"] },
    });
    const prompts = roll({ recipe: "photo", n: 30, seed: 202, theme: "art-history-madlib" }, resolved);
    const subjects = new Set(prompts.map((p) => p.meta.subject));
    for (const s of subjects) {
      expect(["a lone cypress", "a cracked bell", "a paper lantern"]).toContain(s);
    }
  });
});

describe("determinism with custom banks", () => {
  it("same opts + same resolved banks reproduce the batch exactly", () => {
    const custom: CustomBanks = { LEXICON: { add: ["EXTRA"] }, PALETTE: { add: [{ text: "t", category: "muted" }] } };
    const a = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded" }, resolveBanks(banks, custom));
    const b = roll({ recipe: "collision", n: 12, seed: 42, theme: "nous-branded" }, resolveBanks(banks, custom));
    expect(a.map((p) => p.text)).toEqual(b.map((p) => p.text));
    expect(a.map((p) => p.meta)).toEqual(b.map((p) => p.meta));
  });
});

describe("PARITY GUARD — default path unchanged", () => {
  const cases = [
    { recipe: "collision", n: 12, seed: 42, theme: "nous-branded", texture: true },
    { recipe: "influence", n: 20, seed: 909, theme: "nous-branded" },
    { recipe: "photo", n: 15, seed: 6101, theme: "art-history-madlib" },
  ];
  it("roll(opts) === roll(opts, undefined) === roll(opts, banks)", () => {
    for (const opts of cases) {
      const a = roll(opts);
      const b = roll(opts, undefined);
      const c = roll(opts, banks);
      expect(b.map((p) => p.text)).toEqual(a.map((p) => p.text));
      expect(b.map((p) => p.meta)).toEqual(a.map((p) => p.meta));
      expect(c.map((p) => p.text)).toEqual(a.map((p) => p.text));
      expect(c.map((p) => p.meta)).toEqual(a.map((p) => p.meta));
    }
  });
});

describe("validateTastePack", () => {
  it("accepts a good pack: ok, no errors", () => {
    const good: CustomBanks = {
      LEXICON: { add: ["HOUSE"], disable: ["NOUS RESEARCH"] },
      INFLUENCE: { add: { g: { name: "G", domain: "fine-art", move: "a G move" } } },
      SUBJECTS: { add: [{ text: "a quiet object", tags: ["object"] }] },
      themes: {
        good: {
          recipes: ["influence"],
          lexicon: "LEXICON",
          subjects: "SUBJECTS",
          influenceDomain: null,
          srefMode: null,
          coverage: false,
          modifiers: false,
          markStyle: "wordmark",
        },
      },
    };
    const res = validateTastePack(good);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.value).toBeDefined();
  });

  it("rejects a malformed pack: errors present, ok false, no value", () => {
    const bad = {
      LEXICON: { add: [1, 2, 3] }, // not strings
      INFLUENCE: "nope", // not an object
      brandWordRe: 5, // not a string
    };
    const res = validateTastePack(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.value).toBeUndefined();
  });

  it("rejects a non-object pack", () => {
    expect(validateTastePack(null).ok).toBe(false);
    expect(validateTastePack([]).ok).toBe(false);
    expect(validateTastePack("x").ok).toBe(false);
  });

  it("warns on a degenerate-but-legal pack: ok true, warnings present", () => {
    const degenerate: CustomBanks = {
      SUBJECTS_LARGE: { replace: true }, // emptied axis, no add
      themes: {
        t: {
          recipes: ["does-not-exist"], // unknown recipe -> warning
          lexicon: "LEXICON",
          subjects: "SUBJECTS",
          influenceDomain: null,
          srefMode: null,
          coverage: false,
          modifiers: false,
          markStyle: "wordmark",
        },
      },
    };
    const res = validateTastePack(degenerate);
    expect(res.ok).toBe(true); // warnings never block
    expect(res.errors).toEqual([]);
    expect(res.warnings.length).toBeGreaterThanOrEqual(2);
    expect(res.warnings.some((w) => w.includes("emptied"))).toBe(true);
    expect(res.warnings.some((w) => w.includes("unknown recipe"))).toBe(true);
  });
});

describe("presets", () => {
  it("EDGELESS_DEFAULT is a no-op overlay", () => {
    const r = resolveBanks(banks, EDGELESS_DEFAULT);
    expect(r.SUBJECTS_LARGE).toEqual(banks.SUBJECTS_LARGE);
    expect(r.INFLUENCE).toEqual(banks.INFLUENCE);
  });

  it("BLANK_CANVAS still yields output on a first roll", () => {
    const resolved = resolveBanks(banks, BLANK_CANVAS);
    const prompts = roll({ recipe: "influence", n: 3, seed: 1, theme: "nous-branded" }, resolved);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.every((p) => p.text.length > 0)).toBe(true);
  });

  it("both presets validate clean", () => {
    for (const name of Object.keys(PRESETS)) {
      const res = validateTastePack(PRESETS[name]);
      expect(res.ok).toBe(true);
    }
  });
});

describe("empty-axis preflight — graceful degrade, not a cryptic crash", () => {
  it("emptying a required axis throws ONE clear, actionable message naming the axis", () => {
    // Replace INFLUENCE with nothing, then roll a recipe that needs it.
    const resolved = resolveBanks(banks, { INFLUENCE: { replace: true } });
    expect(() =>
      roll({ recipe: "influence", n: 6, seed: 1, theme: "nous-branded" }, resolved),
    ).toThrowError(/Influence[\s\S]*Customize/);
  });

  it("emptying the subject bank under a coverage theme errors clearly, not with a NaN/BigInt crash", () => {
    const resolved = resolveBanks(banks, { SUBJECTS_LARGE: { replace: true } });
    // art-history-madlib uses SUBJECTS_LARGE + coverage; message must name Subject.
    expect(() =>
      roll({ recipe: "photo", n: 4, seed: 2, theme: "art-history-madlib" }, resolved),
    ).toThrowError(/Subject/);
  });

  it("a starved axis does NOT block recipes whose axes are intact", () => {
    // Palette emptied: 'spectral' (mode/subject/lexicon, no palette) still rolls.
    const resolved = resolveBanks(banks, { PALETTE: { replace: true } });
    const prompts = roll({ recipe: "spectral", n: 4, seed: 3, theme: "nous-branded" }, resolved);
    expect(prompts.length).toBeGreaterThan(0);
  });
});

describe("validateTastePack — empty theme recipes", () => {
  it("warns (does not error) when a custom theme has no recipes", () => {
    const pack: CustomBanks = {
      themes: {
        mine: {
          recipes: [],
          lexicon: null,
          subjects: "SUBJECTS",
          influenceDomain: null,
          srefMode: null,
          coverage: false,
          modifiers: false,
          markStyle: "none",
        } as ThemeDef,
      },
    };
    const res = validateTastePack(pack);
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => /no recipes/.test(w))).toBe(true);
  });
});
