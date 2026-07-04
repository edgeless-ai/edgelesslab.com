"""Shared helpers for dealflow-spine signal adapters.

Every adapter module in this package exposes ``fetch() -> list[dict]`` where
each dict conforms to the Signal contract:

    {
      "id": str,             # stable/deterministic per source record
      "source": str,
      "signal_type": str,    # fema_disaster|code_violation|tax_delinquent|
                             # obituary|pre_foreclosure|assumable_loan|other
      "observed_at": str,    # iso8601
      "property": {"apn": str|None, "address": str, "city": str,
                   "state": str, "zip": str,
                   "lat": float|None, "lon": float|None},
      "owner": {"name": str, "mailing_address": str} | None,
      "evidence": dict,      # source-specific payload
      "source_url": str|None,
      "confidence": float,   # 0-1
    }

Adapters keep politeness invariants centralized here: a descriptive
User-Agent, a per-process minimum interval between HTTP requests, and
bounded retries. Fixture fallback (offline mode) is also centralized.

stdlib + requests only. Python 3.11.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests  # only needed for LIVE fetches
except ImportError:  # fresh env: offline/fixture mode must still work
    requests = None  # type: ignore[assignment]

USER_AGENT = (
    "dealflow-spine-rnd/0.1 (internal R&D; polite; contact: ops@edgelesslab.com)"
)

# fixtures/adapters/ lives two levels above this file (products/dealflow-spine/)
FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "adapters"

_MIN_INTERVAL_S = 1.0  # self-imposed rate limit: >= 1s between requests
_last_request_ts = 0.0

# ---------------------------------------------------------------------------
# live/offline gate
#
# Network adapters default to OFFLINE (bundled fixtures) unless the run is
# explicitly made live: `python cli.py run --live` sets DEALFLOW_LIVE=1.
# An adapter's fetch(offline=...) argument still wins when passed explicitly
# (True or False); only offline=None consults the environment.
# ---------------------------------------------------------------------------

LIVE_ENV_VAR = "DEALFLOW_LIVE"


def live_enabled() -> bool:
    """True when this process was explicitly switched to live network mode."""
    return os.environ.get(LIVE_ENV_VAR, "").strip().lower() in {"1", "true", "yes"}


def resolve_offline(offline: bool | None) -> bool:
    """Resolve a fetch(offline=...) argument against the live gate."""
    return (not live_enabled()) if offline is None else bool(offline)

VALID_SIGNAL_TYPES = {
    "fema_disaster",
    "code_violation",
    "tax_delinquent",
    "obituary",
    "pre_foreclosure",
    "assumable_loan",
    "other",
}


def http_get(url: str, params: dict | None = None, *, timeout: int = 30,
             retries: int = 2, backoff_s: float = 2.0) -> "requests.Response":
    """Polite GET: proper UA, self rate-limit, bounded retries."""
    if requests is None:
        raise RuntimeError(
            "the 'requests' package is not installed — live fetches are "
            "unavailable. Run offline (the default) or `pip install requests` "
            "and re-run with `cli.py run --live`.")
    global _last_request_ts
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        wait = _MIN_INTERVAL_S - (time.monotonic() - _last_request_ts)
        if wait > 0:
            time.sleep(wait)
        try:
            resp = requests.get(
                url, params=params, timeout=timeout,
                headers={"User-Agent": USER_AGENT},
            )
            _last_request_ts = time.monotonic()
            if resp.status_code in (429, 502, 503, 504) and attempt < retries:
                time.sleep(backoff_s * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:  # includes HTTPError
            _last_request_ts = time.monotonic()
            last_exc = exc
            if attempt < retries:
                time.sleep(backoff_s * (attempt + 1))
    raise last_exc  # type: ignore[misc]


def http_get_json(url: str, params: dict | None = None, **kw) -> dict | list:
    return http_get(url, params, **kw).json()


def make_id(*parts) -> str:
    """Deterministic signal id from stable source-record fields."""
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_fixture(name: str) -> list | dict:
    """Load a fixture file from fixtures/adapters/."""
    path = FIXTURES_DIR / name
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_fixture(name: str, data) -> Path:
    """Save raw sample data captured from a live API call."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURES_DIR / name
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, default=str)
    return path


def build_signal(*, id: str, source: str, signal_type: str, observed_at: str,
                 address: str = "", city: str = "", state: str = "",
                 zip_code: str = "", apn: str | None = None,
                 lat: float | None = None, lon: float | None = None,
                 owner: dict | None = None, evidence: dict | None = None,
                 source_url: str | None = None,
                 confidence: float = 0.5) -> dict:
    """Assemble + sanity-check one Signal dict."""
    if signal_type not in VALID_SIGNAL_TYPES:
        raise ValueError(f"invalid signal_type: {signal_type}")
    if not 0.0 <= confidence <= 1.0:
        raise ValueError(f"confidence out of range: {confidence}")
    if owner is not None:
        owner = {"name": owner.get("name", ""),
                 "mailing_address": owner.get("mailing_address", "")}
    return {
        "id": id,
        "source": source,
        "signal_type": signal_type,
        "observed_at": observed_at,
        "property": {
            "apn": apn,
            "address": address or "",
            "city": city or "",
            "state": state or "",
            "zip": zip_code or "",
            "lat": float(lat) if lat is not None else None,
            "lon": float(lon) if lon is not None else None,
        },
        "owner": owner,
        "evidence": evidence or {},
        "source_url": source_url,
        "confidence": round(float(confidence), 3),
    }
