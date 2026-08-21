"use client";

/**
 * Bring-Your-Own-Taste customize drawer for the MJ prompt-engine dashboard.
 *
 * Everything here is client-side and static-export safe. The engine layer
 * (custom-banks.ts / engine.ts) is the correctness-critical half and is owned
 * by the orchestrator; this file is pure UI over its frozen contract:
 *   - resolveBanks(banks, custom) -> resolved Banks (pure merge, never mutates)
 *   - roll(opts, resolvedBanks)   -> generate with the user's taste
 *   - validateTastePack(json)     -> { ok, errors[], warnings[], value? }
 *   - EDGELESS_DEFAULT / BLANK_CANVAS preset seeds
 *
 * CustomBanks is per-axis { add?, disable?, replace? } (+ themes?, brandWordRe?).
 * We manipulate it through a small structural lens (AxisOverride) so the generic
 * editor does not need to know each axis's element type; typed casts live only
 * at that lens boundary.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  Download,
  Upload,
  Sparkles,
  Trash2,
  TriangleAlert,
  Plus,
  X,
  RotateCcw,
  Scale,
} from "lucide-react";

import { banks } from "@/lib/prompt-engine/banks";
import { roll, stripOperatorAnnotations } from "@/lib/prompt-engine/engine";
import {
  resolveBanks,
  validateTastePack,
  EDGELESS_DEFAULT,
  BLANK_CANVAS,
} from "@/lib/prompt-engine/custom-banks";
import type { CustomBanks } from "@/lib/prompt-engine/custom-banks";
import type {
  Banks,
  InfluenceEntry,
  ThemeDef,
} from "@/lib/prompt-engine/types";

/* ------------------------------------------------------------------ */
/* CustomBanks structural lens                                        */
/* ------------------------------------------------------------------ */

/**
 * The axes the UI edits. Kept as a literal list so the readout and editors
 * iterate one source of truth.
 */
type AxisKey =
  | "SUBJECTS"
  | "SUBJECTS_LARGE"
  | "MODIFIERS"
  | "PALETTE"
  | "LEXICON"
  | "LAYOUT"
  | "TEXTURE"
  | "PROCESS"
  | "MODE"
  | "FORMAT"
  | "INFLUENCE"
  | "BRAND_TAGS";

/**
 * Structural view of one axis's override — matches the frozen contract. `add`
 * is an array for every axis EXCEPT INFLUENCE, whose `add` is a keyed record
 * ({ [key]: InfluenceEntry }); the editor branches on meta.record for that.
 */
interface AxisOverride {
  add?: unknown[] | Record<string, unknown>;
  disable?: string[];
  replace?: boolean;
}

function addCountOf(add: AxisOverride["add"]): number {
  if (!add) return 0;
  return Array.isArray(add) ? add.length : Object.keys(add).length;
}

/** Slug an influence name into a stable-ish record key. */
function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type CustomThemes = Record<string, ThemeDef>;

/** Read one axis override without needing its exact element type. */
function getAxis(cb: CustomBanks, axis: AxisKey): AxisOverride {
  const rec = cb as unknown as Record<string, AxisOverride | undefined>;
  return rec[axis] ?? {};
}

/** Immutably set one axis override (dropping it entirely when empty). */
function setAxis(
  cb: CustomBanks,
  axis: AxisKey,
  next: AxisOverride,
): CustomBanks {
  const rec = { ...(cb as unknown as Record<string, unknown>) };
  const empty =
    addCountOf(next.add) === 0 &&
    (!next.disable || next.disable.length === 0) &&
    !next.replace;
  if (empty) delete rec[axis];
  else rec[axis] = next;
  return rec as unknown as CustomBanks;
}

function getThemes(cb: CustomBanks): CustomThemes {
  const rec = cb as unknown as { themes?: CustomThemes };
  return rec.themes ?? {};
}

