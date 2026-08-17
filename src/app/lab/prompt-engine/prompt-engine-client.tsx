"use client";

/**
 * MJ Prompt-Engine Dashboard — client shell over src/lib/prompt-engine.
 *
 * All generation logic lives in the engine module (frozen API); this component
 * only wires controls → RollOptions, renders results, runs the dedup check
 * against the static corpus snapshot, and handles copy/export/history.
 *
 * Static-export constraints: corpus.json is fetched lazily (small, needed for
 * unburned-seed suggestion + round numbers); srefs.json (~1.2MB) is fetched
 * ONLY when the active theme's sref mode needs it.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  Copy,
  Dices,
  History,
  ListChecks,
  Loader2,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { banks } from "@/lib/prompt-engine/banks";
import { roll } from "@/lib/prompt-engine/engine";
import type {
  DedupeResult,
  GeneratedPrompt,
  RollOptions,
  SrefIndex,
} from "@/lib/prompt-engine/types";
import { buildSrefIndex } from "@/lib/prompt-engine/sref";
import { checkBatch } from "@/lib/prompt-engine/dedupe";
import { formatRoundBlock, nextRound } from "@/lib/prompt-engine/round";

const { THEMES, INFLUENCE, PALETTE } = banks;

const THEME_INFO: Record<string, { label: string; blurb: string }> = {
  "nous-branded": {
    label: "Nous Branded",
    blurb: "Wordmark-forward brand posters — lexicon, print processes, restrained palettes.",
  },
  "art-history-madlib": {
    label: "Art-History Madlib",
    blurb: "Real museum artworks as style refs, crossed with a wide subject bank.",
  },
  "colorist-typography": {
    label: "Colorist Typography",
    blurb: "Color-first type studies — esoteric, music, and typography influences.",
  },
  "off-brief-random": {
    label: "Off-Brief Random",
    blurb: "Anything goes — stacked random srefs, wide subjects, zero brand rules.",
  },
};

function themeLabel(key: string): string {
  return THEME_INFO[key]?.label ?? key.replace(/-/g, " ");
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface Corpus {
  prompts: string[];
  burnedSeeds: number[];
  maxRound: number;
  generatedAt: string;
}

type SrefPoolChoice = "default" | "single" | "varied";
type GirlChoice = "auto" | "off" | "on";

interface Settings {
  theme: string;
  recipe: string; // "wide" or a recipe key
  count: number;
  maxSaturatedShare: number; // >= 1 → off (undefined to engine)
  srefPool: SrefPoolChoice;
  coverage: boolean;
  texture: boolean;
  markStyle: string; // branded theme only
  lockInfluence: string | null; // INFLUENCE key
  lockPalette: string | null; // palette text
  girl: GirlChoice;
  /** Engine contract (blender.py --girl-rate N): INTEGER "every Nth prompt". */
  girlRate: number;
}

interface StoredPrompt {
  text: string;
  meta: GeneratedPrompt["meta"];
}

interface HistoryEntry {
  id: string;
  at: string;
  settings: Settings;
  seed: number;
  seedsUsed: number[];
  prompts: StoredPrompt[];
  dedupe: DedupeResult[];
}

const LS_KEY = "el-prompt-engine-history-v1";
const HISTORY_MAX = 20;
const DEFAULT_THEME = Object.keys(THEMES)[0] ?? "nous-branded";

const defaultSettings = (theme: string): Settings => ({
  theme,
  recipe: "wide",
  count: 24,
  maxSaturatedShare: 0.35,
  srefPool: "default",
  coverage: true, // house default: coverage-guaranteed picking ON
  texture: true,
  markStyle: THEMES[theme]?.markStyle ?? "wordmark",
  lockInfluence: null,
  lockPalette: null,
  girl: "auto",
  girlRate: 4, // every 4th prompt (~25%)
});

/**
 * The engine takes an INTEGER "every Nth prompt" girl rate (blender.py
 * --girl-rate N). Early history entries stored a 0..1 fraction; normalize
 * anything restored from storage so a legacy 0.25 becomes "every 4th".
 */
