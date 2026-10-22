import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";


// AgentReady (agentready.org): agents reach llms.txt and the AI catalog through
// links, rarely by guessing paths. Keep both linked and the index complete.
const root = process.cwd();

describe("agent readiness", () => {
  it("links llms.txt and the AI catalog from the root layout head", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/rel="alternate"[^>]*href="\/llms\.txt"/);
    expect(layout).toMatch(/rel="ai-catalog"[^>]*href="\/\.well-known\/ai-catalog\.json"/);
  });

  it("links llms.txt from the footer", () => {
    const footer = readFileSync(join(root, "src/components/footer.tsx"), "utf8");
    expect(footer).toContain('href: "/llms.txt"');
  });

  it("builds llms.txt from the Field Notes and marimo registries", () => {
    const route = readFileSync(join(root, "src/app/llms.txt/route.ts"), "utf8");
    expect(route).toContain("creativeDemos");
    expect(route).toContain("publishedMarimoDemos");
    expect(route).toContain("/.well-known/ai-catalog.json");
  });

  it("ships a valid AI catalog whose site URLs point at real routes", () => {
    const cat = JSON.parse(readFileSync(join(root, "public/.well-known/ai-catalog.json"), "utf8"));
    expect(cat.specVersion).toBe("1.0");
    expect(cat.host.identifier).toBe("edgelesslab.com");
    const urls: string[] = cat.entries.map((e: { url: string }) => e.url);
    expect(urls).toContain("https://edgelesslab.com/llms.txt");
    for (const e of cat.entries) {
      expect(e.identifier).toMatch(/^urn:ai:edgelesslab\.com:/);
      expect(e.type).toBeTruthy();
      expect(e.description.length).toBeGreaterThan(10);
    }
  });
});
