"""Unit tests for BlockchainMonitor.

Following TDD - these tests define the expected behavior of the
real-time blockchain monitoring system.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock, call
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import json

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from monitoring.blockchain_monitor import (
    BlockchainMonitor,
    MonitorConfig,
    BlockProcessor,
    TransactionFilter,
    MempoolWatcher,
    PatternAlert,
    AlertLevel,
    ChainReorgHandler,
    MonitoringError,
    PatternAlertSystem
)
from core.pattern_capture import PatternType, PatternMetadata


class TestBlockchainMonitor:
    """Test the main BlockchainMonitor functionality."""
    
    @pytest.fixture
    def monitor_config(self):
        """Configuration for blockchain monitoring."""
        return MonitorConfig(
            chains=["ethereum", "polygon", "arbitrum"],
            block_confirmations=3,
            pattern_detection_enabled=True,
            mempool_monitoring=True,
            reorg_detection=True,
            alert_config={
                "email_enabled": False,
                "webhook_url": None,
                "alert_cooldown": 300  # 5 minutes
            },
            filters={
                "min_value_eth": 0.1,
                "interesting_addresses": [
                    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",  # Uniswap
                ],
                "pattern_types": [
                    PatternType.DEFI_SWAP,
                    PatternType.ARBITRAGE,
                    PatternType.MEV_OPERATION
                ]
            }
        )
    
    @pytest.fixture
    def mock_websocket_manager(self):
        """Mock WebSocketManager for testing."""
        manager = AsyncMock()
        manager.is_connected = Mock(return_value=True)
        manager.subscribe = AsyncMock(return_value="0xsub123")
        manager.get_next_event = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_knowledge_service(self):
        """Mock BlockchainKnowledgeService."""
        service = AsyncMock()
        service.capture_pattern = AsyncMock()
        service.store_pattern = AsyncMock()
        return service
    
    def test_blockchain_monitor_initialization(self, monitor_config):
        """Test 1: BlockchainMonitor initializes with configuration."""
        monitor = BlockchainMonitor(config=monitor_config)
        
        assert monitor.config == monitor_config
        assert len(monitor.chains) == 3
        assert monitor.pattern_detection_enabled is True
        assert monitor.mempool_monitoring_enabled is True
        assert monitor.is_running is False
        assert monitor.block_processor is not None
        assert monitor.mempool_watcher is not None
    
    @pytest.mark.asyncio
    async def test_start_monitoring_multiple_chains(
        self, 
        monitor_config,
        mock_websocket_manager,
        mock_knowledge_service
    ):
        """Test 2: Start monitoring multiple chains concurrently."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager,
            knowledge_service=mock_knowledge_service
        )
        
        # Mock subscription responses
        subscriptions = {
            "ethereum": ["0xblock1", "0xpending1"],
            "polygon": ["0xblock2", "0xpending2"],
            "arbitrum": ["0xblock3", "0xpending3"]
        }
        
        call_count = 0
        def get_subscription(*args, **kwargs):
            nonlocal call_count
            chain = args[0] if args else kwargs.get('chain')
            idx = call_count % 2
            call_count += 1
            return subscriptions[chain][idx]
        
        mock_websocket_manager.subscribe.side_effect = get_subscription
        
        # Start monitoring
        await monitor.start()
        
        assert monitor.is_running is True
        
        # Verify subscriptions for each chain
        assert mock_websocket_manager.subscribe.call_count == 6  # 2 per chain
        
        # Verify both newHeads and pendingTransactions subscribed
        for chain in ["ethereum", "polygon", "arbitrum"]:
            calls = [
                call(chain=chain, method="eth_subscribe", params=["newHeads"]),
                call(chain=chain, method="eth_subscribe", params=["pendingTransactions"])
            ]
            for expected_call in calls:
                assert expected_call in mock_websocket_manager.subscribe.call_args_list
    
    @pytest.mark.asyncio
    async def test_block_processing_and_pattern_detection(
        self,
        monitor_config,
        mock_websocket_manager,
        mock_knowledge_service
    ):
        """Test 3: Process blocks and detect patterns."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager,
            knowledge_service=mock_knowledge_service
        )
        
        # Mock block with transactions
        mock_block = {
            "number": "0x123456",
            "hash": "0xblockHash...",
            "timestamp": "0x12345678",
            "transactions": [
                {
                    "hash": "0xtx1...",
                    "from": "0xSender...",
                    "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",  # Uniswap
                    "value": "0x1bc16d674ec80000",  # 2 ETH
                    "input": "0x7ff36ab5...",  # swapExactETHForTokens
                    "gasPrice": "0x4a817c800"
                },
                {
                    "hash": "0xtx2...",
                    "from": "0xOther...",
                    "to": "0xRandom...",
                    "value": "0x0",
                    "input": "0x"
                }
            ]
        }
        
        # Process block
        patterns = await monitor.process_block("ethereum", mock_block)
        
        # Should detect pattern from Uniswap transaction
        assert len(patterns) > 0
        assert mock_knowledge_service.capture_pattern.called
        
        # Verify pattern details
        captured_pattern = mock_knowledge_service.capture_pattern.call_args[0][0]
        assert captured_pattern["to"] == "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        assert int(captured_pattern["value"], 16) > monitor.config.filters["min_value_eth"] * 10**18
    
    @pytest.mark.asyncio
    async def test_transaction_filtering(self, monitor_config):
        """Test 4: Filter transactions based on criteria."""
        monitor = BlockchainMonitor(config=monitor_config)
        
        transactions = [
            {  # Should pass - high value to interesting address
                "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "value": "0x1bc16d674ec80000",  # 2 ETH
                "input": "0xa9059cbb..."
            },
            {  # Should fail - low value
                "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "value": "0x16345785d8a0000",  # 0.1 ETH
                "input": "0xa9059cbb..."
            },
            {  # Should fail - not interesting address
                "to": "0xRandomAddress...",
                "value": "0x8ac7230489e80000",  # 10 ETH
                "input": "0x"
            }
        ]
        
        filter = TransactionFilter(monitor.config.filters)
        filtered = [tx for tx in transactions if filter.should_process(tx)]
        
        assert len(filtered) == 1
        assert filtered[0]["to"] == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    
    @pytest.mark.asyncio
    async def test_mempool_monitoring(
        self,
        monitor_config,
        mock_websocket_manager
    ):
        """Test 5: Monitor mempool for pending transactions."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager
        )
        
        # Mock pending transactions
        pending_txs = [
            {
                "hash": "0xpending1...",
                "from": "0xSender1...",
                "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "value": "0x3635c9adc5dea00000",  # 1000 ETH - potential MEV
                "gasPrice": "0x12a05f200",  # Very high gas
                "maxPriorityFeePerGas": "0x9502f900"
            },
            {
                "hash": "0xpending2...",
                "from": "0xSender2...",
                "to": "0xNormal...",
                "value": "0x0",
                "gasPrice": "0x4a817c800"  # Normal gas
            }
        ]
        
        mock_websocket_manager.get_next_event.side_effect = [
            {"params": {"result": pending_txs[0]}},
            {"params": {"result": pending_txs[1]}}
        ]
        
        # Monitor mempool
        mev_candidates = []
        monitor.mempool_watcher.on_mev_candidate = lambda tx: mev_candidates.append(tx)
        
        await monitor.mempool_watcher.process_pending_transactions("ethereum", 2)
        
        # Should detect high-value, high-gas transaction as MEV
        assert len(mev_candidates) == 1
        assert mev_candidates[0]["hash"] == "0xpending1..."
        assert mev_candidates[0]["mev_score"] > 0.8  # High MEV probability
    
    @pytest.mark.asyncio
    async def test_chain_reorganization_detection(
        self,
        monitor_config,
        mock_websocket_manager
    ):
        """Test 6: Detect and handle chain reorganizations."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager
        )
        
        # Track blocks
        blocks = [
            {"number": "0x100", "hash": "0xhash100", "parentHash": "0xhash99"},
            {"number": "0x101", "hash": "0xhash101", "parentHash": "0xhash100"},
            {"number": "0x102", "hash": "0xhash102", "parentHash": "0xhash101"},
            # Reorg occurs
            {"number": "0x101", "hash": "0xhash101_new", "parentHash": "0xhash100"},
            {"number": "0x102", "hash": "0xhash102_new", "parentHash": "0xhash101_new"}
        ]
        
        reorg_detected = False
        reorg_depth = 0
        
        def on_reorg(chain, depth, old_blocks, new_blocks):
            nonlocal reorg_detected, reorg_depth
            reorg_detected = True
            reorg_depth = depth
        
        monitor.chain_reorg_handler.on_reorganization = on_reorg
        
        # Process blocks
        for block in blocks:
            await monitor.chain_reorg_handler.process_block("ethereum", block)
        
        assert reorg_detected is True
        assert reorg_depth == 2  # Blocks 101 and 102 were reorganized
    
    @pytest.mark.asyncio
    async def test_pattern_alerts(
        self,
        monitor_config,
        mock_knowledge_service
    ):
        """Test 7: Generate alerts for significant patterns."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            knowledge_service=mock_knowledge_service
        )
        
        alerts_generated = []
        
        def on_alert(alert: PatternAlert):
            alerts_generated.append(alert)
        
        monitor.alert_system.on_alert = on_alert
        
        # Create patterns that should trigger alerts
        patterns = [
            {
                "type": PatternType.ARBITRAGE,
                "metadata": {
                    "profit_usd": 10000,  # High profit
                    "gas_used": 300000,
                    "protocols": ["uniswap", "sushiswap"]
                },
                "quality_score": 0.95
            },
            {
                "type": PatternType.MEV_OPERATION,
                "metadata": {
                    "mev_type": "sandwich",
                    "victim_loss_usd": 5000,
                    "attacker_profit_usd": 4500
                },
                "quality_score": 0.98
            }
        ]
        
        # Process patterns
        for pattern in patterns:
            await monitor.check_pattern_alerts(pattern)
        
        assert len(alerts_generated) == 2
        
        # Check arbitrage alert
        arb_alert = next(a for a in alerts_generated if a.pattern_type == PatternType.ARBITRAGE)
        assert arb_alert.level == AlertLevel.HIGH
        assert arb_alert.metadata["profit_usd"] == 10000
        
        # Check MEV alert
        mev_alert = next(a for a in alerts_generated if a.pattern_type == PatternType.MEV_OPERATION)
        assert mev_alert.level == AlertLevel.CRITICAL
        assert "sandwich" in mev_alert.message
    
    @pytest.mark.asyncio
    async def test_monitoring_performance_metrics(
        self,
        monitor_config,
        mock_websocket_manager,
        mock_knowledge_service
    ):
        """Test 8: Track monitoring performance metrics."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager,
            knowledge_service=mock_knowledge_service
        )
        
        # Process multiple blocks
        for i in range(10):
            block = {
                "number": hex(1000 + i),
                "hash": f"0xhash{i}",
                "timestamp": hex(int(datetime.now().timestamp()) + i),
                "transactions": [
                    {"hash": f"0xtx{i}_{j}", "to": "0xaddr", "value": "0x1"}
                    for j in range(5)
                ]
            }
            
            start_time = datetime.now()
            await monitor.process_block("ethereum", block)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Track metrics
            monitor.metrics_collector.record_block_processing_time(
                "ethereum", processing_time
            )
        
        # Get performance metrics
        metrics = monitor.get_performance_metrics()
        
        assert metrics["blocks_processed"] == 10
        assert metrics["transactions_processed"] == 50
        assert metrics["average_block_time"] > 0
        assert metrics["patterns_detected"] >= 0
        assert "ethereum" in metrics["chain_metrics"]
        assert metrics["chain_metrics"]["ethereum"]["blocks"] == 10
    
    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(
        self,
        monitor_config,
        mock_websocket_manager,
        mock_knowledge_service
    ):
        """Test 9: Handle errors gracefully and recover."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager,
            knowledge_service=mock_knowledge_service
        )
        
        # Simulate various errors
        error_count = 0
        
        async def failing_capture(*args, **kwargs):
            nonlocal error_count
            error_count += 1
            if error_count < 3:
                raise Exception("Capture failed")
            # Success on 3rd attempt
            return {"pattern": "recovered"}
        
        mock_knowledge_service.capture_pattern = failing_capture
        
        # Process block with error handling
        block = {
            "number": "0x1000",
            "transactions": [{"hash": "0xtx1", "to": "0xaddr", "value": "0x1"}]
        }
        
        patterns = await monitor.process_block("ethereum", block)
        
        # Should recover after errors
        assert error_count == 3
        assert len(patterns) > 0
        assert monitor.error_stats["pattern_capture_errors"] == 2
    
    @pytest.mark.asyncio
    async def test_graceful_shutdown(
        self,
        monitor_config,
        mock_websocket_manager
    ):
        """Test 10: Gracefully shutdown monitoring."""
        monitor = BlockchainMonitor(
            config=monitor_config,
            websocket_manager=mock_websocket_manager
        )
        
        # Start monitoring
        await monitor.start()
        assert monitor.is_running is True
        
        # Track cleanup
        cleanup_called = {
            "save_state": False,
            "close_connections": False,
            "flush_patterns": False
        }
        
        async def mock_save_state():
            cleanup_called["save_state"] = True
        
        async def mock_close():
            cleanup_called["close_connections"] = True
        
        async def mock_flush():
            cleanup_called["flush_patterns"] = True
        
        monitor.save_state = mock_save_state
        monitor.websocket_manager.shutdown = mock_close
        monitor.flush_pending_patterns = mock_flush
        
        # Shutdown
        await monitor.stop()
        
        assert monitor.is_running is False
        assert all(cleanup_called.values())


