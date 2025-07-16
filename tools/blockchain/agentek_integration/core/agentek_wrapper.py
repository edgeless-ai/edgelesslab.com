"""Python wrapper for agentek TypeScript blockchain tools.

This module provides a bridge between Python and the agentek TypeScript
library, enabling seamless blockchain operations with type safety and
error handling.
"""

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from dataclasses import dataclass
import logging
from functools import lru_cache
import time

logger = logging.getLogger(__name__)


class BridgeMethod(Enum):
    """Available methods for TypeScript-Python bridging."""
    SUBPROCESS = "subprocess"
    NODE_CALLS_PYTHON = "node-calls-python"
    JSON_RPC = "json-rpc"


@dataclass
class AgentekResponse:
    """Standardized response from agentek operations."""
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentekBridgeError(Exception):
    """Base error for agentek bridge operations."""
    def __init__(
        self, 
        message: str,
        tool_name: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.tool_name = tool_name
        self.params = params
        self.original_error = original_error
        self.context = context or {}


class AgentekTimeoutError(AgentekBridgeError):
    """Timeout error for agentek operations."""
    def __init__(
        self,
        message: str,
        tool_name: str,
        timeout_ms: int,
        elapsed_ms: int
    ):
        super().__init__(message, tool_name)
        self.timeout_ms = timeout_ms
        self.elapsed_ms = elapsed_ms


class AgentekValidationError(AgentekBridgeError):
    """Validation error for invalid parameters."""
    def __init__(
        self,
        message: str,
        tool_name: str,
        invalid_fields: Dict[str, str]
    ):
        super().__init__(message, tool_name)
        self.invalid_fields = invalid_fields


class AgentekNetworkError(AgentekBridgeError):
    """Network-related errors."""
    def __init__(
        self,
        message: str,
        url: str,
        status_code: Optional[int] = None,
        retry_count: int = 0,
        max_retries: int = 3
    ):
        super().__init__(message)
        self.url = url
        self.status_code = status_code
        self.retry_count = retry_count
        self.max_retries = max_retries
    
    @property
    def can_retry(self) -> bool:
        """Check if the operation can be retried."""
        return self.retry_count < self.max_retries


class TypeConverter:
    """Convert types between Python and TypeScript/JavaScript."""
    
    @staticmethod
    def python_to_ts(value: Any) -> Any:
        """Convert Python value to TypeScript-compatible format."""
        if value is None:
            return None
        
        # Handle large integers (Wei values)
        if isinstance(value, int) and value > 2**53:
            return str(value)
        
        # Handle nested structures
        if isinstance(value, dict):
            return {k: TypeConverter.python_to_ts(v) for k, v in value.items()}
        
        if isinstance(value, list):
            return [TypeConverter.python_to_ts(item) for item in value]
        
        return value
    
    @staticmethod
    def ts_to_python(value: Any) -> Any:
        """Convert TypeScript/JSON value to Python format."""
        if value is None:
            return None
        
        # Convert string numbers back to integers if possible
        if isinstance(value, str) and value.isdigit():
            try:
                return int(value)
            except ValueError:
                return value
        
        # Handle nested structures
        if isinstance(value, dict):
            return {k: TypeConverter.ts_to_python(v) for k, v in value.items()}
        
        if isinstance(value, list):
            return [TypeConverter.ts_to_python(item) for item in value]
        
        return value


@dataclass
class RetryStrategy:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    initial_delay_ms: int = 100
    max_delay_ms: int = 10000
    exponential_base: float = 2.0
    jitter_enabled: bool = False
    jitter_factor: float = 0.1
    
    def get_delay_ms(self, attempt: int) -> int:
        """Calculate delay for given attempt number."""
        delay = self.initial_delay_ms * (self.exponential_base ** attempt)
        return min(int(delay), self.max_delay_ms)
    
    def get_delay_with_jitter(self, attempt: int) -> int:
        """Get delay with optional jitter."""
        base_delay = self.get_delay_ms(attempt)
        if not self.jitter_enabled:
            return base_delay
        
        import random
        jitter = random.uniform(
            -self.jitter_factor, 
            self.jitter_factor
        ) * base_delay
        return int(base_delay + jitter)


class ErrorHandler:
    """Handle errors and implement retry logic."""
    
    def __init__(self, retry_strategy: Optional[RetryStrategy] = None):
        self.retry_strategy = retry_strategy or RetryStrategy()
        self._error_reporter = None
        self._circuit_breaker = {}
    
    def set_error_reporter(self, reporter):
        """Set a callback for error reporting."""
        self._error_reporter = reporter
    
    async def handle_subprocess_error(
        self, 
        process: subprocess.Popen,
        tool_name: str,
        params: Dict[str, Any]
    ):
        """Handle subprocess execution errors."""
        stdout, stderr = await process.communicate()
        error_msg = stderr.decode() if stderr else "Unknown error"
        
        raise AgentekBridgeError(
            message=f"Subprocess error: {error_msg}",
            tool_name=tool_name,
            params=params
        )
    
    def parse_json_response(self, response: str, tool_name: str) -> Dict[str, Any]:
        """Parse JSON response with error handling."""
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            raise AgentekBridgeError(
                message="Failed to parse JSON response",
                tool_name=tool_name,
                original_error=e
            )
    
    def is_retryable(self, error: Exception) -> bool:
        """Determine if an error is retryable."""
        return isinstance(error, (AgentekNetworkError, AgentekTimeoutError))
    
    async def with_retry(self, func, operation_name: str, max_attempts: Optional[int] = None):
        """Execute function with retry logic."""
        max_attempts = max_attempts or self.retry_strategy.max_attempts
        
        for attempt in range(max_attempts):
            try:
                return await func()
            except Exception as e:
                if self._error_reporter:
                    self._error_reporter(e, {
                        "operation": operation_name,
                        "attempt": attempt + 1
                    })
                
                if not self.is_retryable(e) or attempt == max_attempts - 1:
                    if isinstance(e, AgentekNetworkError):
                        e.retry_count = attempt + 1
                    raise
                
                delay_ms = self.retry_strategy.get_delay_with_jitter(attempt)
                await asyncio.sleep(delay_ms / 1000)
    
    async def with_timeout(self, coro, timeout_ms: int, operation_name: str):
        """Execute coroutine with timeout."""
        start_time = time.time()
        try:
            return await asyncio.wait_for(
                coro,
                timeout=timeout_ms / 1000
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.time() - start_time) * 1000)
            raise AgentekTimeoutError(
                message=f"Operation {operation_name} timed out",
                tool_name=operation_name,
                timeout_ms=timeout_ms,
                elapsed_ms=elapsed_ms
            )
    
    def wrap_error(
        self,
        error: Exception,
        tool_name: str,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> AgentekBridgeError:
        """Wrap an error with additional context."""
        return AgentekBridgeError(
            message=str(error),
            tool_name=tool_name,
            params=params,
            original_error=error,
            context=context
        )
    
    def enable_circuit_breaker(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        """Enable circuit breaker pattern."""
        self._circuit_breaker_config = {
            "failure_threshold": failure_threshold,
            "timeout_seconds": timeout_seconds
        }
    
    async def with_circuit_breaker(self, func, operation_name: str):
        """Execute with circuit breaker protection."""
        breaker = self._circuit_breaker.get(operation_name, {
            "failures": 0,
            "last_failure": None,
            "state": "closed"
        })
        
        # Check if circuit is open
        if breaker["state"] == "open":
            if (time.time() - breaker["last_failure"]) > self._circuit_breaker_config["timeout_seconds"]:
                breaker["state"] = "half-open"
            else:
                raise AgentekBridgeError(f"Circuit breaker is open for {operation_name}")
        
        try:
            result = await func()
            # Reset on success
            breaker["failures"] = 0
            breaker["state"] = "closed"
            return result
        except Exception as e:
            breaker["failures"] += 1
            breaker["last_failure"] = time.time()
            
            if breaker["failures"] >= self._circuit_breaker_config["failure_threshold"]:
                breaker["state"] = "open"
            
            self._circuit_breaker[operation_name] = breaker
            raise


class AgentekWrapper:
    """Main wrapper for agentek TypeScript tools."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.bridge_method = BridgeMethod(
            self.config.get("python_bridge", {}).get("method", "subprocess")
        )
        self.pool_size = self.config.get("python_bridge", {}).get("pool_size", 3)
        self.timeout = self.config.get("python_bridge", {}).get("timeout", 30000)
        self.type_converter = TypeConverter()
        self.error_handler = ErrorHandler()
        self._process_pool = None
        self._cache = {} if self.config.get("performance", {}).get("cache_enabled", False) else None
        
        # Initialize bridge
        self._initialize_bridge()
    
    def _initialize_bridge(self):
        """Initialize the TypeScript-Python bridge."""
        if self.bridge_method == BridgeMethod.SUBPROCESS:
            # Initialize subprocess pool if needed
            if self.pool_size > 1:
                self._process_pool = []  # Actual pool implementation would go here
        elif self.bridge_method == BridgeMethod.NODE_CALLS_PYTHON:
            # Initialize node-calls-python if available
            pass
        elif self.bridge_method == BridgeMethod.JSON_RPC:
            # Initialize JSON-RPC client
            pass
    
    async def call_tool(
        self, 
        tool_name: str, 
        params: Dict[str, Any],
        chain: Optional[str] = None
    ) -> Dict[str, Any]:
        """Call an agentek tool with given parameters."""
        # Validate parameters
        self._validate_params(tool_name, params)
        
        # Check cache
        cache_key = f"{tool_name}:{json.dumps(params, sort_keys=True)}:{chain}"
        if self._cache is not None and cache_key in self._cache:
            return self._cache[cache_key]
        
        # Convert parameters
        ts_params = self.type_converter.python_to_ts(params)
        
        # Add chain if specified
        if chain:
            ts_params["chain"] = chain
        
        # Execute based on bridge method
        try:
            if self.bridge_method == BridgeMethod.SUBPROCESS:
                result = await self._execute_subprocess(tool_name, ts_params)
            elif self.bridge_method == BridgeMethod.NODE_CALLS_PYTHON:
                result = await self._execute_node_calls_python(tool_name, ts_params)
            elif self.bridge_method == BridgeMethod.JSON_RPC:
                result = await self._execute_json_rpc(tool_name, ts_params)
            else:
                raise ValueError(f"Unknown bridge method: {self.bridge_method}")
            
            # Convert result back to Python types
            py_result = self.type_converter.ts_to_python(result)
            
            # Cache if enabled
            if self._cache is not None:
                self._cache[cache_key] = py_result
            
            return py_result
            
        except Exception as e:
            raise self.error_handler.wrap_error(e, tool_name, params, {"chain": chain})
    
    async def _execute_subprocess(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool via subprocess."""
        # Build command
        script_path = Path(__file__).parent / "bridges" / "subprocess_bridge.js"
        cmd = [
            "node",
            str(script_path),
            tool_name,
            json.dumps(params)
        ]
        
        # Execute with timeout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        async def communicate():
            return await process.communicate()
        
        stdout, stderr = await self.error_handler.with_timeout(
            communicate(),
            self.timeout,
            tool_name
        )
        
        if process.returncode != 0:
            await self.error_handler.handle_subprocess_error(process, tool_name, params)
        
        return self.error_handler.parse_json_response(stdout.decode(), tool_name)
    
    async def _execute_node_calls_python(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool via node-calls-python."""
        # Implementation would use node-calls-python library
        raise NotImplementedError("node-calls-python bridge not yet implemented")
    
    async def _execute_json_rpc(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool via JSON-RPC."""
        import aiohttp
        
        endpoint = self.config.get("python_bridge", {}).get("endpoint", "http://localhost:8545")
        
        payload = {
            "jsonrpc": "2.0",
            "method": tool_name,
            "params": params,
            "id": 1
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(endpoint, json=payload) as response:
                result = await response.json()
                
                if "error" in result:
                    raise AgentekBridgeError(
                        message=result["error"].get("message", "Unknown error"),
                        tool_name=tool_name,
                        params=params
                    )
                
                return result.get("result", {})
    
    async def _execute_with_pool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute using process pool for better performance."""
        # Pool implementation would go here
        return await self._execute_subprocess(tool_name, params)
    
    async def _execute_node_script(self, script_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Node.js script directly."""
        return await self._execute_subprocess(script_name, args)
    
    def _validate_params(self, tool_name: str, params: Dict[str, Any]) -> bool:
        """Validate tool parameters."""
        # Check for Ethereum address format
        if "address" in params:
            address = params["address"]
            if not (isinstance(address, str) and address.startswith("0x") and len(address) == 42):
                raise AgentekValidationError(
                    "Invalid parameters",
                    tool_name,
                    {"address": "Invalid address format"}
                )
        
        if "tokenAddress" in params:
            token = params["tokenAddress"]
            if not (isinstance(token, str) and token.startswith("0x") and len(token) == 42):
                raise AgentekValidationError(
                    "Invalid parameters",
                    tool_name,
                    {"tokenAddress": "Invalid address format"}
                )
        
        # Check required parameters based on tool
        required_params = {
            "getERC20Balance": ["address", "tokenAddress"],
            "transfer": ["to", "amount"],
            "swap": ["tokenIn", "tokenOut", "amount"]
        }
        
        if tool_name in required_params:
            missing = [p for p in required_params[tool_name] if p not in params]
            if missing:
                raise AgentekValidationError(
                    "Missing required parameters",
                    tool_name,
                    {p: "Missing required parameter" for p in missing}
                )
        
        return True
    
    async def list_available_tools(self) -> Dict[str, List[str]]:
        """List all available agentek tools."""
        return await self._execute_node_script("list_tools", {})
    
    async def batch_call(self, requests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple tool calls in a batch."""
        batch_params = {
            "requests": [
                {
                    "tool": req["tool"],
                    "params": self.type_converter.python_to_ts(req["params"])
                }
                for req in requests
            ]
        }
        
        result = await self._execute_node_script("batch_execute", batch_params)
        
        # Convert results back
        if "results" in result:
            result["results"] = [
                self.type_converter.ts_to_python(r) 
                for r in result["results"]
            ]
        
        return result
    
    def _calculate_pattern_quality(self, pattern: Dict[str, Any]) -> float:
        """Calculate quality score for a pattern."""
        score = 0.0
        
        # Success factor
        if pattern.get("status") == "success":
            score += 0.4
        
        # Gas efficiency
        gas_used = int(pattern.get("gasUsed", 0))
        if gas_used > 0:
            if gas_used < 100000:
                score += 0.3
            elif gas_used < 200000:
                score += 0.2
            else:
                score += 0.1
        
        # Execution time
        exec_time = pattern.get("executionTime", 0)
        if exec_time > 0:
            if exec_time < 3:
                score += 0.2
            elif exec_time < 5:
                score += 0.1
        
        # Error handling
        if not pattern.get("error"):
            score += 0.1
        
        return min(score, 1.0)