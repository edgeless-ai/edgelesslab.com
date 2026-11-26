import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage();
  for (const url of ['https://soas-repository.worktribe.com/output/377701', 'https://eprints.soton.ac.uk/459924/1/229515.pdf', 'https://doi.org/10.1093/llc/fqac037', 'https://xtf.lib.virginia.edu/xtf/view?docId=StudiesInBiblio%2FuvaBook%2Ftei%2Fsibv020.xml;chunk.id=vol020.12;toc.depth=1;toc.id=;brand=default']) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(6000);
      results.push({ url, status: response?.status(), finalUrl: page.url(), title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 2000) });
    } catch (error) { results.push({ url, error: String(error) }); }
  }
} finally { await browser.close(); }
await writeFile('evidence/lia/citation-browser-recovery.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
