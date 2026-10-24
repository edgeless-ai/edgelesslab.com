import { describe, expect, it } from "vitest";
import { marimoDemos } from "../marimo-demos";

const liveSlugs = [
  "2610.20764-sc-eff-scaling",
  "2610.08936-clean-vs-robustness",
  "embodied-playground-suite-gap",
];

const publishedDemos = marimoDemos.filter(
  (demo) => demo.publishedUrl,
);

describe("published marimo gallery", () => {
  it("only includes demos with verified publication URLs", () => {
    expect(publishedDemos.map((demo) => demo.slug)).toEqual(liveSlugs);
    for (const demo of publishedDemos) {
      expect(demo.publishedUrl).toBe(`https://marimo.edgelesslab.com/${demo.slug}/`);
      expect(demo.state).toBe("published");
    }
  });
});
