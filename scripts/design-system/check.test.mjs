import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, cp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { checkConsumer, checkAdapter, validateCatalog, projectRoot } from './check.mjs';

const catalog = JSON.parse(await readFile(resolve(projectRoot, 'src/components/design-system/tokens.json'), 'utf8'));
const adapter = await readFile(resolve(projectRoot, 'src/components/design-system/primitives.tsx'), 'utf8');
const css = await readFile(resolve(projectRoot, 'src/components/design-system/primitives.module.css'), 'utf8');
const imports = 'import { Surface, Main, Container, Heading, Text, Section, List, ListItem, Strong, BackLink, InlineLink } from "@/components/design-system/primitives";';
const page = jsx => `${imports}\nexport default function Page() { return (${jsx}); }`;
const check = source => checkConsumer(source, 'fixture.tsx', catalog);

const positive = page(`<Surface elevation="none"><Main><Container measure="page"><Heading kind="title">Support</Heading><Text variant="subtitle">Intro</Text><BackLink href="/">Home</BackLink><Container measure="reading"><Section spaceAfter="section"><Heading kind="section">Help</Heading><Text variant="body">Email {" "}<InlineLink href="mailto:help@example.com"><Strong>Help</Strong></InlineLink></Text><List><ListItem>Answer</ListItem></List></Section></Container></Container></Main></Surface>`);

test('known catalog tokens and semantic primitives pass', () => {
  assert.doesNotThrow(() => validateCatalog(catalog));
  assert.doesNotThrow(() => check(positive));
  assert.doesNotThrow(() => checkAdapter(adapter, css, catalog));
  assert.doesNotThrow(() => check(`${imports}\n// A harmless comment about className.\nexport default function Page() { return <Text>{"@ts-ignore is literal text"}</Text>; }`));
});

const negative = {
  'unknown typography token': page('<Text variant="huge">No</Text>'),
  'known raw color': page('<Text color="#FAFAFA">No</Text>'),
  'raw color through token prop': page('<Text variant="#FAFAFA">No</Text>'),
  'known raw spacing': page('<Section spaceAfter="40px">No</Section>'),
  'numeric spacing': page('<Section spaceAfter={40}>No</Section>'),
  'arbitrary className': page('<Text className="text-red-500">No</Text>'),
  'style object': page('<Text style={{ color: "red" }}>No</Text>'),
  'css prop': page('<Text css={{ margin: 7 }}>No</Text>'),
  'dangerouslySetInnerHTML': page('<Text dangerouslySetInnerHTML={{ __html: "<style>*{color:red}</style>" }} />'),
  'JSX spread': page('<Text {...{ variant: "body" }}>No</Text>'),
  'spread children': page('<Text>{..."abc"}</Text>'),
  'literal raw tag': page('<div>No</div>'),
  'style injection': page('<style>{"*{color:red}"}</style>'),
  'head stylesheet injection': page('<link rel="stylesheet" href="/rogue.css" />'),
  'raw anchor': page('<a href="/">No</a>'),
  'polymorphic as': page('<Text as="section">No</Text>'),
  'href on paragraph': page('<Text href="/">No</Text>'),
  'namespace tag': page('<Text.Body>No</Text.Body>'),
  'namespace prop': page('<Text xml:lang="en">No</Text>'),
  'missing required semantic kind': page('<Heading>No</Heading>'),
  'duplicate token': page('<Text variant="body" variant="subtitle">No</Text>'),
  'unsafe target': page('<InlineLink href="javascript:alert(1)">No</InlineLink>'),
  'protocol-relative target': page('<InlineLink href="//example.com">No</InlineLink>'),
  'typed JSX': page('<Text<any>>No</Text>'),
  'type assertion': page('<Text variant={"giant" as any}>No</Text>'),
  'angle type assertion': `${imports} export const bad = <any>"x";`,
  'satisfies expression': page('<Text variant={"body" satisfies string}>No</Text>'),
  'non-null assertion': page('<Text variant={"body"!}>No</Text>'),
  'unknown helper import': 'import { Bad } from "./helper"; export default function Page() { return <Bad />; }',
  'other component import': 'import { Bad } from "@/components/other"; export default function Page() { return <Bad />; }',
  'primitive internal import': 'import tokens from "@/components/design-system/tokens.json";',
  'side effect CSS import': 'import "./style.css";',
  'namespace import': 'import * as DS from "@/components/design-system/primitives";',
  'aliased import': 'import { Text as T } from "@/components/design-system/primitives";',
  're-export': 'export { Text } from "@/components/design-system/primitives";',
  'type declaration escape': 'declare module "react" { interface Attributes { style?: any } }',
  'ts-ignore': `// @ts-ignore\n${positive}`,
  'ts-nocheck': `/* @ts-nocheck */\n${positive}`,
  'ts-expect-error': `${imports} export default function Page() { return <Text>{/* @ts-expect-error */}No</Text>; }`,
  'lint suppression': `/* eslint-disable */\n${positive}`,
  'factory': 'import { createElement } from "react"; export default function Page() { return createElement("div"); }',
  'dynamic import': `${imports} export default function Page() { return import("./helper"); }`,
  'require': `${imports} const bad = require("./helper");`,
  'IIFE': page('<Text>{(() => "No")()}</Text>'),
  'mutating call': page('<Text>{document.body.setAttribute("style", "color:red")}</Text>'),
  'function parameter injection': `${imports} export default function Page({ children }: any) { return <Text>{children}</Text>; }`,
  'local code before return': `${imports} export default function Page() { const bad = "x"; return <Text>No</Text>; }`,
  'top-level execution': `${positive}\nconsole.log("No");`,
  'metadata arbitrary call': 'import { createPageMetadata } from "@/lib/metadata"; export const metadata = createPageMetadata({title: evil()});',
  'metadata spread': 'import { createPageMetadata } from "@/lib/metadata"; export const metadata = createPageMetadata({...evil});',
  'legacy shell style': 'import { Nav } from "@/components/nav"; export default function Page() { return <Nav className="bad" />; }',
  'legacy shell children': 'import { Footer } from "@/components/footer"; export default function Page() { return <Footer>Injected</Footer>; }',
  'syntax error': `${imports} export default function Page( {`,
};
for (const [name, source] of Object.entries(negative)) test(`consumer rejects ${name}`, () => assert.throws(() => check(source)));

