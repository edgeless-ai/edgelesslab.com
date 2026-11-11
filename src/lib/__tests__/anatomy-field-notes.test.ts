import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { creativeDemos } from "../creative-demos";

const slugs = ["kanban-dispatcher"];
describe("Anatomy field-note publication candidate", () => {
  for (const slug of slugs) {
    it(`${slug} has an explicit category and self-contained, CSS-preserved pages`, () => {
      const demo = creativeDemos.find((entry) => entry.slug === slug);
      expect(demo).toMatchObject({ category: "Anatomy", hasControls: true, date: "2026-11-09" });
      for (const filename of ["index.html", "light.html"]) {
        const html = readFileSync(`public/creative-demos/${slug}/${filename}`, "utf8");
        expect(html).toMatch(/<html[^>]*data-preserve-inline-styles/);
        expect(html).toContain(`<title>${demo!.title} | Edgeless Lab</title>`);
        expect(html).toContain('<meta name="description"');
        expect(html).toContain('href="/field-notes/"');
        expect(html).toContain("Model, sources &amp; limits");
        expect(html).toContain('<link rel="icon" href="data:image/svg+xml,');
        expect(html).toContain("MIT License");
        expect(html).toContain("Copyright (c) 2026 Ryan");
        expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["']https?:/);
        expect(html).not.toContain("/Users/");
      }
      expect(existsSync(`public/creative-demos/${slug}/provenance.json`)).toBe(true);
    });
  }
  it("does not release figures with an open visual or approval gate", () => {
    for (const slug of ["eval-bench", "bid-no-bid", "mechanical-watch", "turbofan", "water-wheel", "windmill", "trebuchet"]) {
      expect(creativeDemos.find((entry) => entry.slug === slug)).toBeUndefined();
      expect(existsSync(`public/creative-demos/${slug}/index.html`)).toBe(false);
    }
  });
});
