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
  it("pins the critic-approved SRQ reconstruction instead of its legacy fallback", () => {
    const slug = "2610.20838-srq-endpoint-weight";
    const catalog = JSON.parse(readFileSync(join(process.cwd(), "scripts/marimo-pages-catalog.json"), "utf8"));
    expect(catalog.fallbacks).not.toHaveProperty(slug);
    expect(catalog.sources.filter((source: { mount: string }) => source.mount === slug)).toEqual([{
      files: 759, mount: slug, path: `${slug}/site`, root: "outputs",
      sha256: "f62af79ff49d4526f35a98ec7ae85da02c1685262104dca1548566d1a47c496f",
    }]);
    expect(catalog.redirects).toContain(`/${slug}/assets/* /2607.06560-vision-unified-generation/assets/:splat 200\n`);
    // The already-deployed sibling must survive the full-project upload.
    expect(catalog.sources.find((source: { mount: string }) => source.mount === "2611.05665-construct-mixture-rank")).toMatchObject({
      files: 483, sha256: "336f1f2099ec22e8cdb5c1c2bcc6e569cfabb60d1163475b714d867026b5846c",
    });
  });
  it("registers the exact-witnessed Harmonica speed frontier with its RTX 4090 qualification", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.04640-harmonica-speed-frontier");
    expect(entry?.title).toBe("Harmonica: Quality-Qualified Speed Frontier");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.04640-harmonica-speed-frontier/");
    expect(entry?.description).toBe("Raise a minimum RTX 4090 inference-speed requirement and see which selected transcription model leads on an eight-set mean frame-F1 recomputation.");
    expect(entry?.tags).toContain("evidence-boundaries");
    expect(publishedMarimoDemos).toContain(entry);
  });
  it("registers Ready Cohorts only after exact live deadline-packing verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2608.12123-ready-cohort-packing");
    expect(entry).toEqual({
      "slug": "2608.12123-ready-cohort-packing",
      "title": "Ready Cohorts: Deadline-Aware Packing",
      "description": "Pack same-route control events by launch deadlines and compare fixed-window eligibility, the exact offline opportunity, and a local upper bound.",
      "category": "Research",
      "tags": [
        "agent-systems",
        "gpu-scheduling",
        "dynamic-programming",
        "deadline-packing"
      ],
      "published_url": "https://marimo.edgelesslab.com/2608.12123-ready-cohort-packing/"
    });
    expect(publishedMarimoDemos).toContain(entry);
    const catalog = JSON.parse(readFileSync(join(process.cwd(), "scripts/marimo-pages-catalog.json"), "utf8"));
    expect(catalog.sources.find((source: { mount: string }) => source.mount === entry?.slug)).toMatchObject({
      files: 759, path: "2608.12123-ready-cohort-packing/site",
      sha256: "eb6c2d1401ca3feefb21d4d2b3088b9869c3b6591d7b9762eceae31d2f28697e",
    });
  });
  it("lists DistillGuard after independent live reactive verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2603.07835-distillguard-damage-budget");
    expect(entry?.description).toContain("not broad distillation resistance or a model rerun");
    expect(entry?.published_url).toBe('https://edgelesslab.com/marimo/2603.07835-distillguard-damage-budget/')
    expect(publishedMarimoDemos).toContain(entry)
  });
  it("registers the exact-witnessed avatar stage timeline without claiming measured latency", () => {
    const entry = marimoDemos.find(d => d.slug === "2602.07449-avatar-stage-timeline");
    expect(entry?.title).toBe("Avatar Latency Needs a Stage Timeline");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2602.07449-avatar-stage-timeline/");
    expect(entry?.description).toContain("Separate steady-state video throughput from first speech and first displayed frame");
    expect(entry?.tags).toContain("evidence-boundaries");
    expect(publishedMarimoDemos).toContain(entry);
  });
  it("registers the live ProvenanceGuard queue with its fixed-rate extrapolation boundary", () => {
    const entry = marimoDemos.find(d => d.slug === "2606.18037-provenanceguard-policy");
    expect(entry?.title).toBe("ProvenanceGuard: The Fail-Closed Queue");
    const catalog = JSON.parse(readFileSync(join(process.cwd(), "scripts/marimo-pages-catalog.json"), "utf8"));
    expect(catalog.sources.find((source: { mount: string }) => source.mount === entry?.slug)).toMatchObject({
      files: 710,
      path: "2606.18037-provenanceguard-policy-legend-fix/site",
      sha256: "1d9139009c0c2a43d50c22ae559f83b7dc6f83b5bfd92f85ef6046cfe88993e3",
    });
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2606.18037-provenanceguard-policy/");
    expect(entry?.description).toContain("Derived sensitivity analysis under fixed rates only");
    expect(entry?.description).toContain("no model rerun, transfer validation, medical or production readiness claim");
    expect(entry?.tags).toContain("policy-sensitivity");
    expect(publishedMarimoDemos).toContain(entry);
  });
  it("registers the live reasoning-energy sensitivity without implying measured GPU energy", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.05512-reasoning-energy-paradox");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.05512-reasoning-energy-paradox/");
    expect(entry?.description).toContain("Hypothetical duration sensitivity only");
    expect(entry?.description).toContain("no model inference, benchmark replay or GPU energy measurement");
    expect(publishedMarimoDemos).toContain(entry);
  });
  it("publishes the exact-witnessed calibrated judge illustration with its synthetic-model boundary", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.35815-calibrated-judge-inference");
    expect(entry?.title).toBe("LLM-Judge False-Confidence Frontier");
    expect(entry?.category).toBe("Research");
    expect(entry?.description).toContain("Analyst-authored Gaussian sensitivity model only");
    expect(entry?.description).toContain("No evalstats/PPI execution");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.35815-calibrated-judge-inference/");
    expect(publishedMarimoDemos).toContain(entry);
  });
  it("registers QPRU only after live formula and fixed-uncertainty verification", () => {
    const notebook = marimoDemos.find((demo) => demo.slug === "2609.04354-qpru-evidence-frontier");
    expect(notebook).toEqual({
      slug: "2609.04354-qpru-evidence-frontier",
      title: "QPRU: Parameter Savings Are Not Quantum Advantage",
      description: "Recompute QPRU parameter-count formulas beside published AAPL uncertainty, while keeping architecture savings separate from unproven accuracy, speed, and quantum-advantage claims.",
      category: "Research",
      tags: ["quantum-ml", "time-series", "parameter-counts", "uncertainty", "evidence-boundaries"],
      published_url: "https://edgelesslab.com/marimo/2609.04354-qpru-evidence-frontier/",
    });
    expect(publishedMarimoDemos).toContain(notebook);
  });
  it("registers the unified vision backbone duplication notebook after live verification", () => {
    const notebook = marimoDemos.find((demo) => demo.slug === "2607.06560-vision-unified-generation");

    expect(notebook).toMatchObject({
      title: "Unified Vision: The Backbone Duplication Ledger",
      description: "Explore how one shared 7B vision interface changes normalized backbone inventory as the represented task portfolio grows.",
      category: "Research",
      tags: ["computer-vision", "multimodal-generation", "model-architecture", "systems-accounting", "evidence-boundaries"],
      published_url: "https://marimo.edgelesslab.com/2607.06560-vision-unified-generation/",
    });
    expect(publishedMarimoDemos).toContain(notebook);
  });
  it("registers the verified trigger-boundary demo without overstating probe success", () => {
    const entry = marimoDemos.find(d => d.slug === "2401.05566-adversarial-training-blind-spot");
    expect(entry?.title).toBe("When Red-Teaming Teaches the Trigger Boundary");
    expect(entry?.category).toBe("AI evaluation");
    expect(entry?.tags).toEqual(["ai-safety", "red-teaming", "backdoors", "evaluation", "distribution-shift"]);
    expect(entry?.description).toBe("Reproduce Sleeper Agents Figure 3b aggregate response rates and explore why narrow probe success does not establish removal of a held-out trigger-conditioned policy.");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2401.05566-adversarial-training-blind-spot/");
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      "title", "slug", "description", "category", "tags", "published_url",
    ].sort());
    expect(publishedMarimoDemos).toContainEqual(entry);
  });

  it("registers the live maintainer-flagged sample with selection and inference boundaries", () => {
    const entry = marimoDemos.find(d => d.slug === "2611.15159-slop-sample-boundary");
    expect(entry?.title).toBe("Maintainer-Flagged PRs: Selection Before Inference");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2611.15159-slop-sample-boundary/");
    expect(entry?.category).toBe("Research");
    expect(entry?.tags).toEqual(["open-source", "ai-coding", "software-engineering", "dataset-audit", "evidence-boundaries"]);
    expect(entry?.description).toContain("measured precision separate from unknown recall and causal claims");
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      "title", "slug", "description", "category", "tags", "published_url",
    ].sort());
    expect(publishedMarimoDemos).toContainEqual(entry);
  });

  it("registers the frozen tail-release illustration with its explicit evidence boundary", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.10964-tail-aware-release");
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.10964-tail-aware-release/");
    expect(entry?.title).toBe("Ready Is Not Released: Preserving Scheduling Choice");
    expect(entry?.description).toContain("Deterministic six-turn mechanism illustration");
    expect(entry?.description).toContain("no mean-CVaR estimator, adaptive queue-pressure controller, trace replay");
    expect(entry?.description).toContain("author-reported, not demo outputs");
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      "title", "slug", "description", "category", "tags", "published_url",
    ].sort());
    expect(publishedMarimoDemos).toContainEqual(entry);
  });

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

  it("registers the TRILOGUE known-source ceiling after live control verification", () => {
    const entry = marimoDemos.find(d => d.slug === "2609.04452-trilogue-pipeline-ceiling");
    expect(entry).toBeDefined();
    expect(entry?.published_url).toBe("https://marimo.edgelesslab.com/2609.04452-trilogue-pipeline-ceiling/");
    expect(entry?.title).toBe("TRILOGUE: The Known-Source Ceiling");
    expect(entry?.category).toBe("Research");
    expect(entry?.tags).toContain("evaluation-boundary");
    expect(entry?.description).toContain("supplied article");
    expect(publishedMarimoDemos).toContainEqual(entry);
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