function setThemes(cb: CustomBanks, themes: CustomThemes): CustomBanks {
  const rec = { ...(cb as unknown as Record<string, unknown>) };
  if (Object.keys(themes).length === 0) delete rec.themes;
  else rec.themes = themes;
  return rec as unknown as CustomBanks;
}

/* ------------------------------------------------------------------ */
/* Axis metadata                                                      */
/* ------------------------------------------------------------------ */

interface DefaultEntry {
  key: string; // disable key: text / phrase / influence-key
  label: string; // display
}

interface AxisMeta {
  axis: AxisKey;
  label: string;
  /** Default bank entries (from the FROZEN defaults) with their disable key. */
  defaults: DefaultEntry[];
  /** Render the add form; onAdd receives the built entry to append to add. */
  renderAddForm: (onAdd: (entry: unknown) => void) => ReactNode;
  /** Label for an entry sitting in the user's add collection. */
  addLabel: (entry: unknown) => string;
  /** INFLUENCE only: its `add` is a keyed record, not an array. */
  record?: boolean;
}

const STRING_AXES: { axis: AxisKey; label: string; source: string[] }[] = [
  { axis: "SUBJECTS_LARGE", label: "Subjects (wide bank)", source: banks.SUBJECTS_LARGE },
  { axis: "MODIFIERS", label: "Modifiers", source: banks.MODIFIERS },
  { axis: "LEXICON", label: "Lexicon (brand words)", source: banks.LEXICON },
  { axis: "LAYOUT", label: "Layout", source: banks.LAYOUT },
  { axis: "TEXTURE", label: "Texture", source: banks.TEXTURE },
  { axis: "PROCESS", label: "Process", source: banks.PROCESS },
  { axis: "BRAND_TAGS", label: "Brand tags", source: banks.BRAND_TAGS },
];

/** Every axis the readout reports a resolved count for, in display order. */
const READOUT_AXES: { axis: AxisKey; label: string }[] = [
  { axis: "SUBJECTS", label: "Subjects" },
  { axis: "SUBJECTS_LARGE", label: "Subjects (wide)" },
  { axis: "INFLUENCE", label: "Influences" },
  { axis: "PALETTE", label: "Palette" },
  { axis: "MODIFIERS", label: "Modifiers" },
  { axis: "LEXICON", label: "Lexicon" },
  { axis: "LAYOUT", label: "Layout" },
  { axis: "TEXTURE", label: "Texture" },
  { axis: "PROCESS", label: "Process" },
  { axis: "MODE", label: "Mode" },
  { axis: "FORMAT", label: "Format" },
  { axis: "BRAND_TAGS", label: "Brand tags" },
];

function resolvedCount(resolved: Banks, axis: AxisKey): number {
  const v = (resolved as unknown as Record<string, unknown>)[axis];
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Small shared building blocks (mirror the client's house style)     */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[11px] font-mono uppercase tracking-[0.12em] mb-2"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </div>
  );
}

function MiniInput({
  value,
  onChange,
  placeholder,
  onEnter,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      className="w-full rounded-md border px-2.5 py-1.5 text-sm"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    />
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <Plus size={13} />
      Add
    </button>
  );
}

function MiniSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="flex items-center gap-2 text-xs cursor-pointer select-none"
      style={{ color: "var(--text-secondary)" }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative w-8 h-[18px] rounded-full transition-colors shrink-0"
        style={{
          background: checked ? "var(--accent)" : "var(--bg-elevated)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--border-subtle)"}`,
        }}
      >
        <span
          className="absolute top-[2px] w-3 h-3 rounded-full transition-all"
          style={{
            left: checked ? "calc(100% - 14px)" : "2px",
            background: checked ? "var(--accent-contrast)" : "var(--text-tertiary)",
          }}
        />
      </button>
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Generic AxisEditor                                                 */
/* ------------------------------------------------------------------ */

function AxisEditor({
  meta,
  override,
  onChange,
  resolvedCount: count,
}: {
  meta: AxisMeta;
  override: AxisOverride;
  onChange: (next: AxisOverride) => void;
  resolvedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const disable = override.disable ?? [];
  const replace = override.replace ?? false;
  const disabledSet = useMemo(() => new Set(override.disable ?? []), [override.disable]);

  // add is an array for every axis except INFLUENCE (a keyed record). Normalize
  // to a list of { id, label } for display + removal regardless.
  const addItems = useMemo<{ id: string; label: string }[]>(() => {
    if (meta.record) {
      const rec = (override.add as Record<string, unknown> | undefined) ?? {};
      return Object.entries(rec).map(([k, v]) => ({ id: k, label: meta.addLabel(v) }));
    }
    const arr = (override.add as unknown[] | undefined) ?? [];
    return arr.map((e, i) => ({ id: String(i), label: meta.addLabel(e) }));
  }, [override.add, meta]);
  const addCount = addItems.length;

  const toggleDisable = (key: string) => {
    const next = new Set(disabledSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...override, disable: [...next] });
  };
  const appendAdd = (entry: unknown) => {
    if (meta.record) {
      const rec = { ...((override.add as Record<string, unknown> | undefined) ?? {}) };
      const e = entry as InfluenceEntry;
      const taken = new Set([...Object.keys(rec), ...Object.keys(banks.INFLUENCE)]);
      const base = slug(e.name) || "influence";
      let key = base;
      for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
      rec[key] = e;
      onChange({ ...override, add: rec });
    } else {
      const arr = (override.add as unknown[] | undefined) ?? [];
      onChange({ ...override, add: [...arr, entry] });
    }
  };
  const removeAdd = (id: string) => {
    if (meta.record) {
      const rec = { ...((override.add as Record<string, unknown> | undefined) ?? {}) };
      delete rec[id];
      onChange({ ...override, add: rec });
    } else {
      const arr = (override.add as unknown[] | undefined) ?? [];
      const i = Number(id);
      onChange({ ...override, add: arr.filter((_, j) => j !== i) });
    }
  };

  const editedBadge = addCount > 0 || disable.length > 0 || replace;

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronDown
            size={14}
            style={{
              transform: open ? "rotate(180deg)" : undefined,
              transition: "transform 0.15s",
              color: "var(--text-tertiary)",
            }}
          />
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {meta.label}
          </span>
          {editedBadge && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-mono rounded"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              edited
            </span>
          )}
        </span>
        <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: "var(--text-tertiary)" }}>
          {count} live
        </span>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <MiniSwitch
              checked={replace}
              onChange={(v) => onChange({ ...override, replace: v })}
              label="Replace (use only my entries, ignore defaults)"
            />
            {editedBadge && (
              <button
                type="button"
                onClick={() => onChange({})}
                className="inline-flex items-center gap-1 text-[11px] font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                <RotateCcw size={11} /> reset axis
              </button>
            )}
          </div>

          {/* Add form */}
          <div className="mb-3">{meta.renderAddForm(appendAdd)}</div>

          {/* User-added entries */}
          {addCount > 0 && (
            <div className="mb-3">
              <FieldLabel>Added ({addCount})</FieldLabel>
              <ul className="flex flex-wrap gap-1.5">
                {addItems.map((item) => (
                  <li
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    <span className="truncate max-w-[240px]">{item.label}</span>
                    <button type="button" aria-label="Remove entry" onClick={() => removeAdd(item.id)}>
                      <X size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Default entries with disable toggles */}
          <FieldLabel>
            Defaults ({meta.defaults.length})
            {replace && " — ignored while Replace is on"}
          </FieldLabel>
          <ul
            className="max-h-56 overflow-y-auto rounded border divide-y"
            style={{
              borderColor: "var(--border-subtle)",
              opacity: replace ? 0.45 : 1,
            }}
          >
            {meta.defaults.map((d) => {
              const off = disabledSet.has(d.key);
              return (
                <li
                  key={d.key}
                  className="flex items-center justify-between gap-3 px-2.5 py-1.5"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <span
                    className="text-[12px] font-mono truncate"
                    style={{
                      color: off ? "var(--text-tertiary)" : "var(--text-secondary)",
                      textDecoration: off ? "line-through" : undefined,
                    }}
                  >
                    {d.label}
                  </span>
                  <MiniSwitch
                    checked={!off}
                    onChange={() => toggleDisable(d.key)}
                    label={off ? `Enable ${d.label}` : `Disable ${d.label}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add-form builders                                                  */
/* ------------------------------------------------------------------ */

function StringAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [v, setV] = useState("");
  const commit = () => {
    const t = v.trim();
    if (!t) return;
    onAdd(t);
    setV("");
  };
  return (
    <div className="flex gap-2">
      <MiniInput value={v} onChange={setV} onEnter={commit} placeholder="add an entry…" ariaLabel="New entry" />
      <AddButton onClick={commit} label="Add entry" />
    </div>
  );
}

function makeStringMeta(axis: AxisKey, label: string, source: string[]): AxisMeta {
  return {
    axis,
    label,
    defaults: source.map((s) => ({ key: s, label: s })),
    renderAddForm: (onAdd) => <StringAddForm onAdd={onAdd} />,
    addLabel: (e) => String(e),
  };
}

function SubjectsAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const commit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({
      text: t,
      tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
    });
    setText("");
    setTags("");
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MiniInput value={text} onChange={setText} onEnter={commit} placeholder="subject text…" ariaLabel="Subject text" />
        <MiniInput value={tags} onChange={setTags} onEnter={commit} placeholder="tags (comma-separated)" ariaLabel="Subject tags" />
      </div>
      <AddButton onClick={commit} label="Add subject" />
    </div>
  );
}

function PaletteAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const commit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({ text: t, category: category.trim() || "custom" });
    setText("");
    setCategory("");
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MiniInput value={text} onChange={setText} onEnter={commit} placeholder="palette phrase…" ariaLabel="Palette text" />
        <MiniInput value={category} onChange={setCategory} onEnter={commit} placeholder="category (e.g. jewel)" ariaLabel="Palette category" />
      </div>
      <AddButton onClick={commit} label="Add palette" />
    </div>
  );
}

function ModeAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [phrase, setPhrase] = useState("");
  const [look, setLook] = useState("");
  const [ar, setAr] = useState("4:5");
  const commit = () => {
    const p = phrase.trim();
    if (!p) return;
    onAdd({ phrase: p, look: look.trim(), ar: ar.trim() || "4:5" });
    setPhrase("");
    setLook("");
    setAr("4:5");
  };
  return (
    <div className="space-y-2">
      <MiniInput value={phrase} onChange={setPhrase} onEnter={commit} placeholder="mode phrase…" ariaLabel="Mode phrase" />
      <MiniInput value={look} onChange={setLook} onEnter={commit} placeholder="look description…" ariaLabel="Mode look" />
      <div className="flex gap-2">
        <MiniInput value={ar} onChange={setAr} onEnter={commit} placeholder="ar (e.g. 4:5)" ariaLabel="Mode aspect ratio" />
        <AddButton onClick={commit} label="Add mode" />
      </div>
    </div>
  );
}

function FormatAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [phrase, setPhrase] = useState("");
  const [ar, setAr] = useState("4:5");
  const commit = () => {
    const p = phrase.trim();
    if (!p) return;
    onAdd({ phrase: p, ar: ar.trim() || "4:5" });
    setPhrase("");
    setAr("4:5");
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MiniInput value={phrase} onChange={setPhrase} onEnter={commit} placeholder="format phrase…" ariaLabel="Format phrase" />
        <MiniInput value={ar} onChange={setAr} onEnter={commit} placeholder="ar (e.g. 4:5)" ariaLabel="Format aspect ratio" />
      </div>
      <AddButton onClick={commit} label="Add format" />
    </div>
  );
}

