# Agent-Browser Evaluation Report

**Date:** 2026-08-05
**Repository:** edgelesslab.com
**Agent-Browser Version:** 0.27.0
**Playwright Version:** project-installed via `npm install`

## Executive Summary

**agent-browser v0.27.0 is not ready to replace Playwright for E2E testing on this project.** It is a capable automation tool for interactive sessions, debugging, and one-off page inspections, but it lacks the structured test framework, assertion library, and CI integration that Playwright provides. The most appropriate use is as a complementary debugging tool, not a replacement.

---

## 1. Baseline: Existing Playwright Tests

| Test | Result | Notes |
|------|--------|-------|
| Home page renders (nav + hero) | PASS | 200 + nav visible + h1 visible + title match |
| /lab/marimo/ 25+ links | PASS | 25+ unique external links resolved |
| /field-notes/ featured studies | PASS | 6+ cards visible |
| Command palette open + search | FAIL | pagefind.js 404 from static export (pre-existing) |
| No severe console errors | PASS | Known issues filtered |

**Playwright strengths:**
- 5 test files covering smoke, E2E, and performance (6 tests, 1 performance suite)
- Built-in assertions (`expect(page).toHaveTitle()`, `toBeVisible()`, `toEqual([])`)
- `--reporter=list` for CI-friendly output
- Console error collection with known-issue filtering
- CDP session for network throttling (performance tests)
- `page.on("pageerror")` for runtime JS error tracking

## 2. Agent-Browser Trial Results

| Scenario | Result | Time |
|----------|--------|------|
| `open /blog/` | PASS (title + URL returned) | ~1s |
| `snapshot -i` (interactive) | PASS (full ref tree, 180+ elements) | ~0.5s |
| `click @e99` (⌘K Search button) | PASS (dialog opens) | ~0.5s |
| `fill @e172` (search textbox) | PASS (value set) | ~0.5s |
| `get value @e172` | PASS (returns entered text) | ~0.3s |
| `eval` (JS execution) | PASS (inline JS works) | ~0.3s |
| `find textbox` (role-based selection) | PASS | ~0.5s |
| `batch` mode (chained commands) | PASS | ~0.3s/command |
| `screenshot` | not tested (no visual regression need) | — |
| navigation to /lab/marimo/, /field-notes/, /blog/ | PASS (all 200) | ~1s each |