function normalizeGirlRate(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return 4;
  if (v >= 1) return Math.round(v);
  return Math.max(1, Math.round(1 / v));
}

/** Legacy history entries could hold markStyle "none"/"quiet" as mark styles. */
function normalizeSettings(s: Settings): Settings {
  return {
    ...s,
    girlRate: normalizeGirlRate(s.girlRate),
    markStyle: s.markStyle === "none" ? "wordmark" : s.markStyle,
  };
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

function randomSeed(burned: Set<number>): number {
  for (let i = 0; i < 50; i++) {
    const s = 1 + Math.floor(Math.random() * 999_999);
    if (!burned.has(s)) return s;
  }
  return 1 + Math.floor(Math.random() * 999_999);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older/insecure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function PromptEngineClient() {
  const [settings, setSettings] = useState<Settings>(() =>
    defaultSettings(DEFAULT_THEME),
  );
  const [seed, setSeed] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<StoredPrompt[]>([]);
  const [dedupe, setDedupe] = useState<DedupeResult[]>([]);
  const [seedsUsed, setSeedsUsed] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [srefNotice, setSrefNotice] = useState<string | null>(null);
  const [includeDupes, setIncludeDupes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRound, setCopiedRound] = useState(false);
  const [influenceQuery, setInfluenceQuery] = useState("");

  const corpusRef = useRef<Corpus | null>(null);
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const srefIndexRef = useRef<SrefIndex | null>(null);
  const srefFailedRef = useRef(false);
  const [srefReady, setSrefReady] = useState(false);

  const theme = THEMES[settings.theme];
  const isBranded = theme?.markStyle === "wordmark";
  const needsSrefs = theme?.srefMode != null;

  /* ------------------------- corpus (small, fetched once) ---------- */

  const loadCorpus = useCallback(async (): Promise<Corpus | null> => {
    if (corpusRef.current) return corpusRef.current;
    try {
      const res = await fetch("/prompt-engine/corpus.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Corpus;
      // check_dupes.corpus() historically yielded seeds as lexicographically
      // sorted STRINGS; the exporter now emits numbers, but coerce + sort
      // defensively so burnedSet.has(numericSeed) and the running ledger stay
      // correct even against a stale corpus.json.
      data.burnedSeeds = (data.burnedSeeds ?? [])
        .map(Number)
        .filter((s) => Number.isFinite(s))
        .sort((a, b) => a - b);
      corpusRef.current = data;
      setCorpus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // Seed suggestion + history restore happen post-mount only (avoids any
  // SSR/hydration mismatch from Math.random or localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Restore history first (await a microtask so setState stays async).
      await Promise.resolve();
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as HistoryEntry[];
          if (Array.isArray(parsed)) setHistory(parsed.slice(0, HISTORY_MAX));
        }
      } catch {
        setStorageNotice("Saved history could not be read — starting fresh.");
      }
      const c = await loadCorpus();
      if (cancelled) return;
      const burned = new Set(c?.burnedSeeds ?? []);
      setSeed((prev) => prev ?? randomSeed(burned));
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCorpus]);

  const burnedSet = useMemo(
    () => new Set(corpus?.burnedSeeds ?? []),
    [corpus],
  );

  /* ------------------------- srefs (1.2MB, lazy) ------------------- */

  const loadSrefIndex = useCallback(async () => {
    if (srefIndexRef.current || srefFailedRef.current)
      return srefIndexRef.current;
    try {
      const res = await fetch("/prompt-engine/srefs.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { refs: unknown[] };
      srefIndexRef.current = buildSrefIndex(
        data.refs as Parameters<typeof buildSrefIndex>[0],
      );
      setSrefReady(true);
      return srefIndexRef.current;
    } catch {
      srefFailedRef.current = true;
      return null;
    }
  }, []);

  /* ------------------------- generation ---------------------------- */

  const persistHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries);
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(entries));
      setStorageNotice(null);
    } catch {
      // Quota exceeded or storage unavailable — degrade to in-memory only.
      setStorageNotice(
        "Could not save to browser storage (quota?) — history is session-only.",
      );
    }
  }, []);

  const generate = useCallback(async () => {
    if (seed == null || generating) return;
    setGenerating(true);
    setGenError(null);
    setSrefNotice(null);
    try {
      const th = THEMES[settings.theme];
      const recipes =
        settings.recipe === "wide" ? th.recipes : [settings.recipe];

      // Museum/random-stacked themes need the sref index — lazy fetch now.
      let srefIndex: SrefIndex | null = null;
      if (th.srefMode != null) {
        srefIndex = await loadSrefIndex();
        if (!srefIndex) {
          setSrefNotice(
            "Museum reference pack unavailable — generating without --sref image refs. " +
              "(Refs are best-effort anyway: AIC URLs are deprioritized due to 403s and safe-flags are approximate.)",
          );
        }
      }

      const srefCountPool =
        settings.srefPool === "single"
          ? [2]
          : settings.srefPool === "varied"
            ? [1, 2, 2, 3]
            : undefined;

      const lock: Record<string, string> = {};
      if (settings.lockInfluence) lock.influence = settings.lockInfluence;
      if (settings.lockPalette) lock.palette = settings.lockPalette;

      // Roll-wide: spread the batch across every recipe in the theme, one
      // engine roll per recipe with its own derived seed so the
      // coverage-guaranteed picker walks a different slice of each bank.
      const per = Math.floor(settings.count / recipes.length);
      const extra = settings.count % recipes.length;
      const rolled: GeneratedPrompt[] = [];
      const used: number[] = [];
      recipes.forEach((recipe, i) => {
        const n = per + (i < extra ? 1 : 0);
        if (n <= 0) return;
        const s = seed + i;
        used.push(s);
        const opts: RollOptions = {
          recipe,
          n,
          seed: s,
          theme: settings.theme,
          coverage: settings.coverage,
          texture: settings.texture,
          ...(Object.keys(lock).length ? { lock } : {}),
          ...(settings.maxSaturatedShare < 1
            ? { maxSaturatedShare: settings.maxSaturatedShare }
            : {}),
          ...(srefCountPool ? { srefCountPool } : {}),
          // "quiet" is NOT a mark style in the engine — it's the separate
          // opts.quiet boolean (blender.py --quiet); markStyle only
          // special-cases "sentence", everything else renders the wordmark.
          ...(isBranded
            ? settings.markStyle === "quiet"
              ? { quiet: true }
              : { markStyle: settings.markStyle }
            : {}),
          ...(settings.girl === "off"
            ? { girlRate: 0 }
            : settings.girl === "on"
              ? { girlRate: normalizeGirlRate(settings.girlRate) }
              : {}),
          ...(th.srefMode != null ? { srefIndex } : {}),
        };
        rolled.push(...roll(opts));
      });

      const c = await loadCorpus();
      const results: DedupeResult[] = c
        ? checkBatch(
            rolled.map((p) => p.text),
            c.prompts,
          )
        : rolled.map(() => ({ status: "ok" as const, bestRatio: 0 }));

      const stored = rolled.map((p) => ({ text: p.text, meta: p.meta }));
      setPrompts(stored);
      setDedupe(results);
      setSeedsUsed(used);
      setIncludeDupes(false);

      const entry: HistoryEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        settings: { ...settings },
        seed,
        seedsUsed: used,
        prompts: stored,
        dedupe: results,
      };
      persistHistory([entry, ...history].slice(0, HISTORY_MAX));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [
    seed,
    generating,
    settings,
    isBranded,
    history,
    loadCorpus,
    loadSrefIndex,
    persistHistory,
  ]);

  /* ------------------------- derived ------------------------------- */

  const flaggedCount = dedupe.filter((d) => d.status !== "ok").length;
  const includedPrompts = useMemo(
    () =>
      prompts.filter(
        (_, i) => includeDupes || (dedupe[i]?.status ?? "ok") === "ok",
      ),
    [prompts, dedupe, includeDupes],
  );

  const copyAll = useCallback(async () => {
    if (!includedPrompts.length) return;
    const ok = await copyText(includedPrompts.map((p) => p.text).join("\n"));
    if (ok) {
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1800);
    }
  }, [includedPrompts]);

  const copyRoundBlock = useCallback(async () => {
    if (!includedPrompts.length) return;
    const c = corpusRef.current;
    const roundNumber = nextRound(c?.maxRound ?? 0);
    const th = settings.theme;
    const recipeDesc =
      settings.recipe === "wide"
        ? `roll-wide across ${THEMES[th].recipes.join("/")}`
        : `recipe=${settings.recipe}`;
    const bits = [
      `dashboard roll — theme=${th}`,
      recipeDesc,
      `n=${includedPrompts.length}${flaggedCount && !includeDupes ? ` (${flaggedCount} dupes dropped)` : ""}`,
      `coverage ${settings.coverage ? "on" : "off"}`,
      settings.maxSaturatedShare < 1
        ? `maxSat=${settings.maxSaturatedShare.toFixed(2)}`
        : null,
      settings.srefPool !== "default"
        ? `srefPool=${settings.srefPool === "single" ? "[2]" : "[1,2,2,3]"}`
        : null,
    ].filter(Boolean);
    // Ledger convention in fun-exploration-prompts.txt: numeric ascending,
    // no repeats (burnedSeeds are already coerced to numbers in loadCorpus).
    const ledger = Array.from(
      new Set([...(c?.burnedSeeds ?? []), ...seedsUsed]),
    ).sort((a, b) => a - b);
    const block = formatRoundBlock(includedPrompts as GeneratedPrompt[], {
      roundNumber,
      seedsUsed,
      headerNote: bits.join(", "),
      runningLedger: ledger,
    });
    const ok = await copyText(block);
    if (ok) {
      setCopiedRound(true);
      window.setTimeout(() => setCopiedRound(false), 1800);
    }
  }, [includedPrompts, settings, seedsUsed, flaggedCount, includeDupes]);

  const restoreEntry = useCallback((entry: HistoryEntry) => {
    setSettings(normalizeSettings(entry.settings));
    setSeed(entry.seed);
    setPrompts(entry.prompts);
    setDedupe(entry.dedupe);
    setSeedsUsed(entry.seedsUsed);
    setIncludeDupes(false);
    setShowHistory(false);
  }, []);

  const deleteEntry = useCallback(
    (id: string) => {
      persistHistory(history.filter((h) => h.id !== id));
    },
    [history, persistHistory],
  );

  const setTheme = useCallback((key: string) => {
    setSettings((prev) => ({
      ...defaultSettings(key),
      // keep batch-shape prefs across theme switches
      count: prev.count,
      maxSaturatedShare: prev.maxSaturatedShare,
      texture: prev.texture,
    }));
    setInfluenceQuery("");
  }, []);

  const influenceMatches = useMemo(() => {
    const q = influenceQuery.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(INFLUENCE)
      .filter(
        ([key, v]) =>
          key.includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.domain.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [influenceQuery]);

  /* ------------------------- render -------------------------------- */

  return (
    <div>
      {/* ============================ Controls ======================== */}
      <section
        className="rounded-xl border p-5 sm:p-6 mb-8"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Theme cards */}
        <FieldLabel>Theme</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Object.keys(THEMES).map((key) => {
            const active = settings.theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className="text-left rounded-lg border p-3.5 transition-all"
                style={{
                  background: active ? "var(--accent-muted)" : "var(--bg-elevated)",
                  borderColor: active ? "var(--accent)" : "var(--border-subtle)",
                }}
                aria-pressed={active}
              >
                <div
                  className="text-sm font-medium mb-1"
                  style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {themeLabel(key)}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", lineHeight: 1.45 }}
                >
                  {THEME_INFO[key]?.blurb ?? `${THEMES[key].recipes.length} recipes`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Recipe chips */}
        <FieldLabel>Recipes</FieldLabel>
        <div className="flex flex-wrap gap-2 mb-2">
          <Chip
            active={settings.recipe === "wide"}
            onClick={() => setSettings((s) => ({ ...s, recipe: "wide" }))}
          >
            <Sparkles size={12} className="inline -mt-0.5 mr-1" />
            Roll wide — all {theme?.recipes.length ?? 0} recipes
          </Chip>
          {(theme?.recipes ?? []).map((r) => (
            <Chip
              key={r}
              active={settings.recipe === r}
              onClick={() => setSettings((s) => ({ ...s, recipe: r }))}
            >
              {r}
            </Chip>
          ))}
        </div>
        <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
          Wide is the point of this tool: spread the batch across every recipe, then filter —
          don&apos;t hand-pick a narrow lane.
        </p>

        {/* Count / seed row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div>
            <FieldLabel>Batch size — {settings.count}</FieldLabel>
            <input
              type="range"
              min={4}
              max={60}
              step={1}
              value={settings.count}
              onChange={(e) =>
                setSettings((s) => ({ ...s, count: Number(e.target.value) }))
              }
              className="w-full accent-[var(--accent)]"
              aria-label="Batch size"
            />
          </div>

          <div>
            <FieldLabel>
              Seed
              {seed != null && burnedSet.has(seed) && (
                <span className="ml-2" style={{ color: "var(--oxide)" }}>
                  already burned
                </span>
              )}
            </FieldLabel>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed ?? ""}
                onChange={(e) => setSeed(Number(e.target.value) || 0)}
                className="w-full rounded-md border px-2.5 py-1.5 text-sm font-mono"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
                aria-label="Seed"
              />
              <button
                type="button"
                onClick={() => setSeed(randomSeed(burnedSet))}
                title="Suggest a fresh unburned seed"
                className="rounded-md border px-2.5 transition-colors hover:border-[var(--border-hover)]"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <Dices size={16} />
              </button>
            </div>
          </div>

          <div>
            <FieldLabel>
              Palette restraint —{" "}
              {settings.maxSaturatedShare >= 1
                ? "no cap"
                : `≤${Math.round(settings.maxSaturatedShare * 100)}% saturated`}
            </FieldLabel>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.maxSaturatedShare}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maxSaturatedShare: Number(e.target.value),
                }))
              }
              className="w-full accent-[var(--accent)]"
              aria-label="Palette restraint"
            />
            <div
              className="flex justify-between text-[10px] font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>restrained</span>
              <span>saturated</span>
            </div>
          </div>

          <div>
            <FieldLabel>Sref count pool</FieldLabel>
            <div className="flex gap-2">
              {(
                [
                  ["default", "theme"],
                  ["single", "[2]"],
                  ["varied", "[1,2,2,3]"],
                ] as [SrefPoolChoice, string][]
              ).map(([val, label]) => (
                <Chip
                  key={val}
                  active={settings.srefPool === val}
                  disabled={!needsSrefs}
                  onClick={() => setSettings((s) => ({ ...s, srefPool: val }))}
                >
                  {label}
                </Chip>
              ))}
            </div>
            {!needsSrefs && (
              <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                this theme doesn&apos;t use image refs
              </p>
            )}
          </div>
        </div>

        {/* Toggles row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-2">
          <Toggle
            label="Coverage-guaranteed picks"
            checked={settings.coverage}
            onChange={(v) => setSettings((s) => ({ ...s, coverage: v }))}
            hint="every bank entry surfaces evenly — no silent favorites"
          />
          <Toggle
            label="Texture"
            checked={settings.texture}
            onChange={(v) => setSettings((s) => ({ ...s, texture: v }))}
          />
          {isBranded && (
            <label
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Mark style
              <select
                value={settings.markStyle}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, markStyle: e.target.value }))
                }
                className="rounded-md border px-2 py-1 text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {/* "none" is not offered: on a branded theme the engine has no
                    mark-suppression path (it falls through to the wordmark),
                    so offering it would be a silent no-op. "quiet" maps to the
                    engine's opts.quiet boolean, not a mark style. */}
                {["wordmark", "sentence", "quiet"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Advanced
            <ChevronDown
              size={14}
              style={{
                transform: showAdvanced ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s",
              }}
            />
          </button>
        </div>

        {/* Advanced */}
        {showAdvanced && (
          <div
            className="rounded-lg border p-4 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-5"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {/* Lock influence */}
            <div>
              <FieldLabel>Lock influence</FieldLabel>
              {settings.lockInfluence ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {INFLUENCE[settings.lockInfluence]?.name ?? settings.lockInfluence}
                  <button
                    type="button"
                    aria-label="Clear influence lock"
                    onClick={() =>
                      setSettings((s) => ({ ...s, lockInfluence: null }))
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <>
                  <input
                    type="text"
                    value={influenceQuery}
                    onChange={(e) => setInfluenceQuery(e.target.value)}
                    placeholder="search 97 influences…"
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  {influenceMatches.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {influenceMatches.map(([key, v]) => (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => {
                              setSettings((s) => ({ ...s, lockInfluence: key }));
                              setInfluenceQuery("");
                            }}
                            className="w-full text-left text-xs px-2 py-1 rounded hover:bg-[var(--bg-surface-hover)]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            <span style={{ color: "var(--text-primary)" }}>{v.name}</span>{" "}
                            <span className="font-mono">· {v.domain}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Lock palette */}
            <div>
              <FieldLabel>Lock palette</FieldLabel>
              <select
                value={settings.lockPalette ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    lockPalette: e.target.value || null,
                  }))
                }
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">— any —</option>
                {PALETTE.map((p) => (
                  <option key={p.text} value={p.text}>
                    [{p.category}] {p.text}
                  </option>
                ))}
              </select>
            </div>

            {/* Girl mode */}
            <div>
              <FieldLabel>Girl mode</FieldLabel>
              <div className="flex items-center gap-2 flex-wrap">
                {(["auto", "off", "on"] as GirlChoice[]).map((g) => (
                  <Chip
                    key={g}
                    active={settings.girl === g}
                    onClick={() => setSettings((s) => ({ ...s, girl: g }))}
                  >
                    {g}
                  </Chip>
                ))}
                {settings.girl === "on" && (
                  <span className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {/* Engine contract: integer "every Nth prompt", like
                        blender.py --girl-rate N (NOT a percentage). */}
                    every{" "}
                    {settings.girlRate === 1
                      ? "prompt"
                      : `${ordinal(settings.girlRate)} prompt`}{" "}
                    (~{Math.round(100 / settings.girlRate)}%)
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={settings.girlRate}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          girlRate: Math.max(1, Math.round(Number(e.target.value))),
                        }))
                      }
                      className="w-24 accent-[var(--accent)]"
                      aria-label="Girl rate (every Nth prompt)"
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={generate}
            disabled={generating || seed == null}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {needsSrefs && !srefReady ? "Loading museum refs…" : "Rolling…"}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate {settings.count}
              </>
            )}
          </button>
          {genError && (
            <span className="text-sm" style={{ color: "var(--oxide)" }} role="alert">
              {genError}
            </span>
          )}
        </div>
        {srefNotice && (
          <p className="mt-3 text-xs flex items-start gap-1.5" style={{ color: "var(--oxide)" }}>
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            {srefNotice}
          </p>
        )}
      </section>

      {/* ============================ Results ========================= */}
      {prompts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Batch
              </h2>
              <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {prompts.length} prompts · seeds {seedsUsed.join(", ")}
                {flaggedCount > 0 && (
                  <span style={{ color: "var(--oxide)" }}>
                    {" "}
                    · {flaggedCount} flagged as dupes
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {flaggedCount > 0 && (
                <Toggle
                  label={`include ${flaggedCount} flagged`}
                  checked={includeDupes}
                  onChange={setIncludeDupes}
                />
              )}
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: copiedAll ? "var(--green)" : "var(--text-secondary)",
                }}
              >
                {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                Copy all ({includedPrompts.length})
              </button>
              <button
                type="button"
                onClick={copyRoundBlock}
                title="Copy a [rNN] block pasteable into fun-exploration-prompts.txt"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: copiedRound ? "var(--green)" : "var(--text-secondary)",
                }}
              >
                {copiedRound ? <Check size={13} /> : <ClipboardCopy size={13} />}
                Copy as round block
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {prompts.map((p, i) => (
              <PromptCard
                key={`${p.meta.seed}-${p.meta.index}-${i}`}
                prompt={p}
                dedupe={dedupe[i]}
              />
            ))}
          </div>
        </section>
      )}

      {/* ============================ History ========================= */}
      <section>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          <History size={15} />
          Session history ({history.length})
          <ChevronDown
            size={14}
            style={{
              transform: showHistory ? "rotate(180deg)" : undefined,
              transition: "transform 0.15s",
            }}
          />
        </button>
        {storageNotice && (
          <p className="text-xs mb-2" style={{ color: "var(--oxide)" }}>
            {storageNotice}
          </p>
        )}
        {showHistory &&
          (history.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Nothing yet — generated batches are saved here (in your browser only).
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {themeLabel(h.settings.theme)} ·{" "}
                      {h.settings.recipe === "wide" ? "roll-wide" : h.settings.recipe} ·{" "}
                      {h.prompts.length} prompts
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(h.at).toLocaleString()} · seeds {h.seedsUsed.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => restoreEntry(h)}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--border-hover)]"
                      style={{
                        background: "var(--bg-elevated)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ListChecks size={12} />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(h.id)}
                      aria-label="Delete history entry"
                      className="rounded-md border p-1.5 transition-colors hover:border-[var(--border-hover)]"
                      style={{
                        background: "var(--bg-elevated)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-mono uppercase tracking-[0.12em] mb-2"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="px-3 py-1.5 rounded-full text-xs font-mono border transition-colors disabled:opacity-40"
      style={{
        background: active ? "var(--accent-muted)" : "var(--bg-elevated)",
        borderColor: active ? "var(--accent)" : "var(--border-subtle)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label
      className="flex items-center gap-2 text-sm cursor-pointer select-none"
      style={{ color: "var(--text-secondary)" }}
      title={hint}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative w-8 h-[18px] rounded-full transition-colors"
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

function PromptCard({
  prompt,
  dedupe,
}: {
  prompt: StoredPrompt;
  dedupe?: DedupeResult;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const status = dedupe?.status ?? "ok";
  const flagged = status !== "ok";

  const onCopy = async () => {
    const ok = await copyText(prompt.text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const chips: string[] = [
    prompt.meta.recipe,
    prompt.meta.influenceName ?? undefined,
    prompt.meta.paletteCategory ? `palette:${prompt.meta.paletteCategory}` : undefined,
    prompt.meta.ar ? `ar ${prompt.meta.ar}` : undefined,
    prompt.meta.girl ? "girl" : undefined,
  ].filter((c): c is string => Boolean(c));

  return (
    <div
      data-prompt-card
      className="rounded-lg border p-3.5 flex flex-col gap-2.5"
      style={{
        background: "var(--bg-surface)",
        borderColor: flagged ? "var(--oxide)" : "var(--border-subtle)",
        opacity: flagged ? 0.85 : 1,
      }}
    >
      <p
        className="text-[13px] font-mono break-words"
        style={{ color: "var(--text-primary)", lineHeight: 1.55 }}
      >
        {prompt.text}
      </p>

      {flagged && (
        <div className="text-[11px] font-mono" style={{ color: "var(--oxide)" }}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1"
          >
            <TriangleAlert size={11} />
            {status === "exact" ? "exact duplicate" : "near-duplicate"}
            {dedupe && dedupe.bestRatio > 0 && ` · ${dedupe.bestRatio.toFixed(2)}`}
            <ChevronDown
              size={11}
              style={{ transform: expanded ? "rotate(180deg)" : undefined }}
            />
          </button>
          {expanded && dedupe?.closest && (
            <p
              className="mt-1.5 pl-4 break-words"
              style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}
            >
              closest logged prompt: {dedupe.closest}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {chips.map((c) => (
            <span
              key={c}
              className="px-1.5 py-0.5 text-[10px] font-mono rounded truncate max-w-[160px]"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {c}
            </span>
          ))}
        </div>
        <button
          type="button"
          data-copy-prompt
          onClick={onCopy}
          aria-label="Copy prompt"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-mono transition-colors hover:border-[var(--border-hover)]"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: copied ? "var(--green)" : "var(--text-secondary)",
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
