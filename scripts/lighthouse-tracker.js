/**
 * Aggregate Lighthouse CI results into a time-series JSON file.
 * Expects LHCI_RESULTS_FILE env var (set by treosh/lighthouse-ci-action)
 * or reads from .lighthouseci/ manifest.
 */
const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(process.cwd(), 'data', 'lighthouse-history.json');
const LHCI_DIR = path.join(process.cwd(), '.lighthouseci');

function readManifest() {
  const manifestPath = path.join(LHCI_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('No manifest found at', manifestPath);
    return [];
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readReport(url) {
  const manifest = readManifest();
  const entry = manifest.find(e => e.url === url);
  if (!entry) return null;
  const reportPath = path.join(LHCI_DIR, entry.jsonPath);
  if (!fs.existsSync(reportPath)) return null;
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function extractScores(report) {
  const cats = report.categories;
  return {
    performance: Math.round(cats.performance.score * 100),
    accessibility: Math.round(cats.accessibility.score * 100),
    bestPractices: Math.round(cats['best-practices'].score * 100),
    seo: Math.round(cats.seo.score * 100)
  };
}

function main() {
  const urls = [
    'https://edgelesslab.com/',
    'https://edgelesslab.com/blog/',
    'https://edgelesslab.com/products/',
    'https://edgelesslab.com/about/'
  ];

  let history = { runs: [] };
  if (fs.existsSync(HISTORY_PATH)) {
    history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  }

  const run = {
    timestamp: new Date().toISOString(),
    scores: {}
  };

  for (const url of urls) {
    const report = readReport(url);
    if (report) {
      run.scores[url] = extractScores(report);
      console.log(`${url}:`, JSON.stringify(run.scores[url]));
    } else {
      console.warn(`No report for ${url}`);
    }
  }

  history.runs.push(run);
  // Keep last 52 runs (≈ 1 year weekly)
  if (history.runs.length > 52) {
    history.runs = history.runs.slice(-52);
  }

  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log('Wrote history to', HISTORY_PATH);
}

main();
