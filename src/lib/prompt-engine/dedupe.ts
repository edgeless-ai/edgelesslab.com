// Port of check_dupes.py: exact + fuzzy (difflib.SequenceMatcher ratio,
// Ratcliff/Obershelp) match of a new batch against the historical prompt
// corpus. check_dupes.py passes junk=None but keeps difflib's DEFAULT
// autojunk=True, and a large share of the stripped corpus prompts are >= 200
// chars -- the autojunk regime -- so autojunk IS emulated here (popular
// characters of a long `b` are barred from seeding matches). With junk=None
// the bjunk set stays empty, so difflib's junk-extension pass never fires;
// only the b2j purge matters. The golden fixtures pin exact ratios in both
// the short (<200 chars) and autojunk (>=200 chars) regimes.

import type { DedupeResult } from "./types";

/**
 * Port of check_dupes.py's strip lambda: remove `--flag [value]` pairs,
 * lowercase, trim.
 */
export function stripFlags(s: string): string {
  return s.replace(/--\S+( \S+)?/g, "").toLowerCase().trim();
}

/** Longest matching block in a[alo:ahi] vs b[blo:bhi] (difflib port). */
function findLongestMatch(
  a: string,
  b: string,
  b2j: Map<string, number[]>,
  alo: number,
  ahi: number,
  blo: number,
  bhi: number,
): [number, number, number] {
  let besti = alo;
  let bestj = blo;
  let bestsize = 0;
  let j2len = new Map<number, number>();
  for (let i = alo; i < ahi; i++) {
    const newj2len = new Map<number, number>();
    const indices = b2j.get(a[i]);
    if (indices) {
      for (const j of indices) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        newj2len.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
    }
    j2len = newj2len;
  }
  // With junk=None, bjunk is empty, so difflib's two extension passes
  // collapse into one. (Autojunk's "popular" elements are NOT junk: difflib
  // only removes them from b2j, and the extension passes still cross them --
  // exactly what this single pass does.)
  while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) {
    besti--;
    bestj--;
    bestsize++;
  }
  while (
    besti + bestsize < ahi &&
    bestj + bestsize < bhi &&
    a[besti + bestsize] === b[bestj + bestsize]
  ) {
    bestsize++;
  }
  return [besti, bestj, bestsize];
}

function totalMatches(a: string, b: string): number {
  const b2j = new Map<string, number[]>();
  for (let j = 0; j < b.length; j++) {
    const ch = b[j];
    const list = b2j.get(ch);
    if (list) list.push(j);
    else b2j.set(ch, [j]);
  }
  // difflib autojunk (the default check_dupes.py inherits): when b has >= 200
  // elements, characters occurring more than 1% of the time (> n/100 + 1
  // occurrences) are "popular" and purged from b2j -- they cannot seed a
  // match, though matches may still extend across them (see above).
  if (b.length >= 200) {
    const ntest = Math.floor(b.length / 100) + 1;
    for (const [ch, list] of b2j) {
      if (list.length > ntest) b2j.delete(ch);
    }
  }
  let matches = 0;
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]];
  while (queue.length > 0) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = findLongestMatch(a, b, b2j, alo, ahi, blo, bhi);
    if (k > 0) {
      matches += k;
      queue.push([alo, i, blo, j]);
      queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return matches;
}

/**
 * Faithful difflib.SequenceMatcher(None, a, b).ratio():
 * 2*M / (len(a)+len(b)) where M = total matching-block size.
 */
export function ratio(a: string, b: string): number {
  const length = a.length + b.length;
  if (length === 0) return 1;
  return (2 * totalMatches(a, b)) / length;
}

/**
 * difflib real_quick_ratio-style cheap upper bound on ratio(a, b), used to
 * skip corpus pairs that cannot beat the current best. Always >= ratio(a, b).
 */
export function quickRatioBound(a: string, b: string): number {
  const length = a.length + b.length;
  if (length === 0) return 1;
  return (2 * Math.min(a.length, b.length)) / length;
}

const NEAR_THRESHOLD = 0.9;

/**
 * check_dupes.py semantics: exact = raw string match against the raw corpus;
 * near = stripped ratio > 0.90 vs the stripped corpus. quickRatioBound skips
 * pairs that cannot improve bestRatio (bound >= true ratio, so verdicts are
 * unchanged by the skip).
 */
export function checkBatch(prompts: string[], corpus: string[]): DedupeResult[] {
  const rawSet = new Set(corpus);
  const stripped = corpus.map(stripFlags);
  return prompts.map((p) => {
    if (rawSet.has(p)) return { status: "exact", bestRatio: 1, closest: p };
    const ps = stripFlags(p);
    let bestRatio = 0;
    let closest: string | undefined;
    for (let i = 0; i < stripped.length; i++) {
      if (quickRatioBound(ps, stripped[i]) <= bestRatio) continue;
      const r = ratio(ps, stripped[i]);
      if (r > bestRatio) {
        bestRatio = r;
        closest = corpus[i];
      }
    }
    return { status: bestRatio > NEAR_THRESHOLD ? "near" : "ok", bestRatio, closest };
  });
}
