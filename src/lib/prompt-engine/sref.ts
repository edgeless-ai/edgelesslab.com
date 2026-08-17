// Port of sref_pack.py's museum image-ref lookup (real artwork URLs used as
// MidJourney --sref). Ordering semantics are the hard-won part: NGA hits
// first, then shuffled safe non-AIC refs, then AIC-and-friends LAST and only
// if still short of `count` -- deprioritized, never hard-excluded (some
// artists, e.g. Hokusai's ukiyo-e prints, exist ONLY in AIC in this pack).

import type { Rng } from "./rng";
import type { SrefIndex, SrefRef } from "./types";

/**
 * Split a merged ref list (public/prompt-engine/srefs.json shape) into the
 * NGA pack and the multi-museum pack, preserving original order in each.
 */
export function buildSrefIndex(refs: SrefRef[]): SrefIndex {
  const nga: SrefRef[] = [];
  const multi: SrefRef[] = [];
  for (const r of refs) {
    (r.museum === "NGA" ? nga : multi).push(r);
  }
  return { nga, multi };
}

export interface SrefLookupOptions {
  count: number;
  safeOnly?: boolean;
  deprioritizeMuseums?: string[];
  preferNga?: boolean;
  rng: Rng;
}

/**
 * Up to `count` real museum-artwork URLs whose artist field contains
 * artistSubstr (case-insensitive substring match, same as
 * sref_pack.sref_for_artist). NGA refs are checked first in pack order (the
 * curated pack has no safety flags and no known 403 issues); multi-museum
 * refs are safe-filtered, split into non-deprioritized (shuffled) and
 * deprioritized (shuffled, appended only if still short).
 */
export function srefUrlsForArtist(
  index: SrefIndex,
  artistSubstr: string,
  opts: SrefLookupOptions,
): string[] {
  const {
    count,
    safeOnly = true,
    deprioritizeMuseums = ["AIC"],
    preferNga = true,
    rng,
  } = opts;
  const needle = artistSubstr.toLowerCase();
  const hits: string[] = [];
  if (preferNga) {
    for (const r of index.nga) {
      if (r.artist.toLowerCase().includes(needle)) hits.push(r.url);
    }
  }
  const good: string[] = [];
  const fallback: string[] = [];
  for (const r of index.multi) {
    if (!r.artist.toLowerCase().includes(needle)) continue;
    if (safeOnly && !(r.safe && r.mod_safe)) continue;
    (deprioritizeMuseums.includes(r.museum) ? fallback : good).push(r.url);
  }
  // Both shuffles run unconditionally, matching the Python rng call order.
  rng.shuffle(good);
  rng.shuffle(fallback);
  hits.push(...good);
  if (hits.length < count) hits.push(...fallback);
  return hits.slice(0, count);
}
