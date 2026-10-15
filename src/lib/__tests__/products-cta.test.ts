import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../app/products/page.tsx", import.meta.url), "utf8");

describe("products featured CTA", () => {
  it("names the Pro kit and its contents instead of implying the free kit", () => {
    expect(page).toContain("Get Claude Memory Kit Pro");
    expect(page).toContain("12 templates · 5 stack libraries");
    expect(page).not.toContain("Start with Claude Memory Kit");
  });

  it("uses the consent-aware checkout button and a hero attribution tag", () => {
    expect(page).toMatch(/<GumroadButton\s+href="https:\/\/edgelessai.gumroad.com\/l\/claude-memory-kit\?[^"\n]+utm_content=hero"/);
    expect(page).toContain('productName="Claude Memory Kit Pro"');
    expect(page).toContain('</GumroadButton>');
  });
});
