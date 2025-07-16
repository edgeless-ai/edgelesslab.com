"""Unit tests for WebSocketManager.

Following TDD principles - tests written before implementation.
These tests define the expected behavior of the WebSocket management system.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
try:
    from unittest.mock import AsyncMock
except ImportError:
    # For Python < 3.8
    class AsyncMock(Mock):
        async def __call__(self, *args, **kwargs):
            return super().__call__(*args, **kwargs)
from datetime import datetime, timedelta
import json
from typing import Dict, Any, List

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from monitoring.websocket_manager import (
    WebSocketManager,
    WebSocketConfig,
    ConnectionPool,
    ConnectionState,
    WebSocketError,
    ReconnectStrategy,
    ChainEndpoint,
    Connection
)


class TestWebSocketManager:
    """Test WebSocket connection management functionality."""
    
    @pytest.fixture
    def ws_config(self):
        """WebSocket configuration for testing."""
        return WebSocketConfig(
            endpoints={
                "ethereum": ChainEndpoint(
                    url="wss://eth-mainnet.example.com",
                    chain_id=1,
                    rate_limit=100  # requests per second
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
                max_delay=60.0,
                exponential_base=2.0
            ),
            connection_timeout=30.0,
            ping_interval=20.0,
            max_connections_per_chain=3
        )
    
    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket connection."""
        ws = AsyncMock()
        ws.send = AsyncMock()
        ws.recv = AsyncMock()
        ws.close = AsyncMock()
        ws.ping = AsyncMock()
        ws.closed = False
        return ws
    
    def test_websocket_manager_initialization(self, ws_config):
        """Test 1: WebSocketManager initializes with configuration."""
        manager = WebSocketManager(config=ws_config)
        
        assert manager.config == ws_config
        assert len(manager.endpoints) == 2
        assert "ethereum" in manager.endpoints
        assert "polygon" in manager.endpoints
        assert manager.connection_pool is not None
        assert manager.is_running is False
    
    @pytest.mark.asyncio
    async def test_single_chain_connection(self, ws_config, mock_websocket):
        """Test 2: Connect to a single blockchain WebSocket."""
        manager = WebSocketManager(config=ws_config)
        
        with patch('websockets.connect', return_value=mock_websocket):
            connection = await manager.connect_to_chain("ethereum")
            
            assert connection is not None
            assert connection.state == ConnectionState.CONNECTED
            assert connection.chain == "ethereum"
            assert connection.websocket == mock_websocket
            assert connection.created_at <= datetime.now()
    
    @pytest.mark.asyncio
    async def test_multi_chain_concurrent_connections(self, ws_config, mock_websocket):
        """Test 3: Connect to multiple chains concurrently."""
        manager = WebSocketManager(config=ws_config)
        
        # Create different mock websockets for each chain
        mock_eth_ws = AsyncMock()
        mock_poly_ws = AsyncMock()
        
        async def mock_connect(url, **kwargs):
            if "eth" in url:
                return mock_eth_ws
            elif "polygon" in url:
                return mock_poly_ws
            return mock_websocket
        
        with patch('websockets.connect', side_effect=mock_connect):
            connections = await manager.connect_all_chains()
            
            assert len(connections) == 2
            assert "ethereum" in connections
            assert "polygon" in connections
            assert connections["ethereum"].websocket == mock_eth_ws
            assert connections["polygon"].websocket == mock_poly_ws
    
    @pytest.mark.asyncio
    async def test_connection_failure_handling(self, ws_config):
        """Test 4: Handle connection failures gracefully."""
        manager = WebSocketManager(config=ws_config)
        
        with patch('websockets.connect', side_effect=ConnectionError("Failed to connect")):
            with pytest.raises(WebSocketError) as exc_info:
                await manager.connect_to_chain("ethereum")
            
            assert "Failed to connect to ethereum" in str(exc_info.value)
            assert manager.get_connection_state("ethereum") == ConnectionState.DISCONNECTED
    
    @pytest.mark.asyncio
    async def test_automatic_reconnection_with_backoff(self, ws_config):
        """Test 5: Reconnect with exponential backoff on disconnection."""
        manager = WebSocketManager(config=ws_config)
        
        # Track reconnection attempts
        reconnect_attempts = []
        reconnect_delays = []
        
        async def mock_connect_with_failures(url, **kwargs):
            attempt = len(reconnect_attempts)
            reconnect_attempts.append(datetime.now())
            
            if attempt < 3:  # Fail first 3 attempts
                raise ConnectionError("Connection failed")
            
            # Success on 4th attempt
            ws = AsyncMock()
            ws.closed = False
            return ws
        
        with patch('websockets.connect', side_effect=mock_connect_with_failures):
            with patch('asyncio.sleep', side_effect=lambda d: reconnect_delays.append(d)):
                connection = await manager.connect_with_retry("ethereum")
                
                assert connection is not None
                assert len(reconnect_attempts) == 4  # 3 failures + 1 success
                assert reconnect_delays == [1.0, 2.0, 4.0]  # Exponential backoff
    
    @pytest.mark.asyncio
    async def test_event_subscription_and_filtering(self, ws_config, mock_websocket):
        """Test 6: Subscribe to and filter blockchain events."""
        manager = WebSocketManager(config=ws_config)
        
        # Mock subscription response
        mock_websocket.recv.side_effect = [
            json.dumps({"id": 1, "result": "0x123"}),  # Subscription ID
            json.dumps({  # New block event
                "method": "eth_subscription",
                "params": {
                    "subscription": "0x123",
                    "result": {
                        "number": "0x1234567",
                        "hash": "0xabc...",
                        "transactions": ["0xtx1...", "0xtx2..."]
                    }
                }
            })
        ]
        
        with patch('websockets.connect', return_value=mock_websocket):
            await manager.connect_to_chain("ethereum")
            
            # Subscribe to new blocks
            subscription_id = await manager.subscribe(
                chain="ethereum",
                method="eth_subscribe",
                params=["newHeads"]
            )
            
            assert subscription_id == "0x123"
            
            # Receive filtered event
            event = await manager.get_next_event(
                chain="ethereum",
                filters={"method": "eth_subscription"}
            )
            
            assert event is not None
            assert event["params"]["subscription"] == "0x123"
            assert "result" in event["params"]
    
    @pytest.mark.asyncio
    async def test_rate_limiting_per_chain(self, ws_config):
        """Test 7: Enforce rate limiting per chain."""
        manager = WebSocketManager(config=ws_config)
        
        with patch('websockets.connect', return_value=AsyncMock()):
            await manager.connect_to_chain("ethereum")
            
            # Send requests up to rate limit
            start_time = datetime.now()
            requests_sent = 0
            
            # Try to send 150 requests (exceeds 100/sec limit)
            for i in range(150):
                try:
                    await manager.send_request(
                        chain="ethereum",
                        method="eth_getBlockByNumber",
                        params=["latest", True],
                        enforce_rate_limit=True
                    )
                    requests_sent += 1
                except WebSocketError as e:
                    if "Rate limit exceeded" in str(e):
                        break
            
            elapsed = (datetime.now() - start_time).total_seconds()
            
            # Should send ~100 requests in 1 second
            assert requests_sent <= 105  # Allow small buffer
            assert elapsed >= 0.9  # Should take at least ~1 second
    
    @pytest.mark.asyncio
    async def test_connection_pool_management(self, ws_config):
        """Test 8: Manage connection pool with limits."""
        manager = WebSocketManager(config=ws_config)
        
        mock_connections = [AsyncMock() for _ in range(5)]
        connection_count = 0
        
        async def mock_connect(url, **kwargs):
            nonlocal connection_count
            if connection_count >= 3:  # Max connections per chain
                raise WebSocketError("Connection limit reached")
            ws = mock_connections[connection_count]
            connection_count += 1
            return ws
        
        with patch('websockets.connect', side_effect=mock_connect):
            # Create connections up to limit
            conns = []
            for i in range(3):
                conn = await manager.get_or_create_connection("ethereum")
                conns.append(conn)
            
            assert len(conns) == 3
            
            # Try to create one more - should reuse existing
            conn4 = await manager.get_or_create_connection("ethereum")
            assert conn4 in conns  # Reused existing connection
    
    @pytest.mark.asyncio
    async def test_heartbeat_ping_monitoring(self, ws_config, mock_websocket):
        """Test 9: Monitor connection health with periodic pings."""
        manager = WebSocketManager(config=ws_config)
        
        ping_count = 0
        
        async def mock_ping():
            nonlocal ping_count
            ping_count += 1
            if ping_count > 3:
                raise ConnectionError("Ping timeout")
        
        mock_websocket.ping = mock_ping
        
        with patch('websockets.connect', return_value=mock_websocket):
            connection = await manager.connect_to_chain("ethereum")
            
            # Start heartbeat monitoring
            monitor_task = asyncio.create_task(
                manager.monitor_connection_health("ethereum")
            )
            
            # Let it run for a bit
            await asyncio.sleep(0.1)
            
            # Should detect failed ping and mark as unhealthy
            assert ping_count >= 1
            
            # Cancel monitoring
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
    
    @pytest.mark.asyncio
    async def test_graceful_shutdown(self, ws_config, mock_websocket):
        """Test 10: Gracefully shutdown all connections."""
        manager = WebSocketManager(config=ws_config)
        
        # Track close calls
        close_calls = []
        
        async def mock_close():
            close_calls.append(datetime.now())
        
        mock_websocket.close = mock_close
        
        with patch('websockets.connect', return_value=mock_websocket):
            # Connect to multiple chains
            await manager.connect_all_chains()
            
            # Verify connections active
            assert manager.is_running is True
            assert len(manager.active_connections) == 2
            
            # Shutdown
            await manager.shutdown()
            
            # Verify all closed
            assert len(close_calls) == 2
            assert manager.is_running is False
            assert len(manager.active_connections) == 0
    
    @pytest.mark.asyncio
    async def test_event_routing_to_handlers(self, ws_config, mock_websocket):
        """Test 11: Route events to registered handlers."""
        manager = WebSocketManager(config=ws_config)
        
        # Track handled events
        handled_blocks = []
        handled_txs = []
        
        async def block_handler(event):
            handled_blocks.append(event)
        
        async def tx_handler(event):
            handled_txs.append(event)
        
        # Register handlers
        manager.register_handler("newHeads", block_handler)
        manager.register_handler("pendingTransactions", tx_handler)
        
        # Mock incoming events
        mock_websocket.recv.side_effect = [
            json.dumps({
                "method": "eth_subscription",
                "params": {
                    "subscription": "0x1",
                    "result": {"number": "0x123", "type": "newHeads"}
                }
            }),
            json.dumps({
                "method": "eth_subscription", 
                "params": {
                    "subscription": "0x2",
                    "result": {"hash": "0xabc", "type": "pendingTransactions"}
                }
            })
        ]
        
        with patch('websockets.connect', return_value=mock_websocket):
            await manager.connect_to_chain("ethereum")
            
            # Process events
            await manager.process_events("ethereum", count=2)
            
            assert len(handled_blocks) == 1
            assert len(handled_txs) == 1
            assert handled_blocks[0]["params"]["result"]["number"] == "0x123"
            assert handled_txs[0]["params"]["result"]["hash"] == "0xabc"
    
    @pytest.mark.asyncio
    async def test_connection_metrics_tracking(self, ws_config, mock_websocket):
        """Test 12: Track connection metrics and statistics."""
        manager = WebSocketManager(config=ws_config)
        
        with patch('websockets.connect', return_value=mock_websocket):
            await manager.connect_to_chain("ethereum")
            
            # Send some requests
            for i in range(10):
                await manager.send_request(
                    chain="ethereum",
                    method="eth_blockNumber",
                    params=[]
                )
            
            # Get metrics
            metrics = manager.get_connection_metrics("ethereum")
            
            assert metrics["total_requests"] == 10
            assert metrics["connection_uptime"] > 0
            assert metrics["average_latency"] >= 0
            assert metrics["error_rate"] == 0.0
            assert metrics["state"] == "connected"
    
    @pytest.mark.asyncio
    async def test_multi_endpoint_failover(self, ws_config):
        """Test 13: Failover to backup endpoints on primary failure."""
        # Add backup endpoints
        ws_config.endpoints["ethereum"].backup_urls = [
            "wss://eth-backup1.example.com",
            "wss://eth-backup2.example.com"
        ]
        
        manager = WebSocketManager(config=ws_config)
        
        attempt_count = 0
        
        async def mock_connect_with_failover(url, **kwargs):
            nonlocal attempt_count
            attempt_count += 1
            
            if "mainnet" in url:  # Primary fails
                raise ConnectionError("Primary down")
            elif "backup1" in url:  # First backup fails
                raise ConnectionError("Backup1 down")
            elif "backup2" in url:  # Second backup succeeds
                ws = AsyncMock()
                ws.closed = False
                return ws
            
            raise ConnectionError("Unknown endpoint")
        
        with patch('websockets.connect', side_effect=mock_connect_with_failover):
            connection = await manager.connect_to_chain("ethereum")
            
            assert connection is not None
            assert attempt_count == 3  # Primary + 2 backups
            assert connection.endpoint_url == "wss://eth-backup2.example.com"
    
    @pytest.mark.asyncio
    async def test_connection_state_persistence(self, ws_config):
        """Test 14: Persist and restore connection state."""
        manager = WebSocketManager(config=ws_config)
        
        with patch('websockets.connect', return_value=AsyncMock()):
            # Establish connections and subscriptions
            await manager.connect_to_chain("ethereum")
            sub_id = await manager.subscribe(
                chain="ethereum",
                method="eth_subscribe",
                params=["newHeads"]
            )
            
            # Save state
            state = manager.export_state()
            
            assert "ethereum" in state["connections"]
            assert state["connections"]["ethereum"]["subscriptions"] == [sub_id]
            assert state["connections"]["ethereum"]["state"] == "connected"
            
            # Create new manager and restore state
            new_manager = WebSocketManager(config=ws_config)
            await new_manager.restore_state(state)
            
            # Verify restoration
            assert new_manager.get_subscription_ids("ethereum") == [sub_id]
            assert new_manager.get_connection_state("ethereum") == ConnectionState.CONNECTED
    
    @pytest.mark.asyncio
    async def test_concurrent_request_handling(self, ws_config, mock_websocket):
        """Test 15: Handle concurrent requests without blocking."""
        manager = WebSocketManager(config=ws_config)
        
        # Mock responses with delays
        response_delays = [0.1, 0.05, 0.15, 0.02, 0.08]
        responses = []
        
        async def mock_recv():
            if responses:
                delay, response = responses.pop(0)
                await asyncio.sleep(delay)
                return json.dumps(response)
            return json.dumps({"result": "default"})
        
        mock_websocket.recv = mock_recv
        
        with patch('websockets.connect', return_value=mock_websocket):
            await manager.connect_to_chain("ethereum")
            
            # Prepare responses
            for i, delay in enumerate(response_delays):
                responses.append((delay, {"id": i, "result": f"response_{i}"}))
            
            # Send concurrent requests
            start_time = datetime.now()
            tasks = []
            
            for i in range(5):
                task = manager.send_request(
                    chain="ethereum",
                    method="eth_call",
                    params=[{"data": f"0x{i}"}]
                )
                tasks.append(task)
            
            # Wait for all responses
            results = await asyncio.gather(*tasks)
            elapsed = (datetime.now() - start_time).total_seconds()
            
            # Should complete in roughly the max delay time, not sum
            assert elapsed < sum(response_delays) * 0.5  # Much less than sequential
            assert len(results) == 5
            assert all("result" in r for r in results)


