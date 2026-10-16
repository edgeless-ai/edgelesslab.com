import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FREE_KIT_URL } from "../free-kit";

const page = readFileSync(new URL("../../app/products/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../../app/products/[slug]/page.tsx", import.meta.url), "utf8");

describe("products featured CTA", () => {
  it("offers one free kit instead of the retired paid catalog", () => {
    expect(page).toContain("Edgeless Free Kit");
    expect(page.match(/<FreeKitButton\s*\//g)).toHaveLength(1);
    expect(page).not.toMatch(/Get Claude Memory Kit Pro|\$29|Shipping Q3|3\+ months|5 agents/);
  });

  it("uses direct zero-price checkout, including legacy detail routes", () => {
    expect(new URL(FREE_KIT_URL).searchParams.get("price")).toBe("0");
    expect(new URL(FREE_KIT_URL).searchParams.get("utm_content")).toBe("products_hero");
    expect(detail).toContain("<FreeKitButton />");
    expect(detail).not.toMatch(/GumroadButton|StripeButton|product\.price|content\.body/);
  });
});
