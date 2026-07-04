"""Shared time-value-of-money primitives (stdlib only).

All rates are ANNUAL decimals (0.0325 = 3.25%). All terms are MONTHS.
User/adapter-supplied rates in either encoding go through normalize_rate()
— the ONE percent-vs-decimal convention for the whole underwriting library.
"""

from __future__ import annotations

import math

#: Boundary between decimal-form and percent-form annual rates.
#: See normalize_rate() for the rationale.
PERCENT_FORM_MIN = 0.25


def normalize_rate(rate) -> float | None:
    """Normalize an annual interest rate to DECIMAL form (0.0275 = 2.75%).

    This is the single rate convention for the underwriting library —
    strategy_picker, subto, and assumption all route rate input through it,
    so `loan_rate=1.0` can never mean 1%/yr to the picker and 100%/yr to the
    calculator it hands off to.

      value >= PERCENT_FORM_MIN (0.25)  -> percent form:  1.0  -> 0.01 (1%/yr)
      value <  PERCENT_FORM_MIN         -> decimal form:  0.0275 -> 0.0275

    Why 0.25: plausible annual note rates live in roughly 0.25%..25%. A
    DECIMAL-form value >= 0.25 would mean a >= 25%/yr mortgage (not a real
    note; even hard money tops out low-20s%), and a PERCENT-form value
    < 0.25 would mean a < 0.25%/yr coupon (below any teaser/ARM floor). So
    the two encodings never overlap across the 0.25 line. Notably 1.0 means
    1%/yr and 0.9 (a teaser/ARM floor) means 0.9%/yr — NOT 100%/90%.

    None -> None (unknown), 0 -> 0.0 (a true zero-rate note), non-finite ->
    None (garbage). Strings are accepted ("2.75%", "2.75", " 6.8 "): a
    trailing '%' is an EXPLICIT percent-form marker (bypasses the 0.25
    heuristic); unparseable strings -> None.
    """
    if rate is None:
        return None
    explicit_percent = False
    if isinstance(rate, str):
        cleaned = rate.strip().replace(",", "").replace("$", "")
        if cleaned.endswith("%"):
            explicit_percent = True
            cleaned = cleaned[:-1].strip()
        try:
            rate = float(cleaned)
        except ValueError:
            return None
    r = float(rate)
    if not math.isfinite(r):
        return None
    if r == 0:
        return 0.0
    if explicit_percent:
        return r / 100.0
    return r / 100.0 if abs(r) >= PERCENT_FORM_MIN else r


def monthly_payment(principal: float, annual_rate: float, term_months: int) -> float:
    """Fully-amortizing monthly P&I payment.

    Standard annuity formula: P * r / (1 - (1+r)^-n), r = annual_rate/12.
    Zero-rate loans degrade to straight-line principal.
    """
    if principal <= 0 or term_months <= 0:
        return 0.0
    r = annual_rate / 12.0
    if r == 0:
        return principal / term_months
    return principal * r / (1.0 - (1.0 + r) ** -term_months)


def remaining_balance(
    principal: float, annual_rate: float, term_months: int, payments_made: int
) -> float:
    """Balance remaining after `payments_made` scheduled payments."""
    if payments_made >= term_months:
        return 0.0
    r = annual_rate / 12.0
    if r == 0:
        return principal * (1 - payments_made / term_months)
    pmt = monthly_payment(principal, annual_rate, term_months)
    # FV of principal minus FV of payments made
    growth = (1.0 + r) ** payments_made
    return principal * growth - pmt * (growth - 1.0) / r


def annuity_pv(monthly_cashflow: float, annual_discount_rate: float, months: int) -> float:
    """Present value of a level monthly cash flow.

    Discount rate is applied monthly (annual/12) — a simple, documented
    convention, not an effective-annual conversion. Used for NPV-of-savings
    in assumption.py.
    """
    if months <= 0:
        return 0.0
    d = annual_discount_rate / 12.0
    if d == 0:
        return monthly_cashflow * months
    return monthly_cashflow * (1.0 - (1.0 + d) ** -months) / d


def first_month_principal(balance: float, annual_rate: float, p_and_i: float) -> float:
    """Principal portion of the next payment (amortization credit)."""
    interest = balance * annual_rate / 12.0
    return max(0.0, p_and_i - interest)