class TestConnectionPool:
    """Test connection pooling functionality."""
    
    @pytest.mark.asyncio
    async def test_connection_pool_initialization(self):
        """Test 16: Initialize connection pool with limits."""
        pool = ConnectionPool(
            max_connections_per_chain=5,
            max_idle_time=300.0
        )
        
        assert pool.max_connections_per_chain == 5
        assert pool.max_idle_time == 300.0
        assert len(pool.connections) == 0
    
    @pytest.mark.asyncio
    async def test_connection_lifecycle_in_pool(self):
        """Test 17: Manage connection lifecycle in pool."""
        pool = ConnectionPool(max_connections_per_chain=3)
        
        # Add connections
        for i in range(3):
            conn = Mock()
            conn.chain = "ethereum"
            conn.connection_id = f"conn_{i}"
            conn.last_used = datetime.now()
            pool.add_connection(conn)
        
        assert pool.get_connection_count("ethereum") == 3
        
        # Get least recently used
        lru_conn = pool.get_least_recently_used("ethereum")
        assert lru_conn.connection_id == "conn_0"
        
        # Remove connection
        pool.remove_connection("conn_0")
        assert pool.get_connection_count("ethereum") == 2
    
    @pytest.mark.asyncio  
    async def test_idle_connection_cleanup(self):
        """Test 18: Clean up idle connections automatically."""
        pool = ConnectionPool(
            max_connections_per_chain=5,
            max_idle_time=1.0  # 1 second for testing
        )
        
        # Add connections with different idle times
        old_conn = Mock()
        old_conn.chain = "ethereum"
        old_conn.last_used = datetime.now() - timedelta(seconds=2)
        old_conn.connection_id = "old"
        
        new_conn = Mock()
        new_conn.chain = "ethereum"
        new_conn.last_used = datetime.now()
        new_conn.connection_id = "new"
        
        pool.add_connection(old_conn)
        pool.add_connection(new_conn)
        
        # Clean up idle connections
        removed = pool.cleanup_idle_connections()
        
        assert len(removed) == 1
        assert removed[0].connection_id == "old"
        assert pool.get_connection_count("ethereum") == 1
    
    @pytest.mark.asyncio
    async def test_connection_pool_stats(self):
        """Test 19: Track pool statistics."""
        pool = ConnectionPool(max_connections_per_chain=5)
        
        # Add various connections
        chains = ["ethereum", "polygon", "ethereum", "arbitrum"]
        for i, chain in enumerate(chains):
            conn = Mock()
            conn.chain = chain
            conn.connection_id = f"{chain}_{i}"
            pool.add_connection(conn)
        
        stats = pool.get_stats()
        
        assert stats["total_connections"] == 4
        assert stats["chains"]["ethereum"] == 2
        assert stats["chains"]["polygon"] == 1
        assert stats["chains"]["arbitrum"] == 1
        assert stats["pool_utilization"]["ethereum"] == 0.4  # 2/5


