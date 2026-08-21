// Bring-Your-Own-Taste engine layer. Users impart their own taste by overlaying
// a CustomBanks on top of the default Banks: per axis they may extend (add),
// disable (hide defaults), or replace (use only their own entries). resolveBanks
// is a PURE merge — it never mutates the defaults — and its output is a plain
// Banks the engine's roll() consumes via its banksOverride parameter. Helpers,
// not guardrails: validateTastePack surfaces problems without ever blocking a
// generation (see BYO-TASTE-SPEC.md).

import { banks as DEFAULT_BANKS } from "./banks";
import type {
  Banks,
  FormatEntry,
  InfluenceEntry,
  ModeEntry,
  PaletteEntry,
  TaggedSubject,
  ThemeDef,
} from "./types";

// --------------------------------------------------------------- custom types

/**
 * Per-axis user override. `Add` is the SHAPE of the axis's `add` collection:
 *   - `string[]`                       for string axes (SUBJECTS_LARGE, LEXICON…)
 *   - `TaggedSubject[]`                for the tagged SUBJECTS bank
 *   - `PaletteEntry[]` / `ModeEntry[]` / `FormatEntry[]` for structured axes
 *   - `Record<string, InfluenceEntry>` for the keyed INFLUENCE bank
 *
 * Semantics (applied by resolveBanks, per axis):
 *   - `replace: true`  → the resolved axis is ONLY `add` (defaults ignored).
 *   - otherwise        → defaults minus `disable`, then `add` appended.
 *
 * `disable` always matches by the entry's IDENTITY STRING: the entry text for
 * SUBJECTS/PALETTE, `phrase` for MODE/FORMAT, the influence KEY for INFLUENCE,
 * and the string itself for plain string axes.
 */
export interface CustomAxis<Add> {
  add?: Add;
  disable?: string[];
  replace?: boolean;
}

/**
 * A user "taste pack": optional overrides for any axis, optional custom themes
 * merged into THEMES (custom wins on a name clash), and an optional brand-word
 * regex source string that overrides the default word-boundary brand matcher.
 * Every field is optional; an empty object is a no-op overlay.
 */
export interface CustomBanks {
  SUBJECTS?: CustomAxis<TaggedSubject[]>;
  SUBJECTS_LARGE?: CustomAxis<string[]>;
  MODIFIERS?: CustomAxis<string[]>;
  PALETTE?: CustomAxis<PaletteEntry[]>;
  LEXICON?: CustomAxis<string[]>;
  LAYOUT?: CustomAxis<string[]>;
  TEXTURE?: CustomAxis<string[]>;
  PROCESS?: CustomAxis<string[]>;
  MODE?: CustomAxis<ModeEntry[]>;
  FORMAT?: CustomAxis<FormatEntry[]>;
  INFLUENCE?: CustomAxis<Record<string, InfluenceEntry>>;
  BRAND_TAGS?: CustomAxis<string[]>;
  /** Custom themes merged into THEMES; a custom name overrides a default. */
  themes?: Record<string, ThemeDef>;
  /** Regex SOURCE (no flags) overriding Banks.BRAND_WORD_RE. */
  brandWordRe?: string;
}

// --------------------------------------------------------------- merge helpers

/**
 * Merge one array axis. Pure: returns a NEW array, never touches `defaults`.
 *   replace → [...add]; else → (defaults minus disabled-by-id) ++ add.
 */
function mergeArray<T>(
  defaults: readonly T[],
  custom: CustomAxis<T[]> | undefined,
  id: (entry: T) => string,
): T[] {
  if (!custom) return defaults.slice();
  const add = custom.add ?? [];
  if (custom.replace) return add.slice();
  const disabled = new Set(custom.disable ?? []);
  const kept = defaults.filter((entry) => !disabled.has(id(entry)));
  return [...kept, ...add];
}

/** Merge the keyed INFLUENCE record. Pure. Disable matches by influence KEY. */
function mergeRecord(
  defaults: Record<string, InfluenceEntry>,
  custom: CustomAxis<Record<string, InfluenceEntry>> | undefined,
): Record<string, InfluenceEntry> {
  if (!custom) return { ...defaults };
  const add = custom.add ?? {};
  if (custom.replace) return { ...add };
  const disabled = new Set(custom.disable ?? []);
  const out: Record<string, InfluenceEntry> = {};
  for (const [k, v] of Object.entries(defaults)) {
    if (!disabled.has(k)) out[k] = v;
  }
  return { ...out, ...add };
}

// ---------------------------------------------------------------- resolveBanks

