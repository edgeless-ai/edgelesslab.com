#!/usr/bin/env python3
"""Simple test to verify WebSocketManager implementation."""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from monitoring.websocket_manager import (
    WebSocketManager,
    WebSocketConfig,
    ChainEndpoint,
    ReconnectStrategy,
    ConnectionState
)


async def test_basic_functionality():
    """Test basic WebSocketManager functionality."""
    print("Testing WebSocketManager implementation...")
    
    # Test 1: Configuration
    config = WebSocketConfig(
        endpoints={
            "ethereum": ChainEndpoint(
                url="wss://eth-mainnet.example.com",
                chain_id=1,
                rate_limit=100
            ),
            "polygon": ChainEndpoint(
                url="wss://polygon-mainnet.example.com",
                chain_id=137,
                rate_limit=150
            )
        },
        reconnect_strategy=ReconnectStrategy(
            max_attempts=5,
            initial_delay=1.0,
            max_delay=60.0
        )
    )
    
    print("✓ Configuration created successfully")
    
    # Test 2: Manager initialization
    manager = WebSocketManager(config=config)
    
    assert len(manager.endpoints) == 2
    assert "ethereum" in manager.endpoints
    assert "polygon" in manager.endpoints
    assert manager.is_running is False
    
    print("✓ Manager initialized correctly")
    
    # Test 3: Connection state
    state = manager.get_connection_state("ethereum")
    assert state == ConnectionState.DISCONNECTED
    
    print("✓ Connection state check works")
    
    # Test 4: Rate limiter
    limiter = manager.rate_limiters["ethereum"]
    assert limiter.rate == 100
    
    print("✓ Rate limiter configured")
    
    # Test 5: Reconnect strategy
    strategy = config.reconnect_strategy
    delay = strategy.get_delay(0)
    assert 0.5 <= delay <= 1.5  # With jitter
    
    print("✓ Reconnect strategy works")
    
    print("\nAll basic tests passed! ✅")
    

async def test_connection_pool():
    """Test connection pool functionality."""
    print("\nTesting ConnectionPool...")
    
    from monitoring.websocket_manager import ConnectionPool, Connection
    
    pool = ConnectionPool(max_connections_per_chain=3)
    
    # Add connections
    for i in range(3):
        conn = Connection("ethereum", f"wss://eth{i}.example.com")
        conn.state = ConnectionState.CONNECTED
        pool.add_connection(conn)
    
    assert pool.get_connection_count("ethereum") == 3
    print("✓ Connection pool manages connections")
    
    # Test LRU
    lru = pool.get_least_recently_used("ethereum")
    assert lru is not None
    
    print("✓ LRU tracking works")
    
    # Test stats
    stats = pool.get_stats()
    assert stats["total_connections"] == 3
    assert stats["chains"]["ethereum"] == 3
    
    print("✓ Pool statistics work")
    
    print("\nConnection pool tests passed! ✅")


async def test_blockchain_monitor():
    """Test BlockchainMonitor functionality."""
    print("\nTesting BlockchainMonitor...")
    
    from monitoring.blockchain_monitor import (
        BlockchainMonitor,
        MonitorConfig,
        TransactionFilter,
        AlertLevel
    )
    
    # Test configuration
    config = MonitorConfig(
        chains=["ethereum", "polygon"],
        block_confirmations=3,
        pattern_detection_enabled=True,
        filters={
            "min_value_eth": 0.1,
            "interesting_addresses": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
        }
    )
    
    monitor = BlockchainMonitor(config=config)
    
    assert len(monitor.chains) == 2
    assert monitor.pattern_detection_enabled is True
    
    print("✓ Monitor initialized correctly")
    
    # Test transaction filter
    filter = TransactionFilter(config.filters)
    
    tx_pass = {
        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "value": "0x1bc16d674ec80000",  # 2 ETH
        "input": "0xa9059cbb..."
    }
    
    tx_fail = {
        "to": "0xRandom",
        "value": "0x0",
        "input": "0x"
    }
    
    assert filter.should_process(tx_pass) is True
    assert filter.should_process(tx_fail) is False
    
    print("✓ Transaction filtering works")
    
    # Test alert levels
    from monitoring.blockchain_monitor import PatternAlertSystem
    alert_system = PatternAlertSystem()
    
    from core.pattern_capture import PatternType
    
    mev_pattern = {
        "type": PatternType.MEV_OPERATION,
        "metadata": {"mev_type": "sandwich", "victim_loss_usd": 10000}
    }
    
    level = alert_system.determine_level(mev_pattern)
    assert level == AlertLevel.CRITICAL
    
    print("✓ Alert level determination works")
    
    print("\nBlockchainMonitor tests passed! ✅")


async def main():
    """Run all tests."""
    print("=" * 50)
    print("Agentek Integration - Implementation Verification")
    print("=" * 50)
    
    await test_basic_functionality()
    await test_connection_pool()
    await test_blockchain_monitor()
    
    print("\n🎉 All tests passed! Implementation is working correctly.")
    

if __name__ == "__main__":
    asyncio.run(main())