class TestBlockProcessor:
    """Test block processing functionality."""
    
    @pytest.mark.asyncio
    async def test_block_validation(self):
        """Test 11: Validate block structure and data."""
        processor = BlockProcessor()
        
        valid_block = {
            "number": "0x123",
            "hash": "0xhash...",
            "parentHash": "0xparent...",
            "timestamp": "0x12345678",
            "transactions": []
        }
        
        invalid_blocks = [
            {},  # Empty
            {"number": "0x123"},  # Missing required fields
            {"number": "invalid", "hash": "0xhash"},  # Invalid number format
        ]
        
        assert processor.validate_block(valid_block) is True
        
        for block in invalid_blocks:
            assert processor.validate_block(block) is False
    
    @pytest.mark.asyncio
    async def test_transaction_extraction(self):
        """Test 12: Extract transactions from block."""
        processor = BlockProcessor()
        
        # Block with full transactions
        block_full = {
            "transactions": [
                {"hash": "0xtx1", "from": "0xaddr1", "to": "0xaddr2"},
                {"hash": "0xtx2", "from": "0xaddr3", "to": "0xaddr4"}
            ]
        }
        
        # Block with transaction hashes only
        block_hashes = {
            "transactions": ["0xtx1", "0xtx2", "0xtx3"]
        }
        
        txs_full = processor.extract_transactions(block_full)
        txs_hashes = processor.extract_transactions(block_hashes)
        
        assert len(txs_full) == 2
        assert all(isinstance(tx, dict) for tx in txs_full)
        
        assert len(txs_hashes) == 3
        assert all(isinstance(tx, str) for tx in txs_hashes)
    
    @pytest.mark.asyncio
    async def test_block_finality_tracking(self):
        """Test 13: Track block finality with confirmations."""
        processor = BlockProcessor(confirmations_required=3)
        
        # Add blocks
        for i in range(10):
            block = {
                "number": hex(1000 + i),
                "hash": f"0xhash{i}",
                "timestamp": hex(int(datetime.now().timestamp()))
            }
            processor.add_block("ethereum", block)
        
        # Check finality
        finalized = processor.get_finalized_blocks("ethereum", current_height=1009)
        
        # Blocks up to 1006 should be finalized (1009 - 3)
        assert len(finalized) == 7  # blocks 1000-1006
        assert all(int(b["number"], 16) <= 1006 for b in finalized)
        
        # Recent blocks should not be finalized
        assert not processor.is_finalized("ethereum", 1007)
        assert not processor.is_finalized("ethereum", 1008)


