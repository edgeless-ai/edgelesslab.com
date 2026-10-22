#!/usr/bin/env python3
"""IndexNow submitter for edgelesslab.com + shop.edgelesslab.com.

Usage:
    python scripts/indexnow_submit.py --dry-run    # count URLs
    python scripts/indexnow_submit.py --submit     # POST to IndexNow
    python scripts/indexnow_submit.py --verify     # curl-check key files
"""

import json
import sys
import urllib.request
from pathlib import Path

KEY = "464bcde7145ecaf7fd17e9e4d18f5e24"
API = "https://api.indexnow.org/indexnow"

MAIN_SITEMAP = Path("/Users/djm/claude-projects/edgelesslab.com/sitemap.xml")
SHOP_SITEMAP = Path("/Users/djm/claude-projects/products/edgeless-store-api/merch-demo/public/sitemap.xml")


def extract_urls(sitemap_path: Path) -> list[str]:
    """Extract <loc> URLs from a sitemap XML file."""
    import xml.etree.ElementTree as ET

    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls: list[str] = []
    for u in root.findall("ns:url", ns):
        loc = u.find("ns:loc", ns)
        if loc is not None and loc.text:
            urls.append(loc.text)
    return urls


def submit(urls: list[str], host: str) -> dict:
    """POST urlList to IndexNow API."""
    body = json.dumps({
        "host": host,
        "key": KEY,
        "keyLocation": f"https://{host}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        API,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "EdgelessLab-IndexNow/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return {"status": resp.status, "body": resp.read().decode()}


def verify(host: str) -> bool:
    """curl-check that the key file is publicly reachable."""
    url = f"https://{host}/{KEY}.txt"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            text = resp.read().decode().strip()
            return text == KEY
    except Exception:
        return False


if __name__ == "__main__":
    action = "--submit" if "--submit" in sys.argv else "--dry-run"

    if action == "--dry-run":
        for sitemap, label in [(MAIN_SITEMAP, "main"), (SHOP_SITEMAP, "shop")]:
            urls = extract_urls(sitemap)
            print(f"{label}: {len(urls)} URLs")
        sys.exit(0)

    # Submit main site
    main_urls = extract_urls(MAIN_SITEMAP)
    print(f"Submitting {len(main_urls)} URLs for edgelesslab.com...")
    r1 = submit(main_urls, "edgelesslab.com")
    print(f"  Status: {r1['status']} — {r1.get('body', '')}")

    # Submit shop
    shop_urls = extract_urls(SHOP_SITEMAP)
    print(f"Submitting {len(shop_urls)} URLs for shop.edgelesslab.com...")
    r2 = submit(shop_urls, "shop.edgelesslab.com")
    print(f"  Status: {r2['status']} — {r2.get('body', '')}")

    # Verify key files
    print("Verifying key files...")
    for host in ["edgelesslab.com", "shop.edgelesslab.com"]:
        ok = verify(host)
        print(f"  {host}: {'OK' if ok else 'FAIL'}")