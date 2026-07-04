"""
underwrite.py — bridge spine DealCandidates into underwriting.strategy_picker.

The underwriting library (underwriting/) is contract-locked: `pick(facts)`
takes a forgiving plain dict and returns a stable
{ranked, recommendation, derived, hitl_note} shape. This module owns the
DELIBERATE mapping from spine vocabulary (PropertyRecord facts + Signal
evidence) to the picker's input keys, calls pick() for every hot/warm
candidate, and attaches the verdict to the candidate record:

    candidate.underwriting = {
        "recommendation": str,        # == ranked_top3[0]["strategy"]
        "ranked_top3":    [entry, entry, entry],   # picker entries, best first
        "hitl_note":      str,
    }

Mapping decisions (each one intentional, see picker_facts()):

  value        estimated_value > list_price > assessed_value (best first)
  loan facts   scanned from signal evidence: loan_balance/loan_amount,
               note_rate/note_rate_stated/estimated_origination_rate/loan_rate,
               loan_type/loan_program, current_market_rate. An assumable_loan
               signal is FINANCING evidence, not seller motivation — it feeds
               these keys and is excluded from the motivation signal list.
  equity       when no explicit balance exists but we know equity_pct AND a
               value, the implied balance value*(1-equity_pct) is passed so
               the picker's equity/gap rules see the same debt picture the
               spine's buy-box saw. If the debt picture is UNKNOWN (no
               balance, no equity fact), `value` is withheld as
               defense-in-depth. (Since the 2026-07-04 review fixes the
               picker itself also tracks `balance_known` and never treats a
               missing balance as free-and-clear — this mapping guard is
               belt-and-braces, not the only line of defense.)
  signals      spine signal_type -> picker MOTIVATION_SIGNALS vocabulary
               (code_violation->code_violations, fema_disaster->insurance_gap,
               ...). "other" signals pass their original label through —
               the picker counts unrecognized labels as generic motivation
               at half weight by design. facts.absentee_owner adds "absentee".
  condition    facts["condition"] if present, else first signal evidence
               carrying a "condition" key. (Not a KNOWN_FACT_KEY today, but
               adapters/enrichment may supply it.)

Nothing in underwriting/ is imported besides strategy_picker, and nothing
there is modified.
"""

from __future__ import annotations

import sys
from pathlib import Path

from .schema import DealCandidate

_PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PACKAGE_ROOT))

from underwriting import strategy_picker  # noqa: E402  (contract-locked API)

#: routes that get a pick() verdict (the review queue underwriting reads)
UNDERWRITE_ROUTES: tuple[str, ...] = ("hot", "warm")

# spine SIGNAL_TYPES -> picker MOTIVATION_SIGNALS vocabulary.
# assumable_loan is deliberately absent (financing evidence, not motivation).
SIGNAL_TYPE_MAP: dict[str, str] = {
    "tax_delinquent": "tax_delinquent",
    "pre_foreclosure": "pre_foreclosure",
    "obituary": "obituary",
    "code_violation": "code_violations",
    "fema_disaster": "insurance_gap",   # the FEMA play IS the insurance-gap play
}

# evidence keys scanned (in order) for each loan fact
_BALANCE_KEYS = ("loan_balance", "loan_amount")
_RATE_KEYS = ("note_rate", "note_rate_stated", "loan_rate",
              "estimated_origination_rate")
_TYPE_KEYS = ("loan_type", "loan_program")


def _first_evidence(candidate: DealCandidate, keys: tuple[str, ...]):
    """First non-None value for any of `keys` across the candidate's signal
    evidence (signals are oldest-first; any hit is better than none)."""
    for sig in candidate.signals:
        for k in keys:
            v = sig.evidence.get(k)
            if v is not None and v != "":
                return v
    return None


def picker_facts(candidate: DealCandidate) -> dict:
    """Map one DealCandidate into strategy_picker.pick() input keys."""
    facts = candidate.facts or {}
    out: dict = {}

    value = (facts.get("estimated_value") or facts.get("list_price")
             or facts.get("assessed_value"))

    # -- loan evidence ------------------------------------------------------
    balance = _first_evidence(candidate, _BALANCE_KEYS)
    rate = _first_evidence(candidate, _RATE_KEYS)
    loan_type = _first_evidence(candidate, _TYPE_KEYS)
    market_rate = _first_evidence(candidate, ("current_market_rate",))
    equity = facts.get("equity_pct")

    if balance is None and equity is not None and value:
        try:
            balance = max(0.0, float(value) * (1.0 - float(equity)))
        except (TypeError, ValueError):
            balance = None

    if balance is not None:
        out["loan_balance"] = balance
        if value:
            out["value"] = value
    elif equity is not None:
        # debt picture only known as a fraction — pass it standalone; the
        # picker honors equity_pct when value/balance can't derive it
        out["equity_pct"] = equity
    # else: debt picture unknown -> withhold value (see module docstring)

    if rate is not None:
        out["loan_rate"] = rate
    if loan_type:
        out["loan_type"] = loan_type
    if market_rate is not None:
        out["market_rate"] = market_rate

    # -- motivation signals -------------------------------------------------
    signals: list[str] = []
    for sig in candidate.signals:
        mapped = SIGNAL_TYPE_MAP.get(sig.signal_type)
        if mapped:
            signals.append(mapped)
        elif sig.signal_type == "other":
            # pass the original detector label through: the picker counts
            # unrecognized labels as generic motivation at half weight
            signals.append(str(sig.evidence.get("_original_signal_type")
                               or "other"))
    if facts.get("absentee_owner"):
        signals.append("absentee")
    out["signals"] = sorted(set(signals))

    # -- condition ------------------------------------------------------------
    condition = facts.get("condition")
    if condition is None:
        condition = _first_evidence(candidate, ("condition",))
    if condition is not None:
        out["condition"] = condition

    return out


def underwrite_candidate(candidate: DealCandidate) -> dict:
    """Run the strategy picker on one candidate and attach the verdict.

    Returns the attached dict ({recommendation, ranked_top3, hitl_note})."""
    result = strategy_picker.pick(picker_facts(candidate))
    verdict = {
        "recommendation": result["recommendation"],
        "ranked_top3": result["ranked"][:3],
        "hitl_note": result["hitl_note"],
    }
    candidate.underwriting = verdict
    return verdict


def underwrite_candidates(
    candidates: list[DealCandidate],
    routes: tuple[str, ...] = UNDERWRITE_ROUTES,
) -> int:
    """Attach picker verdicts to every candidate routed hot/warm.

    Mutates candidates in place; returns how many were underwritten."""
    n = 0
    for c in candidates:
        if c.route in routes:
            underwrite_candidate(c)
            n += 1
    return n


def top_reason(verdict: dict | None) -> str:
    """Display-ready one-liner: why the recommended strategy won."""
    if not verdict:
        return ""
    ranked = verdict.get("ranked_top3") or []
    if not ranked:
        return ""
    best = ranked[0]
    reasons = best.get("reasons") or []
    if reasons:
        return str(reasons[0].get("why") or "")
    return str(best.get("next_action") or "")
