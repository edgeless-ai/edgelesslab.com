"""Obituary signal adapter (newspaper RSS, polite).

Source finding (2026-07, live-probed)
    Most metro obituaries are hosted by Legacy.com, which serves HTML (no
    public RSS) and whose ToS prohibits scraping — NOT used. Lee
    Enterprises papers (gazettetimes.com, democratherald.com, ...) now
    redirect their /obituaries/ sections to Legacy.com too.

    What DOES work keylessly: papers still on the TownNews/BLOX CMS expose
    a search RSS endpoint:
        https://<paper>/search/?f=rss&t=article&c=obituaries&l=<n>
    Live-verified: Herald & News, Klamath Falls OR (heraldandnews.com) —
    real obituaries with names + publish dates.

Signal
    ``obituary`` signals carry the deceased's NAME and the paper's metro
    (city/state) only — no property match at this stage. The spine's merge
    layer is responsible for probate/assessor enrichment later. Confidence
    is intentionally LOW (0.2): a name alone is weak until joined against
    ownership records.

Cadence
    Small-metro papers publish a handful per week; daily polling max.

ToS / politeness
    RSS feeds exist to be polled; we still poll gently (<= 1 feed fetch per
    run, l<=25 items) with a descriptive User-Agent. robots.txt on
    heraldandnews.com does not disallow /search/.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "obituaries_sample.json"

# metro key -> (feed_url, city, state)
METROS = {
    "klamath_falls": (
        "https://www.heraldandnews.com/search/?f=rss&t=article"
        "&c=obituaries&l={limit}",
        "KLAMATH FALLS", "OR",
    ),
    # Add more TownNews papers by dropping in the same /search/?f=rss
    # pattern; verify each with a manual probe first.
}


def _parse_rss(xml_text: str) -> list[dict]:
    """RSS 2.0 -> list of plain item dicts (stdlib only)."""
    root = ET.fromstring(xml_text)
    items = []
    for item in root.iter("item"):
        items.append({
            "title": (item.findtext("title") or "").strip(),
            "link": (item.findtext("link") or "").strip(),
            "guid": (item.findtext("guid") or "").strip(),
            "pub_date": (item.findtext("pubDate") or "").strip(),
            "description": (item.findtext("description") or "").strip(),
        })
    return items


def _fetch_raw(metro: str, limit: int) -> list[dict]:
    url_tmpl, _, _ = METROS[metro]
    resp = _common.http_get(url_tmpl.format(limit=limit))
    return _parse_rss(resp.text)


def _clean_name(title: str) -> str:
    """'Lehman,  Janet Lorraine  (Francis)' -> 'Janet Lorraine Lehman'."""
    t = re.sub(r"\s+", " ", title).strip()
    if "," in t:
        last, _, rest = t.partition(",")
        rest = re.sub(r"\(.*?\)", "", rest).strip()
        if rest:
            return f"{rest} {last.strip()}"
    return t


def _iso(pub_date: str) -> str:
    """RFC-2822 pubDate -> iso8601 (contract requirement)."""
    try:
        return parsedate_to_datetime(pub_date).isoformat()
    except Exception:
        return _common.now_iso()


def _to_signal(item: dict, metro: str) -> dict:
    _, city, state = METROS.get(metro, (None, "", ""))
    return _common.build_signal(
        id=_common.make_id("obit", metro, item.get("guid")
                           or item.get("link") or item.get("title")),
        source=f"newspaper_rss_obituaries_{metro}",
        signal_type="obituary",
        observed_at=_iso(item.get("pub_date", "")),
        city=city,
        state=state,
        evidence={
            "deceased_name": _clean_name(item.get("title", "")),
            "raw_title": item.get("title"),
            "raw_description": item.get("description"),
            "published": item.get("pub_date"),
            "metro": metro,
            "county": {"klamath_falls": "KLAMATH"}.get(metro, ""),
            "enrichment_needed": "probate/assessor ownership join",
        },
        source_url=item.get("link") or None,
        confidence=0.2,  # name-only; no property linkage yet
    )


def fetch(metro: str = "klamath_falls", limit: int = 25,
          offline: bool = False) -> list[dict]:
    """Fetch obituary signals from a metro newspaper RSS feed.

    Args:
        metro: key into METROS registry.
        limit: max feed items requested.
        offline: skip the network and use the bundled fixture.
    """
    if metro not in METROS:
        raise ValueError(f"unknown metro: {metro!r} ({sorted(METROS)})")
    items: list[dict] = []
    from_fixture = False
    if not offline:
        try:
            items = _fetch_raw(metro, limit)
        except Exception:
            items = []
    if not items:
        items = _common.load_fixture(FIXTURE)
        from_fixture = True
    signals = [_to_signal(i, metro) for i in items]
    if from_fixture:
        for s in signals:
            s["evidence"]["fixture_data"] = True
    return signals


if __name__ == "__main__":
    import sys
    offline = "--offline" in sys.argv
    signals = fetch(limit=15, offline=offline)
    print(f"obituaries: {len(signals)} signals offline={offline}")
    if signals:
        import json
        print(json.dumps(signals[0], indent=2))
