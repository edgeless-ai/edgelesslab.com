"""
criteria.py — the buy-box engine (the "C" in CMCO).

A BuyBox is a declarative config (JSON native; YAML if PyYAML happens to be
installed) evaluated against a PropertyRecord. Every check is optional — an
empty/missing block means "don't filter on this".

Checks:
  geo           states (must match), then cities OR zips (zip supports '*'
                prefix-glob, e.g. "339*") OR counties — any one hit passes.
  price_band    min/max vs the best available value fact
                (estimated_value > list_price > assessed_value).
  min_equity_pct  vs facts["equity_pct"] (0-1 fraction).
  property_types  facts["property_type"] must be in the list.
  min_signal_count  distinct signal TYPES on the record — the EBRE
                "2+ list stacking" rule (2 distinct why-they'll-sell signals
                = highest conviction).

Unknowns (fact not present on the record) are governed by unknown_policy:
  "lenient" (default) — unknown facts don't fail the box, they're reported
                        in CriteriaResult.unknowns so underwriting can chase.
  "strict"            — unknown facts count as misses.

Result vocabulary (matched / matches / misses / unknowns) is part of the
DealCandidate contract: criteria_matches = CriteriaResult.as_dict().
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .schema import PropertyRecord

VALUE_FACT_PRIORITY = ("estimated_value", "list_price", "assessed_value")


@dataclass
class CriteriaResult:
    matched: bool
    matches: list[str] = field(default_factory=list)
    misses: list[str] = field(default_factory=list)
    unknowns: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "matched": self.matched,
            "matches": self.matches,
            "misses": self.misses,
            "unknowns": self.unknowns,
        }

    @property
    def geo_missed(self) -> bool:
        """Hard disqualifier: property is outside the target geography."""
        return any(m.startswith("geo") for m in self.misses)


def _zip_matches(zip_code: str, patterns: list[str]) -> bool:
    for pat in patterns:
        pat = str(pat).strip()
        if pat.endswith("*"):
            if zip_code.startswith(pat[:-1]):
                return True
        elif zip_code == pat:
            return True
    return False


class BuyBox:
    """Configurable buy-box. Construct with a config dict or `load()` a file."""

    def __init__(self, config: dict | None = None):
        config = config or {}
        self.name: str = config.get("name", "default")
        geo = config.get("geo") or {}
        self.states: list[str] = [str(s).upper() for s in geo.get("states") or []]
        self.cities: list[str] = [str(c).upper() for c in geo.get("cities") or []]
        self.zips: list[str] = [str(z) for z in geo.get("zips") or []]
        self.counties: list[str] = [str(c).upper() for c in geo.get("counties") or []]
        band = config.get("price_band") or {}
        self.price_min: float | None = band.get("min")
        self.price_max: float | None = band.get("max")
        self.min_equity_pct: float | None = config.get("min_equity_pct")
        self.property_types: list[str] = [
            str(t).lower() for t in config.get("property_types") or []
        ]
        self.min_signal_count: int = int(config.get("min_signal_count") or 0)
        self.unknown_policy: str = config.get("unknown_policy", "lenient")
        self.raw = config

    # -- loading ------------------------------------------------------------

    @classmethod
    def load(cls, path: str | Path) -> "BuyBox":
        path = Path(path)
        text = path.read_text()
        if path.suffix.lower() in (".yaml", ".yml"):
            try:
                import yaml  # optional dep — JSON is the guaranteed format
            except ImportError as e:
                raise RuntimeError(
                    f"{path.name} is YAML but PyYAML is not installed; "
                    "use a .json buy-box or `pip install pyyaml`"
                ) from e
            return cls(yaml.safe_load(text))
        return cls(json.loads(text))

    # -- evaluation ---------------------------------------------------------

    def evaluate(self, record: PropertyRecord) -> CriteriaResult:
        matches: list[str] = []
        misses: list[str] = []
        unknowns: list[str] = []
        facts = record.facts
        prop = record.property

        # geo — state gate, then any-of(city, zip, county)
        if self.states:
            if prop.state.upper() in self.states:
                matches.append(f"geo:state={prop.state.upper()}")
            else:
                misses.append(f"geo:state {prop.state or '?'} not in {self.states}")
        if self.cities or self.zips or self.counties:
            city = prop.city.upper()
            county = str(facts.get("county") or "").upper()
            hit = None
            if self.cities and city and city in self.cities:
                hit = f"geo:city={city}"
            elif self.zips and prop.zip and _zip_matches(prop.zip, self.zips):
                hit = f"geo:zip={prop.zip}"
            elif self.counties and county and county in self.counties:
                hit = f"geo:county={county}"
            if hit:
                matches.append(hit)
            elif not (city or prop.zip or county):
                unknowns.append("geo:locality unknown (no city/zip/county)")
            else:
                misses.append(
                    f"geo:locality ({city or '?'}/{prop.zip or '?'}) not in target area"
                )

        # price band
        if self.price_min is not None or self.price_max is not None:
            value = next(
                (facts[k] for k in VALUE_FACT_PRIORITY if facts.get(k) is not None),
                None,
            )
            if value is None:
                unknowns.append("price:no value fact")
            else:
                lo = self.price_min if self.price_min is not None else float("-inf")
                hi = self.price_max if self.price_max is not None else float("inf")
                if lo <= float(value) <= hi:
                    matches.append(f"price:${float(value):,.0f} in band")
                else:
                    misses.append(f"price:${float(value):,.0f} outside [{lo:,.0f}, {hi:,.0f}]")

        # equity
        if self.min_equity_pct is not None:
            eq = facts.get("equity_pct")
            if eq is None:
                unknowns.append("equity:unknown")
            elif float(eq) >= float(self.min_equity_pct):
                matches.append(f"equity:{float(eq):.0%} >= {float(self.min_equity_pct):.0%}")
            else:
                misses.append(f"equity:{float(eq):.0%} < {float(self.min_equity_pct):.0%}")

        # property type
        if self.property_types:
            ptype = facts.get("property_type")
            if ptype is None:
                unknowns.append("property_type:unknown")
            elif str(ptype).lower() in self.property_types:
                matches.append(f"property_type:{ptype}")
            else:
                misses.append(f"property_type:{ptype} not in {self.property_types}")

        # signal stacking (the EBRE "2+ list" rule)
        if self.min_signal_count:
            distinct = len(record.distinct_signal_types)
            if distinct >= self.min_signal_count:
                matches.append(f"signals:{distinct} distinct >= {self.min_signal_count}")
            else:
                misses.append(f"signals:{distinct} distinct < {self.min_signal_count}")

        if self.unknown_policy == "strict":
            matched = not misses and not unknowns
        else:
            matched = not misses
        return CriteriaResult(
            matched=matched, matches=matches, misses=misses, unknowns=unknowns
        )


def load_buybox(path: str | Path) -> BuyBox:
    """Module-level convenience mirror of BuyBox.load()."""
    return BuyBox.load(path)
