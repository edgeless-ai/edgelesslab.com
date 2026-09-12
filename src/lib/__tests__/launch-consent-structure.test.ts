import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

function parse(path: string) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function nodes(source: ts.Node, predicate: (node: ts.Node) => boolean) {
  const result: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node)) result.push(node); ts.forEachChild(node, visit); }
  visit(source);
  return result;
}

test.each(["src/app/page.tsx", "src/app/field-notes/page.tsx", "src/components/blog-client.tsx", "src/app/about/page.tsx", "src/app/privacy/page.tsx", "src/app/terms/page.tsx"])("%s has one focusable main landmark for the skip link", (path) => {
  const mains = nodes(parse(path), (node) => ts.isJsxOpeningElement(node) && node.tagName.getText() === "main") as ts.JsxOpeningElement[];
  expect(mains).toHaveLength(1);
  const attributes = Object.fromEntries(mains[0].attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a.initializer?.getText()]));
  expect(attributes).toMatchObject({ id: '"main-content"', tabIndex: "{-1}" });
});

test("follow UI offers RSS without collecting an email into analytics", () => {
  const source = parse("src/components/subscribe-form.tsx");
  const elements = nodes(source, (node) => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) as (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[];
  expect(elements.some((node) => ["form", "input"].includes(node.tagName.getText()))).toBe(false);
  expect(elements.some((node) => node.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === "href" && a.initializer?.getText() === '"/feed.xml"'))).toBe(true);
  const calls = nodes(source, ts.isCallExpression) as ts.CallExpression[];
  expect(calls.some((node) => /fetch|sendBeacon/.test(node.expression.getText()))).toBe(false);
});

test("light theme variables target the root carrying the theme attribute", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  expect(css).not.toContain('[data-theme="light"] :root');
  expect(css).toContain(':root[data-theme="light"]');
});

test("no application module eagerly imports the analytics SDK or bypasses its transport gate", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : /\.[jt]sx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [join(dir, entry.name)] : []);
  }
  for (const path of walk("src")) {
    const source = parse(path);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.getText().includes("posthog-js")) {
        expect(statement.importClause?.isTypeOnly, `${path}: eager SDK import`).toBe(true);
      }
    }
    const beacons = nodes(source, (node) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "sendBeacon");
    if (beacons.length) expect(path).toBe("src/lib/analytics.ts");
  }
  expect(readFileSync("src/components/performance-preload.tsx", "utf8")).not.toContain("posthog.com");
});
