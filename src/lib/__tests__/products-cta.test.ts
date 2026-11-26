import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FREE_KIT_URL } from "../free-kit";
import { LOOP_PACKS, listingUrl } from "../etsy-listings";

const page = readFileSync(new URL("../../app/products/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../../app/products/[slug]/page.tsx", import.meta.url), "utf8");

describe("products featured CTA", () => {
  it("offers one free kit instead of the retired paid catalog", () => {
    expect(page).toContain("Edgeless Free Kit");
    expect(page.match(/<FreeKitButton\s*\//g)).toHaveLength(1);
    expect(page).not.toMatch(/Get Claude Memory Kit Pro|\$29|Shipping Q3|3\+ months|5 agents/);
  });

  it("links products directly to a source-backed active Etsy listing with tracking", () => {
    expect(page).toContain('listingUrl(LOOP_PACKS[0].id, "products")');
    expect(page).toContain("Electric Tartan Loop Pack on Etsy");
    const url = new URL(listingUrl(LOOP_PACKS[0].id, "products"));
    expect(url.origin).toBe("https://www.etsy.com");
    expect(url.pathname).toBe("/listing/4535423190");
    expect(url.searchParams.get("utm_source")).toBe("edgelesslab");
    expect(url.searchParams.get("utm_content")).toBe("products");
  });

  it("uses direct zero-price checkout, including legacy detail routes", () => {
    expect(new URL(FREE_KIT_URL).searchParams.get("price")).toBe("0");
    expect(new URL(FREE_KIT_URL).searchParams.get("utm_content")).toBe("products_hero");
    expect(detail).toContain("<FreeKitButton />");
    expect(detail).not.toMatch(/GumroadButton|StripeButton|product\.price|content\.body/);
  });
});
