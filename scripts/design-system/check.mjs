import { readFile, readdir, lstat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { adapterSource, adapterCss, primitiveNames } from './adapter.mjs';

const require = createRequire(import.meta.url);
// Reuse Next's locked PostCSS dependency under npm and pnpm; no new install.
const postcss = createRequire(require.resolve('next/package.json'))('postcss');
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const adapterPath = 'src/components/design-system';
const consumerPath = 'src/app/support';
const approvedImports = {
  '@/components/design-system/primitives': primitiveNames,
  '@/components/nav': ['Nav'],
  '@/components/footer': ['Footer'],
  '@/lib/metadata': ['createPageMetadata'],
};

function exactKeys(value, keys, label) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) {
    throw new Error(`${label}: expected exactly ${keys.join(', ')}`);
  }
}
export function validateCatalog(c) {
  const schema = {
    color: ['canvas', 'primary', 'secondary', 'muted', 'accent', 'accentHover', 'shellCanvas', 'shellGlass'],
    spacing: ['gutter', 'pageTop', 'pageBottom', 'backLink', 'title', 'intro', 'paragraph', 'section', 'heading', 'listIndent', 'listItem', 'focus'],
    measure: ['page', 'reading'], heading: ['title', 'section'], text: ['body', 'subtitle'],
    font: ['backSize', 'backLineHeight', 'strongWeight'], elevation: ['none'],
    layout: ['pageMinimum', 'zero', 'auto'], motion: ['link', 'linkEase'],
  };
  exactKeys(c, Object.keys(schema), 'catalog');
  for (const [group, keys] of Object.entries(schema)) exactKeys(c[group], keys, `catalog.${group}`);
  const value = (input, pattern, label) => {
    if (typeof input !== 'string' || !pattern.test(input)) throw new Error(`${label}: invalid token value`);
  };
  const px = /^(?:0|[1-9]\d*)(?:\.\d+)?px$/;
  const ratio = /^\d+(?:\.\d+)?$/;
  const color = /^(?:#[0-9a-fA-F]{6}|rgba\((?:\d{1,3},\s*){3}(?:0(?:\.\d+)?|1)\))$/;
  for (const [key, modes] of Object.entries(c.color)) {
    exactKeys(modes, ['dark', 'light'], `color.${key}`);
    for (const [mode, input] of Object.entries(modes)) value(input, color, `color.${key}.${mode}`);
  }
  for (const group of ['spacing', 'measure']) for (const [key, input] of Object.entries(c[group])) value(input, px, `${group}.${key}`);
  for (const group of ['heading', 'text']) for (const [key, entry] of Object.entries(c[group])) {
    exactKeys(entry, group === 'heading' ? ['size', 'weight', 'lineHeight', 'tracking'] : ['size', 'lineHeight'], `${group}.${key}`);
    value(entry.size, px, `${group}.${key}.size`);
    value(entry.lineHeight, ratio, `${group}.${key}.lineHeight`);
    if (group === 'heading') {
      value(entry.weight, /^[1-9]00$/, `${group}.${key}.weight`);
      value(entry.tracking, /^-?\d+(?:\.\d+)?em$/, `${group}.${key}.tracking`);
    }
  }
  value(c.font.backSize, px, 'font.backSize');
  value(c.font.backLineHeight, ratio, 'font.backLineHeight');
  value(c.font.strongWeight, /^[1-9]00$/, 'font.strongWeight');
  value(c.elevation.none, /^none$/, 'elevation.none');
  value(c.layout.pageMinimum, /^100%$/, 'layout.pageMinimum');
  value(c.layout.zero, /^0$/, 'layout.zero');
  value(c.layout.auto, /^auto$/, 'layout.auto');
  value(c.motion.link, /^\d+ms$/, 'motion.link');
  value(c.motion.linkEase, /^cubic-bezier\((?:[01](?:\.\d+)?,\s*){3}[01](?:\.\d+)?\)$/, 'motion.linkEase');
  return c;
}

function parse(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (sf.parseDiagnostics.length) throw new Error(`${file}: ${ts.flattenDiagnosticMessageText(sf.parseDiagnostics[0].messageText, '\n')}`);
  // Scan actual comment tokens, not strings that happen to mention a directive.
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if ([ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia].includes(token) && /@ts-|eslint-|prettier-ignore/i.test(scanner.getTokenText())) {
      throw new Error(`${file}: suppression directives are forbidden`);
    }
  }
  return sf;
}
const unparen = node => ts.isParenthesizedExpression(node) ? unparen(node.expression) : node;
const modifiers = node => (node.modifiers ?? []).map(m => m.kind);
const isString = node => node && ts.isStringLiteral(node);

