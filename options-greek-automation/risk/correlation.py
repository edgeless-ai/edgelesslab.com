"""
Correlation guard: beta-weighted exposure with correlation matrix.

Provides:
  - BetaProvider: configurable beta lookup for underlyings
  - CorrelationMatrix: pairwise correlation between underlyings
  - compute_beta_weighted_delta: simple beta-weighted sum
  - compute_correlation_adjusted_exposure: portfolio variance using correlation
"""
import json
import math
from typing import Dict, List, Optional
from dataclasses import dataclass

# Default beta values (to market, SPY=1.0)
DEFAULT_BETAS = {
    "SPY": 1.00,
    "QQQ": 0.95,
    "IWM": 0.85,
    "DIA": 0.95,
    "XLF": 1.10,
    "XLK": 1.05,
    "XLE": 0.90,
    "XLI": 1.00,
    "XLP": 0.65,
    "XLU": 0.55,
    "XLV": 0.75,
    "XLRE": 0.70,
    "XLB": 0.95,
    "GLD": 0.00,
    "TLT": -0.30,
    "HYG": 0.40,
    "LQD": 0.15,
    "SLV": 0.05,
    "USO": 0.10,
    "VIX": -0.80,
}

# Default correlation matrix (SPY, QQQ, IWM, DIA, XLF, XLK, XLE, XLI, XLP, XLU, XLV, XLRE, XLB, GLD, TLT, HYG, LQD, SLV, USO, VIX)
# A 20x20 matrix is unwieldy; we store only the non-default (1.0) and explicit off-diagonal pairs.
DEFAULT_CORRELATIONS: Dict[str, Dict[str, float]] = {
    "SPY": {"QQQ": 0.97, "IWM": 0.88, "DIA": 0.95, "XLF": 0.92, "XLK": 0.93, "XLE": 0.75, "XLI": 0.90, "XLP": 0.80, "XLU": 0.55, "XLV": 0.85, "XLRE": 0.60, "XLB": 0.85, "GLD": -0.15, "TLT": -0.35, "HYG": 0.85, "LQD": 0.40, "SLV": 0.05, "USO": 0.25, "VIX": -0.75},
    "QQQ": {"IWM": 0.82, "DIA": 0.90, "XLF": 0.88, "XLK": 0.96, "XLE": 0.70, "XLI": 0.85, "XLP": 0.75, "XLU": 0.50, "XLV": 0.80, "XLRE": 0.55, "XLB": 0.80, "GLD": -0.10, "TLT": -0.30, "HYG": 0.80, "LQD": 0.35, "SLV": 0.05, "USO": 0.20, "VIX": -0.70},
    "IWM": {"DIA": 0.85, "XLF": 0.90, "XLK": 0.80, "XLE": 0.72, "XLI": 0.88, "XLP": 0.78, "XLU": 0.58, "XLV": 0.82, "XLRE": 0.62, "XLB": 0.88, "GLD": -0.12, "TLT": -0.32, "HYG": 0.82, "LQD": 0.38, "SLV": 0.08, "USO": 0.28, "VIX": -0.68},
    "DIA": {"XLF": 0.90, "XLK": 0.88, "XLE": 0.72, "XLI": 0.92, "XLP": 0.82, "XLU": 0.60, "XLV": 0.88, "XLRE": 0.65, "XLB": 0.88, "GLD": -0.18, "TLT": -0.38, "HYG": 0.82, "LQD": 0.42, "SLV": 0.02, "USO": 0.22, "VIX": -0.72},
    "XLF": {"XLK": 0.85, "XLE": 0.68, "XLI": 0.88, "XLP": 0.75, "XLU": 0.55, "XLV": 0.78, "XLRE": 0.70, "XLB": 0.80, "GLD": -0.10, "TLT": -0.28, "HYG": 0.92, "LQD": 0.45, "SLV": 0.05, "USO": 0.18, "VIX": -0.65},
    "XLK": {"XLE": 0.65, "XLI": 0.82, "XLP": 0.70, "XLU": 0.48, "XLV": 0.75, "XLRE": 0.52, "XLB": 0.78, "GLD": -0.08, "TLT": -0.25, "HYG": 0.78, "LQD": 0.32, "SLV": 0.08, "USO": 0.15, "VIX": -0.62},
    "XLE": {"XLI": 0.75, "XLP": 0.65, "XLU": 0.55, "XLV": 0.60, "XLRE": 0.50, "XLB": 0.85, "GLD": 0.10, "TLT": -0.15, "HYG": 0.65, "LQD": 0.20, "SLV": 0.15, "USO": 0.55, "VIX": -0.45},
    "XLI": {"XLP": 0.80, "XLU": 0.58, "XLV": 0.82, "XLRE": 0.60, "XLB": 0.88, "GLD": -0.15, "TLT": -0.32, "HYG": 0.80, "LQD": 0.38, "SLV": 0.05, "USO": 0.25, "VIX": -0.65},
    "XLP": {"XLU": 0.65, "XLV": 0.85, "XLRE": 0.58, "XLB": 0.72, "GLD": -0.05, "TLT": -0.18, "HYG": 0.70, "LQD": 0.30, "SLV": 0.02, "USO": 0.15, "VIX": -0.55},
    "XLU": {"XLV": 0.58, "XLRE": 0.75, "XLB": 0.55, "GLD": 0.05, "TLT": 0.25, "HYG": 0.55, "LQD": 0.40, "SLV": 0.00, "USO": 0.08, "VIX": -0.40},
    "XLV": {"XLRE": 0.55, "XLB": 0.70, "GLD": -0.02, "TLT": -0.15, "HYG": 0.72, "LQD": 0.28, "SLV": 0.02, "USO": 0.12, "VIX": -0.58},
    "XLRE": {"XLB": 0.60, "GLD": 0.02, "TLT": 0.15, "HYG": 0.60, "LQD": 0.35, "SLV": 0.00, "USO": 0.08, "VIX": -0.42},
    "XLB": {"GLD": -0.05, "TLT": -0.20, "HYG": 0.75, "LQD": 0.30, "SLV": 0.08, "USO": 0.20, "VIX": -0.55},
    "GLD": {"TLT": 0.35, "HYG": -0.05, "LQD": 0.10, "SLV": 0.85, "USO": 0.15, "VIX": -0.10},
    "TLT": {"HYG": 0.55, "LQD": 0.90, "SLV": 0.25, "USO": -0.08, "VIX": 0.20},
    "HYG": {"LQD": 0.65, "SLV": 0.00, "USO": 0.10, "VIX": -0.35},
    "LQD": {"SLV": 0.05, "USO": -0.05, "VIX": -0.15},
    "SLV": {"USO": 0.20, "VIX": -0.05},
    "USO": {"VIX": -0.25},
    "VIX": {},
}


