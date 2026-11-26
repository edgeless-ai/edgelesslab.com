import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8877';
const dest = process.argv[3] || 'evidence/lia';
mkdirSync(dest, { recursive: true });
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = process.env.CHROME_PATH || (existsSync(macChrome) ? macChrome : chromium.executablePath());
for (const [name, path] of [['landing', '/lia/'], ['note', '/lia/building-an-instrument-that-can-say-no/']]) {
  const result = spawnSync('npx', ['--yes', 'lighthouse', `${base}${path}`, '--only-categories=accessibility', '--preset=desktop', '--throttling-method=provided', '--disable-storage-reset', '--chrome-flags=--headless --no-sandbox --disable-background-timer-throttling --disable-renderer-backgrounding', '--output=json', `--output-path=${dest}/lighthouse-${name}.json`, '--quiet'], { env: { ...process.env, CHROME_PATH: chrome }, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
  const report = JSON.parse(readFileSync(`${dest}/lighthouse-${name}.json`, 'utf8'));
  console.log(`${name}: accessibility ${report.categories.accessibility.score * 100}`);
  if (report.categories.accessibility.score < 0.95) process.exitCode = 1;
}
