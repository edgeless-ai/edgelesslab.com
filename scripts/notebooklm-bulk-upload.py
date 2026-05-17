#!/usr/bin/env python3
"""
NotebookLM Bulk Upload — Task 326

Automates source upload to notebooklm.google.com via Playwright.
Requires: Google auth cookies exported from browser (see setup below).

Setup:
    1. Install:  pip install playwright
    2. Browser:  playwright install chromium
    3. Auth:     Log into notebooklm.google.com in Chrome
    4. Export:   Use 'EditThisCookie' extension → export cookies.json
    5. Place:    Save as ~/.notebooklm_cookies.json

Usage:
    python scripts/notebooklm-bulk-upload.py --batch-dir claude-vault/10-Meta/notebooklm-batches/batch-01 --notebook-name "YouTube Batch 1"
    python scripts/notebooklm-bulk-upload.py --all-batches
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Optional

# Playwright import with graceful fallback
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)


COOKIE_PATH = Path.home() / ".notebooklm_cookies.json"
BASE_URL = "https://notebooklm.google.com"


def load_cookies() -> List[dict]:
    if not COOKIE_PATH.exists():
        print(f"ERROR: Cookie file not found at {COOKIE_PATH}")
        print("  1. Log into notebooklm.google.com in Chrome")
        print("  2. Use 'EditThisCookie' extension → export → save as cookies.json")
        print(f"  3. Copy to: {COOKIE_PATH}")
        sys.exit(1)
    with open(COOKIE_PATH) as f:
        return json.load(f)


def setup_context(p, cookies: List[dict]):
    browser = p.chromium.launch(headless=False)  # headless=False for Google bot evasion
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    )
    context.add_cookies(cookies)
    return browser, context


def find_or_create_notebook(page, name: str) -> str:
    """Navigate to a notebook by name, creating if not found."""
    page.goto(f"{BASE_URL}/")
    page.wait_for_selector("text=Notebooks", timeout=15000)
    
    # Check if notebook exists
    notebooks = page.query_selector_all("[data-testid='notebook-card'], .notebook-card, [role='listitem']")
    for nb in notebooks:
        title_el = nb.query_selector("h3, .title, [data-testid='notebook-title']")
        if title_el and name in (title_el.inner_text() or ""):
            nb.click()
            page.wait_for_load_state("networkidle")
            return "existing"
    
    # Create new notebook
    page.click("text=New notebook")
    page.wait_for_selector("input[placeholder*='name' i], input[aria-label*='name' i]", timeout=10000)
    page.fill("input[placeholder*='name' i], input[aria-label*='name' i]", name)
    page.click("text=Create")
    page.wait_for_load_state("networkidle")
    return "created"


def upload_sources(page, files: List[Path]) -> dict:
    """Upload markdown files to current notebook."""
    results = {"uploaded": 0, "failed": 0, "errors": []}
    
    for filepath in files:
        try:
            # Click "Add sources" or "+"
            add_btn = page.query_selector("text=Add sources, button:has-text('+'), [aria-label*='add source' i]")
            if not add_btn:
                # Try alternative selectors
                add_btn = page.query_selector("button:has-text('Sources'), button:has-text('Upload')")
            if add_btn:
                add_btn.click()
            else:
                # Direct file upload via hidden input
                file_input = page.query_selector("input[type='file']")
                if file_input:
                    file_input.set_input_files(str(filepath))
                else:
                    raise PlaywrightTimeout("Could not find upload trigger")
            
            page.wait_for_timeout(2000)  # Upload processing
            results["uploaded"] += 1
            
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{filepath.name}: {e}")
    
    return results


def upload_batch(batch_dir: Path, notebook_name: str, dry_run: bool = False) -> dict:
    files = sorted(batch_dir.glob("*.md"))
    if not files:
        return {"status": "empty", "files": 0}
    
    if dry_run:
        print(f"[DRY-RUN] Would upload {len(files)} files to '{notebook_name}'")
        for f in files[:3]:
            print(f"  → {f.name}")
        if len(files) > 3:
            print(f"  ... and {len(files)-3} more")
        return {"status": "dry_run", "files": len(files)}
    
    cookies = load_cookies()
    
    with sync_playwright() as p:
        browser, context = setup_context(p, cookies)
        page = context.new_page()
        
        try:
            status = find_or_create_notebook(page, notebook_name)
            print(f"Notebook '{notebook_name}': {status}")
            
            results = upload_sources(page, files)
            results["notebook"] = notebook_name
            results["notebook_status"] = status
            return results
            
        except PlaywrightTimeout as e:
            print(f"TIMEOUT: {e}")
            page.screenshot(path=f"/tmp/notebooklm-error-{notebook_name}.png")
            return {"status": "timeout", "error": str(e)}
        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser(description="NotebookLM Bulk Upload")
    parser.add_argument("--batch-dir", type=Path, help="Directory containing .md files to upload")
    parser.add_argument("--notebook-name", help="Target notebook name")
    parser.add_argument("--all-batches", action="store_true", help="Upload all 7 batches sequentially")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be uploaded without doing it")
    args = parser.parse_args()
    
    if args.all_batches:
        base = Path("/Users/djm/claude-projects/claude-vault/10-Meta/notebooklm-batches")
        for i in range(1, 8):
            batch_dir = base / f"batch-{i:02d}"
            name = f"YouTube Corpus Batch {i}"
            print(f"\n{'='*50}")
            print(f"Batch {i}/7: {name}")
            print(f"{'='*50}")
            result = upload_batch(batch_dir, name, dry_run=args.dry_run)
            print(json.dumps(result, indent=2))
            if not args.dry_run and i < 7:
                print("\n[PAUSE] Press Enter to continue to next batch...")
                input()
    elif args.batch_dir and args.notebook_name:
        result = upload_batch(args.batch_dir, args.notebook_name, dry_run=args.dry_run)
        print(json.dumps(result, indent=2))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