const adapterMutations = {
  'inline raw value': adapter.replace('style={variables}', 'style={{ color: "red" }}'),
  'raw class': adapter.replace('className={styles.main}', 'className="p-4"'),
  'extra helper execution': `${adapter}\nconsole.log("injected");`,
  'type broadening': adapter.replace('measure: Measure', 'measure: string'),
  'consumer spread': adapter.replace('{ children }: Children', '{ children, ...props }: Children').replace('<main id=', '<main {...props} id='),
  'suppression': `// @ts-nocheck\n${adapter}`,
};
for (const [name, source] of Object.entries(adapterMutations)) test(`adapter rejects ${name}`, () => assert.throws(() => checkAdapter(source, css, catalog)));
for (const [name, source] of Object.entries({
  'raw known color': css.replace('var(--polar-color-primary)', '#FAFAFA'),
  'raw known spacing': css.replace('var(--polar-spacing-gutter)', '24px'),
  'unknown variable': css.replace('var(--polar-spacing-gutter)', 'var(--escape)'),
  'extra selector': `${css}\n:global(body) { color: red; }`,
  'at-rule': `${css}\n@import "evil.css";`,
  'important override': css.replace('display: flex;', 'display: flex !important;'),
})) test(`CSS parser rejects ${name}`, () => assert.throws(() => checkAdapter(adapter, source, catalog)));

test('catalog requires theme pairs and data-only values', () => {
  for (const mutate of [
    c => { delete c.color.canvas.light; },
    c => { c.color.primary.dark = 'var(--outside)'; },
    c => { c.spacing.gutter = '24px; color: red'; },
    c => { c.spacing.rogue = '17px'; },
    c => { c.code = 'document.body.style.color="red"'; },
  ]) {
    const copy = structuredClone(catalog); mutate(copy);
    assert.throws(() => validateCatalog(copy));
  }
});

