#!/usr/bin/env python3
"""Serial actual-reference delivery audit. No upload, retries or guessed assets.

A bounded reference survey is not a complete runtime audit. Bodies and curl
headers are retained; failed requests never disappear from the JSONL journal.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class References(HTMLParser):
    def __init__(self, url: str):
        super().__init__()
        self.base = url
        self.found: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "base" and a.get("href"):
            self.base = urljoin(self.base, a["href"])
        if tag == "script" and a.get("src"):
            self.found.append(("js", a["src"]))
        if tag == "link" and a.get("href"):
            if "stylesheet" in a.get("rel", "").split():
                self.found.append(("css", a["href"]))
            elif "modulepreload" in a.get("rel", "").split():
                self.found.append(("js", a["href"]))


def html_references(data: bytes, url: str):
    parser = References(url)
    parser.feed(data.decode("utf-8", errors="replace"))
    return list(dict.fromkeys((kind, urljoin(parser.base, ref)) for kind, ref in parser.found))


def js_references(data: bytes, url: str):
    """Literal relative imports only; never interpolate Vite dependency suffixes."""
    text = data.decode("utf-8", errors="replace")
    refs = re.findall(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+\.(?:m?js|css)(?:\?[^"']*)?)["']''', text)
    return list(dict.fromkeys(("css" if urlsplit(ref).path.endswith(".css") else "js", urljoin(url, ref)) for ref in refs))


def mime_ok(kind: str, content_type: str, data: bytes) -> bool:
    mime = content_type.lower().split(";", 1)[0].strip()
    if kind == "html":
        return mime == "text/html"
    if kind == "wasm":
        return mime == "application/wasm" and data.startswith(b"\0asm")
    if data.lstrip().lower().startswith((b"<!doctype html", b"<html")):
        return False
    return mime in ({"text/css"} if kind == "css" else {"application/javascript", "text/javascript", "application/x-javascript"})


class Audit:
    def __init__(self, output: Path, manifest: dict[str, str]):
        output.mkdir(parents=True, exist_ok=False)
        self.output, self.manifest, self.rows = output, manifest, []

    def fetch(self, url: str, kind: str, *, slug: str, reference: str, logical_path: str | None = None):
        i = len(self.rows)
        stem = self.output / f"{i:05d}"
        body = stem.with_suffix(".body")
        headers = stem.with_suffix(".headers")
        started = datetime.now(timezone.utc).isoformat()
        proc = subprocess.run(["curl", "--silent", "--show-error", "--location", "--max-time", "25", "--user-agent", "Edgeless-Marimo-Delivery-Audit/1.0", "--dump-header", str(headers), "--output", str(body), "--write-out", "%{json}", url], capture_output=True, text=True)
        data = body.read_bytes() if body.exists() else b""
        try:
            meta = json.loads(proc.stdout)
        except ValueError:
            meta = {}
        expected = self.manifest.get(logical_path) if logical_path else None
        row = dict(index=i, utc=started, url=url, final_url=meta.get("url_effective"), slug=slug, kind=kind, reference=reference, curl_exit=proc.returncode, stderr=proc.stderr, http=meta.get("http_code"), content_type=meta.get("content_type"), sha256=sha256(data), bytes=len(data), expected_sha256=expected, identity_match=None if logical_path is None else expected == sha256(data), mime_ok=mime_ok(kind, meta.get("content_type") or "", data), body=body.name, headers=headers.name)
        self.rows.append(row)
        with (self.output / "requests.jsonl").open("a") as stream:
            stream.write(json.dumps(row, sort_keys=True) + "\n")
        return row, data


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--entries", type=Path, required=True)
    ap.add_argument("--receipt", type=Path, required=True, help="Latest complete package receipt with logical_manifest")
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--legacy-origin", default="https://marimo.edgelesslab.com")
    ap.add_argument("--slug", action="append", default=[])
    ap.add_argument("--limit-per-kind", type=int, default=2)
    ap.add_argument("--browser-receipt", type=Path, action="append", default=[], help="Additionally fetch actual browser CSS/JS/WASM URLs, serially")
    args = ap.parse_args()
    if not 1 <= args.limit_per_kind <= 10:
        ap.error("limit-per-kind must be between1 and10")
    if not args.entries.is_dir():
        ap.error("entries must be an existing canonical registry directory")
    entries = [json.loads(p.read_text()) for p in sorted(args.entries.glob("*.json"))]
    entries = [e for e in entries if e.get("published_url")]
    unknown = set(args.slug) - {e['slug'] for e in entries}
    if unknown:
        ap.error("unknown published slug(s): " + ', '.join(sorted(unknown)))
    entries = [e for e in entries if not args.slug or e['slug'] in args.slug]
    if not entries:
        ap.error("no published canonical registry entries selected")
    receipt = json.loads(args.receipt.read_text())
    manifest = receipt["logical_manifest"]
    audit = Audit(args.output, manifest)
    root, _ = audit.fetch(args.legacy_origin + "/", "html", slug="", reference="host-root fallback comparison", logical_path="index.html")
    for entry in entries:
        url, slug = entry["published_url"], entry["slug"]
        legacy = urlsplit(url).netloc == "marimo.edgelesslab.com"
        if legacy:
            url = args.legacy_origin + urlsplit(url).path
        row, data = audit.fetch(url, "html", slug=slug, reference="canonical registry", logical_path=f"{slug}/index.html" if legacy else None)
        row["equals_root_fallback"] = legacy and row["sha256"] == root["sha256"]
        refs = html_references(data, row["final_url"] or url)
        counts = {"css": 0, "js": 0}
        for kind, ref in refs:
            if counts[kind] >= args.limit_per_kind:
                continue
            counts[kind] += 1
            path = urlsplit(ref).path.lstrip("/") if legacy else None
            rr, payload = audit.fetch(ref, kind, slug=slug, reference=f"HTML {row['body']}", logical_path=path)
            if kind == "js" and rr["mime_ok"]:
                for dynamic_kind, dynamic_ref in js_references(payload, rr["final_url"] or ref)[:1]:
                    audit.fetch(dynamic_ref, dynamic_kind, slug=slug, reference=f"literal JS import {rr['body']}", logical_path=urlsplit(dynamic_ref).path.lstrip("/") if legacy else None)
        print(json.dumps(dict(slug=slug, html_sha256=row["sha256"], equals_root_fallback=row["equals_root_fallback"], direct_references=len(refs))), flush=True)
    observed = {}
    for path in args.browser_receipt:
        for state in json.loads(path.read_text())["states"]:
            for response in state.get("responses", []):
                observed.setdefault(response["url"], response)
    for url, response in observed.items():
        suffix = Path(urlsplit(url).path).suffix.lower()
        kind = {".css": "css", ".js": "js", ".mjs": "js", ".wasm": "wasm"}.get(suffix)
        if kind is None:
            continue
        own_origin = urlsplit(url).netloc == urlsplit(args.legacy_origin).netloc
        row, _ = audit.fetch(url, kind, slug="browser-observed", reference="actual browser response", logical_path=urlsplit(url).path.lstrip("/") if own_origin else None)
        row["browser_sha256"] = response.get("sha256")
        row["browser_identity_match"] = row["sha256"] == row["browser_sha256"]
    summary = dict(utc=datetime.now(timezone.utc).isoformat(), serial=True, network_mocks=False, entries=len(entries), reference_limit_per_kind=args.limit_per_kind, coverage="bounded HTML direct references + one literal import per selected module + supplied actual browser CSS/JS/WASM URLs", requests=audit.rows)
    (args.output / "survey.json").write_text(json.dumps(summary, indent=2) + "\n")
    failures = [r for r in audit.rows if r["curl_exit"] or r["http"] != 200 or not r["mime_ok"] or r["identity_match"] is False or r.get("equals_root_fallback") or r.get("browser_identity_match") is False]
    print(json.dumps(dict(entries=len(entries), requests=len(audit.rows), failures=len(failures))))
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
