"""
Persistent app state in a PRIVATE Cloudflare R2 bucket (edgeless-state).

Render's container disk is ephemeral, so writable state (submissions, the Stripe Connect
account map, promo caps, sold-counts, owed royalties, wants, payments) is stored in R2
instead of on disk — it survives every redeploy with NO paid disk and no host lock-in.

The bucket has NO public r2.dev domain, so objects are reachable ONLY via the
authenticated CF REST API (same CLOUDFLARE_API_TOKEN as r2_client). Connect maps /
royalties / payments are therefore never publicly exposed.

Local disk is used as a best-effort write-through cache so a transient R2 blip can still
be served within a running container. R2 is always the source of truth across deploys.
"""
from __future__ import annotations
import json
import os
import urllib.error
import urllib.parse
import urllib.request

ACCOUNT_ID = "ae4279904a9110de9f5bd770c41718da"
BUCKET = "edgeless-state"
_API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects"
_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".state_cache")
try:
    os.makedirs(_CACHE_DIR, exist_ok=True)
except Exception:
    pass


def _tok() -> str:
    return os.environ.get("CLOUDFLARE_API_TOKEN", "")


def enabled() -> bool:
    return bool(_tok())


def get_text(name: str):
    """Object text from R2, or None if missing/unconfigured/error."""
    if not _tok():
        return None
    req = urllib.request.Request(f"{_API}/{name.lstrip('/')}", method="GET")
    req.add_header("Authorization", f"Bearer {_tok()}")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return None if e.code == 404 else None
    except Exception:
        return None


def put_text(name: str, text: str) -> bool:
    """Write object to R2 (and a local cache copy). True on R2 success."""
    try:
        with open(os.path.join(_CACHE_DIR, name.replace("/", "_")), "w") as f:
            f.write(text)
    except Exception:
        pass
    if not _tok():
        return False
    req = urllib.request.Request(f"{_API}/{name.lstrip('/')}", method="PUT", data=text.encode("utf-8"))
    req.add_header("Authorization", f"Bearer {_tok()}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
        return True
    except Exception:
        return False


def _cache_text(name: str):
    try:
        with open(os.path.join(_CACHE_DIR, name.replace("/", "_"))) as f:
            return f.read()
    except Exception:
        return None


def load_json(name: str, default):
    """R2 first, then local cache, then default. Never raises."""
    t = get_text(name)
    if t is None:
        t = _cache_text(name)
    if t is None:
        return default
    try:
        return json.loads(t)
    except Exception:
        return default


def save_json(name: str, obj) -> bool:
    return put_text(name, json.dumps(obj))


def read_lines(name: str):
    """Return the lines of a jsonl-style object (R2, then cache). [] if absent."""
    t = get_text(name)
    if t is None:
        t = _cache_text(name)
    return [ln for ln in (t or "").splitlines() if ln.strip()]


def append_line(name: str, line: str) -> bool:
    """Append one line to a jsonl-style object (read-modify-write; low volume)."""
    existing = get_text(name)
    if existing is None:
        existing = _cache_text(name) or ""
    body = existing + (line if line.endswith("\n") else line + "\n")
    return put_text(name, body)


# --- Per-record objects (concurrency-safe) ----------------------------------
# Each record is its OWN R2 object under "<collection>/<id>.json". Concurrent writers
# touch different keys, so there is NO whole-blob read-modify-write clobber — the failure
# mode that silently dropped listings when a redeploy's old+new instances both saved a
# stale full list. Reads rebuild the collection by listing the prefix + fetching each.
def _delete(name: str) -> bool:
    if not _tok():
        return False
    req = urllib.request.Request(f"{_API}/{name.lstrip('/')}", method="DELETE")
    req.add_header("Authorization", f"Bearer {_tok()}")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
        return True
    except Exception:
        return False


def _list_keys(prefix: str):
    """All object keys under a prefix (handles pagination)."""
    if not _tok():
        return []
    keys, cursor = [], ""
    for _ in range(50):  # safety bound (50k objects) — far beyond any real collection
        q = f"?prefix={urllib.parse.quote(prefix)}&per_page=1000" + (f"&cursor={urllib.parse.quote(cursor)}" if cursor else "")
        req = urllib.request.Request(f"{_API}{q}", method="GET")
        req.add_header("Authorization", f"Bearer {_tok()}")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                d = json.loads(r.read().decode("utf-8"))
        except Exception:
            break
        keys.extend(o.get("key") for o in (d.get("result") or []) if o.get("key"))
        cursor = ((d.get("result_info") or {}).get("cursor") or "")
        if not cursor:
            break
    return keys


def put_record(collection: str, rec_id: str, obj) -> bool:
    return put_text(f"{collection}/{rec_id}.json", json.dumps(obj))


def delete_record(collection: str, rec_id: str) -> bool:
    return _delete(f"{collection}/{rec_id}.json")


def list_records(collection: str):
    """Fetch every record in a collection. Returns a list of parsed objects."""
    out = []
    for key in _list_keys(collection + "/"):
        t = get_text(key)
        if not t:
            continue
        try:
            out.append(json.loads(t))
        except Exception:
            pass
    return out
