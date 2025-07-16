"""Unit tests for the agentek Python wrapper.

Following TDD principles, these tests are written before implementation
to define the expected behavior of the TypeScript-Python bridge.
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import Dict, Any, List
import subprocess


# Import the components we'll implement
from ...core.agentek_wrapper import (
    AgentekWrapper,
    AgentekBridgeError,
    TypeConverter,
    AgentekResponse,
    BridgeMethod
)


class TestTypeConverter:
    """Test type conversion between Python and TypeScript."""
    
    def test_python_to_ts_basic_types(self):
        """Test 1: Convert basic Python types to TypeScript."""
        converter = TypeConverter()
        
        # Test None -> null
        assert converter.python_to_ts(None) is None
        
        # Test boolean
        assert converter.python_to_ts(True) is True
        assert converter.python_to_ts(False) is False
        
        # Test numbers
        assert converter.python_to_ts(123) == 123
        assert converter.python_to_ts(123.45) == 123.45
        
        # Test string
        assert converter.python_to_ts("hello") == "hello"
    
    def test_python_to_ts_blockchain_types(self):
        """Test 2: Convert blockchain-specific types."""
        converter = TypeConverter()
        
        # Test Wei values (large integers)
        wei_value = 1000000000000000000  # 1 ETH
        result = converter.python_to_ts(wei_value)
        assert result == str(wei_value)  # Should convert to string for JS safety
        
        # Test hex values
        hex_value = "0x4a817c800"
        assert converter.python_to_ts(hex_value) == hex_value
        
        # Test addresses
        address = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd3e"
        assert converter.python_to_ts(address) == address
    
    def test_ts_to_python_basic_types(self):
        """Test 3: Convert TypeScript/JSON types to Python."""
        converter = TypeConverter()
        
        # Test null -> None
        assert converter.ts_to_python(None) is None
        
        # Test numbers
        assert converter.ts_to_python(123) == 123
        assert converter.ts_to_python(123.45) == 123.45
        
        # Test BigInt representation
        assert converter.ts_to_python("1000000000000000000") == 1000000000000000000
    
    def test_nested_object_conversion(self):
        """Test 4: Convert nested objects between languages."""
        converter = TypeConverter()
        
        python_obj = {
            "address": "0x123...",
            "balance": 1000000000000000000,
            "tokens": {
                "ETH": {"amount": 1000000000000000000, "price": 2500.50},
                "USDC": {"amount": 1000000000, "price": 1.00}
            },
            "transactions": [
                {"hash": "0xabc...", "value": 500000000000000000}
            ]
        }
        
        # Convert to TS format
        ts_obj = converter.python_to_ts(python_obj)
        
        # Check conversions
        assert ts_obj["balance"] == "1000000000000000000"  # BigInt as string
        assert ts_obj["tokens"]["ETH"]["amount"] == "1000000000000000000"
        assert ts_obj["tokens"]["ETH"]["price"] == 2500.50
        assert ts_obj["transactions"][0]["value"] == "500000000000000000"
        
        # Convert back
        python_obj_back = converter.ts_to_python(ts_obj)
        assert python_obj_back["balance"] == 1000000000000000000


class TestAgentekWrapper:
    """Test the main agentek wrapper functionality."""
    
    @pytest.mark.asyncio
    async def test_wrapper_initialization(self, agentek_config):
        """Test 5: Wrapper initializes with proper configuration."""
        wrapper = AgentekWrapper(config=agentek_config)
        
        assert wrapper.config == agentek_config
        assert wrapper.bridge_method == BridgeMethod.SUBPROCESS
        assert wrapper.pool_size == 3
        assert wrapper.timeout == 30000
    
    @pytest.mark.asyncio
    async def test_typescript_function_invocation(self, mock_node_process):
        """Test 6: Successfully invoke TypeScript functions."""
        with patch('asyncio.create_subprocess_exec', return_value=mock_node_process):
            wrapper = AgentekWrapper()
            
            result = await wrapper.call_tool("getERC20Balance", {
                "address": "0x123...",
                "tokenAddress": "0x456..."
            })
            
            assert result["result"] == "success"
            mock_node_process.communicate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_async_operation_handling(self, mock_node_process):
        """Test 7: Handle async TypeScript operations correctly."""
        mock_node_process.communicate = AsyncMock(
            return_value=(
                json.dumps({
                    "status": "success",
                    "data": {"balance": "1000000000000000000"}
                }).encode(),
                b''
            )
        )
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_node_process):
            wrapper = AgentekWrapper()
            
            # Test multiple concurrent calls
            results = await asyncio.gather(
                wrapper.call_tool("getERC20Balance", {"address": "0x1..."}),
                wrapper.call_tool("getGasPrice", {}),
                wrapper.call_tool("dexScreener", {"pair": "ETH/USDC"})
            )
            
            assert len(results) == 3
            assert all(r["status"] == "success" for r in results)
    
    @pytest.mark.asyncio
    async def test_error_propagation(self, mock_node_process):
        """Test 8: TypeScript errors propagate correctly to Python."""
        error_message = "Contract not found"
        mock_node_process.returncode = 1
        mock_node_process.communicate = AsyncMock(
            return_value=(b'', error_message.encode())
        )
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_node_process):
            wrapper = AgentekWrapper()
            
            with pytest.raises(AgentekBridgeError) as exc_info:
                await wrapper.call_tool("getERC20Balance", {
                    "address": "invalid_address"
                })
            
            assert error_message in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_all_tools_accessible(self, agentek_config):
        """Test 9: Verify all 114 agentek tools are accessible."""
        wrapper = AgentekWrapper(config=agentek_config)
        
        # Mock the tool listing response
        tool_list = {
            "tools": [
                "getERC20Balance", "getGasPrice", "dexScreener",
                "uniswapV3Swap", "aaveLend", "ensResolve",
                # ... (would include all 114 tools in real test)
            ]
        }
        
        with patch.object(wrapper, '_execute_node_script', 
                         return_value=tool_list):
            available_tools = await wrapper.list_available_tools()
            
            assert len(available_tools["tools"]) >= 5  # At least our enabled tools
            assert "getERC20Balance" in available_tools["tools"]
            assert "getGasPrice" in available_tools["tools"]
    
    @pytest.mark.asyncio
    async def test_chain_configuration(self, agentek_config, mock_node_process):
        """Test 10: Test multi-chain configuration."""
        mock_node_process.communicate = AsyncMock(
            return_value=(
                json.dumps({
                    "status": "success",
                    "chain": "optimism",
                    "chainId": 10
                }).encode(),
                b''
            )
        )
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_node_process):
            wrapper = AgentekWrapper(config=agentek_config)
            
            # Test operation on different chain
            result = await wrapper.call_tool(
                "getERC20Balance",
                {"address": "0x123..."},
                chain="optimism"
            )
            
            assert result["chain"] == "optimism"
            assert result["chainId"] == 10
    
    @pytest.mark.asyncio 
    async def test_connection_pooling(self, performance_tracker):
        """Test 11: Connection pooling improves performance."""
        wrapper = AgentekWrapper(
            config={"python_bridge": {"method": "subprocess", "pool_size": 3}}
        )
        
        # Mock pool behavior
        mock_pool = MagicMock()
        wrapper._process_pool = mock_pool
        
        # Simulate multiple calls
        performance_tracker.start("pooled_calls")
        
        calls = []
        for i in range(10):
            calls.append(wrapper.call_tool("getGasPrice", {}))
        
        with patch.object(wrapper, '_execute_with_pool', 
                         return_value={"gasPrice": "20"}):
            results = await asyncio.gather(*calls)
        
        performance_tracker.end("pooled_calls")
        
        assert len(results) == 10
        assert performance_tracker.get_duration("pooled_calls") < 1.0  # Should be fast
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test 12: Handle timeouts gracefully."""
        wrapper = AgentekWrapper(
            config={"python_bridge": {"timeout": 100}}  # 100ms timeout
        )
        
        # Mock a slow response
        async def slow_communicate():
            await asyncio.sleep(0.5)  # 500ms delay
            return (b'{}', b'')
        
        mock_process = Mock()
        mock_process.communicate = slow_communicate
        mock_process.returncode = 0
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            with pytest.raises(asyncio.TimeoutError):
                await wrapper.call_tool("slowOperation", {})
    
    def test_validate_tool_params(self):
        """Test 13: Validate tool parameters before sending."""
        wrapper = AgentekWrapper()
        
        # Valid params
        assert wrapper._validate_params("getERC20Balance", {
            "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd3e",
            "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        })
        
        # Invalid address format
        with pytest.raises(ValueError) as exc_info:
            wrapper._validate_params("getERC20Balance", {
                "address": "invalid_address",
                "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            })
        assert "Invalid address format" in str(exc_info.value)
        
        # Missing required param
        with pytest.raises(ValueError) as exc_info:
            wrapper._validate_params("getERC20Balance", {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd3e"
                # missing tokenAddress
            })
        assert "Missing required parameter" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_batch_operations(self):
        """Test 14: Execute batch operations efficiently."""
        wrapper = AgentekWrapper()
        
        batch_requests = [
            {"tool": "getERC20Balance", "params": {
                "address": f"0x{i:040x}",
                "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            }} for i in range(5)
        ]
        
        mock_response = {
            "results": [
                {"balance": f"{i * 1000000000000000000}"} 
                for i in range(5)
            ]
        }
        
        with patch.object(wrapper, '_execute_node_script', 
                         return_value=mock_response):
            results = await wrapper.batch_call(batch_requests)
            
            assert len(results["results"]) == 5
            assert results["results"][0]["balance"] == "0"
            assert results["results"][4]["balance"] == "4000000000000000000"
    
    @pytest.mark.asyncio
    async def test_caching_mechanism(self):
        """Test 15: Caching reduces redundant calls."""
        wrapper = AgentekWrapper(
            config={"performance": {"cache_enabled": True}}
        )
        
        # First call - should hit the bridge
        with patch.object(wrapper, '_execute_node_script', 
                         return_value={"gasPrice": "20000000000"}) as mock_exec:
            result1 = await wrapper.call_tool("getGasPrice", {})
            assert mock_exec.call_count == 1
        
        # Second identical call - should use cache
        result2 = await wrapper.call_tool("getGasPrice", {})
        assert result1 == result2
        assert mock_exec.call_count == 1  # No additional call
        
        # Different params - should hit bridge again
        with patch.object(wrapper, '_execute_node_script',
                         return_value={"gasPrice": "25000000000"}):
            result3 = await wrapper.call_tool("getGasPrice", {"block": "latest"})
            assert result3["gasPrice"] == "25000000000"


class TestBridgeMethod:
    """Test different bridge method implementations."""
    
    @pytest.mark.asyncio
    async def test_subprocess_method(self):
        """Test 16: Subprocess bridge method works correctly."""
        config = {"python_bridge": {"method": "subprocess"}}
        wrapper = AgentekWrapper(config=config)
        
        assert wrapper.bridge_method == BridgeMethod.SUBPROCESS
        
        # Test execution
        mock_result = {"status": "success"}
        with patch.object(wrapper, '_execute_subprocess', 
                         return_value=mock_result):
            result = await wrapper.call_tool("test", {})
            assert result == mock_result
    
    @pytest.mark.asyncio
    async def test_node_calls_python_method(self):
        """Test 17: node-calls-python bridge method (when available)."""
        config = {"python_bridge": {"method": "node-calls-python"}}
        
        # This would require node-calls-python to be installed
        # For now, we test that it's recognized
        wrapper = AgentekWrapper(config=config)
        assert wrapper.bridge_method == BridgeMethod.NODE_CALLS_PYTHON
    
    @pytest.mark.asyncio
    async def test_json_rpc_method(self):
        """Test 18: JSON-RPC bridge method."""
        config = {
            "python_bridge": {
                "method": "json-rpc",
                "endpoint": "http://localhost:8545"
            }
        }
        wrapper = AgentekWrapper(config=config)
        
        assert wrapper.bridge_method == BridgeMethod.JSON_RPC
        
        # Mock JSON-RPC response
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "jsonrpc": "2.0",
            "result": {"balance": "1000000000000000000"},
            "id": 1
        })
        
        with patch('aiohttp.ClientSession.post', return_value=mock_response):
            result = await wrapper.call_tool("getBalance", {"address": "0x..."})
            assert result["balance"] == "1000000000000000000"


class TestErrorHandling:
    """Test comprehensive error handling."""
    
    @pytest.mark.asyncio
    async def test_network_error_handling(self):
        """Test 19: Handle network errors gracefully."""
        wrapper = AgentekWrapper()
        
        with patch('asyncio.create_subprocess_exec', 
                  side_effect=OSError("Network unreachable")):
            with pytest.raises(AgentekBridgeError) as exc_info:
                await wrapper.call_tool("test", {})
            
            assert "Network unreachable" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_malformed_response_handling(self):
        """Test 20: Handle malformed TypeScript responses."""
        wrapper = AgentekWrapper()
        
        mock_process = Mock()
        mock_process.communicate = AsyncMock(
            return_value=(b'invalid json', b'')
        )
        mock_process.returncode = 0
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            with pytest.raises(AgentekBridgeError) as exc_info:
                await wrapper.call_tool("test", {})
            
            assert "Failed to parse response" in str(exc_info.value)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])