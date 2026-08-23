# Prompt Engine — Bring-Your-Own-Taste (v1)

Design principle (David, 2026-08-21): **maximum configurability + accessibility,
no paternalism, no login gate. Helpers, not guardrails.** Users must be able to
impart their own taste. The v1 spec's "banks are dev-only" stance is explicitly
overridden.

## Engine layer (correctness-critical — owned by orchestrator, not delegated)

### `custom-banks.ts` (new)
- `CustomBanks` type: per-axis user data. For each axis the user may:
  - `add`: extra entries appended to the default bank
  - `disable`: a set of default entries to hide (by text / influence-key)
  - `replace`: if true, use ONLY the user's `add` list for that axis (ignore defaults)
- `CustomTheme` type: same shape as `ThemeDef`, user-named.
- `resolveBanks(defaults: Banks, custom?: CustomBanks): Banks` — pure. Produces a
  new Banks object with each axis merged per the rules above; custom themes merged
  into `THEMES`; custom brand regex honored if provided (else default). Never
  mutates `defaults`.
- `validateTastePack(json: unknown): { ok: boolean; errors: string[]; warnings: string[] }`
  — a HELPER. Errors = structurally unusable (malformed JSON shape). Warnings =
  degenerate-but-legal (empty axis after disable, theme referencing an unknown
  recipe, subject bank emptied). Warnings NEVER block generation.
- `EMPTY_CUSTOM` / preset constants: `"edgeless-default"` (no overrides) and
  `"blank-canvas"` (replace=true everywhere, minimal seed entries so a first roll
  still produces something).

### `engine.ts`
- `roll(opts, banksOverride?)` — new optional 2nd arg defaulting to the imported
  `banks`. Inside, `const B = banksOverride ?? banks;` and every `banks.X` in the
  roll body + `pickSubject` reads `B.X`. `brandWordRe` recomputed from `B.BRAND_WORD_RE`
  inside roll (module-level const stays for default callers). NO semantic change
  when `banksOverride` is absent — Python parity + golden fixtures unaffected.

## UI layer (`src/app/lab/prompt-engine/`)

A "Customize" drawer (collapsible, discoverable, not hidden behind a dev flag):

- **Generic `AxisEditor`** reused for every axis: lists entries, add (text field),
  remove/disable (toggle), replace-vs-extend switch, entry count. Influences and
  themes get thin wrappers (influence = name+domain+move; theme = axis/flag picker).
- **Presets**: dropdown — Edgeless default / Blank canvas — as starting points.
- **Taste packs**: Export (download `<name>.tastepack.json`) + Import (file picker,
  runs `validateTastePack`, surfaces warnings inline, still lets you proceed).
- **Live sample preview**: a 3-prompt sample regenerated from the CURRENT edited
  config (debounced) so the effect of an edit is visible immediately — the core
  accessibility + quality helper.
- **Bank-balance readout**: entry count per axis so users see a starved axis.
- **Persistence**: localStorage autosave of the active custom config; restore on load.
- All client-side. No login. No backend.

## Tests
- Engine: `resolveBanks` extend/replace/disable per axis; custom theme merge;
  `roll(opts, custom)` uses custom entries and excludes disabled ones; default
  call path byte-identical to before (parity guard); `validateTastePack`
  error/warning cases. Reverse-classical proof for the disable + replace paths.
- UI: smoke extension — open Customize, add a subject, generate, see it appear;
  export produces valid JSON; import round-trips.

## v2 — Per-entry weighting (shipped 2026-08-23)

Users can make any entry more likely in a RANDOM roll. Shipped as a **sidecar
weight map**, NOT a `weight` field baked into each bank entry, so there was no
data-shape change, no Python change, and the golden parity fixtures stayed
byte-identical.

### Taste-pack JSON schema
Add an optional top-level `weights` object to a taste pack:

```json
{
  "weights": {
    "INFLUENCE":       { "hilma": 3, "fisk": 2 },
    "SUBJECTS_LARGE":  { "a spiral staircase seen from directly below": 5 },
    "PALETTE":         { "ink black on cream": 4 }
  }
}
```

- Shape: `axis -> (entry identity string -> number)`. The identity string is the
  SAME key `disable` uses: entry text for SUBJECTS / SUBJECTS_LARGE / PALETTE,
  `phrase` for MODE / FORMAT, the influence KEY for INFLUENCE, the string itself
  for plain string axes (MODIFIERS, LEXICON, LAYOUT, TEXTURE, PROCESS, BRAND_TAGS).
- A weight > 1 makes an entry proportionally more likely; a missing / non-positive
  / non-finite weight is treated as 1. To make something rare, raise the others;
  to remove it, use `disable`.
- Weights are capped at 1e6 on import (guards a hand-crafted pack from overflowing
  the cumulative sum). The UI stepper emits whole numbers 1..99; imported JSON may
  use fractional weights.

### Semantics + guarantees
- **Parity:** a cumulative weighted pick with all weights equal returns
  `rng.choice`'s exact index on the same single RNG draw, so the default
  (no-weights) path is untouched and weighting never perturbs another axis's stream.
- **Coverage wins:** on a coverage-guaranteed theme the covered axes (Influences,
  Subjects) are picked by the even wrap permutation, so weights on them are IGNORED
  (the drawer shows an inline note when the selected theme is coverage-guaranteed).
- **Composes with resonance:** on the tagged SUBJECTS bank a user weight multiplies
  the resonance boost, i.e. effective weight = `(1 + 3*boost) * userWeight`.

### Engine + UI wiring
- `types.ts`: `WeightMap = Partial<Record<WeightableAxis, Record<string, number>>>`;
  optional `Banks.WEIGHTS`.
- `custom-banks.ts`: `CustomBanks.weights` passed through `resolveBanks` to
  `Banks.WEIGHTS`; `validateTastePack` validates it (structural = error, degenerate
  = warning).
- `engine.ts`: one-draw `weightedPick` / `weightedPickBy` at each random axis;
  `posWeight` clamps junk to 1 and caps at 1e6.
- UI: a −N×+ stepper on every default + added entry, an "N weighted" badge and a
  "clear weights" control per axis, weights round-tripped through the taste pack +
  localStorage.

## Non-goals
- Community taste-pack gallery / backend sharing (client-side files first; the one
  feature that would genuinely need a backend).
- No change to the Python source of truth or the golden parity fixtures.