/**
 * Overlay `custom` on `defaults` and return a NEW Banks. PURE — `defaults` and
 * all of its nested arrays/objects are left untouched (only referenced for the
 * pass-through axes the overlay does not customize). Axes the overlay omits are
 * copied fresh so callers can never alias into the defaults' arrays.
 */
export function resolveBanks(defaults: Banks, custom: CustomBanks = {}): Banks {
  return {
    ...defaults,
    SUBJECTS: mergeArray(defaults.SUBJECTS, custom.SUBJECTS, (s) => s.text),
    SUBJECTS_LARGE: mergeArray(defaults.SUBJECTS_LARGE, custom.SUBJECTS_LARGE, (s) => s),
    MODIFIERS: mergeArray(defaults.MODIFIERS, custom.MODIFIERS, (s) => s),
    PALETTE: mergeArray(defaults.PALETTE, custom.PALETTE, (p) => p.text),
    LEXICON: mergeArray(defaults.LEXICON, custom.LEXICON, (s) => s),
    LAYOUT: mergeArray(defaults.LAYOUT, custom.LAYOUT, (s) => s),
    TEXTURE: mergeArray(defaults.TEXTURE, custom.TEXTURE, (s) => s),
    PROCESS: mergeArray(defaults.PROCESS, custom.PROCESS, (s) => s),
    MODE: mergeArray(defaults.MODE, custom.MODE, (m) => m.phrase),
    FORMAT: mergeArray(defaults.FORMAT, custom.FORMAT, (f) => f.phrase),
    INFLUENCE: mergeRecord(defaults.INFLUENCE, custom.INFLUENCE),
    BRAND_TAGS: mergeArray(defaults.BRAND_TAGS, custom.BRAND_TAGS, (s) => s),
    THEMES: { ...defaults.THEMES, ...(custom.themes ?? {}) },
    BRAND_WORD_RE: custom.brandWordRe ?? defaults.BRAND_WORD_RE,
  };
}

// ------------------------------------------------------------- validation

/** Kind of `add` payload each customizable axis carries. */
type AxisKind = "string" | "subjects" | "palette" | "mode" | "format" | "influence";

