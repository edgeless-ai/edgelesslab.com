import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMarimoDemos, marimoDemos, publishedMarimoDemos, MARIMO_ENTRIES_DIR, type MarimoDemo } from "../marimo-demos";
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
    "http://edgelesslab.com/marimo/test-notebook/",
    "https://edgelesslab.com/test-notebook/",
    "https://edgelesslab.com/marimo/other-notebook/",
    "https://edgelesslab.com/marimo/test-notebook",
    "https://edgelesslab.com/marimo/test-notebook/?draft=true",
    "https://edgelesslab.com/marimo/test-notebook/#draft",
    "https://user:pass@edgelesslab.com/marimo/test-notebook/",
    "https://edgelesslab.com.evil.example/marimo/test-notebook/",
    "https://edgelesslab.com:443/marimo/test-notebook/",
    "https://edgelesslab.com/marimo/../marimo/test-notebook/",
    "https://edgelesslab.com/marimo/%74est-notebook/",
    "https://edgelesslab.com/marimo/test-notebook/extra/",
  ])("rejects invalid or noncanonical publication URL %j", (published_url) => {
    expect(() => validateMarimoCatalog([{ ...fixture(), published_url }])).toThrow(/Invalid publication URL/);
  });

  it.each([
    "https://marimo.edgelesslab.com/test-notebook/",
    "https://edgelesslab.com/marimo/test-notebook/",
  ])("accepts the exact canonical publication URL %j", (published_url) => {
    const demo = { ...fixture(), published_url };
    expect(validateMarimoCatalog([demo])).toEqual([demo]);
  });

  it("registers SpecOpt on the live primary-domain bundle without private metadata", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.21165-specopt-admission-noise");
    expect(entry?.published_url).toBe("https://edgelesslab.com/marimo/2609.21165-specopt-admission-noise/");
    expect(entry?.title).toBe("SpecOpt: Noise at the Admission Gate");
    expect(entry?.category).toBe("Research");
    expect(entry?.tags).toContain("selection-bias");
    expect(entry?.description).toContain("synthetic");
    expect(entry?.description).toContain("clinical claim");
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      "title", "slug", "description", "category", "tags", "published_url",
    ].sort());
    expect(publishedMarimoDemos).toContainEqual(entry);
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

  it("registers the 2609.04404 ASR hallucination taxonomy notebook after live verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.04404-asr-hallucination-taxonomy");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.04404-asr-hallucination-taxonomy/");
    expect(entry?.title).toBe("ASR Grounding Failure Audit");
    expect(entry?.tags).toContain("hallucination");
  });

  it("registers the 2609.27051 anytime-valid-referee notebook after live verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.27051-anytime-valid-referee");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.27051-anytime-valid-referee/");
    expect(entry?.title).toBe("The Evidence Wait Behind an Anytime-Valid Referee");
    expect(entry?.tags).toContain("anytime-valid-inference");
    expect(entry?.tags).toContain("sensitivity-analysis");
  });

  it("registers the google-routing-failure-price notebook after live verification", () => {
    const entry = marimoDemos.find(d => d.slug === "google-routing-failure-price");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/google-routing-failure-price/");
    expect(entry?.title).toBe("The Hidden Price of Unresolved Failures");
    expect(entry?.tags).toContain("model-routing");
  });

  it("registers the 2606.04781-pass-semantics notebook after live verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2606.04781-pass-semantics");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2606.04781-pass-semantics/");
    expect(entry?.title).toBe("One Benchmark Packet, Two Pass Rates");
    expect(entry?.tags).toContain("denominators");
  });

  it("registers the 2609.38372-self-optimizing-harness notebook after live verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.38372-self-optimizing-harness");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.38372-self-optimizing-harness/");
    expect(entry?.title).toBe("A Runnable Edit Is Not a Promotable Harness");
    expect(entry?.tags).toContain("harness-evolution");
    expect(entry?.tags).toContain("governance");
  });
});

describe("per-notebook registry files", () => {
  const write = (dir: string, slug: string, extra: Partial<MarimoDemo> = {}) =>
    writeFileSync(join(dir, `${slug}.json`), JSON.stringify({ ...fixture(slug), ...extra }));
  const scratch = () => mkdtempSync(join(tmpdir(), "marimo-entries-"));

  it("collects one file per notebook so parallel publishes never edit the same path", () => {
    const dir = scratch();
    write(dir, "beta");
    write(dir, "alpha");
    expect(loadMarimoDemos(dir).map((demo) => demo.slug)).toEqual(["alpha", "beta"]);
    // A second lane adding its own notebook file only adds a path: nothing shared, no conflict.
    write(dir, "aardvark");
    expect(loadMarimoDemos(dir).map((demo) => demo.slug)).toEqual(["aardvark", "alpha", "beta"]);
  });

  it("refuses an entry whose filename disagrees with its slug, or that is not JSON", () => {
    const dir = scratch();
    writeFileSync(join(dir, "wrong-name.json"), JSON.stringify(fixture("real-slug")));
    expect(() => loadMarimoDemos(dir)).toThrow(/must be named after its slug/);
    rmSync(join(dir, "wrong-name.json"));
    writeFileSync(join(dir, "broken.json"), "{ not json }");
    expect(() => loadMarimoDemos(dir)).toThrow();
  });

  it("ships exactly one registry file per collected entry, named after its slug", () => {
    const files = readdirSync(MARIMO_ENTRIES_DIR).filter((name) => name.endsWith(".json")).sort();
    expect(files.length).toBeGreaterThan(0);
    expect(files).toEqual(marimoDemos.map((demo) => `${demo.slug}.json`).sort());
  });
});
