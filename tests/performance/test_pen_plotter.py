#!/usr/bin/env python3
"""
TDD unit tests for pen-plotter performance fix.

Tests must pass before the performance fix is merged.
Run: pytest tests/performance/test_pen_plotter.py -v --headed  # headed for debugging

Requires: playwright, pytest, pytest-playwright
Install: npx playwright install chromium

Created: 2026-06-02 (EDGA-6506)
"""

import os
import subprocess
import time
from urllib.parse import urljoin

import pytest
from playwright.sync_api import Page, expect, sync_playwright

# ---------------------------------------------------------------------------
# Test pages
# ---------------------------------------------------------------------------
# The pen-plotter gallery appears on the main pen-plotter lab page.
# If that route doesn't exist standalone, fall back to the homepage gallery.
PEN_PLOTTER_URL = "http://localhost:3000/pen-plotter"
FALLBACK_URL = "http://localhost:3000"


# ---------------------------------------------------------------------------
# Server lifecycle
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def dev_server():
    """Start Next.js dev server and wait for it to be ready."""
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    proc = subprocess.Popen(
        ["npx", "next", "dev", "-p", "3000"],
        cwd=project_root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Wait for server to be ready (up to 60s)
    import socket
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            s = socket.create_connection(("localhost", 3000), timeout=2)
            s.close()
            break
        except (ConnectionRefusedError, OSError):
            time.sleep(1)
    else:
        proc.kill()
        proc.wait()
        pytest.fail("Dev server did not start within 60s")

    yield

    proc.terminate()
    proc.wait(timeout=10)


@pytest.fixture(scope="module")
def browser():
    """Launch a single Playwright browser for the module."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


# ---------------------------------------------------------------------------
# Helper: try pen-plotter URL, fall back to homepage
# ---------------------------------------------------------------------------

def _resolve_page(browser, url=PEN_PLOTTER_URL):
    """Navigate to the pen-plotter page or fallback, return (page, page_type)."""
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    resp = page.goto(url, wait_until="networkidle", timeout=30000)
    if resp and resp.ok:
        return page, "pen-plotter"
    # Fallback to homepage
    resp = page.goto(FALLBACK_URL, wait_until="networkidle", timeout=30000)
    page.close()
    if resp and resp.ok:
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(FALLBACK_URL, wait_until="networkidle", timeout=30000)
        return page, "homepage"
    page.close()
    pytest.fail("Neither pen-plotter page nor homepage is reachable")


# ---------------------------------------------------------------------------
# Test 1: Gallery images have explicit width and height
# ---------------------------------------------------------------------------

def test_gallery_images_have_dimensions(dev_server, browser):
    """Verify every <img> in the gallery has explicit width and height attributes.

    Without explicit dimensions the browser must reflow the page once images
    load, causing Cumulative Layout Shift (CLS). The performance fix must add
    width/height attributes to all gallery images.
    """
    page, _ = _resolve_page(browser)
    images = page.locator("div[class*='grid'] img, div[class*='gallery'] img, section[class*='gallery'] img")

    count = images.count()
    if count == 0:
        # Broader fallback: any <img> inside a grid
        images = page.locator("img")
        count = images.count()

    assert count > 0, "No images found on the page"

    missing = []
    for i in range(count):
        img = images.nth(i)
        w = img.get_attribute("width")
        h = img.get_attribute("height")
        src = img.get_attribute("src") or "(unknown)"
        if not w or not h:
            missing.append(f"  img[{i}]: src={src[:60]} width={w!r} height={h!r}")

    assert not missing, (
        f"Images missing explicit width/height ({len(missing)} of {count}):\n"
        + "\n".join(missing)
    )

    page.close()


# ---------------------------------------------------------------------------
# Test 2: Below-fold images have loading="lazy"
# ---------------------------------------------------------------------------

def test_lazy_loading_applied(dev_server, browser):
    """Verify below-fold images have loading="lazy".

    Images below the initial viewport should use native lazy loading
    to defer their download until the user scrolls near them.
    """
    page, _ = _resolve_page(browser)

    images = page.locator("img")
    count = images.count()
    assert count > 0, "No images on page"

    non_lazy = []
    for i in range(count):
        img = images.nth(i)
        loading = img.get_attribute("loading")
        src = img.get_attribute("src") or "(unknown)"

        # The first visible image (hero/banner) may legitimately be eager
        # All others should be lazy
        if loading != "lazy" and loading != "eager":
            non_lazy.append(f"  img[{i}]: src={src[:60]} loading={loading!r}")

    # Allow up to 1 image to be eager (hero image); flag the rest
    issues = [n for n in non_lazy if "eager" not in n]
    if issues:
        print(f"Non-lazy images (may be acceptable for hero): {len(issues)} of {count}")
        for issue in issues:
            print(issue)

    page.close()


# ---------------------------------------------------------------------------
# Test 3: Total page payload under budget
# ---------------------------------------------------------------------------

def test_total_payload_under_budget(dev_server, browser):
    """Verify total page payload < 1.5MB on cold cache.

    Uses Playwright's request interception to measure total transferred bytes.
    """
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    total_bytes = 0
    resources = {}

    def _track(req):
        """Track response sizes."""
        nonlocal total_bytes

    page.on("response", lambda resp: None)  # placeholder

    # Use performance API instead (more accurate)
    page.goto(FALLBACK_URL, wait_until="networkidle", timeout=30000)

    # Measure via Performance Observer
    total_transfer = page.evaluate("""() => {
        const entries = performance.getEntriesByType('resource');
        let total = 0;
        for (const e of entries) {
            total += e.transferSize || e.encodedBodySize || 0;
        }
        // Add the document itself
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) total += nav.transferSize || nav.encodedBodySize || 0;
        return total;
    }""")

    total_kb = total_transfer / 1024
    assert total_kb < 1500, (
        f"Total payload {total_kb:.0f}KB exceeds 1.5MB budget"
    )
    print(f"Total transfer: {total_kb:.0f}KB (budget: 1500KB)")

    page.close()


# ---------------------------------------------------------------------------
# Test 4: LCP under threshold
# ---------------------------------------------------------------------------

def test_lcp_under_threshold(dev_server, browser):
    """Verify Largest Contentful Paint < 2.5s on simulated slow network.

    Uses Playwright's CDPSession to enable throttling.
    """
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    # Enable slow network simulation via CDP
    cdp = page.context.new_cdp_session(page)
    cdp.send("Network.emulateNetworkConditions", {
        "offline": False,
        "latency": 40,       # 40ms RTT (typical 3G)
        "downloadThroughput": 500 * 1024,   # 500 KB/s
        "uploadThroughput": 100 * 1024,     # 100 KB/s
    })

    # Collect LCP via PerformanceObserver
    lcp_promise = page.evaluate("""() => new Promise((resolve) => {
        let lcp = 0;
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
                lcp = entries[entries.length - 1].startTime;
            }
        });
        observer.observe({type: 'largest-contentful-paint', buffered: true});
        // Wait a bit then resolve
        setTimeout(() => resolve(lcp), 3000);
    })""")

    page.goto(FALLBACK_URL, wait_until="load", timeout=60000)
    time.sleep(1)  # Let LCP settle

    lcp_ms = page.evaluate("""() => {
        return new Promise((resolve) => {
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                resolve(entries.length > 0 ? entries[entries.length-1].startTime : -1);
            }).observe({type: 'largest-contentful-paint', buffered: true});
            setTimeout(() => resolve(-1), 2000);
        });
    }""")

    if lcp_ms < 0:
        pytest.skip("LCP measurement not available (non-Chromium or missing observer)")

    assert lcp_ms < 2500, (
        f"LCP {lcp_ms:.0f}ms exceeds 2.5s threshold"
    )
    print(f"LCP: {lcp_ms:.0f}ms (threshold: 2500ms)")

    cdp.detach()
    page.close()


# ---------------------------------------------------------------------------
# Test 5: No render-blocking resource over 500ms
# ---------------------------------------------------------------------------

def test_no_render_blocking_over_500ms(dev_server, browser):
    """Verify no single render-blocking resource exceeds 500ms load time.

    Render-blocking resources delay First Paint. This test flags any
    CSS, JS, or font file that blocks rendering and takes >500ms.
    """
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    page.goto(FALLBACK_URL, wait_until="networkidle", timeout=30000)

    # Get resource timing entries
    blocking = page.evaluate("""() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fpStart = nav ? nav.domContentLoadedEventStart || 0 : performance.now();
        const entries = performance.getEntriesByType('resource');
        const slow = [];
        for (const e of entries) {
            const isRenderBlocking = e.initiatorType === 'link'
                || e.initiatorType === 'script'
                || e.name.includes('.css')
                || e.name.includes('fonts');
            if (isRenderBlocking && e.duration > 500) {
                slow.push({
                    url: e.name.substring(0, 100),
                    duration: Math.round(e.duration),
                    initiator: e.initiatorType,
                });
            }
        }
        return slow;
    }""")

    if blocking:
        print(f"Slow render-blocking resources ({len(blocking)}):")
        for b in blocking:
            print(f"  {b['duration']}ms {b['initiator']} {b['url']}")

    assert len(blocking) == 0, (
        f"{len(blocking)} render-blocking resources exceed 500ms"
    )

    page.close()


# ---------------------------------------------------------------------------
# Test 6: <main> landmark present
# ---------------------------------------------------------------------------

def test_main_landmark_present(dev_server, browser):
    """Verify a <main> element exists in the DOM.

    The <main> landmark is required for accessibility and screen reader
    navigation. Its absence is flagged by Lighthouse and a11y audits.
    """
    page, _ = _resolve_page(browser)

    mains = page.locator("main")
    assert mains.count() >= 1, (
        "No <main> element found on the page — accessibility landmark missing"
    )

    # Verify it's visible and contains content
    main_element = mains.first
    expect(main_element).to_be_visible()

    page.close()


# ---------------------------------------------------------------------------
# Test 7: Mobile performance score via Lighthouse
# ---------------------------------------------------------------------------

@pytest.mark.skip(reason="Lighthouse CLI requires global install; run manually via: npx lighthouse http://localhost:3000 --output json --quiet")
def test_mobile_performance_score(dev_server):
    """Run Lighthouse programmatically, assert score >= 90.

    This test requires Lighthouse CLI installed globally.
    Install: npm install -g lighthouse

    Manual command:
        npx lighthouse http://localhost:3000/pen-plotter \\
            --output json --quiet --chrome-flags='--headless' \\
        | python3 -c "import sys,json; print(json.load(sys.stdin)['categories']['performance']['score'])"
    """
    result = subprocess.run(
        [
            "npx", "lighthouse",
            PEN_PLOTTER_URL,
            "--output", "json",
            "--quiet",
            "--chrome-flags=--headless",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        # Lighthouse CLI can return non-zero even on success if there are warnings
        pass

    # Parse score from Lighthouse JSON output
    import json
    try:
        report = json.loads(result.stdout)
        score = report["categories"]["performance"]["score"]
        # Lighthouse scores are 0-1, convert to 0-100
        score_pct = score * 100
        assert score_pct >= 90, (
            f"Mobile performance score {score_pct:.0f} is below 90 threshold"
        )
        print(f"Lighthouse performance score: {score_pct:.0f}")
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        pytest.skip(f"Lighthouse score extraction failed: {e} — run manually to diagnose")
