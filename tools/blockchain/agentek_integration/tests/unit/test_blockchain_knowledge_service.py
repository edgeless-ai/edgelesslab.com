"""Unit tests for BlockchainKnowledgeService.

These tests follow TDD principles and define the expected behavior
of the blockchain knowledge capture and storage system.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import Dict, Any, List
import json

from ...core.blockchain_knowledge_service import (
    BlockchainKnowledgeService,
    ServiceConfig,
    PatternExtractor,
    PatternEnricher,
    PatternStorage,
    RecommendationEngine,
    KnowledgeServiceError
)
from ...core.pattern_capture import (
    PatternCapture,
    CaptureConfig,
    PatternType,
    PatternMetadata,
    QualityScore
)


class TestBlockchainKnowledgeService:
    """Test the main BlockchainKnowledgeService functionality."""
    
    @pytest.fixture
    def service_config(self):
        """Service configuration for testing."""
        return ServiceConfig(
            capture_enabled=True,
            min_value_threshold_eth=0.01,
            interesting_contracts=[
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
                "0xC02aaA39b223FE8D0A0e5C4F2E460cC98E0095D7",  # WETH
            ],
            pattern_types=[
                PatternType.TOKEN_TRANSFER,
                PatternType.DEFI_SWAP,
                PatternType.NFT_MINT,
                PatternType.GAS_OPTIMIZATION
            ],
            quality_threshold=0.6,
            batch_size=50,
            cache_ttl=3600  # 1 hour
        )
    
    @pytest.fixture
    def mock_components(self, mock_agentek_client, mock_chroma_manager, mock_embedding_pipeline):
        """Mock service components."""
        return {
            "agentek_wrapper": mock_agentek_client(),
            "chroma_manager": mock_chroma_manager,
            "embedding_pipeline": mock_embedding_pipeline,
            "pattern_extractor": Mock(spec=PatternExtractor),
            "pattern_enricher": Mock(spec=PatternEnricher),
            "pattern_storage": Mock(spec=PatternStorage),
            "recommendation_engine": Mock(spec=RecommendationEngine)
        }
    
    def test_service_initialization_with_components(self, service_config, mock_components):
        """Test 1: Service initializes correctly with all components."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        assert service.config == service_config
        assert service.agentek_wrapper == mock_components["agentek_wrapper"]
        assert service.chroma_manager == mock_components["chroma_manager"]
        assert service.pattern_extractor is not None
        assert service.capture_enabled is True
    
    @pytest.mark.asyncio
    async def test_execute_and_capture_successful_operation(
        self, 
        service_config,
        mock_components
    ):
        """Test 2: Successfully execute blockchain operation and capture pattern."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        # Mock successful token transfer
        mock_result = {
            "transactionHash": "0x123abc...",
            "from": "0xSender...",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
            "value": "0",
            "data": "0xa9059cbb...",  # transfer function
            "gasUsed": "65000",
            "gasPrice": "20000000000",
            "status": "success",
            "blockNumber": 18500000,
            "timestamp": datetime.now().isoformat()
        }
        
        # Mock pattern extraction
        extracted_pattern = {
            "type": PatternType.TOKEN_TRANSFER,
            "metadata": {
                "token": "USDC",
                "amount": "1000000000",
                "gas_efficiency": 0.85
            }
        }
        
        mock_components["agentek_wrapper"].execute = AsyncMock(return_value=mock_result)
        mock_components["pattern_extractor"].extract = Mock(return_value=extracted_pattern)
        mock_components["pattern_storage"].store = AsyncMock(return_value=True)
        
        # Execute and capture
        result = await service.execute_and_capture(
            tool_name="sendTransaction",
            params={
                "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "data": "0xa9059cbb..."
            }
        )
        
        # Verify execution
        assert result["transactionHash"] == "0x123abc..."
        assert result["status"] == "success"
        
        # Verify pattern capture
        mock_components["pattern_extractor"].extract.assert_called_once()
        mock_components["pattern_storage"].store.assert_called_once()
        
        # Verify stored pattern
        stored_pattern = mock_components["pattern_storage"].store.call_args[0][0]
        assert stored_pattern["type"] == PatternType.TOKEN_TRANSFER
    
    @pytest.mark.asyncio
    async def test_execute_and_capture_failed_operation(
        self,
        service_config,
        mock_components
    ):
        """Test 3: Capture patterns from failed blockchain operations."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        # Mock failed transaction
        mock_result = {
            "transactionHash": "0xfailed123...",
            "status": "failed",
            "error": "Insufficient balance",
            "revertReason": "ERC20: transfer amount exceeds balance",
            "gasUsed": "21000",
            "from": "0xSender...",
            "to": "0xToken..."
        }
        
        mock_components["agentek_wrapper"].execute = AsyncMock(return_value=mock_result)
        
        # Failed patterns should still be captured for learning
        result = await service.execute_and_capture(
            tool_name="sendTransaction",
            params={"to": "0xToken...", "data": "0xtransfer..."}
        )
        
        # Verify failure captured
        assert result["status"] == "failed"
        mock_components["pattern_extractor"].extract.assert_called_once()
        
        # Check failure pattern metadata
        extract_call = mock_components["pattern_extractor"].extract.call_args[0][0]
        assert extract_call["status"] == "failed"
        assert "error" in extract_call
    
    def test_pattern_extraction_from_transaction(self, mock_components):
        """Test 4: Extract patterns from various transaction types."""
        extractor = PatternExtractor()
        
        # Test token transfer extraction
        transfer_tx = {
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "data": "0xa9059cbb000000000000000000000000recipient0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003b9aca00",
            "logs": [{
                "event": "Transfer",
                "args": {
                    "from": "0xSender...",
                    "to": "0xRecipient...",
                    "value": "1000000000"
                }
            }]
        }
        
        pattern = extractor.extract(transfer_tx)
        assert pattern["type"] == PatternType.TOKEN_TRANSFER
        assert pattern["metadata"]["function"] == "transfer"
        
        # Test DeFi swap extraction
        swap_tx = {
            "to": "0xUniswapRouter...",
            "data": "0x38ed1739...",  # swapExactTokensForTokens
            "logs": [{
                "event": "Swap",
                "args": {
                    "sender": "0xUser...",
                    "amountIn": "1000000000000000000",
                    "amountOut": "3200000000"
                }
            }]
        }
        
        pattern = extractor.extract(swap_tx)
        assert pattern["type"] == PatternType.DEFI_SWAP
        assert "amountIn" in pattern["metadata"]
    
    def test_pattern_metadata_enrichment(self):
        """Test 5: Enrich patterns with additional metadata."""
        enricher = PatternEnricher()
        
        base_pattern = {
            "type": PatternType.TOKEN_TRANSFER,
            "metadata": {
                "token": "USDC",
                "amount": "1000000000",
                "gasUsed": "65000"
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Mock market data
        with patch.object(enricher, 'get_token_price', return_value=1.0):
            with patch.object(enricher, 'get_gas_price_stats', return_value={
                "fast": 30, "standard": 20, "slow": 15
            }):
                enriched = enricher.enrich(base_pattern)
        
        # Verify enrichment
        assert "usd_value" in enriched["metadata"]
        assert "gas_price_gwei" in enriched["metadata"]
        assert "gas_efficiency_score" in enriched["metadata"]
        assert enriched["metadata"]["usd_value"] == 1000.0  # $1000 USDC
    
    @pytest.mark.asyncio
    async def test_embedding_generation_for_patterns(
        self,
        mock_components,
        service_config
    ):
        """Test 6: Generate embeddings for blockchain patterns."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        pattern = {
            "type": PatternType.DEFI_SWAP,
            "metadata": {
                "protocol": "uniswap_v3",
                "tokenIn": "ETH",
                "tokenOut": "USDC",
                "amountIn": "1000000000000000000",
                "slippage": 0.5
            }
        }
        
        # Mock embedding generation
        mock_embedding = [0.1] * 768
        mock_components["embedding_pipeline"].embed_text.return_value = mock_embedding
        
        # Generate pattern embedding
        embedding = await service._generate_pattern_embedding(pattern)
        
        # Verify embedding generation
        assert len(embedding) == 768
        mock_components["embedding_pipeline"].embed_text.assert_called_once()
        
        # Check embedding text includes important pattern info
        embed_text = mock_components["embedding_pipeline"].embed_text.call_args[0][0]
        assert "DEFI_SWAP" in embed_text
        assert "uniswap_v3" in embed_text
        assert "ETH" in embed_text and "USDC" in embed_text
    
    @pytest.mark.asyncio
    async def test_chroma_storage_integration(
        self,
        mock_components,
        service_config
    ):
        """Test 7: Store patterns in ChromaDB with proper structure."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        pattern = {
            "id": "pattern_123",
            "type": PatternType.GAS_OPTIMIZATION,
            "metadata": {
                "optimization_type": "batch_transfer",
                "gas_saved": "150000",
                "batch_size": 50
            },
            "quality_score": 0.85,
            "embedding": [0.1] * 768
        }
        
        # Store pattern
        await service._store_pattern_in_chroma(pattern)
        
        # Verify ChromaDB call
        mock_components["chroma_manager"].add_pattern.assert_called_once()
        
        stored_data = mock_components["chroma_manager"].add_pattern.call_args[1]
        assert stored_data["collection_name"] == "blockchain_patterns"
        assert stored_data["pattern_id"] == "pattern_123"
        assert stored_data["metadata"]["pattern_type"] == "GAS_OPTIMIZATION"
        assert stored_data["metadata"]["quality_score"] == 0.85
    
    @pytest.mark.asyncio
    async def test_concurrent_pattern_capture(
        self,
        mock_components,
        service_config
    ):
        """Test 8: Handle concurrent pattern captures efficiently."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        # Create multiple concurrent operations
        operations = []
        for i in range(10):
            op = service.execute_and_capture(
                tool_name="getBalance",
                params={"address": f"0x{i:040x}"}
            )
            operations.append(op)
        
        # Mock responses
        mock_components["agentek_wrapper"].execute = AsyncMock(
            return_value={"balance": "1000000000000000000"}
        )
        mock_components["pattern_storage"].store = AsyncMock(return_value=True)
        
        # Execute concurrently
        results = await asyncio.gather(*operations)
        
        # Verify all completed
        assert len(results) == 10
        assert mock_components["pattern_storage"].store.call_count == 10
    
    def test_service_configuration_validation(self):
        """Test 9: Validate service configuration parameters."""
        # Valid config
        valid_config = ServiceConfig(
            capture_enabled=True,
            min_value_threshold_eth=0.01,
            quality_threshold=0.5
        )
        assert valid_config.validate() is True
        
        # Invalid quality threshold
        with pytest.raises(ValueError) as exc_info:
            invalid_config = ServiceConfig(
                quality_threshold=1.5  # > 1.0
            )
            invalid_config.validate()
        assert "Quality threshold must be between 0 and 1" in str(exc_info.value)
        
        # Invalid batch size
        with pytest.raises(ValueError) as exc_info:
            invalid_config = ServiceConfig(
                batch_size=0
            )
            invalid_config.validate()
        assert "Batch size must be positive" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_graceful_degradation_on_chroma_failure(
        self,
        mock_components,
        service_config
    ):
        """Test 10: Service continues operating even if ChromaDB fails."""
        service = BlockchainKnowledgeService(
            config=service_config,
            **mock_components
        )
        
        # Mock ChromaDB failure
        mock_components["chroma_manager"].add_pattern.side_effect = Exception("ChromaDB unavailable")
        
        # Mock successful blockchain operation
        mock_components["agentek_wrapper"].execute = AsyncMock(
            return_value={"status": "success", "data": "test"}
        )
        
        # Execute operation
        result = await service.execute_and_capture(
            tool_name="getBalance",
            params={"address": "0x123..."}
        )
        
        # Operation should succeed even if pattern storage fails
        assert result["status"] == "success"
        
        # Check that failure was logged (would implement logging)
        # Pattern can be queued for later storage
        assert len(service._failed_pattern_queue) > 0


class TestPatternRecommendations:
    """Test pattern-based recommendation functionality."""
    
    @pytest.mark.asyncio
    async def test_get_similar_patterns(self, mock_chroma_manager):
        """Test 11: Retrieve similar patterns for recommendations."""
        engine = RecommendationEngine(mock_chroma_manager)
        
        # Mock similar patterns
        similar_patterns = [
            {
                "id": "pattern_1",
                "metadata": {
                    "pattern_type": "DEFI_SWAP",
                    "gas_used": "180000",
                    "success_rate": 0.98,
                    "avg_slippage": 0.3
                },
                "distance": 0.1
            },
            {
                "id": "pattern_2",
                "metadata": {
                    "pattern_type": "DEFI_SWAP",
                    "gas_used": "175000",
                    "success_rate": 0.99,
                    "avg_slippage": 0.2
                },
                "distance": 0.15
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = similar_patterns
        
        # Get recommendations
        current_context = {
            "operation": "swap",
            "protocol": "uniswap_v3",
            "estimated_gas": "200000"
        }
        
        recommendations = await engine.get_recommendations(current_context)
        
        assert len(recommendations) > 0
        assert recommendations[0]["suggested_gas"] == "175000"
        assert recommendations[0]["confidence"] > 0.8
    
    @pytest.mark.asyncio
    async def test_pattern_based_gas_optimization(self, mock_chroma_manager):
        """Test 12: Recommend gas optimizations based on patterns."""
        engine = RecommendationEngine(mock_chroma_manager)
        
        # Mock gas optimization patterns
        gas_patterns = [
            {
                "metadata": {
                    "pattern_type": "GAS_OPTIMIZATION",
                    "time_of_day": "02:00",
                    "day_of_week": "Sunday",
                    "avg_gas_price": "15000000000",
                    "success_rate": 0.99
                }
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = gas_patterns
        
        recommendations = await engine.get_gas_recommendations(
            operation_type="token_transfer"
        )
        
        assert "optimal_time" in recommendations
        assert recommendations["optimal_time"] == "02:00"
        assert recommendations["expected_gas_price"] == "15000000000"


class TestPatternAnalytics:
    """Test pattern analytics and insights generation."""
    
    @pytest.mark.asyncio
    async def test_pattern_quality_distribution(self, mock_chroma_manager):
        """Test 13: Analyze quality distribution of captured patterns."""
        service = BlockchainKnowledgeService(
            chroma_manager=mock_chroma_manager
        )
        
        # Mock patterns with various quality scores
        patterns = [
            {"metadata": {"quality_score": 0.9}},
            {"metadata": {"quality_score": 0.8}},
            {"metadata": {"quality_score": 0.7}},
            {"metadata": {"quality_score": 0.6}},
            {"metadata": {"quality_score": 0.5}}
        ]
        
        mock_chroma_manager.search_patterns.return_value = patterns
        
        distribution = await service.analyze_pattern_quality_distribution()
        
        assert distribution["average_quality"] == 0.7
        assert distribution["high_quality_count"] == 2  # >= 0.8
        assert distribution["low_quality_count"] == 2   # < 0.6
    
    @pytest.mark.asyncio
    async def test_pattern_evolution_over_time(self, mock_chroma_manager):
        """Test 14: Track how patterns evolve over time."""
        service = BlockchainKnowledgeService(
            chroma_manager=mock_chroma_manager
        )
        
        # Mock historical patterns
        historical_patterns = [
            {
                "metadata": {
                    "timestamp": "2024-01-01T10:00:00",
                    "gas_price": "20000000000",
                    "pattern_type": "TOKEN_TRANSFER"
                }
            },
            {
                "metadata": {
                    "timestamp": "2024-01-02T10:00:00", 
                    "gas_price": "25000000000",
                    "pattern_type": "TOKEN_TRANSFER"
                }
            },
            {
                "metadata": {
                    "timestamp": "2024-01-03T10:00:00",
                    "gas_price": "30000000000",
                    "pattern_type": "TOKEN_TRANSFER"
                }
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = historical_patterns
        
        evolution = await service.analyze_pattern_evolution(
            pattern_type=PatternType.TOKEN_TRANSFER,
            time_range=(datetime(2024, 1, 1), datetime(2024, 1, 3))
        )
        
        assert evolution["trend"] == "increasing"
        assert evolution["avg_change_per_day"] == 5000000000  # 5 gwei/day
        assert len(evolution["data_points"]) == 3
    
    @pytest.mark.asyncio
    async def test_cross_chain_pattern_analysis(self, mock_chroma_manager):
        """Test 15: Analyze patterns across different blockchains."""
        service = BlockchainKnowledgeService(
            chroma_manager=mock_chroma_manager
        )
        
        # Mock patterns from different chains
        cross_chain_patterns = [
            {
                "metadata": {
                    "chain": "ethereum",
                    "avg_gas_price": "30000000000",
                    "avg_block_time": 12
                }
            },
            {
                "metadata": {
                    "chain": "polygon",
                    "avg_gas_price": "30000000",  # 1000x cheaper
                    "avg_block_time": 2
                }
            }
        ]
        
        mock_chroma_manager.search_patterns.return_value = cross_chain_patterns
        
        analysis = await service.analyze_cross_chain_patterns()
        
        assert "ethereum" in analysis
        assert "polygon" in analysis
        assert analysis["gas_price_ratio"]["ethereum_to_polygon"] == 1000
        assert analysis["speed_ratio"]["polygon_to_ethereum"] == 6


if __name__ == "__main__":
    pytest.main([__file__, "-v"])