import ts from 'typescript';

/** Parse the static catalog without executing old branch code or maintaining a second list. */
export function publicationEntries(source) {
  const file = ts.createSourceFile('marimo-demos.ts', source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((node) => ts.isIdentifier(node.name) && node.name.text === 'marimoDemos');
  if (!declaration?.initializer || !ts.isArrayLiteralExpression(declaration.initializer) || file.parseDiagnostics.length) {
    throw new Error('Expected a valid static marimoDemos array');
  }
  const entries = new Map();
  for (const node of declaration.initializer.elements) {
    if (!ts.isObjectLiteralExpression(node)) throw new Error('Notebook entries must be static objects');
    const properties = new Map();
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('Notebook properties must be static assignments');
      }
      const key = property.name.text;
      if (properties.has(key)) throw new Error('Duplicate notebook property');
      properties.set(key, property.initializer);
    }
    const slug = properties.get('slug');
    if (!slug || !ts.isStringLiteral(slug) || entries.has(slug.text)) throw new Error('Invalid/duplicate notebook slug');
    const url = properties.get('published_url');
    if (url && !ts.isStringLiteral(url) && url.kind !== ts.SyntaxKind.NullKeyword) throw new Error('Publication URLs must be literal or null');
    entries.set(slug.text, {
      published: !!url && ts.isStringLiteral(url),
      // Any metadata change also rechecks delivery, not just URL additions.
      source: ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, file),
    });
  }
  return entries;
}

export function changedPublications(before, after) {
  const old = publicationEntries(before);
  return [...publicationEntries(after)].filter(([slug, entry]) =>
    entry.published && old.get(slug)?.source !== entry.source,
  ).map(([slug]) => slug);
}
