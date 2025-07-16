"""Integration tests for BlockchainKnowledgeService with ChromaDB.

These tests verify the complete flow from blockchain operations
through pattern capture to storage and retrieval in ChromaDB.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List
import numpy as np

from ...core.blockchain_knowledge_service import (
    BlockchainKnowledgeService,
    ServiceConfig
)
from ...core.pattern_capture import PatternType
# ChromaDB imports - would be from main tools package
# from tools.integration.chroma_collections import ChromaCollectionManager
# from tools.integration.chroma_embeddings import ChromaEmbeddingPipeline


class TestKnowledgeServiceIntegration:
    """Test complete integration of blockchain knowledge service."""
    
    @pytest.fixture
    def integration_config(self):
        """Configuration for integration testing."""
        return ServiceConfig(
            capture_enabled=True,
            chroma_persist_dir="./test_chroma_data",
            collection_name="test_blockchain_patterns",
            embedding_model="local",  # Use local model for tests
            batch_size=10,
            min_value_threshold_eth=0.001
        )
    
    @pytest.fixture
    async def knowledge_service(self, integration_config, mock_agentek_client):
        """Create fully integrated knowledge service."""
        # Use real ChromaDB and embedding pipeline
        chroma_manager = ChromaCollectionManager(
            persist_directory=integration_config.chroma_persist_dir
        )
        embedding_pipeline = ChromaEmbeddingPipeline(
            model_type="local",  # Use local model for speed
            cache_enabled=True
        )
        
        service = BlockchainKnowledgeService(
            config=integration_config,
            agentek_wrapper=mock_agentek_client(),
            chroma_manager=chroma_manager,
            embedding_pipeline=embedding_pipeline
        )
        
        yield service
        
        # Cleanup
        import shutil
        shutil.rmtree(integration_config.chroma_persist_dir, ignore_errors=True)
    
    @pytest.mark.asyncio
    async def test_end_to_end_pattern_flow(self, knowledge_service):
        """Test 1: Complete flow from operation to pattern storage."""
        # Mock blockchain operation
        mock_operation = {
            "transactionHash": "0xe2e_test_123...",
            "from": "0xUser123...",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
            "value": "0",
            "data": "0xa9059cbb...",  # transfer
            "gasUsed": "65000",
            "gasPrice": "20000000000",
            "status": "success",
            "logs": [{
                "event": "Transfer",
                "args": {
                    "from": "0xUser123...",
                    "to": "0xRecipient456...",
                    "value": "1000000000"  # 1000 USDC
                }
            }],
            "timestamp": datetime.now().isoformat()
        }
        
        # Execute operation with pattern capture
        with patch.object(
            knowledge_service.agentek_wrapper,
            'execute',
            return_value=mock_operation
        ):
            result = await knowledge_service.execute_and_capture(
                tool_name="sendTransaction",
                params={"to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"}
            )
        
        # Verify operation executed
        assert result["transactionHash"] == "0xe2e_test_123..."
        
        # Wait for async pattern storage
        await asyncio.sleep(0.1)
        
        # Search for the stored pattern
        patterns = await knowledge_service.search_patterns(
            query="USDC transfer",
            limit=10
        )
        
        assert len(patterns) > 0
        found_pattern = patterns[0]
        assert found_pattern["metadata"]["pattern_type"] == "TOKEN_TRANSFER"
        assert found_pattern["metadata"]["token"] == "USDC"
    
    @pytest.mark.asyncio
    async def test_pattern_search_and_retrieval(self, knowledge_service):
        """Test 2: Search and retrieve similar patterns."""
        # Store multiple swap patterns
        swap_patterns = [
            {
                "type": PatternType.DEFI_SWAP,
                "protocol": "uniswap_v3",
                "tokenIn": "ETH",
                "tokenOut": "USDC",
                "amountIn": "1000000000000000000",  # 1 ETH
                "gasUsed": "180000",
                "slippage": 0.5,
                "timestamp": datetime.now() - timedelta(hours=i)
            }
            for i in range(5)
        ]
        
        # Store patterns
        for i, pattern_data in enumerate(swap_patterns):
            await knowledge_service._store_pattern({
                "id": f"swap_{i}",
                "type": pattern_data["type"],
                "metadata": pattern_data,
                "quality_score": 0.8 + (i * 0.02)
            })
        
        # Search for similar swaps
        results = await knowledge_service.search_similar_patterns(
            pattern_type=PatternType.DEFI_SWAP,
            filters={"protocol": "uniswap_v3"},
            limit=3
        )
        
        assert len(results) == 3
        assert all(r["metadata"]["protocol"] == "uniswap_v3" for r in results)
        # Should be ordered by quality score (descending)
        assert results[0]["metadata"]["quality_score"] >= results[1]["metadata"]["quality_score"]
    
    @pytest.mark.asyncio
    async def test_similar_pattern_discovery(self, knowledge_service):
        """Test 3: Discover similar patterns using embeddings."""
        # Create a reference pattern
        reference_pattern = {
            "type": PatternType.TOKEN_TRANSFER,
            "metadata": {
                "token": "USDT",
                "amount": "5000000000",  # 5000 USDT
                "from": "0xWhale123...",
                "to": "0xExchange456...",
                "gas_used": "70000"
            }
        }
        
        # Store reference
        await knowledge_service._store_pattern({
            "id": "reference_transfer",
            **reference_pattern,
            "quality_score": 0.9
        })
        
        # Store similar patterns with varying similarity
        similar_patterns = [
            {  # Very similar - same token, similar amount
                "id": "similar_1",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "token": "USDT",
                    "amount": "4500000000",
                    "gas_used": "68000"
                }
            },
            {  # Somewhat similar - same token, different amount
                "id": "similar_2",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "token": "USDT",
                    "amount": "100000000",
                    "gas_used": "65000"
                }
            },
            {  # Less similar - different token
                "id": "similar_3",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "token": "USDC",
                    "amount": "5000000000",
                    "gas_used": "70000"
                }
            }
        ]
        
        for pattern in similar_patterns:
            await knowledge_service._store_pattern({
                **pattern,
                "quality_score": 0.8
            })
        
        # Find similar patterns
        similar = await knowledge_service.find_similar_patterns(
            reference_pattern_id="reference_transfer",
            similarity_threshold=0.7,
            limit=5
        )
        
        assert len(similar) >= 2
        # Most similar should be first
        assert similar[0]["id"] == "similar_1"
        assert similar[0]["similarity_score"] > 0.8
    
    @pytest.mark.asyncio
    async def test_pattern_based_recommendations(self, knowledge_service):
        """Test 4: Generate recommendations based on stored patterns."""
        # Store historical gas optimization patterns
        gas_patterns = [
            {
                "id": f"gas_opt_{i}",
                "type": PatternType.GAS_OPTIMIZATION,
                "metadata": {
                    "operation": "token_transfer",
                    "time_of_day": hour,
                    "day_of_week": "Monday",
                    "gas_price": 15 + (hour * 2),  # Gas increases during day
                    "gas_used": 65000,
                    "success_rate": 0.99
                },
                "quality_score": 0.9
            }
            for i, hour in enumerate([2, 6, 10, 14, 18, 22])
        ]
        
        for pattern in gas_patterns:
            await knowledge_service._store_pattern(pattern)
        
        # Get recommendations for current operation
        recommendations = await knowledge_service.get_operation_recommendations(
            operation_type="token_transfer",
            current_time=datetime.now().replace(hour=14)  # 2 PM
        )
        
        assert "optimal_time" in recommendations
        assert recommendations["optimal_time"]["hour"] == 2  # 2 AM is cheapest
        assert recommendations["expected_gas_price"] < 20
        assert recommendations["confidence"] > 0.7
    
    @pytest.mark.asyncio
    async def test_multi_chain_pattern_aggregation(self, knowledge_service):
        """Test 5: Aggregate patterns across multiple chains."""
        # Store patterns from different chains
        chains = ["ethereum", "polygon", "arbitrum", "optimism"]
        
        for chain in chains:
            for i in range(3):
                pattern = {
                    "id": f"{chain}_pattern_{i}",
                    "type": PatternType.DEFI_SWAP,
                    "metadata": {
                        "chain": chain,
                        "protocol": "uniswap_v3",
                        "gas_used": 180000 if chain == "ethereum" else 180000 // 100,
                        "gas_price": 30000000000 if chain == "ethereum" else 30000000,
                        "avg_execution_time": 12 if chain == "ethereum" else 2
                    },
                    "quality_score": 0.8
                }
                await knowledge_service._store_pattern(pattern)
        
        # Aggregate cross-chain insights
        aggregation = await knowledge_service.aggregate_cross_chain_patterns(
            pattern_type=PatternType.DEFI_SWAP
        )
        
        assert len(aggregation["chains"]) == 4
        assert aggregation["chains"]["ethereum"]["avg_gas_price"] > aggregation["chains"]["polygon"]["avg_gas_price"]
        assert aggregation["cost_effectiveness_ranking"][0] != "ethereum"  # ETH should not be most cost-effective
        assert "recommendations" in aggregation
    
    @pytest.mark.asyncio
    async def test_real_time_pattern_updates(self, knowledge_service):
        """Test 6: Handle real-time pattern updates and queries."""
        # Simulate real-time trading patterns
        pattern_stream = []
        
        async def generate_patterns():
            """Simulate pattern generation."""
            for i in range(10):
                pattern = {
                    "id": f"realtime_{i}",
                    "type": PatternType.DEFI_SWAP,
                    "metadata": {
                        "timestamp": datetime.now(),
                        "protocol": "uniswap_v3",
                        "profit_usd": 50 + (i * 10),  # Increasing profit
                        "gas_used": 180000 - (i * 1000)  # Optimizing gas
                    },
                    "quality_score": 0.7 + (i * 0.02)
                }
                pattern_stream.append(pattern)
                await knowledge_service._store_pattern(pattern)
                await asyncio.sleep(0.1)  # Simulate time between patterns
        
        # Start pattern generation
        generation_task = asyncio.create_task(generate_patterns())
        
        # Query patterns while they're being generated
        await asyncio.sleep(0.3)  # Let some patterns generate
        
        early_patterns = await knowledge_service.search_patterns(
            query="uniswap_v3",
            limit=5
        )
        assert len(early_patterns) >= 2
        
        # Wait for more patterns
        await asyncio.sleep(0.5)
        
        later_patterns = await knowledge_service.search_patterns(
            query="uniswap_v3",
            limit=10
        )
        assert len(later_patterns) > len(early_patterns)
        
        await generation_task
    
    @pytest.mark.asyncio
    async def test_pattern_evolution_tracking(self, knowledge_service):
        """Test 7: Track pattern evolution over time."""
        # Create evolving gas price patterns over a week
        base_time = datetime.now() - timedelta(days=7)
        
        for day in range(7):
            for hour in [0, 6, 12, 18]:
                timestamp = base_time + timedelta(days=day, hours=hour)
                pattern = {
                    "id": f"evolution_{day}_{hour}",
                    "type": PatternType.GAS_OPTIMIZATION,
                    "metadata": {
                        "timestamp": timestamp.isoformat(),
                        "gas_price": 20 + (day * 2) + (hour // 6 * 5),  # Increasing trend
                        "network_congestion": "low" if hour < 6 else "high",
                        "block_time": 12 + (hour // 12)
                    },
                    "quality_score": 0.8
                }
                await knowledge_service._store_pattern(pattern)
        
        # Analyze evolution
        evolution = await knowledge_service.analyze_pattern_evolution(
            pattern_type=PatternType.GAS_OPTIMIZATION,
            time_range=(base_time, datetime.now()),
            metric="gas_price"
        )
        
        assert evolution["trend"] == "increasing"
        assert evolution["average_daily_change"] > 0
        assert len(evolution["data_points"]) == 28  # 7 days * 4 measurements
        assert evolution["prediction"]["next_day_estimate"] > evolution["current_value"]
    
    @pytest.mark.asyncio
    async def test_knowledge_export_import(self, knowledge_service):
        """Test 8: Export and import pattern knowledge."""
        # Create diverse patterns
        patterns_to_export = [
            {
                "id": "export_1",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {"token": "USDC", "amount": "1000000000"},
                "quality_score": 0.9
            },
            {
                "id": "export_2",
                "type": PatternType.DEFI_SWAP,
                "metadata": {"protocol": "sushiswap", "pair": "ETH/USDC"},
                "quality_score": 0.85
            },
            {
                "id": "export_3",
                "type": PatternType.NFT_MINT,
                "metadata": {"collection": "CoolNFTs", "price": "0.1"},
                "quality_score": 0.7
            }
        ]
        
        # Store patterns
        for pattern in patterns_to_export:
            await knowledge_service._store_pattern(pattern)
        
        # Export knowledge
        export_data = await knowledge_service.export_knowledge(
            filters={"quality_score": {"$gte": 0.7}},
            format="json"
        )
        
        assert len(export_data["patterns"]) == 3
        assert export_data["metadata"]["export_time"] is not None
        assert export_data["metadata"]["version"] == "1.0"
        
        # Clear current patterns (simulate new instance)
        await knowledge_service.clear_patterns()
        
        # Verify patterns cleared
        search_result = await knowledge_service.search_patterns("*", limit=10)
        assert len(search_result) == 0
        
        # Import knowledge
        import_result = await knowledge_service.import_knowledge(export_data)
        
        assert import_result["imported_count"] == 3
        assert import_result["failed_count"] == 0
        
        # Verify patterns restored
        restored = await knowledge_service.search_patterns("*", limit=10)
        assert len(restored) == 3
        assert any(p["id"] == "export_1" for p in restored)


class TestAdvancedPatternAnalytics:
    """Test advanced analytics on captured patterns."""
    
    @pytest.mark.asyncio
    async def test_pattern_clustering(self, knowledge_service):
        """Test 9: Cluster similar patterns for insights."""
        # Create patterns that should cluster together
        
        # Cluster 1: Small retail transfers
        for i in range(5):
            await knowledge_service._store_pattern({
                "id": f"retail_{i}",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "amount_usd": 50 + (i * 10),
                    "gas_used": 65000,
                    "user_type": "retail"
                },
                "quality_score": 0.8
            })
        
        # Cluster 2: Large whale transfers
        for i in range(5):
            await knowledge_service._store_pattern({
                "id": f"whale_{i}",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "amount_usd": 100000 + (i * 50000),
                    "gas_used": 65000,
                    "user_type": "whale"
                },
                "quality_score": 0.9
            })
        
        # Cluster 3: DEX arbitrage
        for i in range(5):
            await knowledge_service._store_pattern({
                "id": f"arb_{i}",
                "type": PatternType.DEFI_SWAP,
                "metadata": {
                    "profit_usd": 100 + (i * 20),
                    "gas_used": 250000,
                    "strategy": "arbitrage"
                },
                "quality_score": 0.85
            })
        
        # Perform clustering
        clusters = await knowledge_service.cluster_patterns(
            min_cluster_size=3,
            similarity_threshold=0.7
        )
        
        assert len(clusters) >= 3
        
        # Verify cluster characteristics
        for cluster in clusters:
            patterns = cluster["patterns"]
            if patterns[0]["id"].startswith("retail"):
                assert all(p["metadata"]["user_type"] == "retail" for p in patterns)
                assert cluster["label"] == "small_transfers" or "retail" in cluster["label"].lower()
            elif patterns[0]["id"].startswith("whale"):
                assert all(p["metadata"]["amount_usd"] > 50000 for p in patterns)
                assert "whale" in cluster["label"].lower() or "large" in cluster["label"].lower()
    
    @pytest.mark.asyncio
    async def test_anomaly_detection(self, knowledge_service):
        """Test 10: Detect anomalous patterns."""
        # Create normal patterns
        for i in range(20):
            await knowledge_service._store_pattern({
                "id": f"normal_{i}",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "gas_used": 65000 + (i * 100),  # Small variation
                    "amount_usd": 1000 + (i * 50),
                    "slippage": 0.1
                },
                "quality_score": 0.8
            })
        
        # Create anomalous patterns
        anomalies = [
            {
                "id": "anomaly_1",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "gas_used": 500000,  # Way too high
                    "amount_usd": 1000,
                    "slippage": 0.1
                },
                "quality_score": 0.3
            },
            {
                "id": "anomaly_2",
                "type": PatternType.TOKEN_TRANSFER,
                "metadata": {
                    "gas_used": 65000,
                    "amount_usd": 1000000,  # Unusually high amount
                    "slippage": 5.0  # Very high slippage
                },
                "quality_score": 0.4
            }
        ]
        
        for anomaly in anomalies:
            await knowledge_service._store_pattern(anomaly)
        
        # Detect anomalies
        detected = await knowledge_service.detect_anomalies(
            pattern_type=PatternType.TOKEN_TRANSFER,
            sensitivity=0.95  # High sensitivity
        )
        
        assert len(detected) >= 2
        anomaly_ids = [a["pattern_id"] for a in detected]
        assert "anomaly_1" in anomaly_ids
        assert "anomaly_2" in anomaly_ids
        
        # Check anomaly reasons
        for anomaly in detected:
            if anomaly["pattern_id"] == "anomaly_1":
                assert "gas_used" in anomaly["anomaly_features"]
            elif anomaly["pattern_id"] == "anomaly_2":
                assert "amount_usd" in anomaly["anomaly_features"] or "slippage" in anomaly["anomaly_features"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])