"""
ConvexValue API Client — Python wrapper around the cv-mcp MCP server.

Provides real-time options chain data with Greeks for US equities/ETFs.
Uses the existing cvforge MCP server.
"""
import json
import os
import subprocess
import threading
import time
from typing import Optional, List, Dict, Any

# API key from env only — never hardcode (was a live key committed to git; rotate it).
DEFAULT_API_KEY = os.environ.get("CONVEXVALUE_API_KEY", "")
DEFAULT_API_URL = "https://tap.convexvalue.com/api/data"
MCP_SERVER_PATH = "/Applications/cvforge.app/Contents/Resources/cv-mcp"


class ConvexValueClient:
    """Python wrapper for the ConvexValue MCP server."""

    def __init__(self, api_key: str = DEFAULT_API_KEY, api_url: str = DEFAULT_API_URL):
        self.api_key = api_key
        self.api_url = api_url
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        self._msg_id = 0
        self._start_mcp()

    def _start_mcp(self) -> None:
        """Start the MCP server subprocess."""
        env = os.environ.copy()
        env["CV_API_KEY"] = self.api_key
        env["CV_API_URL"] = self.api_url
        self._proc = subprocess.Popen(
            [MCP_SERVER_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )
        # Initialize MCP session
        init = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "edgeless-options", "version": "1.0"},
            },
        }
        self._send(init)
        self._recv()  # Discard init response

    def _next_id(self) -> int:
        self._msg_id += 1
        return self._msg_id

    def _send(self, msg: Dict[str, Any]) -> None:
        line = json.dumps(msg) + "\n"
        self._proc.stdin.write(line)
        self._proc.stdin.flush()

    def _recv(self) -> Dict[str, Any]:
        line = self._proc.stdout.readline()
        if not line:
            raise RuntimeError("MCP server closed stdout")
        return json.loads(line)

    def _call(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            msg = {
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
            }
            self._send(msg)
            resp = self._recv()
        if "error" in resp:
            raise RuntimeError(f"MCP error: {resp['error']}")
        return resp["result"]

    def get_chain(
        self,
        symbol: str,
        fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Fetch the option chain for an underlying symbol."""
        args: Dict[str, Any] = {"symbol": symbol}
        if fields:
            args["fields"] = fields
        result = self._call("get_chain", args)
        text = result["content"][0]["text"]
        return json.loads(text)

    def screen(
        self,
        columns: Optional[List[str]] = None,
        filters: Optional[List[Dict[str, Any]]] = None,
        sort: Optional[List[Dict[str, str]]] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Cross-symbol options screener."""
        args: Dict[str, Any] = {"filters": filters or []}
        if columns:
            args["columns"] = columns
        if sort:
            args["sort"] = sort
        args["limit"] = limit
        result = self._call("screen", args)
        text = result["content"][0]["text"]
        return json.loads(text)

    def query_sql(self, sql: str, max_rows: Optional[int] = None) -> List[Dict[str, Any]]:
        """Run a read-only DuckDB SQL query against the options dataset."""
        args: Dict[str, Any] = {"sql": sql}
        if max_rows:
            args["max_rows"] = max_rows
        result = self._call("query_sql", args)
        text = result["content"][0]["text"]
        return json.loads(text)

    def list_fields(self) -> Dict[str, Any]:
        """List all available chain/screen fields."""
        result = self._call("list_chain_fields", {})
        text = result["content"][0]["text"]
        return json.loads(text)

    def close(self) -> None:
        """Terminate the MCP server subprocess."""
        if self._proc:
            self._proc.terminate()
            self._proc.wait(timeout=5)

    def __enter__(self) -> "ConvexValueClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


if __name__ == "__main__":
    # Day 0 verification spike
    print("=" * 60)
    print("ConvexValue API — Day 0 Verification")
    print("=" * 60)

    with ConvexValueClient() as client:
        # 1. Fetch SPY chain with Greeks
        print("\n[1] SPY Chain (select fields):")
        chain = client.get_chain(
            "SPY",
            fields=["delta", "gamma", "vega", "theta", "implied_volatility", "open_interest", "strike_price", "expiration_date"],
        )
        print(f"Symbol: {chain.get('symbol')}")
        print(f"Expirations: {len(chain.get('chain', []))}")
        if chain.get("chain"):
            first_exp = chain["chain"][0]
            print(f"First expiration: {first_exp.get('expiration')}")
            print(f"Strikes count: {len(first_exp.get('strikes', []))}")
            first_strike = first_exp["strikes"][0]
            print(f"First strike: {first_strike[0]}")
            print(f"Call values: {first_strike[1]}")
            print(f"Put values: {first_strike[2]}")

        # 2. Screener — high-IV contracts
        print("\n[2] Screener — SPY contracts with OI > 1000:")
        screen_result = client.screen(
            columns=["ticker", "underlying_ticker", "implied_volatility", "open_interest", "delta", "gamma"],
            filters=[
                {"field": "underlying_ticker", "op": "eq", "value": "SPY"},
                {"field": "open_interest", "op": "gt", "value": 1000}
            ],
            sort=[{"field": "implied_volatility", "direction": "desc"}],
            limit=5,
        )
        print(f"Row count: {screen_result.get('row_count')}")
        for row in screen_result.get("rows", [])[:3]:
            print(f"  {row}")

        # 3. SQL query
        print("\n[3] SQL — Distinct underlyings:")
        sql_result = client.query_sql("SELECT DISTINCT underlying_ticker FROM options_snapshots LIMIT 10")
        print(sql_result)

    print("\n" + "=" * 60)
    print("✅ Day 0 verification complete — ConvexValue API is LIVE")
    print("=" * 60)
