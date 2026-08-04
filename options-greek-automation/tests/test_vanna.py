import pytest
from strategy.vanna import compute_vanna_approx, compute_vanna_from_chain, compute_vanna_black_scholes


def test_vanna_approx() -> None:
    # delta=0.5, vega=0.10, spot=450 -> vanna = 0.5 * 0.10 / 450 = 0.000111
    vanna = compute_vanna_approx(0.5, 0.10, 450)
    assert abs(vanna - 0.000111) < 0.000001


def test_vanna_zero_spot() -> None:
    vanna = compute_vanna_approx(0.5, 0.10, 0)
    assert vanna == 0


def test_vanna_from_chain() -> None:
    row = {
        "delta": 0.3,
        "vega": 0.20,
        "underlying_price": 480,
    }
    vanna = compute_vanna_from_chain(row)
    expected = 0.3 * 0.20 / 480
    assert abs(vanna - expected) < 0.000001


def test_vanna_black_scholes_known_value() -> None:
    # ATM forward, 0.5y, 20% vol: d1=0.07071..., vanna ~ 0.0140695
    vanna = compute_vanna_black_scholes(100.0, 100.0, 0.5, 0.2)
    assert abs(vanna - 0.014069521780325242) < 1.0e-12


def test_vanna_black_scholes_zero_spot() -> None:
    assert compute_vanna_black_scholes(0.0, 100.0, 0.5, 0.2) == 0.0


def test_vanna_black_scholes_zero_vol() -> None:
    assert compute_vanna_black_scholes(100.0, 100.0, 0.5, 0.0) == 0.0


def test_vanna_black_scholes_zero_time() -> None:
    assert compute_vanna_black_scholes(100.0, 100.0, 0.0, 0.2) == 0.0


def test_vanna_black_scholes_no_arbitrage_growth() -> None:
    # All else equal, vanna should increase strictly with maturity for ATM.
    base = compute_vanna_black_scholes(100.0, 100.0, 0.5, 0.2)
    longer = compute_vanna_black_scholes(100.0, 100.0, 1.0, 0.2)
    assert 0.0 < base < longer


def test_vanna_black_scholes_atm_one_year() -> None:
    # ATM forward, 1.0y, 20% vol: ~ 0.0198476
    vanna = compute_vanna_black_scholes(100.0, 100.0, 1.0, 0.2)
    assert abs(vanna - 0.01984762737385059) < 1.0e-12
