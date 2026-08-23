// Port of blender.py v3 roll() -- the theme-driven combinatorial prompt
// engine. Semantics are ported faithfully from the Python reference
// (generated/nous-mj-overnight/blender.py); when in doubt the Python behavior
// wins. Cross-language RNG-stream parity is NOT attempted (see rng.ts), but
// every rule -- theme defaults + explicit-option override precedence, brand
// word-boundary suppression, resonance weighting, coverage wrap salts, girl
// slots, mark styles, the cyanotype-vs-thermal conflict guard, batch dedup
// key, guard loop, texture, sref modes, AR sources -- carries over.

import { banks } from "./banks";
import { wrapIndex } from "./coverage";
import { Rng } from "./rng";
import { srefUrlsForArtist } from "./sref";
import type {
  Banks,
  GeneratedPrompt,
  PromptMeta,
  RollOptions,
  TaggedSubject,
  ThemeDef,
} from "./types";

const OWN = Object.prototype.hasOwnProperty;

/**
 * A usable multiplicity: positive finite number, else 1 (missing/junk => 1).
 * Capped at 1e6 so a hand-crafted taste pack can't overflow the cumulative sum
 * to Infinity (which would silently bias every pick to the last entry). The UI
 * only ever emits 1..99; this guards the imported-JSON path.
 */
function posWeight(w: unknown): number {
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? Math.min(w, 1e6) : 1;
}

/**
 * Weighted pick that consumes EXACTLY ONE rng draw — same as rng.choice — so it
 * never shifts the RNG stream for later axes. Cumulative walk: with all weights
 * equal it returns rng.choice's index bit-for-bit (floor(next()*n) lands in the
 * same block the cumulative threshold selects), so a uniform weightOf is
 * byte-identical to the uniform pick it replaces. `total <= 0` can't happen for
 * a non-empty list (posWeight >= 1) but is guarded for safety.
 */
function weightedPickBy<T>(rng: Rng, items: T[], weightOf: (t: T) => number): T {
  let total = 0;
  for (const it of items) total += weightOf(it);
  if (!(total > 0)) return rng.choice(items);
  const r = rng.next() * total;
  let acc = 0;
  for (const it of items) {
    acc += weightOf(it);
    if (r < acc) return it;
  }
  return items[items.length - 1]; // float-rounding guard
}

/**
 * Pick from `items` honoring an optional weight map keyed by each item's
 * identity string. When `wmap` is undefined the call is LITERALLY rng.choice
 * (the default no-weights path stays untouched); when present it routes through
 * weightedPickBy (still one draw, byte-identical where the user left weights at
 * the default). Prototype-safe: only own keys are read.
 */
function weightedPick<T>(
  rng: Rng,
  items: T[],
  idOf: (t: T) => string,
  wmap?: Record<string, number>,
): T {
  if (!wmap) return rng.choice(items);
  return weightedPickBy(rng, items, (it) => {
    const id = idOf(it);
    return posWeight(OWN.call(wmap, id) ? wmap[id] : 1);
  });
}

/**
 * Strip trailing operator-only annotations from a generated prompt so it can
 * be pasted into the MidJourney imagine bar. blender.py appends
 * " [GIRL/iw 1.5]" to girl prompts as a marker for the OPERATOR (the original
 * consumer was an agent driving the browser, who stripped it before typing);
 * MJ itself rejects the bracket text as a bad parameter. The engine's `text`
 * keeps the annotation — it is part of the Python-parity output and of the
 * round-log format — so ONLY clipboard paths should run this.
 */
export function stripOperatorAnnotations(text: string): string {
  return text.replace(/ \[GIRL\/iw [^\]]+\]$/, "");
}

/**
 * Word-boundary brand match (NOT a substring test -- a naive 'NOUS' in
 * text.upper() false-positives on "luminous"; that exact bug was audited and
 * fixed in the madlib engine, do not reintroduce it).
 */
export const brandWordRe = new RegExp(banks.BRAND_WORD_RE, "iu");

/**
 * blender.py pick_subject: resonance-weighted choice from the TAGGED bank.
 *
 * `wmap` (optional per-entry user weights, keyed by subject text) COMPOSES with
 * the resonance boost: an entry's effective weight is (1 + 3*boost) * userWeight.
 * When wmap is undefined the exact original pool-of-copies + rng.choice runs
 * (byte-identical); with a uniform wmap the composed weighted pick is
 * byte-identical too (integer resonance multiplicities are what rng.choice's
 * pool already encoded).
 */
