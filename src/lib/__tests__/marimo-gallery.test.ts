import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { marimoDemos, publishedMarimoDemos } from "../marimo-demos";

const liveSlugs = [
  "2610.20686-rolaq-cache-accounting",
  "borwein-falsifier",
  "2610.08936-clean-vs-robustness",
  "2609.38201-speculative-tool-exec",
  "2610.20838-srq-endpoint-weight",
  "build-a-chip-bench-multiscoring",
  "embodied-playground-suite-gap",
  "2609.05439-criticgen-risk-frontier",
  "2609.09458-contracteval-denominator",
  "2609.38385-goldimask-context-weighting",
  "2609.35806-sfia-extraction-baselines",
  "2608.05245-search2skill",
];

describe("published marimo gallery", () => {
  it("only includes demos with verified publication URLs", () => {
    expect(publishedMarimoDemos.map((demo) => demo.slug)).toEqual(liveSlugs);
    for (const demo of publishedMarimoDemos) {
      expect(demo.published_url).toBe(`https://marimo.edgelesslab.com/${demo.slug}/`);
    }
    expect(marimoDemos.some((demo) => !demo.published_url)).toBe(true);
  });

  it("uses the published collection for cards, count, tags and structured data", () => {
    const source = readFileSync(new URL("../../app/lab/marimo/page.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bmarimoDemos\b/);
    expect(source).not.toContain("https://edgelesslab.com/marimo/");
    expect(source).toContain("publishedMarimoDemos.flatMap");
    expect(source).toContain("publishedMarimoDemos.filter");
    expect(source).toContain("numberOfItems: publishedMarimoDemos.length");
    expect(source).toContain("itemListElement: publishedMarimoDemos.map");
    expect(source).toContain("{publishedMarimoDemos.length} published notebooks");
    expect(source).toContain("href={demo.published_url}");
    expect(source).toContain("url: demo.published_url");
  });
});
