import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'https://edgelesslab.com';
const dir = path.resolve(process.argv[3] || 'gumroad-csp-evidence');
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { base, checkedAt: new Date().toISOString(), pages: [] };
try {
  for (const route of ['/products/', '/', '/about/']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const entry = { route, cspViolations: [], consoleErrors: [], pageErrors: [], failedRequests: [] };
    await page.exposeFunction('recordViolation', value => entry.cspViolations.push(value));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
      window.recordViolation({ directive: event.effectiveDirective, blockedURI: event.blockedURI, sourceFile: event.sourceFile });
    }));
    page.on('console', message => { if (message.type() === 'error') entry.consoleErrors.push(message.text()); });
    page.on('pageerror', error => entry.pageErrors.push(error.message));
    page.on('requestfailed', request => {
      const url = new URL(request.url());
      entry.failedRequests.push({ url: `${url.origin}${url.pathname}`, error: request.failure()?.errorText });
    });
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle', timeout: 60000 });
    entry.status = response?.status();
    entry.policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    if (route === '/products/') {
      // Gumroad uses lazyOnload. Wait for its real external bundle to install the iframe.
      await page.waitForFunction(() => !!document.querySelector('iframe'), null, { timeout: 15000 }).catch(() => {});
      entry.overlayScript = await page.locator('script[src="https://assets.gumroad.com/js/gumroad-bundle.js"]').count();
      const buy = page.locator('a[href*="edgelessai.gumroad.com/l/"]').filter({ hasText: /Purchase|Download/ }).first();
      entry.buyHref = await buy.getAttribute('href');
      await buy.click();
      const frame = page.locator('iframe[src*="edgelessai.gumroad.com/l/"]');
      try {
        await frame.waitFor({ state: 'visible', timeout: 30000 });
        // A frame becoming visible means Gumroad replied with its height message.
        entry.overlayVisible = true;
        entry.frameSrc = await frame.getAttribute('src');
        entry.frameTitle = await frame.contentFrame().locator('h1').first().textContent({ timeout: 10000 });
        await frame.contentFrame().locator('h1').first().scrollIntoViewIfNeeded();
      } catch (error) {
        entry.overlayVisible = await frame.isVisible().catch(() => false);
        entry.overlayError = error.message;
      }
      await page.screenshot({ path: path.join(dir, 'products-overlay.png') });
    }
    report.pages.push(entry);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(dir, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.pages.length !== 3 || report.pages.some(page => page.status !== 200 || page.cspViolations.length || page.consoleErrors.length || page.pageErrors.length || (page.route === '/products/' && (!page.overlayVisible || !page.frameTitle || page.overlayError)))) process.exitCode = 1;