function pickSubject(
  rng: Rng,
  subjects: TaggedSubject[],
  lex: string | undefined,
  avoidFigures: boolean,
  bnk: Banks,
  wmap?: Record<string, number>,
): string {
  const theme = lex !== undefined ? bnk.LEX_THEME[lex] : undefined;
  const prefer = new Set(theme?.resonates ?? []);
  const avoid = new Set(theme?.contradicts ?? []);
  if (avoidFigures) {
    for (const t of bnk.GIRL.badTags) avoid.add(t);
  }
  if (!wmap) {
    // Original path, untouched.
    const pool: string[] = [];
    for (const { text, tags } of subjects) {
      if (tags.some((t) => avoid.has(t))) continue; // cathedral-vs-bazaar contradictions
      const boost = tags.filter((t) => prefer.has(t)).length;
      for (let i = 0; i < 1 + 3 * boost; i++) pool.push(text);
    }
    if (pool.length > 0) return rng.choice(pool);
    return rng.choice(subjects.map((s) => s.text));
  }
  // Weighted: dedup to one candidate per subject, weight = resonance * user.
  const cands: { text: string; w: number }[] = [];
  for (const { text, tags } of subjects) {
    if (tags.some((t) => avoid.has(t))) continue;
    const boost = tags.filter((t) => prefer.has(t)).length;
    const uw = posWeight(OWN.call(wmap, text) ? wmap[text] : 1);
    cands.push({ text, w: (1 + 3 * boost) * uw });
  }
  if (cands.length > 0) return weightedPickBy(rng, cands, (c) => c.w).text;
  return weightedPick(rng, subjects.map((s) => s.text), (s) => s, wmap);
}

/** blender.py _conflict: MODE-implied palettes clash with PROCESS palettes. */
function conflict(vals: Record<string, string>): boolean {
  const j = Object.values(vals).join(" ").toLowerCase();
  return (
    j.includes("cyanotype") &&
    (j.includes("ironbow") || j.includes("flir") || j.includes("thermal heat"))
  );
}

/** Fill a `{placeholder}` template from vals (Python str.format subset). */
function fill(tmpl: string, vals: Record<string, string>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_m, key: string) => vals[key] ?? "");
}

function isTagged(bank: TaggedSubject[] | string[]): bank is TaggedSubject[] {
  return bank.length > 0 && typeof bank[0] === "object";
}

/**
 * Port of blender.py roll(). Returns up to opts.n generated prompts.
 *
 * `banksOverride` lets a caller supply a resolved (Bring-Your-Own-Taste) Banks
 * — see resolveBanks in custom-banks.ts. When it is undefined the engine reads
 * the module `banks` and behaves BYTE-IDENTICALLY to the default path (Python
 * parity + golden fixtures unaffected).
 */
