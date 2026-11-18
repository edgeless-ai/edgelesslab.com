// Real-network publication witness; no routes, mocks, or notebook execution stubs.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'https://edgelesslab.com';
const dir = path.resolve(process.argv[3] || 'marimo-csp-evidence');
await mkdir(dir, { recursive: true });
const catalogDir = path.resolve('src/lib/marimo-entries');
const catalog = await Promise.all((await readdir(catalogDir)).filter(f => f.endsWith('.json')).sort()
  .map(async f => JSON.parse(await readFile(path.join(catalogDir, f), 'utf8'))));
const targets = [
  catalog.find(d => d.published_url?.startsWith('https://marimo.edgelesslab.com/')),
  catalog.find(d => d.published_url?.startsWith('https://edgelesslab.com/marimo/')),
];
if (targets.some(d => !d)) throw new Error('Need both admitted legacy and primary-domain notebooks');
const browser = await chromium.launch();
const report = {
  base, checkedAt: new Date().toISOString(), source: 'src/lib/marimo-entries/*.json',
  passScope: 'Target notebook rendered; no CSP violations, page errors or parent overflow. Unrelated external bundle console errors are retained, not gated.',
  pages: [],
};
try {
  for (const width of [1440, 390]) {
    for (const target of targets) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const entry = { width, slug: target.slug, publishedUrl: target.published_url, cspViolations: [], consoleErrors: [], pageErrors: [] };
      report.pages.push(entry);
      await page.exposeFunction('recordViolation', value => entry.cspViolations.push(value));
      await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
        window.recordViolation({ directive: event.effectiveDirective, blockedURI: event.blockedURI });
      }));
      page.on('console', m => { if (m.type() === 'error') entry.consoleErrors.push({ text: m.text(), url: m.location().url }); });
      page.on('pageerror', e => entry.pageErrors.push(e.message));
      try {
        const response = await page.goto(new URL('/lab/marimo/', base).href, { waitUntil: 'domcontentloaded' });
        entry.status = response.status();
        entry.policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
        await page.getByRole('button', { name: 'Reject analytics', exact: true }).click();
        const card = page.locator('main a:has(h3)').filter({ has: page.getByRole('heading', { name: target.title, exact: true }) });
        await card.scrollIntoViewIfNeeded();
        const frame = card.locator('iframe');
        await frame.waitFor();
        const published = new URL(target.published_url);
        const expected = published.origin === 'https://edgelesslab.com' ? `${published.pathname}${published.search}${published.hash}` : target.published_url;
        entry.frameSrc = await frame.getAttribute('src');
        await expect(frame).toHaveAttribute('src', expected);
        // A real notebook markdown heading proves more than an iframe element or
        // the Pyodide loading shell. No model/numerical claims are inferred.
        entry.notebookHeading = await frame.contentFrame().locator('h1').first().innerText({ timeout: 120_000 });
        entry.notebookBodyExcerpt = (await frame.contentFrame().locator('body').innerText()).slice(0, 1200);
        entry.documentOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
        await page.screenshot({ path: path.join(dir, `${target.slug}-${width}.png`) });
        entry.pass = entry.status === 200 && !!entry.notebookHeading && entry.documentOverflow === 0
          && entry.cspViolations.length === 0 && entry.pageErrors.length === 0
          && !entry.consoleErrors.some(e => /Content Security Policy|Framing/i.test(e.text));
      } catch (error) {
        entry.error = error.message;
        entry.pass = false;
        await page.screenshot({ path: path.join(dir, `${target.slug}-${width}-failed.png`) }).catch(() => {});
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(path.join(dir, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.pages.length !== 4 || report.pages.some(e => !e.pass)) process.exitCode = 1;
