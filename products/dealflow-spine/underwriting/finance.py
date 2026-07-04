"""Shared time-value-of-money primitives (stdlib only).

All rates are ANNUAL decimals (0.0325 = 3.25%). All terms are MONTHS.
"""

from __future__ import annotations


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
