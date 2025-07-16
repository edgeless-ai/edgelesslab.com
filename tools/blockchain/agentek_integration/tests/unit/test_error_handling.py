"""Unit tests for error handling in the agentek integration."""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from ...core.agentek_wrapper import (
    AgentekBridgeError,
    AgentekTimeoutError,
    AgentekValidationError,
    AgentekNetworkError,
    ErrorHandler,
    RetryStrategy
)


class TestAgentekErrors:
    """Test custom error types for the agentek integration."""
    
    def test_bridge_error_creation(self):
        """Test 1: AgentekBridgeError contains proper context."""
        error = AgentekBridgeError(
            message="Failed to execute tool",
            tool_name="getERC20Balance",
            params={"address": "0x123..."},
            original_error=ValueError("Invalid address")
        )
        
        assert str(error) == "Failed to execute tool"
        assert error.tool_name == "getERC20Balance"
        assert error.params["address"] == "0x123..."
        assert isinstance(error.original_error, ValueError)
    
    def test_timeout_error_details(self):
        """Test 2: AgentekTimeoutError includes timing information."""
        error = AgentekTimeoutError(
            message="Operation timed out",
            tool_name="slowOperation",
            timeout_ms=5000,
            elapsed_ms=5123
        )
        
        assert error.timeout_ms == 5000
        assert error.elapsed_ms == 5123
        assert error.tool_name == "slowOperation"
    
    def test_validation_error_fields(self):
        """Test 3: AgentekValidationError shows invalid fields."""
        error = AgentekValidationError(
            message="Invalid parameters",
            tool_name="transfer",
            invalid_fields={
                "to": "Invalid address format",
                "amount": "Amount must be positive"
            }
        )
        
        assert len(error.invalid_fields) == 2
        assert error.invalid_fields["to"] == "Invalid address format"
        assert error.tool_name == "transfer"
    
    def test_network_error_retry_info(self):
        """Test 4: AgentekNetworkError includes retry information."""
        error = AgentekNetworkError(
            message="Network request failed",
            url="https://eth-mainnet.g.alchemy.com/v2/key",
            status_code=503,
            retry_count=3,
            max_retries=5
        )
        
        assert error.status_code == 503
        assert error.retry_count == 3
        assert error.can_retry is True  # 3 < 5


