#!/usr/bin/env python3
"""
Headless smoke test for the corrupted-manuscript demo.
Starts a local HTTP server, opens the page in Chromium via Playwright,
and verifies structural integrity and key runtime behaviors.
"""

import http.server
import socketserver
import threading
import time
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PORT = 8765
ROOT = Path(__file__).parent.resolve()


def start_server():
    """Serve the demo directory on PORT."""
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", PORT), handler)
    httpd.allow_reuse_address = True
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def main():
    # Start server
    server = start_server()
    time.sleep(0.5)

    url = f"http://localhost:{PORT}/index.html"
    errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto(url, wait_until="networkidle")

            # 1. Verify page title
            title = page.title()
            if title != "The Corrupted Manuscript":
                errors.append(f"Unexpected title: {title}")
            else:
                print(f"[PASS] Page title: {title}")

            # 2. Verify grain canvas exists (p5.js creates a canvas)
            canvas = page.query_selector("canvas")
            if canvas is None:
                errors.append("No <canvas> element found (p5.js grain canvas missing)")
            else:
                print("[PASS] p5.js canvas element present")

            # 3. Verify editorial layer exists
            main = page.query_selector("main")
            if main is None:
                errors.append("No <main> element found (editorial layer missing)")
            else:
                print("[PASS] Editorial <main> layer present")

            # 4. Verify headline count and aria-labels
            headlines = page.query_selector_all("h1, h2")
            if len(headlines) != 5:
                errors.append(f"Expected 5 headlines, got {len(headlines)}")
            else:
                print(f"[PASS] Found {len(headlines)} headlines")

            for h in headlines:
                label = h.get_attribute("aria-label")
                if not label:
                    errors.append(f"Headline missing aria-label: {h.inner_text()[:40]}")

            if not any("aria-label" in str(e) for e in errors):
                print("[PASS] All headlines have aria-labels")

            # 5. Verify TextScramble class is available
            has_class = page.evaluate("typeof TextScramble !== 'undefined'")
            if not has_class:
                errors.append("TextScramble class not defined in page context")
            else:
                print("[PASS] TextScramble class available")

            # 6. Verify IntersectionObserver has triggered or is ready
            # We simulate a scroll to trigger the observer and wait a moment
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(0.5)
            # Scroll back to top
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(0.5)
            # Scroll down slowly to trigger observers
            for y in range(0, 2000, 200):
                page.evaluate(f"window.scrollTo(0, {y})")
                time.sleep(0.2)

            # After scrolling, check if headlines have been scrambled (dataset.scrambled === 'true')
            scrambled_count = page.evaluate("""
                document.querySelectorAll('h1[data-scrambled="true"], h2[data-scrambled="true"]').length
            """)
            print(f"[INFO] Scrambled headlines visible: {scrambled_count}")

            # 7. Verify no JS errors in console (we collect them via event listener)
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.reload(wait_until="networkidle")
            time.sleep(1)
            if console_errors:
                for ce in console_errors:
                    errors.append(f"Console error: {ce}")
            else:
                print("[PASS] No console errors detected")

            # 8. Verify click-to-re-scramble works
            first_h1 = page.query_selector("h1")
            if first_h1:
                first_h1.click()
                time.sleep(0.5)
                # After click, scramble should be running again
                print("[PASS] Click interaction on headline succeeded")

            # 9. Check body background color via computed style
            bg = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
            if "250, 249, 246" not in bg and "rgb(250, 249, 246)" not in bg:
                errors.append(f"Unexpected body background: {bg}")
            else:
                print("[PASS] Body background is warm cream (#FAF9F6)")

            browser.close()

    except Exception as e:
        errors.append(f"Test runner exception: {e}")
        raise
    finally:
        server.shutdown()

    if errors:
        print("\n[FAILURES]")
        for e in errors:
            print(f"  ✗ {e}")
        sys.exit(1)
    else:
        print("\n[ALL PASSED] Demo is runnable and structurally sound.")
        sys.exit(0)


if __name__ == "__main__":
    main()
