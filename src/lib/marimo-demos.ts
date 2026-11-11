import fs from "node:fs";
import path from "node:path";

export interface MarimoDemo {
  slug: string;
  title: string;
  description: string;
  published_url?: string | null;
  category: "Finance/GPU" | "Generative" | "Algorithms" | "Reactive" | "Research" | "AI evaluation" | "AI training";
  tags: string[];
}

/**
 * One JSON file per notebook entry: `src/lib/marimo-entries/<slug>.json`.
 *
 * Parallel publish lanes used to append object literals to a single array in
 * this module. Two lanes touching the same file conflict, and a hand conflict
 * resolution silently dropped entries and shipped a red main. With one file per
 * notebook, two lanes adding different notebooks never touch the same path, so
 * the merge is conflict-free and no hand resolution can delete a neighbour.
 *
 * Collected order is sorted filename order, so it is deterministic and does not
 * depend on which branch merged first.
 */
export const MARIMO_ENTRIES_DIR = path.join(process.cwd(), "src/lib/marimo-entries");

/** Collect every `*.json` entry in a directory. Throws on a slug/filename mismatch. */
export function loadMarimoDemos(entriesDir: string = MARIMO_ENTRIES_DIR): MarimoDemo[] {
  let filenames: string[];
  try {
    filenames = fs.readdirSync(entriesDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return filenames
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const entry = JSON.parse(fs.readFileSync(path.join(entriesDir, name), "utf8")) as MarimoDemo;
      // The filename IS the slug: a registry file that disagrees with itself is
      // how a card came to advertise a URL that no longer existed.
      if (`${entry.slug}.json` !== name) {
        throw new Error(`Marimo entry ${name} must be named after its slug (${entry.slug}.json)`);
      }
      return entry;
    });
}

// A published URL is written only after live verification. Unpublished records
// stay in the directory for restoration, but a runnable URL is never inferred
// from a slug.
export const marimoDemos: MarimoDemo[] = loadMarimoDemos();
export type PublishedMarimoDemo = MarimoDemo & { published_url: string };
export const publishedMarimoDemos = marimoDemos.filter(
  (demo): demo is PublishedMarimoDemo => Boolean(demo.published_url),
);

export const marimoCategories: MarimoDemo["category"][] = [
  "Finance/GPU",
  "Generative",
  "Algorithms",
  "Reactive",
  "Research",
  "AI evaluation",
  "AI training",
];
