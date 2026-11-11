import ts from 'typescript';

/**
 * Publication diffing over the per-notebook registry
 * (`src/lib/marimo-entries/<slug>.json`), so publisher preflight still probes
 * only the entries a branch actually touches.
 *
 * An entry's fingerprint is canonical JSON, not raw file text, so the same
 * notebook compares equal whether it is read from the current JSON registry or
 * from the legacy `src/lib/marimo-demos.ts` array at the merge base.
 */

const sortValue = (value) => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
};

const fingerprint = (entry) => {
  const copy = { ...entry };
  // Unpublished entries carry no URL at all in JSON and `null` in the legacy
  // array; both mean "not opted in" and must fingerprint identically.
  if (copy.published_url == null) delete copy.published_url;
  return JSON.stringify(sortValue(copy));
};

function normalize(entry, origin) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Notebook entry must be an object (${origin})`);
  }
  if (typeof entry.slug !== 'string' || !entry.slug) {
    throw new Error(`Invalid notebook slug (${origin})`);
  }
  if (entry.published_url != null && typeof entry.published_url !== 'string') {
    throw new Error(`Publication URLs must be a literal string or omitted (${origin})`);
  }
  return { slug: entry.slug, published: entry.published_url != null, source: fingerprint(entry) };
}

/** Build a catalog from `{ filename: jsonText }` (Map or plain object). */
export function publicationEntries(files) {
  const entries = files instanceof Map ? [...files] : Object.entries(files);
  const catalog = new Map();
  for (const [name, text] of entries) {
    let entry;
    try {
      entry = JSON.parse(text);
    } catch {
      throw new Error(`Notebook entry ${name} must be valid JSON`);
    }
    const record = normalize(entry, name);
    // The filename carries the slug: a registry file that disagrees with itself
    // is a broken link waiting to ship.
    if (name !== record.slug && name !== `${record.slug}.json`) {
      throw new Error(`Notebook entry ${name} must be named after its slug (${record.slug}.json)`);
    }
    if (catalog.has(record.slug)) throw new Error('Duplicate notebook slug');
    catalog.set(record.slug, record);
  }
  return catalog;
}

/** Legacy reader: the single-array `marimoDemos` catalog at an older revision. */
export function legacyPublicationEntries(source) {
  const file = ts.createSourceFile('marimo-demos.ts', source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((node) => ts.isIdentifier(node.name) && node.name.text === 'marimoDemos');
  if (!declaration?.initializer || !ts.isArrayLiteralExpression(declaration.initializer) || file.parseDiagnostics.length) {
    throw new Error('Expected a valid static marimoDemos array');
  }
  const catalog = new Map();
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
      const initializer = property.initializer;
      const value = ts.isStringLiteral(initializer) ? initializer.text
        : initializer.kind === ts.SyntaxKind.NullKeyword ? null
        : ts.isArrayLiteralExpression(initializer) && initializer.elements.every(ts.isStringLiteral)
          ? initializer.elements.map((element) => element.text)
          : undefined;
      if (value === undefined) throw new Error(`Notebook property ${key} must be static`);
      properties.set(key, value);
    }
    const record = normalize(Object.fromEntries(properties), 'marimo-demos.ts');
    if (catalog.has(record.slug)) throw new Error('Invalid/duplicate notebook slug');
    catalog.set(record.slug, record);
  }
  return catalog;
}

/** Slugs that are published now AND whose metadata/URL changed since `before`. */
export function changedPublications(before, after) {
  const previous = before instanceof Map ? before : publicationEntries(before);
  const next = after instanceof Map ? after : publicationEntries(after);
  return [...next].filter(([slug, entry]) =>
    entry.published && previous.get(slug)?.source !== entry.source,
  ).map(([slug]) => slug);
}
