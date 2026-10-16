import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FREE_KIT_URL, freeKitContents } from "../lib/free-kit";

describe("Edgeless Free Kit", () => {
  it("links directly to a zero-price checkout with attribution", () => {
    const url = new URL(FREE_KIT_URL);
    expect(url.host).toBe("edgelessai.gumroad.com");
    expect(url.pathname).toBe("/l/edgeless-free-kit");
    expect(url.searchParams.get("wanted")).toBe("true");
    expect(url.searchParams.get("price")).toBe("0");
    expect(url.searchParams.get("utm_campaign")).toBe("free_kit");
  });
  it("lists the packaged resources without duplicates or corrupt products", () => {
    expect(freeKitContents).toHaveLength(17);
    expect(new Set(freeKitContents.map(item => item.name)).size).toBe(17);
    expect(freeKitContents.some(item => item.name.includes("Memory Kit Pro"))).toBe(false);
  });
  it("has one kit CTA, no legacy catalog, and no paid copy", () => {
    const page = readFileSync("src/app/products/page.tsx", "utf8");
    expect(page.match(/<FreeKitButton\s*\//g)).toHaveLength(1);
    expect(page).not.toMatch(/ProductsGrid|EtsyCallout|Shipping Q3|3\+ months|5 agents|\$29|paid implementation/i);
    expect(page).toContain("/services/private-ai-systems");
    expect(page).toContain("Enter your email");
  });
  it("tracks an email-capture intent rather than a purchase", () => {
    const button = readFileSync("src/components/free-kit-button.tsx", "utf8");
    expect(button).toContain('trackCTA("free_kit_checkout"');
    expect(button).not.toMatch(/trackPurchase|gumroad.js/);
  });
});
