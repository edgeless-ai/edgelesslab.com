"""Strategy picker — the decision engine of the underwriting library.

Given plain-dict property facts, rank the applicable acquisition strategies
(wholesale / sub-to / assumption / seller-finance / pass) with explicit,
cited WHY.

Framework source: claude-vault/04-Sessions/2026-06-23-ebre-cmco-opportunity-
engine.md ("the strategy doc"). Load-bearing ideas encoded here:

  * "Lead score = number of overlapping signals ('2+ list targeting' =
    highest conviction)"                                     [doc section 1]
  * "misfit toys (non-conforming = appraisal-gap outliers)" — properties
    retail lenders choke on are CASH-BUYER deals → wholesale [doc section 1]
  * "AI = sourcing/screening firehose; human = judgment (underwriting
    discernment)" — this module RANKS AND EXPLAINS, a human underwrites.
    HITL gates are surgical: offer/contract/wire.            [doc section 1]

Deal-shape logic (standard creative-finance decision tree, made explicit):
  equity is the fuel for CASH strategies (wholesale, seller-finance);
  a below-market coupon is the fuel for DEBT strategies (sub-to, assumption);
  motivation is the fuel for ANY deal — zero motivation = pass.

R&D / educational-analytical use only — not financial or legal advice;
verify every structure with an attorney.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

DOC = "2026-06-23-ebre-cmco-opportunity-engine.md §1"

# Signals the spine's detectors emit that indicate SELLER MOTIVATION.
MOTIVATION_SIGNALS = {
    "arrears", "pre_foreclosure", "probate", "estate", "divorce",
    "tax_delinquent", "fire_damage", "insurance_gap", "job_relocation",
    "tired_landlord", "vacant", "fsbo", "absentee", "code_violations",
    "eviction", "obituary",
}
# Property-shape flags (NOT motivation — they change WHICH strategy fits).
PROPERTY_FLAGS = {"non_conforming", "misfit", "unfinished_basement"}

# Common synonyms detectors/callers use → canonical vocabulary above.
SIGNAL_ALIASES = {
    "relocation": "job_relocation", "relocating": "job_relocation",
    "foreclosure": "pre_foreclosure", "nod": "pre_foreclosure",
    "notice_of_default": "pre_foreclosure",
    "behind_on_payments": "arrears", "delinquent": "arrears",
    "late_payments": "arrears",
    "inherited": "probate", "inheritance": "probate",
    "landlord_fatigue": "tired_landlord",
    "out_of_state": "absentee", "out_of_state_owner": "absentee",
    "misfit_toy": "misfit", "misfit_toys": "misfit",
}
# Signals we can't classify still count as GENERIC motivation at half
# weight — a detector firing is evidence of a seller problem even when the
# label is novel; it must never silently zero out to "pass".
UNKNOWN_SIGNAL_WEIGHT = 0.5

CONDITION_WORDS = {"teardown": 1, "poor": 2, "fair": 3, "good": 4, "turnkey": 5}
ASSUMABLE_TYPES = {"fha", "va", "usda"}

DEFAULT_MARKET_RATE = 7.0  # percent
PASS_THRESHOLD = 3         # best strategy must score >= this or we recommend pass


# ----------------------------------------------------------- rule model ----

@dataclass
class Rule:
    id: str
    strategy: str
    weight: int                       # positive score; disqualifiers use dq=True
    test: Callable[[dict], bool]
    why: str
    cite: str = DOC
    dq: bool = False                  # True → hitting this DISQUALIFIES strategy


def _sig(d: dict, *names: str) -> bool:
    return bool(set(names) & d["signals"])


RULES: list[Rule] = [
    # ------------------------------------------------------- WHOLESALE ----
    Rule("W1", "wholesale", 3,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] >= 0.30
                   and d["motivation_count"] >= 2,
         "High equity + 2+ overlapping motivation signals: room for the "
         "margin AND a seller who will trade equity for speed. "
         "('2+ list targeting = highest conviction')"),
    Rule("W2", "wholesale", 2,
         lambda d: d["condition"] is not None and d["condition"] <= 2,
         "Heavy distress: retail buyers/lenders are out, flip buyers are the "
         "natural exit — the wholesale buyer pool."),
    Rule("W3", "wholesale", 2,
         lambda d: bool(d["property_flags"]),
         "Misfit toy (non-conforming/appraisal-gap outlier): financing "
         "appraisals choke, so cash-buyer assignment is the clean exit. "
         "('misfit toys = appraisal-gap outliers')"),
    Rule("W4", "wholesale", 1,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] >= 0.30
                   and 0 < d["motivation_count"] < 2,
         "High equity with some motivation, but below the 2-signal overlap: "
         "workable, lower conviction."),
    Rule("W-DQ1", "wholesale", 0,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] < 0.15,
         "Equity under 15% cannot absorb the end-buyer margin plus an "
         "assignment fee — there is no spread to wholesale.", dq=True),

    # ---------------------------------------------------------- SUB-TO ----
    Rule("S1", "subto", 3,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] < 0.20
                   and d["rate_delta"] is not None and d["rate_delta"] >= 1.5,
         "Low equity + coupon >=1.5% below market: nothing to buy but the "
         "DEBT, and the debt is the asset. The canonical sub-to shape."),
    Rule("S2", "subto", 2,
         lambda d: d["piti"] is not None and d["market_rent"] is not None
                   and d["piti"] <= d["market_rent"],
         "PITI at or under market rent: positive carry from day one."),
    Rule("S3", "subto", 2,
         lambda d: _sig(d, "arrears", "pre_foreclosure"),
         "Arrears/pre-foreclosure: reinstatement is a solvable, priceable "
         "seller problem — sub-to cures it at entry (be-honest-solve-"
         "problems: the offer IS the solution)."),
    Rule("S4", "subto", 1,
         lambda d: d["rate_delta"] is not None and d["rate_delta"] >= 2.5,
         "Deep below-market coupon (>=2.5% delta): the existing note is "
         "worth preserving at almost any structure."),
    Rule("S-DQ1", "subto", 0,
         lambda d: d["loan_balance"] == 0,
         "No existing debt — nothing to take subject-to; route to "
         "seller-finance.", dq=True),
    Rule("S-DQ2", "subto", 0,
         lambda d: d["rate_delta"] is not None and d["rate_delta"] <= 0,
         "Loan rate at/above market: taking over expensive debt has no "
         "economic point — refi/cash strategies dominate.", dq=True),
    Rule("S-DQ3", "subto", 0,
         lambda d: d["piti"] is not None and d["market_rent"] is not None
                   and d["piti"] > 1.10 * d["market_rent"],
         "PITI more than 10% above market rent: structurally negative carry; "
         "only a fast flip could work and that's not a sub-to hold.", dq=True),

    # ------------------------------------------------------ ASSUMPTION ----
    Rule("A1", "assumption", 3,
         lambda d: d["loan_type"] in ASSUMABLE_TYPES
                   and d["rate_delta"] is not None and d["rate_delta"] >= 1.5,
         "Assumable (FHA/VA/USDA) note >=1.5% below market: the rate delta "
         "is legally transferable — a below-market annuity."),
    Rule("A2", "assumption", 2,
         lambda d: d["equity_gap_pct"] is not None and d["equity_gap_pct"] <= 0.15,
         "Equity gap <=15% of value: bridgeable with a normal down payment — "
         "no exotic gap financing needed."),
    Rule("A3", "assumption", 1,
         lambda d: d["rate_delta"] is not None and d["rate_delta"] >= 3.0,
         "Extreme rate delta (>=3%): savings NPV large enough to pay for "
         "assumption friction many times over."),
    Rule("A4", "assumption", 2,
         lambda d: d["loan_type"] in ASSUMABLE_TYPES
                   and d["rate_delta"] is not None and d["rate_delta"] >= 1.5,
         "When the debt can be transferred LEGALLY, formal assumption "
         "dominates sub-to: no due-on-sale risk, and (VA) the seller's "
         "entitlement can be restored via substitution — the honest "
         "structure wins ties."),
    Rule("A-DQ1", "assumption", 0,
         lambda d: d["loan_balance"] > 0 and d["loan_type"] not in ASSUMABLE_TYPES,
         "Loan type is not assumable (conventional due-on-sale enforced).",
         dq=True),
    Rule("A-DQ2", "assumption", 0,
         lambda d: d["loan_balance"] == 0,
         "No loan to assume.", dq=True),
    Rule("A-DQ3", "assumption", 0,
         lambda d: d["equity_gap_pct"] is not None and d["equity_gap_pct"] > 0.25,
         "Equity gap over 25% of value: typical buyers cannot bridge it; "
         "the rate delta is stranded (consider seller carryback instead).",
         dq=True),

    # -------------------------------------------------- SELLER FINANCE ----
    Rule("F1", "seller_finance", 3,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] >= 0.70,
         "Equity >=70%: seller can carry a meaningful note; converts a "
         "lump-sum sale into income (often their actual goal)."),
    Rule("F2", "seller_finance", 2,
         lambda d: d["loan_balance"] == 0 and d["value"] > 0,
         "Free and clear: cleanest possible carryback — no underlying lien, "
         "no due-on-sale, seller becomes the bank."),
    Rule("F3", "seller_finance", 1,
         lambda d: d["condition"] is not None and d["condition"] >= 3,
         "Fair-or-better condition: the collateral supports a long note "
         "(sellers won't carry paper on a teardown)."),
    Rule("F4", "seller_finance", 1,
         lambda d: _sig(d, "tired_landlord", "probate", "estate"),
         "Income-preference signals (tired landlord / estate): mailbox money "
         "without tenants is the pitch that actually solves their problem."),
    Rule("F-DQ1", "seller_finance", 0,
         lambda d: d["equity_pct"] is not None and d["equity_pct"] < 0.30,
         "Equity under 30%: any carryback sits behind a big underlying lien "
         "— that's wrap/sub-to territory, not clean seller finance.", dq=True),
]

STRATEGIES = ("wholesale", "subto", "assumption", "seller_finance")


# ------------------------------------------------------------ deriving ----

def derive_facts(facts: dict) -> dict:
    """Normalize a forgiving plain dict into the fields rules consume.

    Forgiving means:
      * unknown keys ignored, missing keys default to None/0
      * rates as 3.25, 0.0325, or "2.75%" (strings with %/$/commas ok)
      * condition as int 1-5 or a word (teardown/poor/fair/good/turnkey)
      * signals under `signals`, `motivation`, or `motivation_signals`;
        a bare string is treated as a one-element list; synonyms mapped via
        SIGNAL_ALIASES; unrecognized signals count as generic motivation at
        UNKNOWN_SIGNAL_WEIGHT (never silently zero)
      * loan facts either flat (`loan_balance`/`loan_rate`/`loan_type`) or
        nested under `loan` ({"balance", "rate", "type"})
      * a caller-supplied `equity_pct` (0.12 or 12) is used when value and
        balance can't derive it; it also stands in for equity_gap_pct
        (gap = price - balance = equity, to first order)
    """
    if not isinstance(facts, dict):
        facts = {}
    loan = facts.get("loan") if isinstance(facts.get("loan"), dict) else {}
    value = _f(facts.get("value") or facts.get("arv") or facts.get("price"))
    balance = _first_f(facts.get("loan_balance"), loan.get("balance")) or 0.0
    rate = _rate_pct(_first(facts.get("loan_rate"), loan.get("rate")))
    loan_type = str(_first(facts.get("loan_type"), loan.get("type")) or "").lower() or None
    market_rate = _rate_pct(facts.get("market_rate")) or DEFAULT_MARKET_RATE

    if value:
        equity_pct = (value - balance) / value
    else:
        equity_pct = _fraction(facts.get("equity_pct"))
    rate_delta = (market_rate - rate) if rate is not None else None

    if value:
        gap_pct = max(0.0, value - balance) / value
    elif equity_pct is not None and balance > 0:
        gap_pct = max(0.0, equity_pct)  # gap ≈ equity when price ≈ value
    else:
        gap_pct = None

    raw = _first(facts.get("signals"), facts.get("motivation"),
                 facts.get("motivation_signals")) or []
    if isinstance(raw, str):
        raw = [raw]
    raw_signals = {str(s).strip().lower().replace("-", "_").replace(" ", "_")
                   for s in raw}
    raw_signals = {SIGNAL_ALIASES.get(s, s) for s in raw_signals}
    signals = raw_signals & MOTIVATION_SIGNALS
    property_flags = raw_signals & PROPERTY_FLAGS
    unknown = raw_signals - MOTIVATION_SIGNALS - PROPERTY_FLAGS

    return {
        "value": value or 0.0,
        "loan_balance": balance,
        "loan_type": loan_type,
        "loan_rate": rate,
        "market_rate": market_rate,
        "rate_delta": rate_delta,
        "equity_pct": equity_pct,
        "equity_gap_pct": gap_pct,
        "piti": _f(facts.get("piti")),
        "market_rent": _f(facts.get("market_rent")),
        "condition": _condition(facts.get("condition")),
        "signals": signals,
        "property_flags": property_flags,
        "unrecognized_signals": unknown,
        "motivation_count": len(signals) + UNKNOWN_SIGNAL_WEIGHT * len(unknown),
    }


def _f(x):
    """Float coercion that tolerates '2.75%', '$310,000', and junk → None."""
    if isinstance(x, str):
        x = x.replace("%", "").replace("$", "").replace(",", "").strip()
        if not x:
            return None
    try:
        return float(x) if x is not None else None
    except (TypeError, ValueError):
        return None


def _first(*vals):
    return next((v for v in vals if v is not None), None)


def _first_f(*vals):
    return _f(_first(*vals))


def _fraction(x):
    """Equity-style fraction: accepts 0.12 or 12 (percent)."""
    v = _f(x)
    if v is None:
        return None
    return v / 100.0 if v > 1.0 else v


def _rate_pct(rate):
    """Normalize to PERCENT (3.25). Accepts 3.25 or 0.0325."""
    r = _f(rate)
    if r is None or r == 0:
        return None if r is None else 0.0
    return r * 100.0 if r < 1.0 else r


def _condition(c):
    if c is None:
        return None
    if isinstance(c, str):
        return CONDITION_WORDS.get(c.strip().lower())
    try:
        n = int(c)
        return n if 1 <= n <= 5 else None
    except (TypeError, ValueError):
        return None


# -------------------------------------------------------------- picker ----

def pick(facts: dict) -> dict:
    """Rank strategies for a property.

    STABLE SHAPE CONTRACT (regardless of input messiness):
      returns a dict with exactly these keys, always:
        "ranked"         → plain ``list`` of dicts, best first, 'pass'
                           included; always sliceable/indexable; every entry
                           has strategy/score/applicable/reasons/
                           disqualifiers/next_action
        "recommendation" → str, == ranked[0]["strategy"]
        "derived"        → dict of the normalized facts the rules saw
                           (sets rendered as sorted lists)
        "hitl_note"      → str
    Non-dict or empty input degrades to a 'pass' recommendation, never an
    exception. See derive_facts() for accepted input keys.
    """
    d = derive_facts(facts)
    per = {s: {"strategy": s, "score": 0, "applicable": True,
               "reasons": [], "disqualifiers": []} for s in STRATEGIES}

    for rule in RULES:
        try:
            hit = rule.test(d)
        except (TypeError, KeyError):
            hit = False
        if not hit:
            continue
        entry = per[rule.strategy]
        record = {"rule": rule.id, "why": rule.why, "cite": rule.cite}
        if rule.dq:
            entry["applicable"] = False
            entry["disqualifiers"].append(record)
        else:
            entry["score"] += rule.weight
            entry["reasons"].append({**record, "weight": rule.weight})

    for entry in per.values():
        if not entry["applicable"]:
            entry["score"] = 0
        entry["next_action"] = _next_action(entry["strategy"], entry["applicable"])

    best = max((e["score"] for e in per.values()), default=0)
    per["pass"] = _pass_entry(d, best)

    ranked = sorted(per.values(),
                    key=lambda e: (e["applicable"], e["score"]), reverse=True)
    return {
        "ranked": ranked,
        "recommendation": ranked[0]["strategy"],
        "derived": {k: (sorted(v) if isinstance(v, set) else v)
                    for k, v in d.items()},
        "hitl_note": ("Decision support only. Per the strategy doc, the AI is "
                      "the sourcing/screening firehose; a HUMAN underwrites, "
                      "offers, contracts, and wires. " + DOC),
    }


def _pass_entry(d: dict, best_score: int) -> dict:
    reasons, score = [], 0
    if d["motivation_count"] == 0:
        score = max(5, best_score + 1)  # zero motivation ALWAYS tops the rank
        reasons.append({"rule": "P1", "weight": score, "cite": DOC,
                        "why": "Zero motivation signals: no seller problem to "
                               "solve means no deal at ANY structure — the "
                               "spine only produces conviction from "
                               "overlapping signals."})
    elif best_score < PASS_THRESHOLD:
        score = PASS_THRESHOLD
        reasons.append({"rule": "P2", "weight": PASS_THRESHOLD, "cite": DOC,
                        "why": f"No strategy reached score {PASS_THRESHOLD}: "
                               "deal shape fits nothing well. Human judgment "
                               "is expensive — spend it on 2+ signal overlaps."})
    return {"strategy": "pass", "score": score, "applicable": True,
            "reasons": reasons, "disqualifiers": [],
            "next_action": "Archive with derived facts; re-score when the "
                           "spine detects a new signal."}


def _next_action(strategy: str, applicable: bool) -> str:
    if not applicable:
        return "Disqualified — see disqualifiers."
    return {
        "wholesale": "Run wholesale.mao() + sensitivity_table(); order comps "
                     "for arv_from_comps(); estimate repairs before offering.",
        "subto": "Run subto.analyze() with servicer statement numbers; "
                 "attorney review of due-on-sale exposure BEFORE offer.",
        "assumption": "Run assumption.analyze(); request the servicer's "
                      "assumption package; size the equity gap.",
        "seller_finance": "Model the carryback note terms; attorney drafts "
                          "(Dodd-Frank/SAFE Act compliance for owner-occupied).",
    }[strategy]


def rule_table() -> str:
    """Human-readable dump of every rule (for docs/review)."""
    lines = ["ID     | strategy       | wt | type | why"]
    lines.append("-" * 100)
    for r in RULES:
        kind = "DQ " if r.dq else f"+{r.weight} "
        lines.append(f"{r.id:6} | {r.strategy:14} | {kind:>3} | "
                     f"{'dq' if r.dq else 'score'} | {r.why}")
    return "\n".join(lines)
