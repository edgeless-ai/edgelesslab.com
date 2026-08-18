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
  GeneratedPrompt,
  PromptMeta,
  RollOptions,
  TaggedSubject,
  ThemeDef,
} from "./types";

/**
 * Word-boundary brand match (NOT a substring test -- a naive 'NOUS' in
 * text.upper() false-positives on "luminous"; that exact bug was audited and
 * fixed in the madlib engine, do not reintroduce it).
 */
export const brandWordRe = new RegExp(banks.BRAND_WORD_RE, "iu");

/** blender.py pick_subject: resonance-weighted choice from the TAGGED bank. */
function pickSubject(
  rng: Rng,
  subjects: TaggedSubject[],
  lex: string | undefined,
  avoidFigures: boolean,
): string {
  const theme = lex !== undefined ? banks.LEX_THEME[lex] : undefined;
  const prefer = new Set(theme?.resonates ?? []);
  const avoid = new Set(theme?.contradicts ?? []);
  if (avoidFigures) {
    for (const t of banks.GIRL.badTags) avoid.add(t);
  }
  const pool: string[] = [];
  for (const { text, tags } of subjects) {
    if (tags.some((t) => avoid.has(t))) continue; // cathedral-vs-bazaar contradictions
    const boost = tags.filter((t) => prefer.has(t)).length;
    for (let i = 0; i < 1 + 3 * boost; i++) pool.push(text);
  }
  if (pool.length > 0) return rng.choice(pool);
  return rng.choice(subjects.map((s) => s.text));
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

/** Port of blender.py roll(). Returns up to opts.n generated prompts. */
export function roll(opts: RollOptions): GeneratedPrompt[] {
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
  const recipeDef = banks.RECIPES[recipe];
  if (!recipeDef) throw new Error(`unknown recipe ${JSON.stringify(recipe)}`);
  const { axes, tmplBranded, tmplUnbranded, arSource } = recipeDef;

  // Theme defaults; explicit options override (same precedence as the CLI).
  const th: Partial<ThemeDef> = (opts.theme && banks.THEMES[opts.theme]) || {};
  const lexicon: string[] | null =
    th.lexicon === undefined ? banks.LEXICON : th.lexicon === "LEXICON" ? banks.LEXICON : null;
  let subjectsBank: TaggedSubject[] | string[] =
    th.subjects === "SUBJECTS_LARGE" ? banks.SUBJECTS_LARGE : banks.SUBJECTS;
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
      ? (subjectsBank as TaggedSubject[]).filter((s) => !brandWordRe.test(s.text))
      : (subjectsBank as string[]).filter((s) => !brandWordRe.test(s));
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

  const infKeys = Object.keys(banks.INFLUENCE).filter((k) => {
    const v = banks.INFLUENCE[k];
    if (domain && v.domain !== domain) return false;
    if (domainAny && !domainAny.has(v.domain)) return false;
    return true;
  });

  const paletteByText = new Map(banks.PALETTE.map((p) => [p.text, p.category]));
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
    if (arSource === "any") ar = lock.ar || rng.choice(banks.AR_ANY);
    if (rollAxes.includes("lexicon")) {
      vals.lexicon = lock.lexicon || rng.choice(lexicon as string[]);
    }
    for (const ax of rollAxes) {
      if (ax === "influence") {
        const lk = lock.influence;
        if (lk && lk.includes("+")) {
          // blend two influences: hilma+fisk
          const ks = lk.split("+");
          vals.inf_name = ks.map((k) => banks.INFLUENCE[k].name).join(" x ");
          vals.influence = ks.map((k) => banks.INFLUENCE[k].move).join("; ");
          vals._inf = lk;
        } else {
          let k: string;
          if (lk) {
            k = lk;
          } else if (coverage && infKeys.length > 0) {
            k = infKeys[wrapIndex(gidx, infKeys.length, coverageSeed + 100)];
          } else {
            k = rng.choice(infKeys);
          }
          vals.influence = banks.INFLUENCE[k].move;
          vals._inf = k;
          vals.inf_name = banks.INFLUENCE[k].name;
        }
      } else if (ax === "mode") {
        const m = lock.mode !== undefined ? banks.MODE[parseInt(lock.mode, 10)] : rng.choice(banks.MODE);
        vals.mode = m.phrase;
        vals.mode_look = m.look;
        if (arSource === "mode") ar = m.ar;
      } else if (ax === "format") {
        const f = rng.choice(banks.FORMAT);
        vals.format = f.phrase;
        if (arSource === "format") ar = f.ar;
      } else if (ax === "subject") {
        if (lock.subject) {
          vals.subject = lock.subject;
        } else if (subjectsTagged) {
          vals.subject = pickSubject(rng, subjectsBank as TaggedSubject[], vals.lexicon, girlSlot);
        } else if (coverage) {
          vals.subject = (subjectsBank as string[])[
            wrapIndex(gidx, subjectsBank.length, coverageSeed + 200)
          ];
        } else {
          vals.subject = rng.choice(subjectsBank as string[]);
        }
      } else if (ax === "modifier") {
        vals.modifier = rng.choice(banks.MODIFIERS);
      } else if (ax === "process") {
        vals.process = rng.choice(banks.PROCESS);
      } else if (ax === "palette") {
        vals.palette = lock.palette || rng.choice(banks.PALETTE).text;
      } else if (ax === "layout") {
        vals.layout = rng.choice(banks.LAYOUT);
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
        vals.mark = rng.choice(banks.BRAND_TAGS);
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
    let flags = girl ? banks.GIRL.flags : banks.FLAGS;
    const tag = girl ? ` [GIRL/iw ${banks.GIRL.iw}]` : "";
    let desc = fill(tmpl, vals);
    if (opts.texture) desc += `, ${rng.choice(banks.TEXTURE)}`; // digital-vintage grit
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
      desc = `${banks.GIRL.ref} ${desc}`;
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
