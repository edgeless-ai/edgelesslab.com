#!/usr/bin/env python3
"""Stage captured gallery masters as PRIVATE real-shop drafts; never approve/release.

python3 scripts/stage-gallery-posters.py MASTER_DIR TOKEN_PATH
TOKEN_PATH must be outside the repository and scratch GC; it is an ownership
capability, not an API/admin key. Receipts contain no tokens. Identical requests
are content-addressed/idempotent; every write is followed by authenticated reads.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import urllib.error
import urllib.request

API = "https://api.edgelesslab.com"


def request(route, token=None, body=None, content_type=None, idempotency=None):
    headers = {}
    if token:
        headers["X-Draft-Token"] = token
    if content_type:
        headers["Content-Type"] = content_type
    if idempotency:
        headers["Idempotency-Key"] = idempotency
    req = urllib.request.Request(API + route, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as response:
        data = response.read()
        return data if response.headers.get_content_type() == "image/png" else json.loads(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("masters", type=Path)
    parser.add_argument("token_file", type=Path)
    args = parser.parse_args()
    token_path = args.token_file.expanduser().resolve()
    repo = Path(__file__).resolve().parents[1]
    if token_path.is_relative_to(repo) or "/cache/scratch/" in str(token_path):
        raise SystemExit("Store the ownership token outside repository and scratch GC")
    token_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not token_path.exists():
        fd = os.open(token_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as stream:
            stream.write(secrets.token_urlsafe(32) + "\n")
    os.chmod(token_path, 0o600)
    token = token_path.read_text().strip()
    receipts = []
    manifest = json.loads((args.masters / "masters.json").read_text())
    for master in manifest:
        png = (args.masters / master["file"]).read_bytes()
        assert hashlib.sha256(png).hexdigest() == master["sha256"], "master bytes changed"
        boundary = "gallery-" + secrets.token_hex(16)
        multipart = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{master['file']}\"\r\nContent-Type: image/png\r\n\r\n".encode() + png + f"\r\n--{boundary}--\r\n".encode())
        art = request("/upload-art", token, multipart, f"multipart/form-data; boundary={boundary}")
        assert art["private"] is True
        assert (art["image"]["width_px"], art["image"]["height_px"]) == (3600, 5400)
        # Do not invent a provider SKU, price, sample approval or legal attestation.
        # Rights are explicitly left for the independent owner/reviewer to resolve.
        payload = {"title": master["title"], "creator": "Edgeless Lab", "kind": "poster",
                   "art_id": art["art_id"], "print_width_inches": 12, "print_height_inches": 18,
                   "rights_attested": False,
                   "provenance": {"source": master["source"], "source_sha256": master["source_sha256"],
                                  "master_sha256": master["sha256"], "seed": master["seed"], "frame": master["frames"],
                                  "task": "t_749a7410", "publication": "private draft only; rights/provider/bleed/sample/margin review required"}}
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        draft = request("/submit", token, encoded, "application/json", hashlib.sha256(encoded).hexdigest())
        readback = request("/drafts/" + draft["draft_id"], token)
        assert readback["private"] is True and readback["listed"] is False
        assert readback["kind"] == "poster" and readback["art_id"] == art["art_id"]
        assert readback["validation"]["effective_dpi"] == 300
        normalized = request("/draft-art/" + art["art_id"], token)
        assert hashlib.sha256(normalized).hexdigest() == art["image"]["normalized_sha256"]
        public_slug = "sub-" + draft["draft_id"].removeprefix("draft-")
        assert not any(item.get("slug") == public_slug for item in request("/submissions")), "draft unexpectedly listed"
        receipt = {"master": master, "upload": art, "draft": readback, "normalized_art_readback_sha256": hashlib.sha256(normalized).hexdigest(), "public_listing_absent": True}
        receipts.append(receipt)
        (args.masters / "private-draft-receipts.json").write_text(json.dumps(receipts, indent=2) + "\n")
        print(f"VERIFIED {master['slug']}: {draft['draft_id']}, private=true listed=false, 300 DPI, status={readback['status']}", flush=True)
    print(f"PASS {len(receipts)} private poster drafts; no checkout/payment/approval/release calls")


if __name__ == "__main__":
    main()
