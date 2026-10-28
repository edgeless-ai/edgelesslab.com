/**
 * verify-2609.27105-publish.mjs
 * Verification script for the marimo demo 2609.27105-completeness-scope
 *
 * Publication gate checks:
 * 1. HTTP 200
 * 2. WASM app loads (marimo cells present)
 * 3. One slider present: max_nuts (min=1, max=4, default=1, step=1)
 * 4. Default heading: "Scope: up to 1 nut; 2 bounded instances; test-only verdict: both plans pass."
 * 5. SVG chart with data-chart="completeness-scope" and data-bound="1" present
 * 6. Chart SHA-256 matches expected default: 3e3bfe3ade729dfdd0e08f743e71d27183978857eeb9fcd8fd0b6f96b0416a7c
 * 7. After slider mutation (End -> bound 4):
 *    - Heading: "Scope: up to 4 nuts; 30 bounded instances; hidden bug fails 26."
 *    - data-bound changed "1" -> "4"
 *    - Chart SHA-256 matches expected endpoint: e47cfcc05b8cfd663e2b64056cc582f06aa967681ef52cc6452c87ff905786db
 * 8. Zero console errors and request errors (desktop)
 * 9. Narrow viewport (390x844): 0px horizontal overflow, same app/heading checks pass
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';

const VERIFY_URL = process.env.VERIFY_URL || 'https://marimo.edgelesslab.com/2609.27105-completeness-scope/';
const RESULTS_FILE = 'verify-results-2609.27105.json';

const EXPECTED_DEFAULT_HEADING = 'Scope: up to 1 nut; 2 bounded instances; test-only verdict: both plans pass.';
const EXPECTED_ENDPOINT_HEADING = 'Scope: up to 4 nuts; 30 bounded instances; hidden bug fails 26.';
const EXPECTED_CHART_HASH_DEFAULT = '3e3bfe3ade729dfdd0e08f743e71d27183978857eeb9fcd8fd0b6f96b0416a7c';
const EXPECTED_CHART_HASH_AFTER = 'e47cfcc05b8cfd663e2b64056cc582f06aa967681ef52cc6452c87ff905786db';
const CHART_SELECTOR = 'svg[data-chart="completeness-scope"]';

const results = {
  url: VERIFY_URL,
  checks: {},
  passed: true,
};

function log(msg) {
  console.log('[verify-2609.27105] ' + msg);
}

async function getHeading(page) {
  return await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3');
    for (const h of headings) {
      const text = h.innerText || '';
      if (text.includes('Scope: up to')) {
        return text;
      }
    }
    const allText = document.body.innerText || '';
    const m = allText.match(/Scope: up to.*/);
    return m ? m[0] : 'NOT FOUND';
  });
}

async function getChartSvg(page) {
  return await page.evaluate(() => {
    const svg = document.querySelector('svg[data-chart="completeness-scope"]');
    if (svg) return svg.outerHTML;
    return null;
  });
}