class TestErrorHandler:
    """Test the error handling mechanism."""
    
    @pytest.fixture
    def error_handler(self):
        """Create an error handler with default configuration."""
        return ErrorHandler(
            retry_strategy=RetryStrategy(
                max_attempts=3,
                initial_delay_ms=100,
                max_delay_ms=5000,
                exponential_base=2
            )
        )
    
    @pytest.mark.asyncio
    async def test_handle_subprocess_errors(self, error_handler):
        """Test 5: Handle subprocess execution errors."""
        # Mock subprocess that fails
        mock_process = Mock()
        mock_process.returncode = 1
        mock_process.communicate = AsyncMock(
            return_value=(b'', b'Error: Contract not found')
        )
        
        with pytest.raises(AgentekBridgeError) as exc_info:
            await error_handler.handle_subprocess_error(
                mock_process,
                tool_name="getContractInfo",
                params={"address": "0x000..."}
            )
        
        assert "Contract not found" in str(exc_info.value)
        assert exc_info.value.tool_name == "getContractInfo"
    
    @pytest.mark.asyncio
    async def test_handle_json_parsing_errors(self, error_handler):
        """Test 6: Handle JSON parsing errors gracefully."""
        invalid_json = "{'invalid': json}"
        
        with pytest.raises(AgentekBridgeError) as exc_info:
            error_handler.parse_json_response(
                invalid_json,
                tool_name="parseTest"
            )
        
        assert "Failed to parse JSON response" in str(exc_info.value)
        assert exc_info.value.tool_name == "parseTest"
    
    @pytest.mark.asyncio
    async def test_handle_network_errors_with_retry(self, error_handler):
        """Test 7: Retry network errors with exponential backoff."""
        attempt_count = 0
        
        async def failing_network_call():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 3:
                raise AgentekNetworkError(
                    "Connection failed",
                    url="https://api.example.com",
                    status_code=503
                )
            return {"success": True}
        
        result = await error_handler.with_retry(
            failing_network_call,
            operation_name="network_test"
        )
        
        assert result["success"] is True
        assert attempt_count == 3
    
    @pytest.mark.asyncio
    async def test_max_retry_exceeded(self, error_handler):
        """Test 8: Fail after maximum retry attempts."""
        async def always_failing():
            raise AgentekNetworkError(
                "Connection failed",
                url="https://api.example.com",
                status_code=503
            )
        
        with pytest.raises(AgentekNetworkError) as exc_info:
            await error_handler.with_retry(
                always_failing,
                operation_name="always_fail"
            )
        
        assert exc_info.value.retry_count == 3  # Max attempts
    
    def test_categorize_errors(self, error_handler):
        """Test 9: Categorize errors for appropriate handling."""
        # Retryable errors
        network_error = AgentekNetworkError("Network failed", "", 503)
        assert error_handler.is_retryable(network_error) is True
        
        timeout_error = AgentekTimeoutError("Timeout", "test", 5000, 6000)
        assert error_handler.is_retryable(timeout_error) is True
        
        # Non-retryable errors
        validation_error = AgentekValidationError("Invalid", "test", {})
        assert error_handler.is_retryable(validation_error) is False
        
        generic_error = ValueError("Some error")
        assert error_handler.is_retryable(generic_error) is False
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self, error_handler):
        """Test 10: Handle operation timeouts properly."""
        async def slow_operation():
            await asyncio.sleep(2)  # 2 seconds
            return {"result": "done"}
        
        with pytest.raises(AgentekTimeoutError) as exc_info:
            await error_handler.with_timeout(
                slow_operation(),
                timeout_ms=100,
                operation_name="slow_op"
            )
        
        assert exc_info.value.timeout_ms == 100
        assert exc_info.value.elapsed_ms >= 100
    
    def test_error_context_preservation(self, error_handler):
        """Test 11: Preserve context through error transformations."""
        original_error = ValueError("Original error")
        
        bridge_error = error_handler.wrap_error(
            original_error,
            tool_name="testTool",
            params={"key": "value"},
            context={"chain": "mainnet", "block": 123}
        )
        
        assert bridge_error.original_error == original_error
        assert bridge_error.tool_name == "testTool"
        assert bridge_error.params["key"] == "value"
        assert bridge_error.context["chain"] == "mainnet"
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_pattern(self, error_handler):
        """Test 12: Circuit breaker prevents cascading failures."""
        error_handler.enable_circuit_breaker(
            failure_threshold=3,
            timeout_seconds=1
        )
        
        # Simulate multiple failures
        for i in range(3):
            try:
                await error_handler.with_circuit_breaker(
                    AsyncMock(side_effect=Exception("Failed")),
                    operation_name="failing_op"
                )
            except:
                pass
        
        # Circuit should be open now
        with pytest.raises(AgentekBridgeError) as exc_info:
            await error_handler.with_circuit_breaker(
                AsyncMock(return_value={"success": True}),
                operation_name="failing_op"
            )
        
        assert "Circuit breaker is open" in str(exc_info.value)
        
        # Wait for circuit to close
        await asyncio.sleep(1.1)
        
        # Should work now
        result = await error_handler.with_circuit_breaker(
            AsyncMock(return_value={"success": True}),
            operation_name="failing_op"
        )
        assert result["success"] is True