class TestMempoolWatcher:
    """Test mempool monitoring functionality."""
    
    @pytest.mark.asyncio
    async def test_mempool_transaction_analysis(self):
        """Test 14: Analyze pending transactions in mempool."""
        watcher = MempoolWatcher()
        
        # Various transaction types
        transactions = [
            {  # High gas, potential MEV
                "hash": "0xmev1",
                "gasPrice": "0x1dcd65000",  # 8 Gwei
                "maxPriorityFeePerGas": "0xb2d05e00",  # 3 Gwei
                "value": "0x8ac7230489e80000",  # 10 ETH
                "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
            },
            {  # Normal transaction
                "hash": "0xnormal1",
                "gasPrice": "0x77359400",  # 2 Gwei
                "value": "0xde0b6b3a7640000",  # 1 ETH
                "to": "0xrandom"
            },
            {  # Failed transaction attempt
                "hash": "0xfail1",
                "gasPrice": "0x3b9aca00",  # 1 Gwei (too low)
                "value": "0x0",
                "to": "0xcontract"
            }
        ]
        
        analysis = []
        for tx in transactions:
            result = await watcher.analyze_transaction(tx)
            analysis.append(result)
        
        # Check MEV detection
        assert analysis[0]["is_mev_candidate"] is True
        assert analysis[0]["mev_score"] > 0.7
        assert "high_gas" in analysis[0]["flags"]
        
        # Normal transaction
        assert analysis[1]["is_mev_candidate"] is False
        assert analysis[1]["mev_score"] < 0.3
        
        # Low gas transaction
        assert "low_gas" in analysis[2]["flags"]
        assert analysis[2]["likely_to_fail"] is True
    
    @pytest.mark.asyncio
    async def test_mempool_statistics(self):
        """Test 15: Track mempool statistics over time."""
        watcher = MempoolWatcher()
        
        # Simulate mempool activity
        for minute in range(5):
            base_gas = 20 + (minute * 5)  # Increasing gas prices
            
            for i in range(20):  # 20 txs per minute
                tx = {
                    "hash": f"0xtx_{minute}_{i}",
                    "gasPrice": hex(base_gas * 10**9),
                    "value": hex(i * 10**18),
                    "timestamp": datetime.now() + timedelta(minutes=minute)
                }
                watcher.add_transaction(tx)
        
        # Get statistics
        stats = watcher.get_mempool_stats()
        
        assert stats["total_pending"] == 100
        assert stats["gas_price_percentiles"]["p50"] > 0
        assert stats["gas_price_percentiles"]["p95"] > stats["gas_price_percentiles"]["p50"]
        assert stats["avg_wait_time"] >= 0
        assert stats["mev_candidates"] >= 0