const AXIS_KINDS: Record<string, AxisKind> = {
  SUBJECTS: "subjects",
  SUBJECTS_LARGE: "string",
  MODIFIERS: "string",
  PALETTE: "palette",
  LEXICON: "string",
  LAYOUT: "string",
  TEXTURE: "string",
  PROCESS: "string",
  MODE: "mode",
  FORMAT: "format",
  INFLUENCE: "influence",
  BRAND_TAGS: "string",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function hasStringFields(v: unknown, fields: string[]): boolean {
  if (!isPlainObject(v)) return false;
  return fields.every((f) => typeof v[f] === "string");
}

/** Validate an axis's `add` payload against its kind. Returns an error or null. */
function validateAdd(axis: string, kind: AxisKind, add: unknown): string | null {
  switch (kind) {
    case "string":
      return isStringArray(add) ? null : `${axis}.add must be an array of strings`;
    case "subjects":
      return Array.isArray(add) &&
        add.every((s) => isPlainObject(s) && typeof s.text === "string" && isStringArray(s.tags))
        ? null
        : `${axis}.add must be an array of { text: string, tags: string[] }`;
    case "palette":
      return Array.isArray(add) && add.every((p) => hasStringFields(p, ["text", "category"]))
        ? null
        : `${axis}.add must be an array of { text, category }`;
    case "mode":
      return Array.isArray(add) && add.every((m) => hasStringFields(m, ["phrase", "look", "ar"]))
        ? null
        : `${axis}.add must be an array of { phrase, look, ar }`;
    case "format":
      return Array.isArray(add) && add.every((f) => hasStringFields(f, ["phrase", "ar"]))
        ? null
        : `${axis}.add must be an array of { phrase, ar }`;
    case "influence":
      return isPlainObject(add) &&
        Object.values(add).every((v) => hasStringFields(v, ["name", "domain", "move"]))
        ? null
        : `${axis}.add must be a record of { name, domain, move }`;
  }
}

/**
 * Non-blocking taste-pack validator. `errors` = structurally unusable (the pack
 * cannot be fed to resolveBanks). `warnings` = degenerate-but-legal (an axis a
 * pack empties on purpose, a theme naming an unknown recipe/subject bank).
 * `ok` is true iff there are no errors; warnings NEVER set ok = false. When ok,
 * `value` is the pack typed as CustomBanks.
 */
export function validateTastePack(json: unknown): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  value?: CustomBanks;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(json)) {
    return { ok: false, errors: ["taste pack must be a JSON object"], warnings };
  }

  for (const [key, raw] of Object.entries(json)) {
    if (key === "themes" || key === "brandWordRe") continue;
    const kind = AXIS_KINDS[key];
    if (!kind) {
      warnings.push(`unknown axis "${key}" ignored`);
      continue;
    }
    if (!isPlainObject(raw)) {
      errors.push(`axis "${key}" must be an object with optional add/disable/replace`);
      continue;
    }
    if (raw.replace !== undefined && typeof raw.replace !== "boolean") {
      errors.push(`${key}.replace must be a boolean`);
    }
    if (raw.disable !== undefined && !isStringArray(raw.disable)) {
      errors.push(`${key}.disable must be an array of strings`);
    }
    let addOk = true;
    if (raw.add !== undefined) {
      const err = validateAdd(key, kind, raw.add);
      if (err) {
        errors.push(err);
        addOk = false;
      }
    }
    // Degenerate-but-legal: replace with nothing to add empties the axis.
    const addEmpty =
      raw.add === undefined ||
      (Array.isArray(raw.add) && raw.add.length === 0) ||
      (isPlainObject(raw.add) && Object.keys(raw.add).length === 0);
    if (raw.replace === true && addOk && addEmpty) {
      warnings.push(`axis "${key}" is emptied (replace with no add): rolls that use it will starve`);
    }
  }

  // brandWordRe: must be a string and a compilable regex.
  if (json.brandWordRe !== undefined) {
    if (typeof json.brandWordRe !== "string") {
      errors.push("brandWordRe must be a string");
    } else {
      try {
        new RegExp(json.brandWordRe, "iu");
      } catch {
        errors.push("brandWordRe is not a valid regular expression");
      }
    }
  }

  // themes: each must be a well-formed ThemeDef; warn on unknown recipe/bank.
  if (json.themes !== undefined) {
    if (!isPlainObject(json.themes)) {
      errors.push("themes must be an object keyed by theme name");
    } else {
      const knownRecipes = new Set(Object.keys(DEFAULT_BANKS.RECIPES));
      for (const [name, t] of Object.entries(json.themes)) {
        if (!isPlainObject(t)) {
          errors.push(`theme "${name}" must be an object`);
          continue;
        }
        if (!isStringArray(t.recipes)) {
          errors.push(`theme "${name}".recipes must be an array of recipe names`);
        } else if (t.recipes.length === 0) {
          warnings.push(`theme "${name}" has no recipes: selecting it produces nothing`);
        } else {
          for (const r of t.recipes) {
            if (!knownRecipes.has(r)) {
              warnings.push(`theme "${name}" references unknown recipe "${r}"`);
            }
          }
        }
        if (typeof t.subjects !== "string") {
          errors.push(`theme "${name}".subjects must be "SUBJECTS" or "SUBJECTS_LARGE"`);
        } else if (t.subjects !== "SUBJECTS" && t.subjects !== "SUBJECTS_LARGE") {
          warnings.push(`theme "${name}" references unknown subject bank "${t.subjects}"`);
        }
      }
    }
  }

  const ok = errors.length === 0;
  return ok ? { ok, errors, warnings, value: json as CustomBanks } : { ok, errors, warnings };
}

// ------------------------------------------------------------------- presets

/** No overrides — the shipped Edgeless banks exactly. */
export const EDGELESS_DEFAULT: CustomBanks = {};

/**
 * A near-empty starting canvas: replace the core generative axes with a tiny
 * neutral seed set (2-3 entries each) so a first roll still emits output while
 * the user builds up their own taste. Other axes fall through to the defaults.
 */
export const BLANK_CANVAS: CustomBanks = {
  SUBJECTS_LARGE: {
    replace: true,
    add: [
      "a single ripe pear on a bare windowsill",
      "a folded paper crane on grid paper",
      "a spiral staircase seen from directly below",
    ],
  },
  INFLUENCE: {
    replace: true,
    add: {
      "plain-line": {
        name: "PLAIN LINE",
        domain: "fine-art",
        move: "a spare single-weight line drawing, generous negative space, nothing ornamental",
      },
      "flat-block": {
        name: "FLAT BLOCK",
        domain: "fine-art",
        move: "flat blocks of matte color, hard edges, no gradient, poster-like clarity",
      },
    },
  },
  PALETTE: {
    replace: true,
    add: [
      { text: "warm grey on bone", category: "muted" },
      { text: "ink black on cream", category: "muted" },
      { text: "soft ochre on slate", category: "earth" },
    ],
  },
  LEXICON: {
    replace: true,
    add: ["STUDIO", "DRAFT", "MAKER"],
  },
};

/** Named presets used as starting points by the Customize UI. */
export const PRESETS: Record<string, CustomBanks> = {
  "edgeless-default": EDGELESS_DEFAULT,
  "blank-canvas": BLANK_CANVAS,
};