class TestRetryStrategy:
    """Test retry strategy implementations."""
    
    def test_exponential_backoff_calculation(self):
        """Test 13: Calculate exponential backoff delays."""
        strategy = RetryStrategy(
            max_attempts=5,
            initial_delay_ms=100,
            max_delay_ms=10000,
            exponential_base=2
        )
        
        # Test delay calculation for each attempt
        assert strategy.get_delay_ms(0) == 100    # 100 * 2^0 = 100
        assert strategy.get_delay_ms(1) == 200    # 100 * 2^1 = 200
        assert strategy.get_delay_ms(2) == 400    # 100 * 2^2 = 400
        assert strategy.get_delay_ms(3) == 800    # 100 * 2^3 = 800
        assert strategy.get_delay_ms(4) == 1600   # 100 * 2^4 = 1600
        
        # Test max delay cap
        assert strategy.get_delay_ms(10) == 10000  # Capped at max_delay_ms
    
    def test_jitter_in_retry_delay(self):
        """Test 14: Add jitter to prevent thundering herd."""
        strategy = RetryStrategy(
            initial_delay_ms=1000,
            jitter_enabled=True,
            jitter_factor=0.1  # ±10%
        )
        
        delays = [strategy.get_delay_with_jitter(0) for _ in range(10)]
        
        # All delays should be within 10% of 1000ms
        assert all(900 <= d <= 1100 for d in delays)
        # But they should not all be the same (jitter working)
        assert len(set(delays)) > 1
    
    @pytest.mark.asyncio
    async def test_retry_with_different_strategies(self):
        """Test 15: Compare different retry strategies."""
        # Aggressive retry
        aggressive = RetryStrategy(
            max_attempts=10,
            initial_delay_ms=50,
            exponential_base=1.5
        )
        
        # Conservative retry
        conservative = RetryStrategy(
            max_attempts=3,
            initial_delay_ms=1000,
            exponential_base=3
        )
        
        # Test total time for retries
        aggressive_time = sum(
            aggressive.get_delay_ms(i) for i in range(5)
        )
        conservative_time = sum(
            conservative.get_delay_ms(i) for i in range(3)
        )
        
        assert aggressive_time < conservative_time


class TestErrorRecovery:
    """Test error recovery mechanisms."""
    
    @pytest.mark.asyncio
    async def test_fallback_chain_on_error(self):
        """Test 16: Fallback to different chain on error."""
        from ...core.chain_configuration import ChainManager, ChainId
        
        chain_manager = ChainManager()
        
        async def operation_with_fallback(primary_chain, fallback_chain):
            try:
                if primary_chain == ChainId.MAINNET:
                    raise AgentekNetworkError("Mainnet RPC failed", "", 503)
                return {"chain": primary_chain, "success": True}
            except AgentekNetworkError:
                # Fallback to alternative chain
                return {"chain": fallback_chain, "success": True}
        
        result = await operation_with_fallback(
            ChainId.MAINNET,
            ChainId.OPTIMISM
        )
        
        assert result["chain"] == ChainId.OPTIMISM
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """Test 17: Gracefully degrade functionality on errors."""
        class BlockchainService:
            def __init__(self):
                self.full_data_available = True
            
            async def get_token_data(self, address: str) -> Dict[str, Any]:
                if not self.full_data_available:
                    # Degraded mode - return minimal data
                    return {
                        "address": address,
                        "balance": "unavailable",
                        "degraded": True
                    }
                
                # Full mode - would normally fetch all data
                return {
                    "address": address,
                    "balance": "1000000000000000000",
                    "symbol": "TEST",
                    "decimals": 18,
                    "degraded": False
                }
        
        service = BlockchainService()
        
        # Normal operation
        full_data = await service.get_token_data("0x123...")
        assert full_data["degraded"] is False
        
        # Simulate degradation
        service.full_data_available = False
        degraded_data = await service.get_token_data("0x123...")
        assert degraded_data["degraded"] is True
        assert degraded_data["balance"] == "unavailable"
    
    @pytest.mark.asyncio
    async def test_error_reporting_and_monitoring(self, error_handler):
        """Test 18: Report errors for monitoring."""
        errors_reported = []
        
        def error_reporter(error: Exception, context: Dict[str, Any]):
            errors_reported.append({
                "error": error,
                "context": context,
                "timestamp": "2024-01-15T10:00:00Z"
            })
        
        error_handler.set_error_reporter(error_reporter)
        
        # Generate an error
        try:
            await error_handler.with_retry(
                AsyncMock(side_effect=ValueError("Test error")),
                operation_name="test_op",
                max_attempts=1
            )
        except ValueError:
            pass
        
        # Check error was reported
        assert len(errors_reported) == 1
        assert isinstance(errors_reported[0]["error"], ValueError)
        assert errors_reported[0]["context"]["operation"] == "test_op"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])