class TestChainReorgHandler:
    """Test chain reorganization handling."""
    
    @pytest.mark.asyncio
    async def test_reorg_detection_simple(self):
        """Test 16: Detect simple chain reorganization."""
        handler = ChainReorgHandler(max_depth=10)
        
        # Normal chain progression
        await handler.add_block("eth", {"number": "0x100", "hash": "0xa1", "parentHash": "0xa0"})
        await handler.add_block("eth", {"number": "0x101", "hash": "0xa2", "parentHash": "0xa1"})
        await handler.add_block("eth", {"number": "0x102", "hash": "0xa3", "parentHash": "0xa2"})
        
        # Reorg at block 102
        reorg_detected = await handler.add_block(
            "eth", 
            {"number": "0x102", "hash": "0xb3", "parentHash": "0xa2"}
        )
        
        assert reorg_detected is True
        assert handler.get_reorg_depth("eth") == 1
    
    @pytest.mark.asyncio
    async def test_deep_reorg_detection(self):
        """Test 17: Detect deep chain reorganization."""
        handler = ChainReorgHandler(max_depth=10)
        
        # Build initial chain
        for i in range(10):
            await handler.add_block(
                "eth",
                {
                    "number": hex(100 + i),
                    "hash": f"0xa{i}",
                    "parentHash": f"0xa{i-1}" if i > 0 else "0xa_prev"
                }
            )
        
        # Deep reorg from block 105
        reorg_blocks = []
        for i in range(5, 10):
            block = {
                "number": hex(100 + i),
                "hash": f"0xb{i}",
                "parentHash": f"0xb{i-1}" if i > 5 else "0xa4"
            }
            reorg_detected = await handler.add_block("eth", block)
            if reorg_detected:
                reorg_blocks.append(block)
        
        assert len(reorg_blocks) > 0
        assert handler.get_reorg_depth("eth") == 5
    
    @pytest.mark.asyncio
    async def test_reorg_recovery_actions(self):
        """Test 18: Execute recovery actions after reorg."""
        handler = ChainReorgHandler()
        
        recovery_actions = []
        
        async def on_reorg(chain, depth, old_blocks, new_blocks):
            recovery_actions.append({
                "chain": chain,
                "depth": depth,
                "old_count": len(old_blocks),
                "new_count": len(new_blocks)
            })
        
        handler.on_reorganization = on_reorg
        
        # Simulate reorg
        old_chain = [
            {"number": "0x100", "hash": "0xa1"},
            {"number": "0x101", "hash": "0xa2"},
            {"number": "0x102", "hash": "0xa3"}
        ]
        
        new_chain = [
            {"number": "0x101", "hash": "0xb2"},
            {"number": "0x102", "hash": "0xb3"},
            {"number": "0x103", "hash": "0xb4"}
        ]
        
        await handler.handle_reorganization("ethereum", old_chain, new_chain)
        
        assert len(recovery_actions) == 1
        assert recovery_actions[0]["chain"] == "ethereum"
        assert recovery_actions[0]["depth"] == 2
        assert recovery_actions[0]["old_count"] == 3
        assert recovery_actions[0]["new_count"] == 3


