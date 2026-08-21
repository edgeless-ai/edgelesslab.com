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

## Non-goals (v1)
- Per-entry weighting (needs `weight` field through the Python exporter → v2).
- Community taste-pack gallery / backend sharing (client-side files first → v2).
- No change to the Python source of truth or the golden parity fixtures.