export function roll(opts: RollOptions, banksOverride?: Banks): GeneratedPrompt[] {
  const B = banksOverride ?? banks;
  // Recompute the brand matcher from the ACTIVE banks (module-level brandWordRe
  // export is unchanged for default callers).
  const brandRe = new RegExp(B.BRAND_WORD_RE, "iu");
  // Per-entry weights (Bring-Your-Own-Taste). undefined for every axis on the
  // default path -> weightedPick falls straight through to rng.choice.
  const W = B.WEIGHTS;
  const { recipe, n, seed } = opts;
  const lock = opts.lock ?? {};
  const girlRate = opts.girlRate ?? 0;
  // blender.py's --girl-rate N is an INTEGER "every Nth prompt" (int() parse in
  // its CLI); the girl-slot test below is `idx % girlRate === 0`, so a
  // fractional rate (e.g. 0.25 intended as "25%") silently marks EVERY prompt
  // a girl prompt (idx % 0.25 === 0 for all integers). Reject it loudly.
  if (!Number.isInteger(girlRate) || girlRate < 0) {
    throw new Error(
      `girlRate must be a non-negative integer ("every Nth prompt", like blender.py --girl-rate N); got ${girlRate}`,
    );
  }
  const quiet = opts.quiet ?? false;
  // Batch-global positioning (roll-wide support; defaults reproduce the
  // single-roll blender.py behavior exactly).
  const indexOffset = opts.indexOffset ?? 0;
  if (!Number.isInteger(indexOffset) || indexOffset < 0) {
    throw new Error(`indexOffset must be a non-negative integer; got ${indexOffset}`);
  }
  const coverageSeed = opts.coverageSeed ?? seed;

  const rng = new Rng(seed);
  const recipeDef = B.RECIPES[recipe];
  if (!recipeDef) throw new Error(`unknown recipe ${JSON.stringify(recipe)}`);
  const { axes, tmplBranded, tmplUnbranded, arSource } = recipeDef;

  // Theme defaults; explicit options override (same precedence as the CLI).
  const th: Partial<ThemeDef> = (opts.theme && B.THEMES[opts.theme]) || {};
  const lexicon: string[] | null =
    th.lexicon === undefined ? B.LEXICON : th.lexicon === "LEXICON" ? B.LEXICON : null;
  let subjectsBank: TaggedSubject[] | string[] =
    th.subjects === "SUBJECTS_LARGE" ? B.SUBJECTS_LARGE : B.SUBJECTS;
  const domain = opts.domain || th.influenceDomain || null;
  const domainAny = th.influenceDomainsAny ? new Set(th.influenceDomainsAny) : null;
  const srefMode = opts.srefMode !== undefined ? opts.srefMode : th.srefMode ?? null;
  const coverage = opts.coverage !== undefined ? opts.coverage : th.coverage ?? false;
  const markStyle = opts.markStyle || th.markStyle || "wordmark";
  const srefCountPool = opts.srefCountPool ?? th.srefCountPool ?? [2];
  const srefIndex = opts.srefIndex ?? null;

  const subjectsTagged = isTagged(subjectsBank);
  const branded = lexicon !== null && axes.includes("lexicon");
  if (!branded) {
    // Unbranded themes must also exclude subjects with NOUS/HERMES baked into
    // the subject text itself (word-boundary match, NOT substring -- see
    // brandWordRe above).
    subjectsBank = subjectsTagged
      ? (subjectsBank as TaggedSubject[]).filter((s) => !brandRe.test(s.text))
      : (subjectsBank as string[]).filter((s) => !brandRe.test(s));
  }
  let tmpl: string;
  if (branded) {
    tmpl = tmplBranded;
  } else if (tmplUnbranded !== null) {
    tmpl = tmplUnbranded;
  } else {
    throw new Error(
      `recipe ${JSON.stringify(recipe)} has no unbranded variant; give it a lexicon or pick another recipe`,
    );
  }
  const rollAxes = axes.filter((a) => branded || a !== "lexicon");

  const infKeys = Object.keys(B.INFLUENCE).filter((k) => {
    const v = B.INFLUENCE[k];
    if (domain && v.domain !== domain) return false;
    if (domainAny && !domainAny.has(v.domain)) return false;
    return true;
  });

  // Empty-pool preflight (Bring-Your-Own-Taste): a user can empty any axis in
  // the Customize drawer (Replace with no entries, or disable every default).
  // Without this, the roll loop would hit rng.choice([]) -> undefined and throw
  // a cryptic TypeError (or a NaN->BigInt error on the coverage subject path).
  // Per the "helpers, not guardrails" contract we do NOT stop the user editing;
  // instead we throw ONE clear, actionable message naming the empty axis so the
  // UI (which catches per recipe) can degrade gracefully and tell the user how
  // to fix it, while other recipes in a roll-wide batch still produce. Locked
  // axes whose entry was deleted are reported the same way.
  const emptyAxes: string[] = [];
  for (const ax of rollAxes) {
    if (ax === "influence") {
      if (lock.influence) {
        const bad = lock.influence.split("+").filter((k) => !B.INFLUENCE[k]);
        if (bad.length) emptyAxes.push(`Influence (locked "${bad.join(", ")}" no longer exists)`);
      } else if (infKeys.length === 0) {
        emptyAxes.push(domain || domainAny ? "Influence (none in the chosen domain)" : "Influence");
      }
    } else if (ax === "subject") {
      if (!lock.subject && subjectsBank.length === 0) emptyAxes.push("Subject");
    } else if (ax === "mode") {
      if (lock.mode !== undefined) {
        if (!B.MODE[parseInt(lock.mode, 10)]) emptyAxes.push("Capture mode (locked index out of range)");
      } else if (B.MODE.length === 0) emptyAxes.push("Capture mode");
    } else if (ax === "format") {
      if (B.FORMAT.length === 0) emptyAxes.push("Format");
    } else if (ax === "palette") {
      if (!lock.palette && B.PALETTE.length === 0) emptyAxes.push("Palette");
    } else if (ax === "modifier") {
      if (B.MODIFIERS.length === 0) emptyAxes.push("Modifier");
    } else if (ax === "process") {
      if (B.PROCESS.length === 0) emptyAxes.push("Process");
    } else if (ax === "layout") {
      if (B.LAYOUT.length === 0) emptyAxes.push("Layout");
    }
  }
  if (rollAxes.includes("lexicon") && !lock.lexicon && (lexicon as string[]).length === 0) {
    emptyAxes.push("Lexicon / wordmark");
  }
  if (opts.texture && B.TEXTURE.length === 0) emptyAxes.push("Texture");
  if (arSource === "any" && !lock.ar && B.AR_ANY.length === 0) emptyAxes.push("Aspect ratio");
  if (branded && tmplBranded.includes("{mark}") && !quiet && markStyle === "sentence" && B.BRAND_TAGS.length === 0) {
    emptyAxes.push("Brand tags");
  }
  if (emptyAxes.length > 0) {
    throw new Error(
      `Recipe "${recipe}" can't roll — these axes are empty: ${emptyAxes.join(", ")}. ` +
        `Add entries or re-enable some defaults in Customize.`,
    );
  }

  const paletteByText = new Map(B.PALETTE.map((p) => [p.text, p.category]));
  // Two restraint shapes: maxSaturatedShare is the per-roll share cap
  // (blender.py-shaped, share * n for THIS roll); saturatedBudget is a
  // mutable ledger shared across the slices of one roll-wide batch — the
  // engine debits it in place on every pop it emits, so slice k+1 sees what
  // slices 0..k spent without any caller-side accounting. When both are set
  // the stricter one wins on each candidate.
  const budget = opts.saturatedBudget;
  const popCap =
    opts.maxSaturatedShare !== undefined ? opts.maxSaturatedShare * n : Number.POSITIVE_INFINITY;
  let popCount = 0;

  const out: GeneratedPrompt[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard < n * 200) {
    guard++;
    const idx = out.length; // position within this run (meta.index)
    const gidx = indexOffset + idx; // batch-global position: girl slots + coverage
    const vals: Record<string, string> = {};
    let ar = arSource;
    const girlSlot = girlRate > 0 && gidx % girlRate === 0;
    if (arSource === "any") ar = lock.ar || rng.choice(B.AR_ANY);
    if (rollAxes.includes("lexicon")) {
      vals.lexicon =
        lock.lexicon || weightedPick(rng, lexicon as string[], (s) => s, W?.LEXICON);
    }
    for (const ax of rollAxes) {
      if (ax === "influence") {
        const lk = lock.influence;
        if (lk && lk.includes("+")) {
          // blend two influences: hilma+fisk
          const ks = lk.split("+");
          vals.inf_name = ks.map((k) => B.INFLUENCE[k].name).join(" x ");
          vals.influence = ks.map((k) => B.INFLUENCE[k].move).join("; ");
          vals._inf = lk;
        } else {
          let k: string;
          if (lk) {
            k = lk;
          } else if (coverage && infKeys.length > 0) {
            k = infKeys[wrapIndex(gidx, infKeys.length, coverageSeed + 100)];
          } else {
            k = weightedPick(rng, infKeys, (x) => x, W?.INFLUENCE);
          }
          vals.influence = B.INFLUENCE[k].move;
          vals._inf = k;
          vals.inf_name = B.INFLUENCE[k].name;
        }
      } else if (ax === "mode") {
        const m =
          lock.mode !== undefined
            ? B.MODE[parseInt(lock.mode, 10)]
            : weightedPick(rng, B.MODE, (e) => e.phrase, W?.MODE);
        vals.mode = m.phrase;
        vals.mode_look = m.look;
        if (arSource === "mode") ar = m.ar;
      } else if (ax === "format") {
        const f = weightedPick(rng, B.FORMAT, (e) => e.phrase, W?.FORMAT);
        vals.format = f.phrase;
        if (arSource === "format") ar = f.ar;
      } else if (ax === "subject") {
        if (lock.subject) {
          vals.subject = lock.subject;
        } else if (subjectsTagged) {
          // Coverage wins on this axis: when the theme is coverage-guaranteed we
          // do NOT apply user weights (pass undefined), honoring the documented
          // invariant that a covered axis surfaces entries evenly. (Resonance
          // boost still shapes tagged picks, as it always has.)
          vals.subject = pickSubject(
            rng,
            subjectsBank as TaggedSubject[],
            vals.lexicon,
            girlSlot,
            B,
            coverage ? undefined : W?.SUBJECTS,
          );
        } else if (coverage) {
          vals.subject = (subjectsBank as string[])[
            wrapIndex(gidx, subjectsBank.length, coverageSeed + 200)
          ];
        } else {
          vals.subject = weightedPick(
            rng,
            subjectsBank as string[],
            (s) => s,
            W?.SUBJECTS_LARGE,
          );
        }
      } else if (ax === "modifier") {
        vals.modifier = weightedPick(rng, B.MODIFIERS, (s) => s, W?.MODIFIERS);
      } else if (ax === "process") {
        vals.process = weightedPick(rng, B.PROCESS, (s) => s, W?.PROCESS);
      } else if (ax === "palette") {
        vals.palette =
          lock.palette || weightedPick(rng, B.PALETTE, (e) => e.text, W?.PALETTE).text;
      } else if (ax === "layout") {
        vals.layout = weightedPick(rng, B.LAYOUT, (s) => s, W?.LAYOUT);
      }
      // "lexicon" already rolled above
    }
    // Render the wordmark clause -- {mark}. quiet = tiny/absent so the IMAGE
    // leads, not the type.
    if (tmpl.includes("{mark}") && branded) {
      const lx = vals.lexicon ?? "";
      if (quiet) {
        vals.mark = rng.choice([
          `a small discreet "${lx}" mark`,
          `"${lx}" set very small in the margin`,
          "no text, purely visual",
        ]);
      } else if (markStyle === "sentence") {
        vals.mark = weightedPick(rng, B.BRAND_TAGS, (s) => s, W?.BRAND_TAGS);
      } else {
        vals.mark = `wordmark "${lx}"`;
      }
    }
    const key = JSON.stringify([
      vals._inf ?? null,
      vals.subject ?? null,
      vals.mode ?? null,
      vals.format ?? null,
    ]);
    if (seen.has(key) || conflict(vals)) continue;
    const paletteCategory =
      vals.palette !== undefined ? paletteByText.get(vals.palette) : undefined;
    // Rejection-style cap on the "pop" palette category. Checked before
    // seen.add so the same axis combo can re-roll a calmer palette on a later
    // guard iteration. The shared ledger refuses a pop once less than one
    // whole unit remains (fractional budgets like 0.35*24 = 8.4 therefore
    // admit exactly floor(8.4) pops — same rounding as the share cap).
    if (paletteCategory === "pop") {
      if (popCount + 1 > popCap) continue;
      if (budget !== undefined && budget.remaining < 1) continue;
    }
    seen.add(key);
    if (paletteCategory === "pop") {
      popCount++;
      if (budget !== undefined) budget.remaining -= 1;
    }

    const girl = girlSlot; // every Nth prompt features her
    let flags = girl ? B.GIRL.flags : B.FLAGS;
    const tag = girl ? ` [GIRL/iw ${B.GIRL.iw}]` : "";
    let desc = fill(tmpl, vals);
    if (opts.texture) desc += `, ${weightedPick(rng, B.TEXTURE, (s) => s, W?.TEXTURE)}`; // digital-vintage grit
    // Museum sref: pull a real artwork by the rolled influence artist as --sref.
    let sref = "";
    const srefN = rng.choice(srefCountPool);
    if (srefMode === "museum" && vals.inf_name) {
      if (srefIndex) {
        const urls = srefUrlsForArtist(srefIndex, vals.inf_name, {
          count: srefN,
          rng: new Rng(seed + idx),
        });
        sref = urls.length > 0 ? `--sref ${urls.join(" ")}` : "";
      }
      // No srefIndex -> degrade quietly, like blender.py's ImportError fallback.
    } else if (srefMode === "random-stacked") {
      sref = `--sref ${new Array<string>(srefN).fill("random").join(" ")}`;
    }
    if (sref) flags = `${flags} ${sref}`;
    if (girl) {
      // Bare image prompt: the ref URL must LEAD the prompt, unflagged.
      desc = `${B.GIRL.ref} ${desc}`;
    }
    const meta: PromptMeta = {
      index: idx,
      seed,
      recipe,
      theme: opts.theme,
      ar,
      girl,
      influenceKey: vals._inf,
      influenceName: vals.inf_name,
      subject: vals.subject,
      palette: vals.palette,
      paletteCategory,
      mode: vals.mode,
      format: vals.format,
      lexicon: vals.lexicon,
    };
    out.push({ text: `${desc} --ar ${ar} ${flags}${tag}`, meta });
  }
  return out;
}