/** Thin INFLUENCE wrapper: name / domain / move fields (blender.py shape). */
function InfluenceAddForm({ onAdd }: { onAdd: (e: unknown) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [move, setMove] = useState("");
  const commit = () => {
    const n = name.trim();
    if (!n) return;
    const entry: InfluenceEntry = {
      name: n,
      domain: domain.trim() || "custom",
      move: move.trim() || `a ${n}-style composition`,
    };
    onAdd(entry);
    setName("");
    setDomain("");
    setMove("");
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MiniInput value={name} onChange={setName} onEnter={commit} placeholder="name (e.g. FISK)" ariaLabel="Influence name" />
        <MiniInput value={domain} onChange={setDomain} onEnter={commit} placeholder="domain (e.g. typography)" ariaLabel="Influence domain" />
      </div>
      <div className="flex gap-2">
        <MiniInput value={move} onChange={setMove} onEnter={commit} placeholder="signature move / phrase…" ariaLabel="Influence move" />
        <AddButton onClick={commit} label="Add influence" />
      </div>
    </div>
  );
}

function buildAxisMetas(): AxisMeta[] {
  const metas: AxisMeta[] = [];

  metas.push({
    axis: "SUBJECTS",
    label: "Subjects (tagged bank)",
    defaults: banks.SUBJECTS.map((s) => ({ key: s.text, label: s.text })),
    renderAddForm: (onAdd) => <SubjectsAddForm onAdd={onAdd} />,
    addLabel: (e) => (e as { text: string }).text,
  });
  metas.push({
    axis: "INFLUENCE",
    label: "Influences",
    defaults: Object.entries(banks.INFLUENCE).map(([key, v]) => ({
      key,
      label: `${v.name} · ${v.domain}`,
    })),
    renderAddForm: (onAdd) => <InfluenceAddForm onAdd={onAdd} />,
    addLabel: (e) => {
      const v = e as InfluenceEntry;
      return `${v.name} · ${v.domain}`;
    },
    record: true,
  });
  metas.push({
    axis: "PALETTE",
    label: "Palette",
    defaults: banks.PALETTE.map((p) => ({ key: p.text, label: `[${p.category}] ${p.text}` })),
    renderAddForm: (onAdd) => <PaletteAddForm onAdd={onAdd} />,
    addLabel: (e) => {
      const v = e as { text: string; category: string };
      return `[${v.category}] ${v.text}`;
    },
  });
  metas.push({
    axis: "MODE",
    label: "Mode",
    defaults: banks.MODE.map((m) => ({ key: m.phrase, label: m.phrase })),
    renderAddForm: (onAdd) => <ModeAddForm onAdd={onAdd} />,
    addLabel: (e) => (e as { phrase: string }).phrase,
  });
  metas.push({
    axis: "FORMAT",
    label: "Format",
    defaults: banks.FORMAT.map((f) => ({ key: f.phrase, label: f.phrase })),
    renderAddForm: (onAdd) => <FormatAddForm onAdd={onAdd} />,
    addLabel: (e) => (e as { phrase: string }).phrase,
  });
  for (const { axis, label, source } of STRING_AXES) {
    metas.push(makeStringMeta(axis, label, source));
  }
  return metas;
}

/* ------------------------------------------------------------------ */
/* Custom-theme builder                                               */
/* ------------------------------------------------------------------ */

function ThemeBuilder({
  themes,
  onChange,
}: {
  themes: CustomThemes;
  onChange: (next: CustomThemes) => void;
}) {
  const recipeKeys = useMemo(() => Object.keys(banks.RECIPES), []);
  const [name, setName] = useState("");
  const [recipes, setRecipes] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<"SUBJECTS" | "SUBJECTS_LARGE">("SUBJECTS_LARGE");
  const [branded, setBranded] = useState(false);
  const [coverage, setCoverage] = useState(true);
  const [modifiers, setModifiers] = useState(false);
  const [markStyle, setMarkStyle] = useState("wordmark");
  const [srefMode, setSrefMode] = useState<"none" | "museum" | "random-stacked">("none");
  const [err, setErr] = useState<string | null>(null);

  const toggleRecipe = (r: string) =>
    setRecipes((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const save = () => {
    const key = name.trim();
    if (!key) {
      setErr("Give the theme a name.");
      return;
    }
    if (recipes.length === 0) {
      setErr("Pick at least one recipe.");
      return;
    }
    const def: ThemeDef = {
      recipes,
      lexicon: branded ? "LEXICON" : null,
      subjects,
      influenceDomain: null,
      srefMode: srefMode === "none" ? null : srefMode,
      coverage,
      modifiers,
      markStyle: branded ? markStyle : "flat",
    };
    onChange({ ...themes, [key]: def });
    setName("");
    setRecipes([]);
    setErr(null);
  };

  const remove = (key: string) => {
    const next = { ...themes };
    delete next[key];
    onChange(next);
  };

  const existing = Object.keys(themes);

  return (
    <div
      className="rounded-lg border p-3.5"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
    >
      <FieldLabel>Custom theme builder</FieldLabel>
      <p className="text-[11px] mb-3" style={{ color: "var(--text-tertiary)" }}>
        A theme bundles recipes, a subject bank, and a few flags. Saved themes join
        the theme picker above and roll with your custom banks.
      </p>

      {existing.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-3">
          {existing.map((k) => (
            <li
              key={k}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {k} · {themes[k].recipes.length} recipes
              <button type="button" aria-label={`Delete theme ${k}`} onClick={() => remove(k)}>
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        <MiniInput value={name} onChange={setName} placeholder="theme name…" ariaLabel="Theme name" />

        <div>
          <FieldLabel>Recipes</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {recipeKeys.map((r) => {
              const on = recipes.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRecipe(r)}
                  className="px-2.5 py-1 rounded-full text-xs font-mono border transition-colors"
                  style={{
                    background: on ? "var(--accent-muted)" : "var(--bg-elevated)",
                    borderColor: on ? "var(--accent)" : "var(--border-subtle)",
                    color: on ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Subject bank
            <select
              value={subjects}
              onChange={(e) => setSubjects(e.target.value as "SUBJECTS" | "SUBJECTS_LARGE")}
              className="rounded-md border px-2 py-1 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="SUBJECTS">SUBJECTS (tagged)</option>
              <option value="SUBJECTS_LARGE">SUBJECTS_LARGE (wide)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Style refs
            <select
              value={srefMode}
              onChange={(e) => setSrefMode(e.target.value as "none" | "museum" | "random-stacked")}
              className="rounded-md border px-2 py-1 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="none">none</option>
              <option value="museum">museum</option>
              <option value="random-stacked">random-stacked</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <MiniSwitch checked={branded} onChange={setBranded} label="Branded (uses lexicon + wordmark)" />
          <MiniSwitch checked={coverage} onChange={setCoverage} label="Coverage-guaranteed picks" />
          <MiniSwitch checked={modifiers} onChange={setModifiers} label="Modifiers" />
        </div>

        {branded && (
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Mark style
            <select
              value={markStyle}
              onChange={(e) => setMarkStyle(e.target.value)}
              className="rounded-md border px-2 py-1 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {["wordmark", "sentence"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        {err && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--oxide)" }} role="alert">
            <TriangleAlert size={12} /> {err}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          <Plus size={13} /> Save theme
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live sample preview                                                */
/* ------------------------------------------------------------------ */

function SamplePreview({
  resolved,
  theme,
  recipe,
}: {
  resolved: Banks;
  theme: string;
  recipe: string;
}) {
  const [samples, setSamples] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 900000));

  // Debounced (~300ms) regenerate whenever the config, theme, recipe, or the
  // reroll seed changes — so the effect of an edit is visible immediately.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const th = resolved.THEMES[theme];
        if (!th) {
          setSamples([]);
          setError("Selected theme is unavailable.");
          return;
        }
        const rec = recipe === "wide" ? th.recipes[0] : recipe;
        const out = roll(
          { recipe: rec, n: 3, seed, theme, coverage: th.coverage },
          resolved,
        );
        setSamples(out.map((p) => stripOperatorAnnotations(p.text)));
        setError(null);
      } catch (e) {
        setSamples([]);
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [resolved, theme, recipe, seed]);

  return (
    <div
      className="rounded-lg border p-3.5"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <FieldLabel>Live sample (updates as you edit)</FieldLabel>
        <button
          type="button"
          aria-label="Reroll sample"
          onClick={() => setSeed(1 + Math.floor(Math.random() * 900000))}
          className="inline-flex items-center gap-1 text-[11px] font-mono"
          style={{ color: "var(--text-tertiary)" }}
        >
          <RotateCcw size={11} /> reroll
        </button>
      </div>
      {error ? (
        <p className="text-xs flex items-start gap-1.5" style={{ color: "var(--oxide)" }} role="alert">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : samples.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          No sample yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {samples.map((s, i) => (
            <li
              key={i}
              className="text-[12px] font-mono break-words"
              style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bank-balance readout                                               */
/* ------------------------------------------------------------------ */

function BalanceReadout({ resolved }: { resolved: Banks }) {
  return (
    <div
      className="rounded-lg border p-3.5"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
    >
      <FieldLabel>
        <span className="inline-flex items-center gap-1.5">
          <Scale size={12} /> Bank balance (resolved entry counts)
        </span>
      </FieldLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {READOUT_AXES.map(({ axis, label }) => {
          const n = resolvedCount(resolved, axis);
          const starved = n === 0;
          return (
            <div
              key={axis}
              className="flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
              style={{
                borderColor: starved ? "var(--oxide)" : "var(--border-subtle)",
                background: "var(--bg-surface)",
              }}
            >
              <span className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                {label}
              </span>
              <span
                className="text-[12px] font-mono tabular-nums shrink-0"
                style={{ color: starved ? "var(--oxide)" : "var(--text-primary)" }}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customize drawer (top-level)                                       */
/* ------------------------------------------------------------------ */

export function CustomizeDrawer({
  customBanks,
  setCustomBanks,
  resolved,
  theme,
  recipe,
}: {
  customBanks: CustomBanks;
  setCustomBanks: (next: CustomBanks) => void;
  resolved: Banks;
  theme: string;
  recipe: string;
}) {
  const [open, setOpen] = useState(false);
  const [packName, setPackName] = useState("my-taste");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const metas = useMemo(() => buildAxisMetas(), []);
  const themes = getThemes(customBanks);
  const dirty = Object.keys(customBanks).length > 0;

  const applyPreset = (which: string) => {
    if (which === "edgeless-default") setCustomBanks(EDGELESS_DEFAULT);
    else if (which === "blank-canvas") setCustomBanks(BLANK_CANVAS);
    setImportWarnings([]);
    setImportErrors([]);
    setImportNote(null);
  };

  const exportPack = () => {
    const safe = (packName.trim() || "taste").replace(/[^\w.-]+/g, "-");
    const blob = new Blob([JSON.stringify(customBanks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.tastepack.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    setImportWarnings([]);
    setImportErrors([]);
    setImportNote(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportErrors(["File is not valid JSON."]);
      return;
    }
    const res = validateTastePack(parsed);
    if (!res.ok) {
      setImportErrors(res.errors.length ? res.errors : ["Taste pack is not usable."]);
      return;
    }
    // Warnings are degenerate-but-legal — surface them but still apply.
    const value = (res.value ?? parsed) as CustomBanks;
    setCustomBanks(value);
    setImportWarnings(res.warnings ?? []);
    setImportNote(
      `Imported ${file.name}${res.warnings?.length ? ` (${res.warnings.length} warning${res.warnings.length > 1 ? "s" : ""})` : ""}.`,
    );
  };

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        <Sparkles size={15} />
        Customize banks{dirty ? " (active)" : ""}
        <ChevronDown
          size={14}
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
        />
      </button>

      {open && (
        <div
          className="rounded-xl border p-5 sm:p-6 space-y-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Bring your own taste. Add or disable entries on any axis, build a theme, and
            everything you roll below uses your banks. All local to your browser — nothing
            is uploaded. Export a taste pack to share or back it up.
          </p>

          {/* Presets + taste packs */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel>Preset</FieldLabel>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyPreset(e.target.value);
                  e.currentTarget.value = "";
                }}
                aria-label="Seed a preset"
                className="rounded-md border px-2.5 py-1.5 text-sm"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="">Seed a preset…</option>
                <option value="edgeless-default">Edgeless default</option>
                <option value="blank-canvas">Blank canvas</option>
              </select>
            </div>

            <div>
              <FieldLabel>Taste pack name</FieldLabel>
              <MiniInput value={packName} onChange={setPackName} ariaLabel="Taste pack name" placeholder="my-taste" />
            </div>

            <button
              type="button"
              onClick={exportPack}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <Download size={13} /> Export
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <Upload size={13} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImportFile(f);
                e.target.value = "";
              }}
            />

            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setCustomBanks({});
                  setImportWarnings([]);
                  setImportErrors([]);
                  setImportNote(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}
              >
                <RotateCcw size={13} /> Reset all
              </button>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="text-xs" style={{ color: "var(--oxide)" }} role="alert">
              <div className="flex items-center gap-1.5 mb-1">
                <TriangleAlert size={12} /> Import failed:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {importErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {importNote && (
            <p className="text-xs" style={{ color: "var(--green)" }} role="status">
              {importNote}
            </p>
          )}
          {importWarnings.length > 0 && (
            <div className="text-xs" style={{ color: "var(--oxide)" }} role="status">
              <div className="flex items-center gap-1.5 mb-1">
                <TriangleAlert size={12} /> Applied with warnings:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {importWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Readout + preview */}
          <BalanceReadout resolved={resolved} />
          <SamplePreview resolved={resolved} theme={theme} recipe={recipe} />

          {/* Axis editors */}
          <div>
            <FieldLabel>Axes</FieldLabel>
            <div className="space-y-2">
              {metas.map((meta) => (
                <AxisEditor
                  key={meta.axis}
                  meta={meta}
                  override={getAxis(customBanks, meta.axis)}
                  onChange={(next) => setCustomBanks(setAxis(customBanks, meta.axis, next))}
                  resolvedCount={resolvedCount(resolved, meta.axis)}
                />
              ))}
            </div>
          </div>

          {/* Theme builder */}
          <ThemeBuilder
            themes={themes}
            onChange={(next) => setCustomBanks(setThemes(customBanks, next))}
          />
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* localStorage helpers (used by the client)                          */
/* ------------------------------------------------------------------ */

export const CUSTOM_BANKS_LS_KEY = "el-prompt-engine-custom-banks-v1";

export function loadCustomBanks(): CustomBanks | null {
  try {
    const raw = window.localStorage.getItem(CUSTOM_BANKS_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CustomBanks;
    return null;
  } catch {
    return null;
  }
}

/** Returns false when the write failed (quota/unavailable) so the caller can warn. */
export function saveCustomBanks(cb: CustomBanks): boolean {
  try {
    window.localStorage.setItem(CUSTOM_BANKS_LS_KEY, JSON.stringify(cb));
    return true;
  } catch {
    return false;
  }
}

export { resolveBanks };