export function checkConsumer(source, file, catalog) {
  const sf = parse(source, file);
  const bindings = new Map();
  const functions = new Set();
  const fail = (node, message) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    throw new Error(`${file}:${line + 1}:${character + 1}: ${message}`);
  };
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const path = isString(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
    const clause = statement.importClause;
    if (!Object.hasOwn(approvedImports, path) || statement.attributes || !clause || clause.isTypeOnly || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) fail(statement, 'only explicit approved named imports are allowed');
    for (const element of clause.namedBindings.elements) {
      if (element.propertyName || element.isTypeOnly || !approvedImports[path].includes(element.name.text) || bindings.has(element.name.text)) fail(element, 'unknown, aliased, or duplicate import');
      bindings.set(element.name.text, path);
    }
  }
  const enumProps = {
    Surface: { elevation: Object.keys(catalog.elevation) },
    Container: { measure: Object.keys(catalog.measure) },
    Heading: { kind: Object.keys(catalog.heading) },
    Text: { variant: Object.keys(catalog.text) },
    Section: { spaceAfter: Object.keys(catalog.spacing) },
    BackLink: { href: null }, InlineLink: { href: null },
  };
  function jsx(node) {
    node = unparen(node);
    if (ts.isJsxFragment(node)) { for (const child of node.children) childNode(child); return; }
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) fail(node, 'only static primitive JSX can be returned');
    const open = ts.isJsxElement(node) ? node.openingElement : node;
    const tag = ts.isIdentifier(open.tagName) ? open.tagName.text : '';
    if (!bindings.has(tag) || (!primitiveNames.includes(tag) && tag !== 'Nav' && tag !== 'Footer')) fail(open, 'raw HTML and unapproved components are forbidden');
    if (open.typeArguments?.length) fail(open, 'JSX type arguments are forbidden');
    const seen = new Set();
    for (const attr of open.attributes.properties) {
      if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) fail(attr, 'JSX spreads and namespaced attributes are forbidden');
      const name = attr.name.text;
      if (!Object.hasOwn(enumProps[tag] ?? {}, name) || seen.has(name)) fail(attr, `unapproved or duplicate ${tag} prop: ${name}`);
      seen.add(name);
      const literal = ts.isJsxExpression(attr.initializer ?? attr) ? attr.initializer.expression : attr.initializer;
      if (!isString(literal)) fail(attr, 'props require literal semantic tokens; expressions, casts and raw styles are forbidden');
      if (name === 'href') {
        if (!/^(?:\/(?!\/)[^\s\\]*|mailto:[^\s<>]+)$/.test(literal.text)) fail(attr, 'href must be a local path or mailto target');
      } else if (!enumProps[tag][name].includes(literal.text)) fail(attr, `unknown ${name} token: ${literal.text}`);
    }
    for (const required of ({ Container: ['measure'], Heading: ['kind'], BackLink: ['href'], InlineLink: ['href'] }[tag] ?? [])) if (!seen.has(required)) fail(open, `${tag} requires ${required}`);
    if (ts.isJsxElement(node)) {
      if (tag === 'Nav' || tag === 'Footer') fail(node, 'legacy shell imports must be prop-free self-closing elements');
      for (const child of node.children) childNode(child);
    }
  }
  function childNode(node) {
    if (ts.isJsxText(node)) return;
    if (ts.isJsxExpression(node)) {
      if (node.dotDotDotToken) fail(node, 'spread children are forbidden');
      if (!node.expression || isString(node.expression)) return;
      fail(node, 'children expressions must be literal text; dynamic code is forbidden');
    }
    jsx(node);
  }
  let metadataCount = 0;
  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    if (ts.isFunctionDeclaration(statement)) {
      if (!statement.name || bindings.has(statement.name.text) || functions.has(statement.name.text) || statement.parameters.length || statement.typeParameters || statement.type || statement.asteriskToken || !statement.body ||
          !modifiers(statement).every(k => k === ts.SyntaxKind.ExportKeyword || k === ts.SyntaxKind.DefaultKeyword) || !modifiers(statement).includes(ts.SyntaxKind.ExportKeyword)) fail(statement, 'components must be exported, parameter-free static functions');
      functions.add(statement.name.text);
      if (statement.body.statements.length !== 1 || !ts.isReturnStatement(statement.body.statements[0]) || !statement.body.statements[0].expression) fail(statement, 'component body must contain only its JSX return');
      jsx(statement.body.statements[0].expression);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const declarations = statement.declarationList.declarations;
      const d = declarations[0];
      if (metadataCount++ || modifiers(statement).join() !== String(ts.SyntaxKind.ExportKeyword) || !(statement.declarationList.flags & ts.NodeFlags.Const) || declarations.length !== 1 || !ts.isIdentifier(d.name) || d.name.text !== 'metadata' || d.type || !d.initializer || !ts.isCallExpression(d.initializer) || d.initializer.typeArguments || !ts.isIdentifier(d.initializer.expression) || d.initializer.expression.text !== 'createPageMetadata' || bindings.get('createPageMetadata') !== '@/lib/metadata' || d.initializer.arguments.length !== 1 || !ts.isObjectLiteralExpression(d.initializer.arguments[0])) fail(statement, 'only the literal createPageMetadata export is allowed');
      const object = d.initializer.arguments[0];
      const keys = new Set();
      for (const p of object.properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name) || !['title', 'description', 'path', 'keywords'].includes(p.name.text) || keys.has(p.name.text)) fail(p, 'metadata requires fixed, unique literal fields');
        keys.add(p.name.text);
        if (p.name.text === 'keywords' ? !ts.isArrayLiteralExpression(p.initializer) || !p.initializer.elements.every(isString) : !isString(p.initializer)) fail(p, 'metadata values must be literal text');
      }
      continue;
    }
    fail(statement, 'unsupported statement: imports, literal metadata and static JSX components only');
  }
}

