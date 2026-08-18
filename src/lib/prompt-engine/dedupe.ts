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
 * A corpus pre-processed for repeated checks: the raw texts, an exact-match
 * set, and the stripped forms. Stripping ~360 long prompts is the cheap part
 * of a check but still worth doing once per corpus, not once per generate.
 */
export interface PreparedCorpus {
  raw: string[];
  rawSet: Set<string>;
  stripped: string[];
  /**
   * Optional human-readable provenance ("the logged round history", "a batch
   * saved in this browser…"). When set, a match against this corpus stamps
   * DedupeResult.source so the UI can say WHERE the dupe came from — a hit
   * against the append-only log means "this already ran in MJ", while a hit
   * against a never-exported local batch only means "you rolled this before".
   * Unlabeled corpora produce results identical to the pre-label behavior.
   */
  label?: string;
}

export function prepareCorpus(corpus: string[], label?: string): PreparedCorpus {
  return {
    raw: corpus,
    rawSet: new Set(corpus),
    stripped: corpus.map(stripFlags),
    ...(label !== undefined ? { label } : {}),
  };
}

/**
 * check_dupes.py semantics for ONE prompt against one or more corpora (e.g.
 * the static snapshot plus prompts rolled earlier this session): exact = raw
 * string match; near = stripped ratio > 0.90. quickRatioBound skips pairs
 * that cannot improve bestRatio (bound >= true ratio, so verdicts are
 * unchanged by the skip). Corpora are scanned in the given order, matching
 * single-corpus checkBatch exactly when one is passed.
 */
export function checkOne(p: string, corpora: readonly PreparedCorpus[]): DedupeResult {
  for (const c of corpora) {
    if (c.rawSet.has(p)) {
      return {
        status: "exact",
        bestRatio: 1,
        closest: p,
        ...(c.label !== undefined ? { source: c.label } : {}),
      };
    }
  }
  const ps = stripFlags(p);
  let bestRatio = 0;
  let closest: string | undefined;
  let source: string | undefined;
  for (const c of corpora) {
    for (let i = 0; i < c.stripped.length; i++) {
      if (quickRatioBound(ps, c.stripped[i]) <= bestRatio) continue;
      const r = ratio(ps, c.stripped[i]);
      if (r > bestRatio) {
        bestRatio = r;
        closest = c.raw[i];
        source = c.label;
      }
    }
  }
  return {
    status: bestRatio > NEAR_THRESHOLD ? "near" : "ok",
    bestRatio,
    closest,
    ...(source !== undefined ? { source } : {}),
  };
}

/** Synchronous batch check (check_dupes.py semantics). */
export function checkBatch(prompts: string[], corpus: string[]): DedupeResult[] {
  const prepared = [prepareCorpus(corpus)];
  return prompts.map((p) => checkOne(p, prepared));
}

/**
 * Chunked batch check for the browser: the full fuzzy scan of a default
 * 24-prompt batch takes seconds of pure CPU, and running it synchronously
 * right after setState leaves no task boundary for the "Rolling…" state to
 * paint — the page just hangs. This variant yields a REAL macrotask before
 * every per-prompt check (including the first, so the pending UI is
 * guaranteed at least one paint) and reports progress after each. Without
 * `withinBatchLabel`, verdicts are identical to checkBatch over the same
 * corpora.
 *
 * withinBatchLabel additionally checks each prompt against the ACCEPTED
 * (status "ok") prompts earlier in this same batch, flagging internal
 * near-twins with that label as the source. check_dupes.py never had this
 * axis — its batch was always a single roll whose `seen` key already
 * de-duplicates axis combos — but a multi-recipe roll-wide batch is a
 * dashboard construct whose slices share no `seen` state, and the house rule
 * is "dupes flagged, never silently included". Only ok-verdict prompts join
 * the self corpus, so a pair of internal twins flags exactly one of the two
 * (dropping flagged prompts keeps one copy instead of losing both).
 */
export async function checkBatchAsync(
  prompts: string[],
  corpora: readonly PreparedCorpus[],
  opts: {
    onProgress?: (done: number, total: number) => void;
    withinBatchLabel?: string;
  } = {},
): Promise<DedupeResult[]> {
  const self: PreparedCorpus | null =
    opts.withinBatchLabel !== undefined
      ? {
          raw: [],
          rawSet: new Set<string>(),
          stripped: [],
          label: opts.withinBatchLabel,
        }
      : null;
  const scan = self ? [...corpora, self] : corpora;
  const out: DedupeResult[] = [];
  for (let i = 0; i < prompts.length; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
    const res = checkOne(prompts[i], scan);
    out.push(res);
    if (self && res.status === "ok") {
      self.raw.push(prompts[i]);
      self.rawSet.add(prompts[i]);
      self.stripped.push(stripFlags(prompts[i]));
    }
    opts.onProgress?.(i + 1, prompts.length);
  }
  return out;
}
