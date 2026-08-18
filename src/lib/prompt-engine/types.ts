// Shared types for the MJ prompt-engine port (blender.py v3 / sref_pack.py /
// check_dupes.py -> TypeScript). The Python toolchain in
// generated/nous-mj-overnight/ is the reference implementation; when in doubt
// the Python behavior wins.

export interface TaggedSubject {
  text: string;
  tags: string[];
}

export interface LexThemeEntry {
  resonates: string[];
  contradicts: string[];
}

export interface ModeEntry {
  phrase: string;
  look: string;
  ar: string;
}

export interface FormatEntry {
  phrase: string;
  ar: string;
}

export interface PaletteEntry {
  text: string;
  category: string;
}

export interface InfluenceEntry {
  name: string;
  domain: string;
  move: string;
}

export interface RecipeDef {
  axes: string[];
  tmplBranded: string;
  tmplUnbranded: string | null;
  arSource: string;
}

export type SrefMode = "museum" | "random-stacked" | null;

export interface ThemeDef {
  recipes: string[];
  /** "LEXICON" references banks.LEXICON; null = unbranded theme. */
  lexicon: "LEXICON" | null;
  subjects: "SUBJECTS" | "SUBJECTS_LARGE";
  influenceDomain: string | null;
  srefMode: SrefMode;
  coverage: boolean;
  modifiers: boolean;
  markStyle: string;
  srefCountPool?: number[];
  influenceDomainsAny?: string[];
}

export interface GirlConfig {
  ref: string;
  iw: number;
  badTags: string[];
  flags: string;
}

export interface Banks {
  SUBJECTS: TaggedSubject[];
  SUBJECTS_LARGE: string[];
  MODIFIERS: string[];
  BRAND_TAGS: string[];
  LEX_THEME: Record<string, LexThemeEntry>;
  MODE: ModeEntry[];
  PROCESS: string[];
  FORMAT: FormatEntry[];
  PALETTE: PaletteEntry[];
  LEXICON: string[];
  LAYOUT: string[];
  TEXTURE: string[];
  INFLUENCE: Record<string, InfluenceEntry>;
  RECIPES: Record<string, RecipeDef>;
  THEMES: Record<string, ThemeDef>;
  AR_ANY: string[];
  FLAGS: string;
  GIRL: GirlConfig;
  /** Regex SOURCE (no flags) for word-boundary brand matching. */
  BRAND_WORD_RE: string;
}

// ------------------------------------------------------------------- sref

export interface SrefRef {
  artist: string;
  url: string;
  museum: string;
  safe?: boolean;
  mod_safe?: boolean;
}

export interface SrefIndex {
  /** NGA pack refs, original order (curated, no safety flags needed). */
  nga: SrefRef[];
  /** Multi-museum pack refs (AIC/CMA/MET/EUR), original order. */
  multi: SrefRef[];
}

// ------------------------------------------------------------------ engine

/**
 * Mutable pop-palette budget SHARED by every recipe slice of one roll-wide
 * batch (see RollOptions.saturatedBudget). Deliberately an object rather than
 * a number: roll() debits `remaining` in place as it emits pop-palette
 * prompts, so later slices automatically see what earlier slices spent —
 * no caller-side re-counting of palette metas between slices.
 */
export interface SaturatedBudget {
  /** Pop-palette prompts the whole batch may still emit. May be fractional. */
  remaining: number;
}

export interface RollOptions {
  recipe: string;
  n: number;
  seed: number;
  theme?: string;
  lock?: Record<string, string>;
  domain?: string;
  /**
   * INTEGER "every Nth prompt is a girl prompt" (blender.py --girl-rate N).
   * NOT a 0..1 fraction — the engine throws on non-integers. 0/undefined = off.
   */
  girlRate?: number;
  quiet?: boolean;
  texture?: boolean;
  coverage?: boolean;
  markStyle?: string;
  srefCountPool?: number[];
  srefMode?: SrefMode;
  /**
   * 0..1: caps the "pop" palette-category share of the batch, rejection-style
   * in the roll loop. undefined = off.
   */
  maxSaturatedShare?: number;
  /**
   * Batch-global palette restraint for multi-slice (roll-wide) callers: one
   * mutable budget object passed to EVERY slice of the batch. The engine is
   * the only bookkeeper — it refuses a pop palette once remaining < 1 and
   * debits remaining on each pop it emits — so restraint holds across the
   * whole batch instead of rounding down per slice (share 0.35 over six n=4
   * slices floored each slice to 1 pop: a hard 25% ceiling the slider never
   * promised). Takes precedence over maxSaturatedShare. Absent → single-roll
   * blender.py-shaped behavior, unchanged.
   */
  saturatedBudget?: SaturatedBudget;
  /**
   * From sref.ts buildSrefIndex(). null/undefined -> museum mode degrades to
   * no sref, like blender.py's ImportError fallback.
   */
  srefIndex?: SrefIndex | null;
  /**
   * Batch-global index of this roll's FIRST prompt (default 0). Roll-wide
   * callers pass the running prompt count so girl slots and coverage picking
   * see one continuous batch instead of restarting at 0 per recipe slice
   * (which inflated the girl share and broke batch-level coverage).
   */
  indexOffset?: number;
  /**
   * Salt base for the coverage-guaranteed picker (default: this roll's seed,
   * i.e. blender.py behavior). Roll-wide callers pass the batch's BASE seed
   * for every slice so all slices walk ONE shared wrap permutation — restoring
   * the batch-level "every entry before repeats" guarantee — while per-slice
   * RNG seeds stay distinct.
   */
  coverageSeed?: number;
}

export interface PromptMeta {
  index: number;
  seed: number;
  recipe: string;
  theme?: string;
  ar: string;
  girl: boolean;
  influenceKey?: string;
  influenceName?: string;
  subject?: string;
  palette?: string;
  paletteCategory?: string;
  mode?: string;
  format?: string;
  lexicon?: string;
}

export interface GeneratedPrompt {
  text: string;
  meta: PromptMeta;
}

// ------------------------------------------------------------------ dedupe

export type DedupeStatus = "ok" | "exact" | "near";

export interface DedupeResult {
  status: DedupeStatus;
  bestRatio: number;
  closest?: string;
  /**
   * Human-readable label of the corpus the closest match came from (e.g. "the
   * logged round history" vs "a batch saved in this browser"). Only present
   * when the matching PreparedCorpus was given a label — unlabeled corpora
   * (checkBatch, the golden fixtures) produce results identical to before.
   */
  source?: string;
}
