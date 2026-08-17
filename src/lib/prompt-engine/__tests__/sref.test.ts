// sref ordering semantics (port of sref_pack.sref_for_artist): NGA hits
// first, then shuffled safe non-AIC, AIC deprioritized LAST only if short --
// never hard-excluded.

import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { buildSrefIndex, srefUrlsForArtist } from "../sref";
import type { SrefRef } from "../types";

const refs: SrefRef[] = [
  { artist: "Johannes Vermeer", url: "nga-vermeer-1", museum: "NGA" },
  { artist: "Johannes Vermeer", url: "nga-vermeer-2", museum: "NGA" },
  { artist: "Katsushika Hokusai", url: "aic-hokusai-1", museum: "AIC", safe: true, mod_safe: true },
  { artist: "Katsushika Hokusai", url: "aic-hokusai-2", museum: "AIC", safe: true, mod_safe: true },
  { artist: "Johannes Vermeer", url: "met-vermeer-1", museum: "MET", safe: true, mod_safe: true },
  { artist: "Johannes Vermeer", url: "cma-vermeer-1", museum: "CMA", safe: true, mod_safe: false },
  { artist: "Johannes Vermeer", url: "eur-vermeer-unsafe", museum: "EUR", safe: false, mod_safe: false },
  { artist: "Johannes Vermeer", url: "aic-vermeer-1", museum: "AIC", safe: true, mod_safe: true },
];

const index = buildSrefIndex(refs);

describe("buildSrefIndex", () => {
  it("splits NGA from multi-museum refs, preserving order", () => {
    expect(index.nga.map((r) => r.url)).toEqual(["nga-vermeer-1", "nga-vermeer-2"]);
    expect(index.multi).toHaveLength(6);
  });
});

describe("srefUrlsForArtist", () => {
  it("prefers NGA hits first, in pack order", () => {
    const urls = srefUrlsForArtist(index, "Vermeer", { count: 2, rng: new Rng(1) });
    expect(urls).toEqual(["nga-vermeer-1", "nga-vermeer-2"]);
  });

  it("returns an artist present only in AIC (deprioritized, not excluded)", () => {
    const urls = srefUrlsForArtist(index, "Hokusai", { count: 2, rng: new Rng(1) });
    expect(urls).toHaveLength(2);
    expect(new Set(urls)).toEqual(new Set(["aic-hokusai-1", "aic-hokusai-2"]));
  });

  it("uses AIC refs only when non-deprioritized hits fall short", () => {
    const urls = srefUrlsForArtist(index, "Vermeer", { count: 4, rng: new Rng(2) });
    // 2 NGA + 1 safe MET, then AIC fills the shortfall.
    expect(urls.slice(0, 2)).toEqual(["nga-vermeer-1", "nga-vermeer-2"]);
    expect(urls[2]).toBe("met-vermeer-1");
    expect(urls[3]).toBe("aic-vermeer-1");
  });

  it("safeOnly filters unsafe multi-pack refs (needs safe AND mod_safe)", () => {
    const urls = srefUrlsForArtist(index, "Vermeer", { count: 10, rng: new Rng(3) });
    expect(urls).not.toContain("cma-vermeer-1"); // mod_safe false
    expect(urls).not.toContain("eur-vermeer-unsafe");
    const unsafeIncluded = srefUrlsForArtist(index, "Vermeer", {
      count: 10,
      safeOnly: false,
      rng: new Rng(3),
    });
    expect(unsafeIncluded).toContain("cma-vermeer-1");
    expect(unsafeIncluded).toContain("eur-vermeer-unsafe");
  });

  it("matches case-insensitively by substring", () => {
    const urls = srefUrlsForArtist(index, "vermeer", { count: 1, rng: new Rng(4) });
    expect(urls).toEqual(["nga-vermeer-1"]);
    expect(srefUrlsForArtist(index, "No Such Artist", { count: 2, rng: new Rng(4) })).toEqual([]);
  });
});
