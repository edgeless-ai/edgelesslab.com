"""Integration tests for the complete pattern capture flow."""

import pytest
import asyncio
import json
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

from ...core.agentek_wrapper import AgentekWrapper
from ...core.blockchain_knowledge_service import BlockchainKnowledgeService
from ...core.pattern_capture import PatternCapture, CaptureConfig


class TestPatternCaptureIntegration:
    """Test the full integration of pattern capture from blockchain operations."""
    
    @pytest.fixture
    def capture_config(self):
        """Configuration for pattern capture."""
        return CaptureConfig(
            capture_enabled=True,
            min_value_threshold=0.1,  # 0.1 ETH
            interesting_contracts=[
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
                "0xC02aaA39b223FE8D0A0e5C4F2E460cC98E0095D7"   # WETH
            ],
            gas_threshold=100000,  # Capture high gas transactions
            pattern_types=[
                "token_transfer",
                "defi_swap",
                "nft_mint",
                "contract_interaction"
            ]
        )
    
    @pytest.mark.asyncio
    async def test_end_to_end_pattern_capture(
        self, 
        mock_agentek_client,
        mock_chroma_manager,
        mock_embedding_pipeline,
        capture_config
    ):
        """Test 1: Complete flow from blockchain operation to pattern storage."""
        # Initialize service
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline,
            capture_config=capture_config
        )
        
        # Mock agentek response
        mock_response = {
            "transactionHash": "0x123abc...",
            "from": "0xuser...",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
            "value": "0",
            "data": "0xa9059cbb...",  # transfer function
            "gasUsed": "65000",
            "status": "success",
            "logs": [{
                "event": "Transfer",
                "args": {
                    "from": "0xuser...",
                    "to": "0xrecipient...",
                    "value": "1000000000"  # 1000 USDC
                }
            }]
        }
        
        with patch.object(
            service.agentek_wrapper, 
            'call_tool',
            return_value=mock_response
        ):
            # Execute operation
            result = await service.execute_and_capture(
                tool_name="sendTransaction",
                params={
                    "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    "data": "0xa9059cbb...",
                    "chain": "mainnet"
                }
            )
        
        # Verify pattern was captured
        assert mock_chroma_manager.add_pattern.called
        captured_pattern = mock_chroma_manager.add_pattern.call_args[1]
        
        assert captured_pattern["metadata"]["pattern_type"] == "token_transfer"
        assert captured_pattern["metadata"]["token"] == "USDC"
        assert captured_pattern["metadata"]["gas_used"] == "65000"
        assert "embedding" in captured_pattern
    
    @pytest.mark.asyncio
    async def test_defi_swap_pattern_capture(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 2: Capture DeFi swap patterns with route information."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Mock Uniswap V3 swap response
        swap_response = {
            "transactionHash": "0xswap123...",
            "protocol": "uniswapV3",
            "tokenIn": "ETH",
            "tokenOut": "USDC",
            "amountIn": "1000000000000000000",  # 1 ETH
            "amountOut": "2500000000",  # 2500 USDC
            "route": [
                {"pool": "ETH/USDC", "fee": 3000}
            ],
            "gasUsed": "180000",
            "slippage": 0.005
        }
        
        with patch.object(
            service.agentek_wrapper,
            'call_tool',
            return_value=swap_response
        ):
            result = await service.execute_and_capture(
                tool_name="uniswapV3Swap",
                params={
                    "tokenIn": "ETH",
                    "tokenOut": "USDC", 
                    "amountIn": "1000000000000000000",
                    "slippage": 0.5
                }
            )
        
        # Verify DeFi pattern details
        captured = mock_chroma_manager.add_pattern.call_args[1]
        assert captured["metadata"]["pattern_type"] == "defi_swap"
        assert captured["metadata"]["protocol"] == "uniswapV3"
        assert captured["metadata"]["price_impact"] is not None
        assert "route" in captured["metadata"]
    
    @pytest.mark.asyncio
    async def test_batch_pattern_capture(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 3: Capture patterns from batch operations."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Batch token balance checks
        batch_requests = [
            {
                "tool": "getERC20Balance",
                "params": {
                    "address": f"0x{i:040x}",
                    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
                }
            }
            for i in range(5)
        ]
        
        batch_responses = [
            {
                "address": req["params"]["address"],
                "balance": str(i * 1000000000),
                "token": "USDC",
                "decimals": 6
            }
            for i, req in enumerate(batch_requests)
        ]
        
        with patch.object(
            service.agentek_wrapper,
            'batch_call',
            return_value={"results": batch_responses}
        ):
            results = await service.batch_execute_and_capture(batch_requests)
        
        # Should create aggregated pattern
        assert mock_chroma_manager.add_pattern.called
        captured = mock_chroma_manager.add_pattern.call_args[1]
        assert captured["metadata"]["pattern_type"] == "batch_operation"
        assert captured["metadata"]["operation_count"] == 5
    
    @pytest.mark.asyncio
    async def test_gas_optimization_pattern_learning(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 4: Learn from gas usage patterns."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Simulate multiple transactions with different gas usage
        transactions = [
            {
                "hash": f"0x{i:064x}",
                "gasUsed": str(50000 + i * 10000),
                "gasPrice": "20000000000",
                "function": "transfer",
                "success": True
            }
            for i in range(5)
        ]
        
        for tx in transactions:
            with patch.object(
                service.agentek_wrapper,
                'call_tool',
                return_value=tx
            ):
                await service.execute_and_capture(
                    tool_name="sendTransaction",
                    params={"data": "0xtransfer..."}
                )
        
        # Analyze gas patterns
        gas_insights = await service.analyze_gas_patterns(
            operation_type="transfer",
            time_window=3600  # Last hour
        )
        
        assert "average_gas" in gas_insights
        assert "optimal_gas_price" in gas_insights
        assert gas_insights["pattern_count"] >= 5
    
    @pytest.mark.asyncio
    async def test_failed_transaction_pattern_capture(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 5: Capture patterns from failed transactions."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Failed transaction response
        failed_response = {
            "transactionHash": "0xfailed123...",
            "status": "failed",
            "error": "Insufficient balance",
            "gasUsed": "21000",
            "revertReason": "ERC20: transfer amount exceeds balance"
        }
        
        with patch.object(
            service.agentek_wrapper,
            'call_tool',
            return_value=failed_response
        ):
            result = await service.execute_and_capture(
                tool_name="sendTransaction",
                params={"to": "0xtoken...", "data": "0xtransfer..."}
            )
        
        # Verify failure pattern captured
        captured = mock_chroma_manager.add_pattern.call_args[1]
        assert captured["metadata"]["pattern_type"] == "failed_transaction"
        assert captured["metadata"]["error_type"] == "Insufficient balance"
        assert captured["metadata"]["revert_reason"] is not None
    
    @pytest.mark.asyncio
    async def test_pattern_similarity_search(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 6: Find similar patterns for optimization."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Mock similar patterns in ChromaDB
        similar_patterns = [
            {
                "id": "pattern1",
                "metadata": {
                    "pattern_type": "defi_swap",
                    "protocol": "uniswapV3",
                    "gas_used": "180000",
                    "success_rate": 0.98
                }
            },
            {
                "id": "pattern2", 
                "metadata": {
                    "pattern_type": "defi_swap",
                    "protocol": "uniswapV3",
                    "gas_used": "175000",
                    "success_rate": 0.99
                }
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = similar_patterns
        
        # Search for similar swap patterns
        recommendations = await service.get_pattern_recommendations(
            operation_type="defi_swap",
            context={
                "protocol": "uniswapV3",
                "tokenPair": "ETH/USDC"
            }
        )
        
        assert len(recommendations) > 0
        assert recommendations[0]["suggested_gas"] == "175000"  # Optimal from patterns
    
    @pytest.mark.asyncio
    async def test_cross_chain_pattern_correlation(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 7: Correlate patterns across different chains."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Capture patterns from different chains
        chains = ["mainnet", "optimism", "arbitrum"]
        
        for chain in chains:
            response = {
                "chain": chain,
                "gasPrice": str(20000000000 if chain == "mainnet" else 1000000),
                "blockTime": 12 if chain == "mainnet" else 2,
                "transactionHash": f"0x{chain}123..."
            }
            
            with patch.object(
                service.agentek_wrapper,
                'call_tool',
                return_value=response
            ):
                await service.execute_and_capture(
                    tool_name="getGasPrice",
                    params={"chain": chain}
                )
        
        # Analyze cross-chain patterns
        cross_chain_analysis = await service.analyze_cross_chain_patterns()
        
        assert "mainnet" in cross_chain_analysis
        assert "gas_price_ratio" in cross_chain_analysis
        assert cross_chain_analysis["mainnet"]["avg_gas_price"] > \
               cross_chain_analysis["optimism"]["avg_gas_price"]
    
    @pytest.mark.asyncio
    async def test_pattern_quality_scoring(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 8: Score pattern quality for learning."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # High quality pattern (successful, optimal gas)
        high_quality = {
            "transactionHash": "0xhigh123...",
            "status": "success",
            "gasUsed": "65000",
            "gasPrice": "15000000000",
            "executionTime": 2.5
        }
        
        # Low quality pattern (failed, high gas)
        low_quality = {
            "transactionHash": "0xlow123...",
            "status": "failed", 
            "gasUsed": "250000",
            "gasPrice": "100000000000",
            "error": "Out of gas"
        }
        
        # Calculate quality scores
        high_score = service._calculate_pattern_quality(high_quality)
        low_score = service._calculate_pattern_quality(low_quality)
        
        assert high_score > 0.8
        assert low_score < 0.3
        assert high_score > low_score
    
    @pytest.mark.asyncio
    async def test_pattern_evolution_tracking(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 9: Track how patterns evolve over time."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Simulate pattern evolution over time
        timestamps = [
            datetime(2024, 1, 1, 10, 0),
            datetime(2024, 1, 2, 10, 0),
            datetime(2024, 1, 3, 10, 0)
        ]
        
        for i, timestamp in enumerate(timestamps):
            response = {
                "timestamp": timestamp.isoformat(),
                "gasPrice": str(20000000000 + i * 5000000000),
                "pattern": "gas_price_trend"
            }
            
            with patch.object(
                service.agentek_wrapper,
                'call_tool',
                return_value=response
            ):
                await service.execute_and_capture(
                    tool_name="getGasPrice",
                    params={"timestamp": timestamp.isoformat()}
                )
        
        # Analyze pattern evolution
        evolution = await service.analyze_pattern_evolution(
            pattern_type="gas_price_trend",
            time_range=(timestamps[0], timestamps[-1])
        )
        
        assert evolution["trend"] == "increasing"
        assert len(evolution["data_points"]) == 3
        assert evolution["prediction"] is not None
    
    @pytest.mark.asyncio
    async def test_pattern_based_automation(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 10: Automate decisions based on learned patterns."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Mock historical successful patterns
        successful_patterns = [
            {
                "metadata": {
                    "gas_price": "15000000000",
                    "time_of_day": "02:00",
                    "success_rate": 0.99
                }
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = successful_patterns
        
        # Get automated recommendation
        recommendation = await service.get_automated_recommendation(
            operation="token_transfer",
            current_conditions={
                "time": "14:00",
                "network_congestion": "high"
            }
        )
        
        assert "wait_until" in recommendation
        assert recommendation["wait_until"] == "02:00"
        assert recommendation["recommended_gas_price"] == "15000000000"
        assert recommendation["confidence"] > 0.8


class TestPatternCapturePerformance:
    """Test performance aspects of pattern capture."""
    
    @pytest.mark.asyncio
    async def test_capture_latency(
        self,
        performance_tracker,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 11: Measure pattern capture latency."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        performance_tracker.start("pattern_capture")
        
        with patch.object(
            service.agentek_wrapper,
            'call_tool',
            return_value={"status": "success"}
        ):
            await service.execute_and_capture(
                tool_name="getBalance",
                params={"address": "0x123..."}
            )
        
        performance_tracker.end("pattern_capture")
        
        # Pattern capture should be fast (< 100ms overhead)
        assert performance_tracker.get_duration("pattern_capture") < 0.1
    
    @pytest.mark.asyncio
    async def test_concurrent_pattern_capture(
        self,
        mock_chroma_manager,
        mock_embedding_pipeline
    ):
        """Test 12: Handle concurrent pattern captures efficiently."""
        service = BlockchainKnowledgeService(
            agentek_wrapper=AgentekWrapper(),
            chroma_manager=mock_chroma_manager,
            embedding_pipeline=mock_embedding_pipeline
        )
        
        # Create multiple concurrent operations
        operations = []
        for i in range(10):
            op = service.execute_and_capture(
                tool_name="getBalance",
                params={"address": f"0x{i:040x}"}
            )
            operations.append(op)
        
        with patch.object(
            service.agentek_wrapper,
            'call_tool',
            return_value={"balance": "1000"}
        ):
            results = await asyncio.gather(*operations)
        
        assert len(results) == 10
        assert mock_chroma_manager.add_pattern.call_count == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])