test('actual CLI: recursive files, extensions, boundary changes, exit codes and no scope overrides', async () => {
  const root = await mkdtemp(join(tmpdir(), 'polar-cli-'));
  try {
    await mkdir(join(root, 'scripts/design-system'), { recursive: true });
    await mkdir(join(root, 'src/app/support/nested'), { recursive: true });
    await cp(join(projectRoot, 'src/components/design-system'), join(root, 'src/components/design-system'), { recursive: true });
    for (const file of ['check.mjs', 'adapter.mjs']) await cp(join(projectRoot, 'scripts/design-system', file), join(root, 'scripts/design-system', file));
    await symlink(join(projectRoot, 'node_modules'), join(root, 'node_modules'), 'dir');
    const target = join(root, 'src/app/support/page.tsx');
    const run = (args = []) => spawnSync(process.execPath, [join(root, 'scripts/design-system/check.mjs'), ...args], { encoding: 'utf8' });
    await writeFile(target, positive);
    let result = run(); assert.equal(result.status, 0, result.stderr);
    assert.notEqual(run(['--scope=elsewhere']).status, 0);
    for (const name of ['unknown typography token', 'known raw color', 'known raw spacing', 'type assertion', 'JSX spread', 'unknown helper import']) {
      await writeFile(target, negative[name]); result = run();
      assert.equal(result.status, 1, `${name}: ${result.stdout} ${result.stderr}`);
    }
    await writeFile(target, positive);
    const nested = join(root, 'src/app/support/nested/helper.tsx');
    await writeFile(nested, page('<Text>Valid helper source is still checked.</Text>'));
    assert.equal(run().status, 0);
    await writeFile(nested, page('<div>Nested bypass</div>'));
    assert.equal(run().status, 1);
    await rm(nested);
    for (const name of ['rogue.css', 'helper.js', 'page.mdx', 'types.d.ts']) {
      const path = join(root, 'src/app/support/nested', name);
      await writeFile(path, ''); assert.equal(run().status, 1, name); await rm(path);
    }
    await symlink(target, nested); assert.equal(run().status, 1); await rm(nested);
    const adapterFile = join(root, 'src/components/design-system/primitives.tsx');
    await writeFile(adapterFile, adapterMutations['inline raw value']); assert.equal(run().status, 1);
    await writeFile(adapterFile, adapter);
    const extra = join(root, 'src/components/design-system/helper.ts');
    await writeFile(extra, 'export const x = 1'); assert.equal(run().status, 1); await rm(extra);
    const bad = structuredClone(catalog); delete bad.color.canvas.light;
    await writeFile(join(root, 'src/components/design-system/tokens.json'), JSON.stringify(bad));
    assert.equal(run().status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('TypeScript fixtures enforce derived token props and semantic attributes', async () => {
  // Compiler host keeps deliberately invalid fixtures out of the project tsconfig.
  const fixture = join(projectRoot, 'scripts/design-system/__virtual_fixture.tsx');
  const options = { strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, resolveJsonModule: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2017, types: ['react'] };
  function diagnostics(jsx) {
    const content = `import { Text, Heading, Container, Section, Main, InlineLink, List, ListItem } from "../../src/components/design-system/primitives"; export const Example = (${jsx});`;
    const host = ts.createCompilerHost(options);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (name, languageVersion, onError, shouldCreate) => name === fixture ? ts.createSourceFile(name, content, languageVersion, true, ts.ScriptKind.TSX) : original(name, languageVersion, onError, shouldCreate);
    const program = ts.createProgram([fixture, join(projectRoot, 'next-env.d.ts')], options, host);
    return ts.getPreEmitDiagnostics(program);
  }
  const good = diagnostics('<Main><Container measure="reading"><Heading kind="section">Help</Heading><Section spaceAfter="section"><Text variant="body"><InlineLink href="mailto:help@example.com">Help</InlineLink></Text><List><ListItem>Answer</ListItem></List></Section></Container></Main>');
  assert.deepEqual(good.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
  for (const jsx of [
    '<Text variant="giant">Bad</Text>', '<Section spaceAfter="40px">Bad</Section>',
    '<Container measure="99px">Bad</Container>', '<Text style={{ color: "red" }}>Bad</Text>',
    '<Text className="x">Bad</Text>', '<Text href="/">Bad</Text>',
    '<Text as="a">Bad</Text>', '<Heading kind="h7">Bad</Heading>',
    '<InlineLink href="javascript:alert(1)">Bad</InlineLink>',
    '<Main id="wrong">Bad</Main>', '<List role="presentation">Bad</List>',
  ]) assert.ok(diagnostics(jsx).some(d => d.file?.fileName === fixture), jsx);
});
