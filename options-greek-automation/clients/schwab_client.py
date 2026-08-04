"""Schwab API client for live options execution.

Replaces Alpaca paper trading for options using Schwab's trader API.
"""
import os
from typing import Any, Dict, Optional
from contextlib import contextmanager
from datetime import datetime, timezone

import requests

SCHWAB_BASE = "https://api.schwabapi.com/trader/v1"
AUTH_URL = "https://api.schwabapi.com/v1/oauth/authorize"
TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token"


class SchwabAuthError(Exception):
    """Raised on OAuth or token refresh failure."""


def _guard_live_orders(action: str) -> None:
    """Hard stop on live orders. The linked Schwab account holds REAL money and
    the mandate is paper-only — no order may fire by accident. Requires a
    deliberate, explicit opt-in that David sets by hand for a sanctioned live run.
    """
    if os.getenv("SCHWAB_ALLOW_LIVE_ORDERS") != "1":
        raise RuntimeError(
            f"{action} BLOCKED: Schwab is data-only (real-money account, paper-only "
            "mandate). Live orders are disabled. This is intentional — do not set "
            "SCHWAB_ALLOW_LIVE_ORDERS without David's explicit authorization."
        )


class SchwabClient:
    """Minimal Schwab client for options account + order workflows."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        callback_url: str,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.callback_url = callback_url
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at: float = 0.0

    def build_auth_url(self, state: str) -> str:
        return (
            "https://api.schwabapi.com/v1/oauth/authorize"
            f"?client_id={self.client_id}"
            f"&redirect_uri={self.callback_url}"
            f"&response_type=code"
            f"&state={state}"
        )

    def exchange_code(self, code: str) -> Dict[str, Any]:
        payload: Dict[str, str] = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.callback_url,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        data = self._post(TOKEN_URL, payload, authorized=False)
        self._apply_token_response(data)
        return data

    def refresh_access_token(self) -> Dict[str, Any]:
        if not self.refresh_token:
            raise SchwabAuthError("refresh_token is not set")
        payload: Dict[str, str] = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        data = self._post(TOKEN_URL, payload, authorized=False)
        self._apply_token_response(data)
        return data

    def _apply_token_response(self, data: Dict[str, Any]) -> None:
        if isinstance(data.get("access_token"), str):
            self.access_token = data["access_token"]
        if isinstance(data.get("refresh_token"), str):
            self.refresh_token = data["refresh_token"]
        expires_in = int(data.get("expires_in", 0))
        self.token_expires_at = datetime.now(timezone.utc).timestamp() + expires_in

    def get_account(self, account_number: str) -> Dict[str, Any]:
        data = self._get(f"{SCHWAB_BASE}/accounts/{account_number}")
        return self._unwrap(data)

    def get_positions(self, account_number: str) -> Dict[str, Any]:
        data = self._get(f"{SCHWAB_BASE}/accounts/{account_number}/positions")
        return self._unwrap(data)

    def get_option_chain(self, account_number: str, symbol: str) -> Dict[str, Any]:
        data = self._get(f"{SCHWAB_BASE}/accounts/{account_number}/option_chain", params={"symbol": symbol})
        return self._unwrap(data)

    def place_order(self, account_number: str, order: Dict[str, Any]) -> Dict[str, Any]:
        _guard_live_orders("place_order")
        payload = {"order": order}
        data = self._post(
            f"{SCHWAB_BASE}/accounts/{account_number}/orders",
            payload,
        )
        return self._unwrap(data)

    def cancel_order(self, account_number: str, order_id: int) -> Dict[str, Any]:
        _guard_live_orders("cancel_order")
        data = self._delete(f"{SCHWAB_BASE}/accounts/{account_number}/orders/{order_id}")
        return self._unwrap(data)

    def _authorized_headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}", "Accept": "application/json"}

    def _default_headers(self) -> Dict[str, str]:
        return {"Accept": "application/json"}

    def _unwrap(self, resp: requests.Response) -> Dict[str, Any]:
        try:
            data = resp.json()
        except ValueError as exc:
            raise RuntimeError(f"Invalid JSON from Schwab: {resp.text}") from exc
        if not resp.ok:
            detail = data.get("message", data) if isinstance(data, dict) else data
            raise RuntimeError(f"Schwab API error {resp.status_code}: {detail}")
        return data

    def _post(
        self,
        url: str,
        payload: Dict[str, Any],
        authorized: bool = True,
    ) -> requests.Response:
        with _build_client() as session:
            resp = session.post(
                url,
                json=payload,
                headers=self._authorized_headers() if authorized else self._default_headers(),
            )
            return resp

    def _get(self, url: str, params: Optional[Dict[str, Any]] = None, authorized: bool = True) -> requests.Response:
        with _build_client() as session:
            resp = session.get(
                url,
                params=params,
                headers=self._authorized_headers() if authorized else self._default_headers(),
            )
            return resp

    def _delete(self, url: str, authorized: bool = True) -> requests.Response:
        with _build_client() as session:
            resp = session.delete(
                url,
                headers=self._authorized_headers() if authorized else self._default_headers(),
            )
            return resp


@contextmanager
def _build_client():
    with requests.Session() as session:
        yield session


if __name__ == "__main__":
    client_id = os.getenv("SCHWAB_API_KEY", "")
    client = SchwabClient(client_id=client_id, client_secret="", callback_url="http://localhost:8420/callback")
    print("Auth URL:", client.build_auth_url("state123"))