def _ensure_symmetric(corr: Dict[str, Dict[str, float]]) -> Dict[str, Dict[str, float]]:
    """Make correlation matrix symmetric."""
    result = {}
    for a, b_dict in corr.items():
        if a not in result:
            result[a] = {}
        for b, val in b_dict.items():
            result[a][b] = val
            if b not in result:
                result[b] = {}
            result[b][a] = val
    return result


class BetaProvider:
    """Provides beta values for underlyings."""

    def __init__(self, betas: Optional[Dict[str, float]] = None):
        self.betas = {**DEFAULT_BETAS, **(betas or {})}

    def get(self, underlying: str) -> float:
        return self.betas.get(underlying, 1.0)

    def update(self, underlying: str, beta: float) -> None:
        self.betas[underlying] = beta


class CorrelationMatrix:
    """Provides pairwise correlations between underlyings."""

    def __init__(self, correlations: Optional[Dict[str, Dict[str, float]]] = None):
        raw = correlations or DEFAULT_CORRELATIONS
        self.correlations = _ensure_symmetric(raw)

    def get(self, a: str, b: str) -> float:
        if a == b:
            return 1.0
        return self.correlations.get(a, {}).get(b, 0.0)


@dataclass
class Position:
    underlying: str
    delta: float
    qty: int
    beta: Optional[float] = None


def compute_beta_weighted_delta(positions: List[Position], beta_provider: BetaProvider) -> float:
    """Sum of beta * delta * qty for each position."""
    return sum(beta_provider.get(p.underlying) * p.delta * p.qty for p in positions)


def compute_correlation_adjusted_exposure(
    positions: List[Position],
    beta_provider: BetaProvider,
    correlation_matrix: CorrelationMatrix,
) -> float:
    """
    Portfolio variance-like metric: sqrt(sum_i sum_j w_i * w_j * rho_ij)
    where w_i = beta_i * delta_i * qty_i.
    Returns the effective exposure in delta-equivalent terms.
    """
    if not positions:
        return 0.0

    weights = [beta_provider.get(p.underlying) * p.delta * p.qty for p in positions]
    underlyings = [p.underlying for p in positions]

    total = 0.0
    for i, wi in enumerate(weights):
        for j, wj in enumerate(weights):
            rho = correlation_matrix.get(underlyings[i], underlyings[j])
            total += wi * wj * rho

    return math.sqrt(abs(total)) if total != 0 else 0.0