class TestReconnectStrategy:
    """Test reconnection strategy functionality."""
    
    def test_reconnect_strategy_configuration(self):
        """Test 20: Configure reconnection strategy."""
        strategy = ReconnectStrategy(
            max_attempts=10,
            initial_delay=0.5,
            max_delay=120.0,
            exponential_base=2.0,
            jitter=True
        )
        
        assert strategy.max_attempts == 10
        assert strategy.initial_delay == 0.5
        assert strategy.max_delay == 120.0
        assert strategy.exponential_base == 2.0
        assert strategy.jitter is True
    
    def test_exponential_backoff_calculation(self):
        """Test 21: Calculate exponential backoff delays."""
        strategy = ReconnectStrategy(
            initial_delay=1.0,
            max_delay=60.0,
            exponential_base=2.0,
            jitter=False
        )
        
        delays = []
        for attempt in range(6):
            delay = strategy.get_delay(attempt)
            delays.append(delay)
        
        assert delays == [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]
        
        # Test max delay cap
        delay_10 = strategy.get_delay(10)
        assert delay_10 == 60.0  # Capped at max_delay
    
    def test_backoff_with_jitter(self):
        """Test 22: Add jitter to prevent thundering herd."""
        strategy = ReconnectStrategy(
            initial_delay=1.0,
            exponential_base=2.0,
            jitter=True
        )
        
        # Get multiple delays for same attempt
        delays = [strategy.get_delay(3) for _ in range(10)]
        
        # All should be different due to jitter
        assert len(set(delays)) > 1
        
        # All should be within expected range (8 ± jitter)
        base_delay = 8.0  # 1 * 2^3
        assert all(base_delay * 0.5 <= d <= base_delay * 1.5 for d in delays)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])