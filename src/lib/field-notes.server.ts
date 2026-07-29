import "server-only";

import fs from "node:fs";
import path from "node:path";
import { creativeDemos } from "@/lib/creative-demos";
import type { FieldNote } from "@/lib/field-note-types";

const LEGACY_TAG_DATA = `
glassmorphism-data-atlas|Data visualization
generative-editorial-topography|Generative
acoustic-cartography|Data visualization
mathematical-specimen|Science
morphogenesis-dial|Simulation
morphogenic-hero|Simulation
turing-braille|Simulation
flow-field-particle-ecosystem|Flow field
flow-field-calligraphy|Flow field
phonetic-flow-field|Flow field
luminous-cartography|Generative
lunar-flow-cartography|Generative
current-atlas|Data visualization
specimen-as-galaxy|Science
coral-specimen|Science
algorithmic-fluid-plotter|Plotter
segregation-engine|Simulation
difference-flows|Generative
telemetry-jelly-terminal|Data visualization
living-globs|Simulation
punctuation-planetarium|Generative
tessellated-swarm-letterform|Swarm
luxury-procedural-product|Generative
demo-fractal-type|Science
mondrian-time-grid|Generative
elastic-feedback-stage|Generative
variable-font-synapse|Typography
alphabet-glacier|Typography
rorschach-type|Typography
synesthetic-math-grid|Science
generative-token-forge|Generative
css-grid-dreams|Generative
tartan-weave-synth|Textile
topographic-ascii|Data visualization
sashiko-weather|Data visualization
parametric-type-wave|Plotter
manifest-cloth|Textile
serial-permutation-canvas|Systems
postcard-matrix|Data visualization
driving-wheel|Generative
dalang-shadow-grid|Simulation
fluid-font-gauntlet|Typography
sedimentary-kinetic-type|Typography
harmonograph-lissajous|Science plot
phyllotaxis-vogel|Science plot
euclidean-toussaint|Science plot
hilbert-curve|Science plot
lsystem-lindenmayer|Science plot
rule30-wolfram|Science plot
truchet-smith|Science plot
gray-scott-munafo|Science plot
labyrinth-chaos|Science plot
`;

const LEGACY_TAGS = new Map(
  LEGACY_TAG_DATA.trim().split("\n").map((line) => {
    const [slug, category] = line.split("|");
    return [slug, category] as const;
  })
);

const FEATURED = new Set([
  "flow-field-particle-ecosystem",
  "tartan-weave-synth",
  "harmonograph-lissajous",
  "serial-permutation-canvas",
  "algorithmic-fluid-plotter",
  "generative-editorial-topography",
]);

const explicitBySlug = new Map(creativeDemos.map((demo) => [demo.slug, demo]));

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8212;|&mdash;/g, "-");
}

function textFrom(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1] ? decodeEntities(match[1].replace(/\s+/g, " ").trim()) : undefined;
}

function humanize(slug: string): string {
  return slug
    .replace(/^demo-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTitle(value: string): string {
  return value.replace(/\s*\u2014\s*/g, ": ").replace(/\s+/g, " ").trim();
}

function normalizeProse(value: string): string {
  return value.replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim();
}

function titleFrom(html: string, slug: string): string {
  const raw = textFrom(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? humanize(slug);
  return normalizeTitle(
    raw
    .replace(/\s*(?:\u2014|\||-)\s*Edgeless Lab.*$/i, "")
    .replace(/\s*(?:\u2014|\||-)\s*Field Notes.*$/i, "")
  );
}

function descriptionFrom(html: string, title: string): string {
  const nameFirst = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=(["'])([\s\S]*?)\1[^>]*>/i
  );
  const contentFirst = html.match(
    /<meta[^>]+content=(["'])([\s\S]*?)\1[^>]+name=["']description["'][^>]*>/i
  );
  const raw = nameFirst?.[2] ?? contentFirst?.[2];

  return raw
    ? normalizeProse(decodeEntities(raw))
    : `${title} is an interactive study from the Edgeless Lab archive.`;
}

function categoryFrom(slug: string, html: string, tags: string[]): string {
  const legacy = LEGACY_TAGS.get(slug);
  if (legacy) return legacy;

  const haystack = `${slug} ${tags.join(" ")} ${html.slice(0, 1800)}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/plotter|plottable|svg export/, "Plotter"],
    [/type|typograph|glyph|letter|font|ascii|braille/, "Typography"],
    [/swarm|agent|ecosystem/, "Swarm"],
    [/flow.field|vector.field|current/, "Flow field"],
    [/data.viz|atlas|telemetry|chart|ledger/, "Data visualization"],
    [/cellular|reaction.diffusion|turing|simulation|physics|morphogen/, "Simulation"],
    [/textile|tartan|sashiko|weav|cloth|embroider/, "Textile"],
    [/audio|sound|percuss|harmonic|rhythm/, "Sound"],
    [/science|math|fractal|algorithm/, "Science"],
  ];

  return rules.find(([pattern]) => pattern.test(haystack))?.[1] ?? "Generative";
}

function tagsFrom(category: string, tags: string[], slug: string): string[] {
  const broad = tags
    .filter((tag) => !["p5.js", "Canvas 2D", "Interactive", "Generative"].includes(tag))
    .map((tag) => tag.replace("Agent-Based", "Agents"));

  const inferred = [
    category,
    ...broad,
    ...(slug.includes("scroll") ? ["Scroll"] : []),
    ...(slug.includes("webgl") || slug.includes("3d") ? ["WebGL"] : []),
  ];

  return Array.from(new Set(inferred)).slice(0, 3);
}

export function getFieldNotes(): FieldNote[] {
  const root = path.join(process.cwd(), "public", "creative-demos");
  const slugs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(root, slug, "index.html")));

  return slugs
    .map((slug): FieldNote => {
      const directory = path.join(root, slug);
      const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
      const explicit = explicitBySlug.get(slug);
      const title = normalizeTitle(explicit?.title ?? titleFrom(html, slug));
      const description = normalizeProse(
        explicit?.description ?? descriptionFrom(html, title)
      );
      const category = categoryFrom(slug, html, explicit?.tags ?? []);
      const citedPlot = fs.existsSync(path.join(directory, "plot.svg"));

      return {
        slug,
        title,
        description,
        category,
        tags: tagsFrom(category, explicit?.tags ?? [], slug),
        published: explicit?.date,
        hasControls:
          explicit?.hasControls ??
          /input|select|button|controls|dat\.gui|lil-gui/i.test(html),
        curated: LEGACY_TAGS.has(slug) || Boolean(explicit),
        featured: FEATURED.has(slug),
        citedPlot,
      };
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.curated !== b.curated) return a.curated ? -1 : 1;
      if (a.published && b.published && a.published !== b.published) {
        return b.published.localeCompare(a.published);
      }
      return a.title.localeCompare(b.title);
    });
}
