import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { posts } from "../blog";


describe("LongCapHarness publication", () => {
  const draft = readFileSync("content/blog/longcapharness-breakdown.md", "utf8");
  const [, frontmatter, markdown] = draft.split("---", 3);
  const metadata = Object.fromEntries(frontmatter.trim().split("\n").map((line) => {
    const colon = line.indexOf(": ");
    return [line.slice(0, colon), JSON.parse(line.slice(colon + 2))];
  }));
  const matches = posts.filter((post) => post.slug === "longcapharness-breakdown");

  it("registers the approved draft exactly once and preserves its metadata", () => {
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject(metadata);
    expect(matches[0].editorial).toBe(true);
    expect(matches[0].productSlug).toBeUndefined();
  });

  it("keeps the registry body in sync with approved Markdown, without a duplicate title", () => {
    // The page supplies the H1; all remaining approved text is preserved verbatim.
    const body = draft.slice(draft.indexOf("---", 3) + 3).trim();
    expect(markdown).toBeDefined();
    expect(matches[0].content).toBe(body.slice(body.indexOf("\n\n") + 2));
    expect(matches[0].content).not.toMatch(/^# /);
    expect(matches[0].content).toContain("advantage over RRSI on ICL is narrow");
    expect(matches[0].content).toContain("70.25-point gain on ICL over base");
    expect(matches[0].content).toContain("We haven't run this harness ourselves");
  });

  it("uses supported lists for every comparison, without raw tables or separators", () => {
    const content = matches[0].content;
    expect(content).not.toMatch(/^\s*\|/m);
    expect(content).not.toMatch(/^---\s*$/m);
    for (const comparison of [
      "- **Llama3-8B (zero-shot)** — Configuration: 8K context; Avg Score: 15.14.",
      "- **Llama3-8B with LongCapHarness** — Configuration: 8K context; Avg Score: **79.32**.",
      "- **Gain:** **+64.18**.",
      "- **Llama3-8B** — Baseline: NExtLong (128K); LongCapHarness: LongCapHarness; Honest Gain: **+9.17** pts.",
      "- **Qwen2.5-3B** — Baseline: PolicyLong (128K); LongCapHarness: LongCapHarness; Honest Gain: **+14.63** pts.",
      "- **Recall** — LongCapHarness: **100.00**; Base Model: 18.00 (Llama).",
      "- **RULER** — LongCapHarness: **94.62**; Base Model: 17.80 (Llama).",
      "- **Reranking** — LongCapHarness: **39.67**; Base Model: 7.74.",
      "- **RRSI** — Input (M): 52.42; Output (M): 3.87; Cost: $331.",
      "- **LongCapHarness** — Input (M): 814.11; Output (M): 3.35; Cost: **$541**.",
      "- **NExtLong training** — Input (M): —; Output (M): —; Cost: $3,696.",
    ]) expect(content).toContain(comparison);
  });

  it("has valid related-post targets", () => {
    const links = [...matches[0].content.matchAll(/\]\(\/blog\/([^/)]+)\)/g)];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(posts.some((post) => post.slug === link[1])).toBe(true);
  });
});
