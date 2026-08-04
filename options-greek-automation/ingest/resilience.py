"""
Ingestion resilience layer: circuit breaker, data quality gate, retry logic.
Handles ConvexValue API failures gracefully.
"""
import time
import random
import logging
from typing import Callable, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("ingest.resilience")


@dataclass
class CircuitBreaker:
    """Circuit breaker pattern: 3 failures = 5-minute cooldown."""
    failure_threshold: int = 3
    cooldown_seconds: float = 300.0
    _failures: int = field(default=0, repr=False)
    _last_failure: Optional[float] = field(default=None, repr=False)
    _state: str = field(default="closed", repr=False)  # closed, open, half_open

    def call(self, fn: Callable, *args, **kwargs) -> Any:
        if self._state == "open":
            if time.time() - self._last_failure < self.cooldown_seconds:
                raise RuntimeError("Circuit breaker OPEN: API temporarily unavailable")
            self._state = "half_open"
            logger.info("Circuit breaker half-open: trying one call")

        try:
            result = fn(*args, **kwargs)
            self._reset()
            return result
        except Exception as e:
            self._failures += 1
            self._last_failure = time.time()
            if self._failures >= self.failure_threshold:
                self._state = "open"
                logger.warning(f"Circuit breaker OPEN: {self._failures} consecutive failures")
            raise

    def _reset(self):
        self._failures = 0
        self._last_failure = None
        self._state = "closed"


def exponential_backoff_retry(
    fn: Callable, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 30.0
) -> Any:
    """Retry with exponential backoff + jitter."""
    last_error = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                delay = min(base_delay * (2 ** attempt), max_delay)
                jitter = random.uniform(0, delay * 0.3)
                sleep_time = delay + jitter
                logger.warning(f"Retry {attempt + 1}/{max_retries}: {e}. Sleeping {sleep_time:.1f}s")
                time.sleep(sleep_time)
    raise last_error


@dataclass
class DataQualityGate:
    """Reject snapshots with too many nulls or stale data."""
    max_null_ratio: float = 0.20
    max_staleness_seconds: int = 360

    def check_chain(self, chain: dict, expected_fields: list) -> tuple[bool, str]:
        """Returns (passed, reason)."""
        if not chain or not chain.get("chain"):
            return False, "Empty chain"

        total = 0
        nulls = 0
        for exp in chain["chain"]:
            for strike in exp.get("strikes", []):
                for side_values in [strike[1], strike[2]]:
                    if side_values:
                        total += len(side_values)
                        nulls += sum(1 for v in side_values if v is None)

        if total == 0:
            return False, "No data points"

        null_ratio = nulls / total
        if null_ratio > self.max_null_ratio:
            return False, f"Null ratio {null_ratio:.1%} > {self.max_null_ratio:.1%}"

        return True, "OK"

    def check_underlying(self, spot: Optional[float]) -> tuple[bool, str]:
        if spot is None or spot <= 0:
            return False, "Invalid spot price"
        return True, "OK"
