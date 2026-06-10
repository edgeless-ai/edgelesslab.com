#!/usr/bin/env python3
"""Headless smoke test for the volumetric liquid glyph demo."""

from playwright.sync_api import sync_playwright
import sys

URL = "http://localhost:8765/index.html"
CONSOLE_ERRORS = []
CONSOLE_LOGS = []

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 800, "height": 600})
        page = context.new_page()

        # Capture console messages
        page.on("console", lambda msg: CONSOLE_LOGS.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: CONSOLE_ERRORS.append(str(err)))

        try:
            page.goto(URL, timeout=15000)
        except Exception as e:
            print(f"FAILED to load page: {e}")
            sys.exit(1)

        # Let the animation run for a few loop cycles (p5.js needs time to init)
        page.wait_for_timeout(3000)

        # Check for WebGL / p5.js initialization by looking at the canvas
        canvas_count = page.evaluate("""() => document.querySelectorAll('canvas').length""")
        print(f"Canvas elements found: {canvas_count}")

        # Gather console output
        if CONSOLE_ERRORS:
            print("\n--- PAGE ERRORS ---")
            for e in CONSOLE_ERRORS:
                print(f"  ERROR: {e}")
        else:
            print("\nNo page JavaScript errors detected.")

        if CONSOLE_LOGS:
            print("\n--- CONSOLE LOGS ---")
            for log in CONSOLE_LOGS:
                print(f"  {log}")

        # Take a screenshot to verify visual output
        page.screenshot(path="/Users/djm/claude-projects/creative-demos/volumetric-liquid-glyph/screenshot.png")
        print("\nScreenshot saved to screenshot.png")

        browser.close()

        if CONSOLE_ERRORS:
            sys.exit(1)
        print("\nTest PASSED — page loaded and ran without JS errors.")

if __name__ == "__main__":
    main()
