#!/usr/bin/env node
// Internal bridge for generate-blog-meta.py. Evaluates trusted local registry
// modules using the site's installed TypeScript compiler; never fetches packages.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';

function evaluateRegistry(root) {
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const entry = fs.realpathSync(path.join(root, 'src/lib/blog.ts'));
  const modules = new Map();
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  };

  function load(filename) {
    filename = fs.realpathSync(filename);
    if (!filename.startsWith(root + path.sep)) throw new Error(`Import outside --root: ${filename}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const source = fs.readFileSync(filename, 'utf8');
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(ast.parseDiagnostics, {
      getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n',
    }));
    if (filename === entry) {
      const declared = ast.statements.some(statement => ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(declaration =>
          ts.isIdentifier(declaration.name) && declaration.name.text === 'allPosts'));
      if (!declared) throw new Error('Registry must declare top-level allPosts');
    }
    // Export the private raw registry ONLY inside this in-memory compilation.
    // The actual source file and its publication exports remain untouched.
    const result = ts.transpileModule(source + (filename === entry ? '\nexport { allPosts as __blogMetaAllPosts };\n' : ''), {
      compilerOptions, fileName: filename, reportDiagnostics: true,
    });
    const errors = (result.diagnostics ?? []).filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
    const compiledModule = { exports: {} };
    modules.set(filename, compiledModule);
    function localRequire(specifier) {
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        throw new Error(`Registry imports must be relative local modules: ${specifier}`);
      }
      const base = path.resolve(path.dirname(filename), specifier);
      const resolved = [base, `${base}.ts`, path.join(base, 'index.ts')].find(candidate =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!resolved || path.extname(resolved) !== '.ts') throw new Error(`Cannot resolve TypeScript registry import: ${specifier}`);
      return load(resolved);
    }
    // Not a security sandbox: modules are trusted code. A fresh context prevents
    // incidental stdout from corrupting the bridge JSON; timeouts bound evaluation.
    vm.runInNewContext(result.outputText, {
      module: compiledModule, exports: compiledModule.exports, require: localRequire,
    }, { filename, timeout: 5000 });
    return compiledModule.exports;
  }

  const { posts, __blogMetaAllPosts: allPosts } = load(entry);
  function validatePosts(value, label, unique) {
    if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a nonempty array`);
    const seen = new Set();
    for (const post of value) {
      if (!post || typeof post !== 'object' || Array.isArray(post)) throw new Error(`${label}: invalid post`);
      for (const field of ['slug', 'title', 'description', 'date', 'readTime', 'content']) {
        if (typeof post[field] !== 'string' || !post[field].trim()) throw new Error(`${label}: invalid ${field}`);
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error(`${label}: invalid slug ${post.slug}`);
      if (!Array.isArray(post.tags) || !post.tags.every(tag => typeof tag === 'string')) throw new Error(`${label}: invalid tags`);
      if (unique && seen.has(post.slug)) throw new Error(`${label}: duplicate slug ${post.slug}`);
      seen.add(post.slug);
    }
  }
  validatePosts(allPosts, 'allPosts', false);
  validatePosts(posts, 'posts', true);
  const firstBySlug = new Map();
  for (const post of allPosts) if (!firstBySlug.has(post.slug)) firstBySlug.set(post.slug, post);
  const expected = [...firstBySlug.values()];
  // blog.ts deliberately deduplicates first-winner slugs. Any other filtering,
  // ordering or value transformation needs an explicit generator contract change.
  if (JSON.stringify(expected) !== JSON.stringify(posts)) {
    throw new Error('posts count/order/slug set or values differ from first-winner allPosts registry');
  }
  const metadata = posts.map(post => Object.fromEntries(Object.entries(post).filter(([key]) => key !== 'content')));
  const payload = { rawCount: allPosts.length, registrySlugs: posts.map(post => post.slug), metadata };
  const encoded = JSON.stringify(payload, (_key, value) => {
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' ||
        (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Non-JSON registry metadata');
    return value;
  });
  // Compare plain JSON to ensure serialization did not change post identities.
  const decoded = JSON.parse(encoded);
  if (!isDeepStrictEqual(decoded.registrySlugs, Array.from(payload.registrySlugs)) ||
      decoded.metadata.length !== posts.length || decoded.metadata.some(post => Object.hasOwn(post, 'content'))) {
    throw new Error('Generated metadata count/slug set/content validation failed');
  }
  return encoded;
}

try {
  process.stdout.write(evaluateRegistry(fs.realpathSync(process.argv[2])) + '\n');
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
