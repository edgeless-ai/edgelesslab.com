import pytest
from execution.alpaca_client import build_occ_symbol


def test_build_occ_call():
    occ = build_occ_symbol("SPY", "2026-07-19", "call", 450.00)
    assert occ == "SPY260719C00450000"


def test_build_occ_put():
    occ = build_occ_symbol("SPY", "2026-07-19", "put", 445.50)
    assert occ == "SPY260719P00445500"