**Agent-browser strengths:**
- Extremely fast — sub-second per command
- `batch` mode with JSON stdin is ideal for AI-agent workflows
- `snapshot -i` returns a rich, well-structured accessibility tree
- `--json` mode for machine-parseable output
- `find` command with role/label/text selectors (similar to Playwright's `getByRole`)
- `--session-name` for state persistence between runs
- `eval` for arbitrary JS execution (same as Playwright's `page.evaluate()`)
- Keyboard, mouse, upload, scroll, and tab management
- `network` command for request interception and HAR recording
- `vitals` command for Core Web Vitals measurement
- `diff` for snapshot/screenshot comparison

## 3. Comparison Matrix

| Criteria | Playwright | agent-browser | Winner |
|----------|-----------|---------------|--------|
| **Test framework** | Built-in (`test()`, `describe()`, `expect()`) | None — CLI tool only | Playwright |
| **Assertions** | Rich matchers (`toBeVisible`, `toEqual`, `toContainText`, etc.) | None — must pipe output to `jq`/`python3` | Playwright |
| **CI integration** | `npx playwright test --reporter=list` | Possible but manual (pipe + grep) | Playwright |
| **Page navigation** | `page.goto()` + `waitForLoadState` | `open` + `wait` | Tie |
| **Element selection** | `getByRole`, `locator()`, `$eval` | `@ref`, `find role/text/label`, `eval` | Tie |
| **Interactive elements snapshot** | `page.accessibility.snapshot()` | `snapshot -i` (richer, faster) | Agent-Browser |
| **JS execution** | `page.evaluate()` | `eval` | Tie |
| **Console error collection** | `page.on("console")` + `page.on("pageerror")` | `console` + `errors` commands | Tie |
| **Network throttling** | CDP session | `set` settings (viewport, geo, etc.) | Playwright (explicit CDP) |
| **Performance measurement** | manual via CDP | `vitals` command (LCP/CLS/TTFB/FCP/INP) | Agent-Browser |
| **Screenshot diff** | Pixelmatch plugin | `diff screenshot --baseline` | Tie |
| **HAR recording** | `page.route()` interception | `network har start/stop` | Agent-Browser (dedicated) |
| **Video recording** | `video: 'on'` in config | `record start/stop` | Tie |
| **Trace viewer** | built-in `--trace` | `trace start/stop` | Tie |
| **State persistence** | `storageState` in config | `--session-name` / `auth save` | Agent-Browser (simpler) |
| **Multi-tab** | `page.context()` | `tab new/list/close` | Tie |
| **Headless mode** | default | `--headed` flag (default headless) | Tie |
| **Installation** | `npm i -D @playwright/test` + `npx playwright install chromium` | `npm install -g agent-browser` + `agent-browser install` | Tie |
| **Binary size** | ~300MB (Chromium) | ~300MB (Chromium) | Tie |
| **Learning curve** | Medium (framework + API) | Low (CLI commands) | Agent-Browser |
| **Code complexity** | 77 lines (smoke.spec.ts) | Equivalent in batch JSON | Tie |
| **Maintenance overhead** | Standard (config, browser updates) | CLI updates + pipeline scripts | Tie |

## 4. Gap Analysis

### Critical gaps preventing replacement

1. **No test framework** — agent-browser has no `describe()`, `test()`, `beforeEach()`, or `expect()`. Each "test" is a shell pipe. There is no test runner, no pass/fail reporting, no retry logic, no CI exit code.

2. **No assertion library** — You cannot write `expect(page).toHaveTitle(/edgeless/i)`. You get raw output and must parse it yourself. This means every test requires custom JSON parsing, regex matching, or grep.

3. **No console error filtering** — Playwright's test pattern for collecting JS errors (`page.on("pageerror")`) and filtering known issues has no CLI equivalent. The `console` and `errors` commands dump raw output.

4. **No CI integration** — Playwright returns a structured exit code (0 = all pass, 1 = any fail) with a summary line. Agent-browser returns whatever the last command returned. There's no `--junit` or `--reporter` flag.

5. **No structured test reports** — Playwright's `--reporter=list`, `--reporter=json`, `--reporter=junit` give CI systems structured data. Agent-browser has `--json` per command but no aggregate report.

### Minor gaps

6. **Session management** — Each `agent-browser` command opens a new daemon session. Batch mode solves this, but mixing batch and single commands loses state. Requires careful pipeline design.

7. **Ref renumbering** — The `@eN` refs can change between snapshots (e.g., when a dialog opens, the refs shift). Tests using hardcoded refs are brittle. The `find` command (role-based) is more stable but less precise.

## 5. Recommended Approach

### Keep Playwright for testing

Playwright remains the right tool for:
- CI/CD pipeline E2E tests
- Structured test suites with assertions
- Console error monitoring
- Performance regression testing (CDP + LCP measurements)
- Cross-browser testing (Chromium, Firefox, WebKit)

### Add agent-browser for debugging

Use agent-browser alongside Playwright for:
- Quick interactive debugging: `agent-browser open <url> && agent-browser snapshot -i`
- AI-agent-driven browser automation (its `chat` command and `batch` mode are designed for this)
- A11y tree inspection (`snapshot -i` is better than Playwright's accessibility snapshot)
- Core Web Vitals measurement (`vitals` command)
- Visual diff testing (`diff screenshot --baseline`)

### Concrete integration

```bash
# Debugging workflow (ad-hoc, not CI)
agent-browser open http://localhost:3000/blog/ \
  && agent-browser snapshot -i \
  && agent-browser vitals --json

# Or in a Playwright debugging session
# Use agent-browser to inspect the a11y tree when a test fails
```

## 6. Verdict

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| **Test framework** | 1 | No framework at all |
| **Assertion support** | 1 | Must pipe to external tools |
| **CI readiness** | 1 | No reporter, no structured results |
| **Speed** | 5 | Sub-second commands |
| **Snapshot quality** | 5 | Best accessibility tree output I've seen |
| **AI integration** | 5 | `batch`, `chat`, `--json` are AI-native |
| **Debugging** | 4 | Good for interactive sessions |
| **Performance measurement** | 4 | `vitals` command is a nice addition |
| **Overall test replacement** | 1 | Not a test framework |

**Recommendation: Do not replace Playwright.** Use agent-browser as a complementary CLI tool for debugging, accessibility inspection, and AI-agent-driven browser automation. The two tools serve different purposes.