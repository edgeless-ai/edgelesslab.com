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

  it("has valid related-post targets", () => {
    const links = [...matches[0].content.matchAll(/\]\(\/blog\/([^/)]+)\)/g)];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(posts.some((post) => post.slug === link[1])).toBe(true);
  });
});
