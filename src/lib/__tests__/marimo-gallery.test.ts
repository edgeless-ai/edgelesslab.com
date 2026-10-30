import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { marimoDemos, publishedMarimoDemos, type MarimoDemo } from "../marimo-demos";
import { validateMarimoCatalog } from "../marimo-gallery-contract";

const fixture = (slug = "test-notebook"): MarimoDemo => ({
  slug, title: "Test notebook", description: "Fixture only, never published.",
  category: "Research", tags: ["test"],
  published_url: `https://marimo.edgelesslab.com/${slug}/`,
});

describe("published marimo gallery", () => {
  it("matches an independently validated raw catalog without a second hand-maintained list", () => {
    expect(publishedMarimoDemos).toEqual(validateMarimoCatalog(marimoDemos));
    expect(marimoDemos.some((demo) => demo.published_url == null)).toBe(true);
  });

  it("accepts another legitimate publication, any category and source order without updating totals", () => {
    const before = validateMarimoCatalog(marimoDemos);
    const added = { ...fixture("regression-addition"), category: "Finance/GPU" as const };
    const after = validateMarimoCatalog([added, ...marimoDemos]);
    expect(after).toEqual([added, ...before]);
    expect(after).toHaveLength(before.length + 1);
  });

  it("does not infer URLs for missing/null unverified entries or leak them into publication expectations", () => {
    const verified = fixture();
    const draft = { ...fixture("unverified"), published_url: undefined };
    const legacy = { ...fixture("legacy"), published_url: null };
    expect(validateMarimoCatalog([verified, draft, legacy])).toEqual([verified]);
    expect(() => validateMarimoCatalog([draft, legacy])).toThrow(/must not be empty/);
    expect(() => validateMarimoCatalog([])).toThrow(/must not be empty/);
  });

  it.each([
    "", " ", "not-a-url", "javascript:alert(1)",
    "http://marimo.edgelesslab.com/test-notebook/",
    "https://evil.example/test-notebook/",
    "https://marimo.edgelesslab.com/other-notebook/",
    "https://marimo.edgelesslab.com/test-notebook",
    "https://marimo.edgelesslab.com/test-notebook/?draft=true",
    "https://marimo.edgelesslab.com/test-notebook/#draft",
    "https://marimo.edgelesslab.com@evil.example/test-notebook/",
    "https://edgelesslab.com/marimo/test-notebook/",
  ])("rejects invalid or noncanonical publication URL %j", (published_url) => {
    expect(() => validateMarimoCatalog([{ ...fixture(), published_url }])).toThrow(/Invalid publication URL/);
  });

  it("rejects duplicate slugs and duplicate URLs rather than counting them twice", () => {
    expect(() => validateMarimoCatalog([fixture(), fixture()])).toThrow(/Duplicate notebook slug/);
    expect(() => validateMarimoCatalog([fixture(), { ...fixture("other"), published_url: fixture().published_url }])).toThrow(/Duplicate publication URL/);
  });

  it.each([
    { slug: "../escape" }, { title: " " }, { description: "" },
    { tags: [] }, { tags: [" "] }, { category: "Unknown" },
  ])("rejects malformed catalog metadata %j", (bad) => {
    expect(() => validateMarimoCatalog([{ ...fixture(), ...bad } as MarimoDemo])).toThrow(/Invalid notebook/);
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