async function getChartDataBound(page) {
  return await page.evaluate(() => {
    const svg = document.querySelector('svg[data-chart="completeness-scope"]');
    if (!svg) return null;
    return svg.getAttribute('data-bound');
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const requestErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    const f = req.failure();
    if (f) requestErrors.push(req.url() + ' -> ' + f.errorText);
  });

  // === HTTP 200 ===
  const response = await page.goto(results.url, { waitUntil: 'networkidle', timeout: 60000 });
  results.checks.http_status = response ? response.status() : null;
  if (!response || response.status() !== 200) {
    results.passed = false;
    results.checks.error = 'HTTP status ' + (response ? response.status() : 'null') + ' — site not live.';
    await browser.close();
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.passed ? 0 : 1);
  }

  // === WASM app load ===
  try {
    await page.waitForFunction(() => {
      return document.querySelector('.marimo') !== null;
    }, { timeout: 45000 });
  } catch (e) {
    await page.waitForTimeout(10000);
  }
  await page.waitForTimeout(15000);

  const hasCells = await page.evaluate(() => document.querySelector('.marimo-cell') !== null);
  results.checks.app_loaded = hasCells ? 'PASS' : 'FAIL';
  if (!hasCells) results.passed = false;

  // === Slider ===
  const sliders = await page.locator('role=slider').all();
  results.checks.slider_count = sliders.length;
  if (sliders.length < 1) {
    results.passed = false;
    results.checks.slider = 'NO SLIDER FOUND';
  } else {
    const minVal = await sliders[0].getAttribute('aria-valuemin');
    const maxVal = await sliders[0].getAttribute('aria-valuemax');
    const initialVal = await sliders[0].getAttribute('aria-valuenow');
    results.checks.slider_valuemin = minVal;
    results.checks.slider_valuemax = maxVal;
    results.checks.slider_initial_valuenow = initialVal;
    if (minVal !== '1' || maxVal !== '4' || initialVal !== '1') {
      results.passed = false;
      results.checks.slider_values = 'FAIL: expected min=1 max=4 initial=1, got min=' + minVal + ' max=' + maxVal + ' initial=' + initialVal;
    }
  }

  // === Default heading ===
  const defaultHeading = await getHeading(page);
  results.checks.default_heading = defaultHeading;
  if (defaultHeading !== EXPECTED_DEFAULT_HEADING) {
    results.passed = false;
    results.checks.default_heading_check = 'FAIL: expected "' + EXPECTED_DEFAULT_HEADING + '"';
  }

  // === Chart attributes (default) ===
  const defaultDataBound = await getChartSvg ? await getChartDataBound(page) : null;
  results.checks.chart_default_data_bound = defaultDataBound;
  if (defaultDataBound !== '1') {
    results.passed = false;
    results.checks.chart_default_bound_check = 'FAIL: expected data-bound="1", got "' + defaultDataBound + '"';
  }

  // === Capture default chart SVG ===
  const defaultChartHtml = await getChartSvg(page);
  if (!defaultChartHtml) {
    results.checks.chart_present = 'FAIL - NO CHART FOUND';
    results.passed = false;
  } else {
    const chartHash = createHash('sha256').update(defaultChartHtml).digest('hex');
    results.checks.chart_present = 'PASS';
    results.checks.chart_default_hash = chartHash;
    results.checks.chart_default_hash_expected = EXPECTED_CHART_HASH_DEFAULT;
    if (chartHash !== EXPECTED_CHART_HASH_DEFAULT) {
      results.passed = false;
      results.checks.chart_hash_default_check = 'FAIL: hash mismatch';
    }
  }

  // === Horizontal overflow (desktop) ===
  const overflowPx = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  results.checks.horizontal_overflow_px = overflowPx;
  if (overflowPx > 0) results.passed = false;

  // === Console and request errors (desktop) ===
  results.checks.console_errors = consoleErrors.length;
  results.checks.request_errors = requestErrors.length;
  if (consoleErrors.length > 0 || requestErrors.length > 0) {
    results.passed = false;
    results.checks.console_error_texts = consoleErrors.slice(0, 10);
    results.checks.request_error_texts = requestErrors.slice(0, 10);
  }

  // === Slider mutation: max_nuts 1 -> 4 ===
  if (sliders.length > 0) {
    await sliders[0].focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(8000);

    const afterVal = await sliders[0].getAttribute('aria-valuenow');
    results.checks.slider_after_valuenow = afterVal;
    if (afterVal !== '4') results.passed = false;

    // === Changed heading ===
    const changedHeading = await getHeading(page);
    results.checks.changed_heading = changedHeading;
    if (changedHeading !== EXPECTED_ENDPOINT_HEADING) {
      results.passed = false;
      results.checks.changed_heading_check = 'FAIL: expected "' + EXPECTED_ENDPOINT_HEADING + '"';
    }

    // === data-bound should be "4" after mutation ===
    const changedDataBound = await getChartDataBound(page);
    results.checks.chart_endpoint_data_bound = changedDataBound;
    if (changedDataBound !== '4') {
      results.passed = false;
      results.checks.chart_endpoint_bound_check = 'FAIL: expected data-bound="4", got "' + changedDataBound + '"';
    }

    // === Chart mutation (SHA-256 should differ) ===
    await page.waitForTimeout(3000);
    const afterChartHtml = await getChartSvg(page);
    if (afterChartHtml) {
      const afterHash = createHash('sha256').update(afterChartHtml).digest('hex');
      results.checks.chart_after_hash = afterHash;
      results.checks.chart_after_hash_expected = EXPECTED_CHART_HASH_AFTER;
      results.checks.chart_changed = defaultChartHtml !== afterChartHtml ? 'PASS' : 'FAIL';
      if (defaultChartHtml === afterChartHtml) {
        results.passed = false;
      }
      if (afterHash !== EXPECTED_CHART_HASH_AFTER) {
        results.passed = false;
        results.checks.chart_hash_after_check = 'FAIL: hash mismatch';
      }
    } else {
      results.checks.chart_changed = 'FAIL - CHART DATA NOT FOUND AFTER INTERACTION';
      results.passed = false;
    }
  } else {
    results.checks.chart_changed = 'SKIP - no slider';
    results.passed = false;
  }

  await browser.close();

  // === Narrow viewport check (390x844) ===
  const browser2 = await chromium.launch({ headless: true });
  const context2 = await browser2.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await context2.newPage();
  const consoleErrors2 = [];
  const requestErrors2 = [];
  page2.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors2.push(msg.text());
  });
  page2.on('requestfailed', (req) => {
    const f = req.failure();
    if (f) requestErrors2.push(req.url() + ' -> ' + f.errorText);
  });

  const resp2 = await page2.goto(results.url, { waitUntil: 'networkidle', timeout: 60000 });
  results.checks.narrow_http_status = resp2.status();
  if (resp2.status() !== 200) {
    results.passed = false;
    results.checks.narrow_error = 'HTTP status ' + resp2.status();
  } else {
    try {
      await page2.waitForFunction(() => document.querySelector('.marimo') !== null, { timeout: 45000 });
    } catch (e) {
      await page2.waitForTimeout(10000);
    }
    await page2.waitForTimeout(15000);

    const narrowHeading = await page2.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3');
      for (const h of headings) {
        const text = h.innerText || '';
        if (text.includes('Scope: up to')) {
          return text;
        }
      }
      const allText = document.body.innerText || '';
      const m = allText.match(/Scope: up to.*/);
      return m ? m[0] : 'NOT FOUND';
    });
    results.checks.narrow_heading = narrowHeading;
    if (narrowHeading !== EXPECTED_DEFAULT_HEADING) {
      results.passed = false;
    }

    const narrowOverflowPx = await page2.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    results.checks.narrow_overflow_px = narrowOverflowPx;
    if (narrowOverflowPx > 0) results.passed = false;

    results.checks.narrow_console_errors = consoleErrors2.length;
    results.checks.narrow_request_errors = requestErrors2.length;
    if (consoleErrors2.length > 0 || requestErrors2.length > 0) {
      results.passed = false;
      results.checks.narrow_console_error_texts = consoleErrors2.slice(0, 10);
      results.checks.narrow_request_error_texts = requestErrors2.slice(0, 10);
    }
  }

  await browser2.close();

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.passed ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(2); });