class TestPatternAlerts:
    """Test pattern alert system."""
    
    def test_alert_level_determination(self):
        """Test 19: Determine alert level based on pattern."""
        alert_system = PatternAlertSystem()
        
        patterns = [
            {
                "type": PatternType.MEV_OPERATION,
                "metadata": {"mev_type": "sandwich", "victim_loss_usd": 10000}
            },
            {
                "type": PatternType.ARBITRAGE,
                "metadata": {"profit_usd": 5000}
            },
            {
                "type": PatternType.GAS_OPTIMIZATION,
                "metadata": {"gas_saved": 50000}
            }
        ]
        
        levels = [alert_system.determine_level(p) for p in patterns]
        
        assert levels[0] == AlertLevel.CRITICAL  # MEV sandwich
        assert levels[1] == AlertLevel.HIGH      # High profit arbitrage
        assert levels[2] == AlertLevel.INFO      # Gas optimization
    
    @pytest.mark.asyncio
    async def test_alert_cooldown_period(self):
        """Test 20: Enforce cooldown period between similar alerts."""
        alert_system = PatternAlertSystem(cooldown_seconds=5)
        
        pattern = {
            "type": PatternType.ARBITRAGE,
            "metadata": {"profit_usd": 1000, "protocols": ["uniswap", "sushiswap"]}
        }
        
        # First alert should trigger
        alert1 = await alert_system.create_alert(pattern)
        assert alert1 is not None
        
        # Immediate duplicate should be suppressed
        alert2 = await alert_system.create_alert(pattern)
        assert alert2 is None
        
        # Wait for cooldown
        await asyncio.sleep(5.1)
        
        # Should trigger again after cooldown
        alert3 = await alert_system.create_alert(pattern)
        assert alert3 is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])