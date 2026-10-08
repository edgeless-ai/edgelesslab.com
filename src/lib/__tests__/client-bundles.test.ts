import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { afterEach, expect, test, vi } from "vitest";

function parse(path: string) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [join(dir, entry.name)] : []
  );
}

function assertClientBoundary(path: string, target: string) {
  const source = parse(path);
  expect(source.statements[0].getText()).toBe('"use client";');
  let found = false;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText() === "dynamic") {
      const [loader, options] = node.arguments;
      if (loader?.getText().includes(`import("${target}")`)) {
        found = true;
        expect(options && ts.isObjectLiteralExpression(options)).toBe(true);
        if (options && ts.isObjectLiteralExpression(options)) {
          expect(options.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === "ssr" && property.initializer.kind === ts.SyntaxKind.FalseKeyword)).toBe(true);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(found, `${path}: missing dynamic boundary for ${target}`).toBe(true);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([undefined, "false", "1"])("normal builds do not install a webpack analyzer hook (ANALYZE=%s)", async (value) => {
  vi.stubEnv("ANALYZE", value);
  const { default: config } = await import("../../../next.config");
  expect(config.webpack).toBeUndefined();
  expect(config.output).toBe("export");
  expect(config.trailingSlash).toBe(true);
});

test("analysis opts into webpack and retains static-export settings", async () => {
  vi.stubEnv("ANALYZE", "true");
  const { default: config } = await import("../../../next.config");
  expect(config.webpack).toBeTypeOf("function");
  expect(config.output).toBe("export");
  expect(config.images?.unoptimized).toBe(true);
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest.devDependencies["@next/bundle-analyzer"]).toBe(manifest.dependencies.next);
  expect(manifest.scripts.analyze).toBe("ANALYZE=true npm run build -- --webpack");
});

test("the tldraw editor and shader component retain client-only dynamic boundaries", () => {
  assertClientBoundary("src/app/lab/swarm-specimen/SwarmSpecimenEmbed.tsx", "./SwarmSpecimenCanvas");
  assertClientBoundary("src/components/hero-section.tsx", "@/components/hero-shader-bg");
});

test("application code does not eagerly bypass the heavy leaf component boundaries", () => {
  const heavyLeaves = new Set(["SwarmSpecimenCanvas", "shapes", "hero-shader-bg", "terminal-god-rays", "lime-aurora-background", "riso-dither-field", "living-cells-hero"]);
  for (const path of walk("src")) {
    for (const statement of parse(path).statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const leaf = specifier.split("/").at(-1);
      if (leaf && heavyLeaves.has(leaf)) {
        // Custom shapes are internal to the dynamically loaded editor chunk.
        expect(path === "src/app/lab/swarm-specimen/SwarmSpecimenCanvas.tsx" && leaf === "shapes", `${path}: eager import of ${specifier}`).toBe(true);
      }
      if (specifier === "tldraw") expect(path).toMatch(/^src\/app\/lab\/swarm-specimen\/(SwarmSpecimenCanvas|shapes)\.tsx$/);
      if (specifier === "posthog-js") throw new Error(`${path}: eager analytics SDK import`);
    }
  }
});