export function checkAdapter(source, css, catalog) {
  const printer = ts.createPrinter({ removeComments: true });
  if (printer.printFile(parse(source, 'primitives.tsx')) !== printer.printFile(parse(adapterSource(catalog), 'primitives.tsx'))) throw new Error('primitives.tsx: adapter AST differs from the reviewed recipe; regenerate or review the policy change');
  const structure = (text) => postcss.parse(text).nodes.filter(n => n.type !== 'comment').map(rule => {
    if (rule.type !== 'rule') throw new Error('adapter CSS: only reviewed rules are allowed');
    return [rule.selector, rule.nodes.filter(n => n.type !== 'comment').map(d => {
      if (d.type !== 'decl') throw new Error('adapter CSS: only reviewed declarations are allowed');
      return [d.prop, d.value, Boolean(d.important)];
    })];
  });
  if (JSON.stringify(structure(css)) !== JSON.stringify(structure(adapterCss(catalog)))) throw new Error('primitives.module.css: CSS AST differs from the reviewed token-only recipe');
}

async function filesUnder(directory) {
  const info = await lstat(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${directory}: scope roots must be real directories`);
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = resolve(directory, name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`${path}: symlinks cannot cross the scope boundary`);
    if (info.isDirectory()) files.push(...await filesUnder(path));
    else if (info.isFile()) files.push(path);
    else throw new Error(`${path}: unsupported scoped filesystem entry`);
  }
  return files;
}

export async function checkProject(root = projectRoot) {
  const catalog = validateCatalog(JSON.parse(await readFile(resolve(root, adapterPath, 'tokens.json'), 'utf8')));
  const adapterFiles = (await filesUnder(resolve(root, adapterPath))).map(p => relative(resolve(root, adapterPath), p)).sort();
  if (adapterFiles.join('|') !== ['primitives.module.css', 'primitives.tsx', 'tokens.json'].sort().join('|')) throw new Error('adapter directory contains an unreviewed file');
  checkAdapter(await readFile(resolve(root, adapterPath, 'primitives.tsx'), 'utf8'), await readFile(resolve(root, adapterPath, 'primitives.module.css'), 'utf8'), catalog);
  const files = await filesUnder(resolve(root, consumerPath));
  if (!files.includes(resolve(root, consumerPath, 'page.tsx'))) throw new Error('Support page.tsx is required');
  for (const file of files) {
    if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) throw new Error(`${relative(root, file)}: only checked .ts/.tsx consumer sources are allowed`);
    checkConsumer(await readFile(file, 'utf8'), relative(root, file), catalog);
  }
  return files.length;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('check accepts no scope overrides or disable flags');
    console.log(`Design system AST gate passed (${await checkProject()} Support source file(s), paired catalog and exact adapter boundary).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
