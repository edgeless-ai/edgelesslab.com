import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function expectTagged(url: string) {
  const query = new URL(url).searchParams;
  expect(query.get("utm_source")).toBe("edgelesslab");
  expect(query.get("utm_medium")).toBe("site");
}

describe("homepage GitHub attribution", () => {
  for (const component of ["home-workbench", "footer", "nav-mobile-menu"]) {
    it(`tags the GitHub destination in ${component}`, () => {
      const source = readFileSync(`src/components/${component}.tsx`, "utf8");
      const urls = [...source.matchAll(/"(https:\/\/github\.com[^\"]*)"/g)];
      expect(urls).toHaveLength(1);
      urls.forEach((match) => expectTagged(match[1]));
    });
  }

  it("does not emit a non-navigation GitHub DNS hint in the href audit", () => {
    const source = readFileSync("src/components/performance-preload.tsx", "utf8");
    expect(source).not.toContain('href="https://github.com"');
  });
});
