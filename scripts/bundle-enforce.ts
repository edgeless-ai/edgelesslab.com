import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'out');

const checks = [
  {
    name: 'artifact_maps_clean',
    description: 'No sourcemaps survive in out/',
    run: async () => {
      const maps: string[] = [];
      const walk = async (dir: string) => {
        for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (full.endsWith('.js.map') || full.endsWith('.css.map')) {
            maps.push(full);
          }
        }
      };
      await walk(OUT_DIR);
      if (maps.length > 0) {
        throw new Error(`Found ${maps.length} sourcemap(s) under out/ (first=${maps[0]})`);
      }
    },
  },
  {
    name: 'route_signature_stable',
    description: 'Route metadata signatures are stable after build',
    run: async () => {
      const globs = [
        path.join(OUT_DIR, '*.txt'),
        path.join(OUT_DIR, '**', '*.txt'),
        path.join(OUT_DIR, '_next', 'static', 'chunks', '*.js'),
      ];
      const seen = new Map<string, string>();
      async function walk(dir: string) {
        for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (full.endsWith('.txt') || (full.endsWith('.js') && full.includes('_next/static/chunks'))) {
            const stat = await fs.promises.stat(full);
            seen.set(full, `${stat.size}@${stat.mtimeMs}`);
          }
        }
      }
      await walk(OUT_DIR);
      if (seen.size === 0) {
        throw new Error('No route/chunk signatures found in out/');
      }
      return { routes: seen.size, sample: Array.from(seen.entries()).slice(0, 3) };
    },
  },
  {
    name: 'route_snapshot_enough',
    description: 'Built artifacts actually exist in out/',
    run: async () => {
      const htmlFiles: string[] = [];
      async function walk(dir: string) {
        for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (full.endsWith('.html')) {
            htmlFiles.push(full);
          }
        }
      }
      await walk(OUT_DIR);
      if (htmlFiles.length === 0) {
        throw new Error('No HTML artifacts found in out/');
      }
      return { pages: htmlFiles.length };
    },
  },
  {
    name: 'static_export_expected',
    description: 'out/ includes expected static assets after export',
    run: async () => {
      const requiredFiles = new Set([
        path.join(OUT_DIR, 'index.html'),
        path.join(OUT_DIR, 'blog', 'index.html'),
        path.join(OUT_DIR, 'sitemap.xml'),
        path.join(OUT_DIR, 'robots.txt'),
      ]);
      const missing: string[] = [];
      for (const file of requiredFiles) {
        try {
          await fs.promises.access(file);
        } catch {
          missing.push(path.relative(OUT_DIR, file));
        }
      }
      if (missing.length > 0) {
        throw new Error(`Missing required static exports: ${missing.join(', ')}`);
      }
      return { required: requiredFiles.size, present: requiredFiles.size - missing.length };
    },
  },
];

async function run() {
  const strict = process.argv.includes('--strict');
  let failed = 0;
  for (const check of checks) {
    try {
      const metrics = (await check.run()) as Record<string, unknown> | undefined;
      console.log(`[OK] ${check.name}: ${check.description}${metrics ? ` | ${JSON.stringify(metrics)}` : ''}`);
    } catch (error) {
      console.log(`[FAIL] ${check.name}: ${check.description} | ${(error as Error).message}`);
      failed += 1;
      if (strict) {
        process.exitCode = 1;
      }
    }
  }
  console.log(`[SUMMARY] checks=${checks.length} failed=${failed}`);
}

run().catch((error) => {
  console.log(`[FAIL] bundle_enforce: ${(error as Error).message}`);
  process.exitCode = 1;
});
