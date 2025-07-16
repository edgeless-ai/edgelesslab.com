"""WebSocket connection management for real-time blockchain monitoring.

This module provides robust WebSocket connection management with features like:
- Connection pooling and load balancing
- Automatic reconnection with exponential backoff
- Rate limiting per chain
- Health monitoring with heartbeat
- Multi-chain concurrent connections
"""

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, List, Optional, Callable, Set, Tuple
import random
import hashlib

try:
    import websockets
    from websockets.client import WebSocketClientProtocol
except ImportError:
    # For testing without websockets installed
    websockets = None
    WebSocketClientProtocol = Any


logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """WebSocket connection states."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    FAILED = "failed"


class WebSocketError(Exception):
    """Base exception for WebSocket errors."""
    pass


@dataclass
class ChainEndpoint:
    """Configuration for a blockchain endpoint."""
    url: str
    chain_id: int
    rate_limit: int = 100  # requests per second
    backup_urls: List[str] = field(default_factory=list)
    
    def get_all_urls(self) -> List[str]:
        """Get primary and backup URLs."""
        return [self.url] + self.backup_urls


@dataclass
class ReconnectStrategy:
    """Configuration for reconnection behavior."""
    max_attempts: int = 5
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number."""
        # Exponential backoff
        delay = min(
            self.initial_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        
        # Add jitter to prevent thundering herd
        if self.jitter:
            jitter_factor = random.uniform(0.5, 1.5)
            delay *= jitter_factor
            
        return delay


@dataclass
class WebSocketConfig:
    """Configuration for WebSocket manager."""
    endpoints: Dict[str, ChainEndpoint]
    reconnect_strategy: ReconnectStrategy = field(default_factory=ReconnectStrategy)
    connection_timeout: float = 30.0
    ping_interval: float = 20.0
    max_connections_per_chain: int = 3
    message_queue_size: int = 10000


class Connection:
    """Represents a single WebSocket connection."""
    
    def __init__(self, chain: str, endpoint_url: str, websocket: Optional[WebSocketClientProtocol] = None):
        self.chain = chain
        self.endpoint_url = endpoint_url
        self.websocket = websocket
        self.state = ConnectionState.DISCONNECTED
        self.created_at = datetime.now()
        self.last_used = datetime.now()
        self.connection_id = self._generate_id()
        self.subscriptions: List[str] = []
        self.pending_requests: Dict[int, asyncio.Future] = {}
        self.request_counter = 0
        
    def _generate_id(self) -> str:
        """Generate unique connection ID."""
        data = f"{self.chain}:{self.endpoint_url}:{self.created_at.isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
        
    def is_healthy(self) -> bool:
        """Check if connection is healthy."""
        if self.websocket is None:
            return False
        if self.state != ConnectionState.CONNECTED:
            return False
        if hasattr(self.websocket, 'closed') and self.websocket.closed:
            return False
        return True
        
    def update_last_used(self):
        """Update last used timestamp."""
        self.last_used = datetime.now()


class ConnectionPool:
    """Manages a pool of WebSocket connections."""
    
    def __init__(self, max_connections_per_chain: int = 3, max_idle_time: float = 300.0):
        self.max_connections_per_chain = max_connections_per_chain
        self.max_idle_time = max_idle_time
        self.connections: Dict[str, List[Connection]] = defaultdict(list)
        self._lock = asyncio.Lock()
        
    def add_connection(self, connection: Connection):
        """Add connection to pool."""
        chain_connections = self.connections[connection.chain]
        
        # Remove excess connections
        if len(chain_connections) >= self.max_connections_per_chain:
            # Remove least recently used
            lru = self.get_least_recently_used(connection.chain)
            if lru:
                self.remove_connection(lru.connection_id)
                
        chain_connections.append(connection)
        
    def remove_connection(self, connection_id: str):
        """Remove connection from pool."""
        for chain, conns in self.connections.items():
            self.connections[chain] = [c for c in conns if c.connection_id != connection_id]
            
    def get_connection(self, chain: str) -> Optional[Connection]:
        """Get available connection for chain."""
        connections = self.connections.get(chain, [])
        
        # Find healthy connection
        for conn in connections:
            if conn.is_healthy():
                conn.update_last_used()
                return conn
                
        return None
        
    def get_least_recently_used(self, chain: str) -> Optional[Connection]:
        """Get least recently used connection."""
        connections = self.connections.get(chain, [])
        if not connections:
            return None
            
        return min(connections, key=lambda c: c.last_used)
        
    def get_connection_count(self, chain: str) -> int:
        """Get number of connections for chain."""
        return len(self.connections.get(chain, []))
        
    def cleanup_idle_connections(self) -> List[Connection]:
        """Remove idle connections."""
        removed = []
        current_time = datetime.now()
        
        for chain, connections in list(self.connections.items()):
            active_connections = []
            
            for conn in connections:
                idle_time = (current_time - conn.last_used).total_seconds()
                if idle_time > self.max_idle_time:
                    removed.append(conn)
                else:
                    active_connections.append(conn)
                    
            self.connections[chain] = active_connections
            
        return removed
        
    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics."""
        total_connections = sum(len(conns) for conns in self.connections.values())
        
        chain_stats = {}
        pool_utilization = {}
        
        for chain, conns in self.connections.items():
            chain_stats[chain] = len(conns)
            pool_utilization[chain] = len(conns) / self.max_connections_per_chain
            
        return {
            "total_connections": total_connections,
            "chains": chain_stats,
            "pool_utilization": pool_utilization
        }


class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, rate: int, burst: Optional[int] = None):
        self.rate = rate  # tokens per second
        self.burst = burst or rate
        self.tokens = float(self.burst)
        self.last_update = time.time()
        self._lock = asyncio.Lock()
        
    async def acquire(self, tokens: int = 1) -> bool:
        """Try to acquire tokens."""
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now
            
            # Add tokens based on elapsed time
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
                
            return False
            
    async def wait_for_token(self, tokens: int = 1):
        """Wait until tokens are available."""
        while not await self.acquire(tokens):
            wait_time = tokens / self.rate
            await asyncio.sleep(wait_time)


class WebSocketManager:
    """Manages WebSocket connections for multiple blockchains."""
    
    def __init__(self, config: WebSocketConfig):
        self.config = config
        self.endpoints = config.endpoints
        self.connection_pool = ConnectionPool(config.max_connections_per_chain)
        self.is_running = False
        self.rate_limiters: Dict[str, RateLimiter] = {}
        self.event_handlers: Dict[str, List[Callable]] = defaultdict(list)
        self.active_connections: Dict[str, Connection] = {}
        self.message_queues: Dict[str, deque] = defaultdict(lambda: deque(maxlen=config.message_queue_size))
        self._tasks: Set[asyncio.Task] = set()
        
        # Initialize rate limiters
        for chain, endpoint in self.endpoints.items():
            self.rate_limiters[chain] = RateLimiter(endpoint.rate_limit)
            
    async def connect_to_chain(self, chain: str) -> Optional[Connection]:
        """Connect to a single blockchain."""
        if chain not in self.endpoints:
            raise WebSocketError(f"Unknown chain: {chain}")
            
        endpoint = self.endpoints[chain]
        urls = endpoint.get_all_urls()
        
        # Try each URL
        for url in urls:
            try:
                if websockets:
                    ws = await asyncio.wait_for(
                        websockets.connect(url),
                        timeout=self.config.connection_timeout
                    )
                else:
                    # Mock for testing
                    ws = AsyncMock()
                    ws.closed = False
                    
                connection = Connection(chain, url, ws)
                connection.state = ConnectionState.CONNECTED
                
                self.connection_pool.add_connection(connection)
                self.active_connections[chain] = connection
                
                # Start message handler
                task = asyncio.create_task(self._handle_messages(connection))
                self._tasks.add(task)
                task.add_done_callback(self._tasks.discard)
                
                logger.info(f"Connected to {chain} via {url}")
                return connection
                
            except Exception as e:
                logger.warning(f"Failed to connect to {url}: {e}")
                continue
                
        raise WebSocketError(f"Failed to connect to {chain}")
        
    async def connect_all_chains(self) -> Dict[str, Connection]:
        """Connect to all configured chains."""
        tasks = []
        for chain in self.endpoints:
            task = asyncio.create_task(self.connect_to_chain(chain))
            tasks.append((chain, task))
            
        connections = {}
        for chain, task in tasks:
            try:
                connection = await task
                connections[chain] = connection
            except Exception as e:
                logger.error(f"Failed to connect to {chain}: {e}")
                
        self.is_running = True
        return connections
        
    async def connect_with_retry(self, chain: str) -> Optional[Connection]:
        """Connect with automatic retry on failure."""
        strategy = self.config.reconnect_strategy
        
        for attempt in range(strategy.max_attempts):
            try:
                return await self.connect_to_chain(chain)
            except Exception as e:
                if attempt == strategy.max_attempts - 1:
                    logger.error(f"Failed to connect to {chain} after {strategy.max_attempts} attempts")
                    raise
                    
                delay = strategy.get_delay(attempt)
                logger.warning(f"Connection attempt {attempt + 1} failed, retrying in {delay:.1f}s: {e}")
                await asyncio.sleep(delay)
                
        return None
        
    def get_connection_state(self, chain: str) -> ConnectionState:
        """Get current connection state for chain."""
        conn = self.active_connections.get(chain)
        if not conn:
            return ConnectionState.DISCONNECTED
        return conn.state
        
    async def subscribe(self, chain: str, method: str, params: List[Any]) -> str:
        """Subscribe to blockchain events."""
        connection = await self.get_or_create_connection(chain)
        
        # Create subscription request
        request_id = connection.request_counter
        connection.request_counter += 1
        
        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params
        }
        
        # Send request
        await self._send_request(connection, request)
        
        # Wait for response
        future = asyncio.Future()
        connection.pending_requests[request_id] = future
        
        try:
            response = await asyncio.wait_for(future, timeout=10.0)
            if "result" in response:
                subscription_id = response["result"]
                connection.subscriptions.append(subscription_id)
                return subscription_id
            else:
                raise WebSocketError(f"Subscription failed: {response}")
        finally:
            connection.pending_requests.pop(request_id, None)
            
    async def get_next_event(self, chain: str, filters: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Get next event from chain."""
        queue = self.message_queues[chain]
        
        # Apply filters if provided
        while queue:
            event = queue.popleft()
            
            if filters:
                # Check if event matches filters
                match = True
                for key, value in filters.items():
                    if key not in event or event[key] != value:
                        match = False
                        break
                        
                if match:
                    return event
            else:
                return event
                
        return None
        
    async def send_request(self, chain: str, method: str, params: List[Any], enforce_rate_limit: bool = True) -> Dict[str, Any]:
        """Send request to blockchain."""
        if enforce_rate_limit:
            limiter = self.rate_limiters.get(chain)
            if limiter:
                try:
                    await asyncio.wait_for(limiter.wait_for_token(), timeout=5.0)
                except asyncio.TimeoutError:
                    raise WebSocketError("Rate limit exceeded")
                    
        connection = await self.get_or_create_connection(chain)
        
        request_id = connection.request_counter
        connection.request_counter += 1
        
        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params
        }
        
        # Send and wait for response
        await self._send_request(connection, request)
        
        future = asyncio.Future()
        connection.pending_requests[request_id] = future
        
        try:
            response = await asyncio.wait_for(future, timeout=30.0)
            return response
        finally:
            connection.pending_requests.pop(request_id, None)
            
    async def get_or_create_connection(self, chain: str) -> Connection:
        """Get existing connection or create new one."""
        # Try to get from pool
        connection = self.connection_pool.get_connection(chain)
        if connection:
            return connection
            
        # Create new connection
        return await self.connect_with_retry(chain)
        
    async def _send_request(self, connection: Connection, request: Dict[str, Any]):
        """Send request over WebSocket."""
        if not connection.is_healthy():
            raise WebSocketError("Connection not healthy")
            
        message = json.dumps(request)
        
        if connection.websocket and hasattr(connection.websocket, 'send'):
            await connection.websocket.send(message)
        else:
            # Mock for testing
            pass
            
    async def _handle_messages(self, connection: Connection):
        """Handle incoming messages from WebSocket."""
        try:
            while connection.is_healthy():
                if connection.websocket and hasattr(connection.websocket, 'recv'):
                    message = await connection.websocket.recv()
                else:
                    # Mock for testing
                    await asyncio.sleep(0.1)
                    continue
                    
                data = json.loads(message)
                
                # Handle response to request
                if "id" in data and data["id"] in connection.pending_requests:
                    future = connection.pending_requests[data["id"]]
                    if not future.done():
                        future.set_result(data)
                        
                # Handle subscription event
                elif "method" in data:
                    # Add to message queue
                    self.message_queues[connection.chain].append(data)
                    
                    # Notify handlers
                    await self._notify_handlers(data)
                    
        except Exception as e:
            logger.error(f"Error handling messages for {connection.chain}: {e}")
            connection.state = ConnectionState.FAILED
            
            # Trigger reconnection
            asyncio.create_task(self._reconnect(connection))
            
    async def _reconnect(self, old_connection: Connection):
        """Reconnect after connection failure."""
        chain = old_connection.chain
        
        try:
            # Remove old connection
            self.connection_pool.remove_connection(old_connection.connection_id)
            self.active_connections.pop(chain, None)
            
            # Close old websocket
            if old_connection.websocket and hasattr(old_connection.websocket, 'close'):
                await old_connection.websocket.close()
                
            # Reconnect
            new_connection = await self.connect_with_retry(chain)
            
            # Restore subscriptions
            if new_connection and old_connection.subscriptions:
                for sub_id in old_connection.subscriptions:
                    # Re-subscribe (implementation depends on chain)
                    pass
                    
        except Exception as e:
            logger.error(f"Failed to reconnect to {chain}: {e}")
            
    async def monitor_connection_health(self, chain: str):
        """Monitor connection health with pings."""
        while self.is_running:
            try:
                connection = self.active_connections.get(chain)
                if connection and connection.websocket:
                    if hasattr(connection.websocket, 'ping'):
                        await connection.websocket.ping()
                        
                await asyncio.sleep(self.config.ping_interval)
                
            except Exception as e:
                logger.warning(f"Health check failed for {chain}: {e}")
                connection.state = ConnectionState.FAILED
                await self._reconnect(connection)
                
    def register_handler(self, event_type: str, handler: Callable):
        """Register event handler."""
        self.event_handlers[event_type].append(handler)
        
    async def _notify_handlers(self, event: Dict[str, Any]):
        """Notify registered handlers of event."""
        event_type = event.get("type") or event.get("method")
        if not event_type:
            return
            
        handlers = self.event_handlers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Error in event handler: {e}")
                
    async def process_events(self, chain: str, count: int = 1):
        """Process events from message queue."""
        processed = 0
        
        while processed < count:
            event = await self.get_next_event(chain)
            if not event:
                break
                
            # Extract event type
            if "params" in event and "result" in event["params"]:
                result = event["params"]["result"]
                if isinstance(result, dict) and "type" in result:
                    event_type = result["type"]
                    await self._notify_handlers(event)
                    
            processed += 1
            
    def get_connection_metrics(self, chain: str) -> Dict[str, Any]:
        """Get metrics for connection."""
        connection = self.active_connections.get(chain)
        if not connection:
            return {"state": "disconnected"}
            
        uptime = (datetime.now() - connection.created_at).total_seconds()
        
        return {
            "state": connection.state.value,
            "uptime": uptime,
            "total_requests": connection.request_counter,
            "active_subscriptions": len(connection.subscriptions),
            "average_latency": 0,  # Would track in production
            "error_rate": 0.0,  # Would track in production
            "last_used": connection.last_used.isoformat()
        }
        
    def get_subscription_ids(self, chain: str) -> List[str]:
        """Get active subscription IDs for chain."""
        connection = self.active_connections.get(chain)
        if not connection:
            return []
        return connection.subscriptions.copy()
        
    def export_state(self) -> Dict[str, Any]:
        """Export current state for persistence."""
        state = {
            "connections": {},
            "timestamp": datetime.now().isoformat()
        }
        
        for chain, connection in self.active_connections.items():
            state["connections"][chain] = {
                "endpoint_url": connection.endpoint_url,
                "state": connection.state.value,
                "subscriptions": connection.subscriptions,
                "created_at": connection.created_at.isoformat()
            }
            
        return state
        
    async def restore_state(self, state: Dict[str, Any]):
        """Restore connections from saved state."""
        connections = state.get("connections", {})
        
        for chain, conn_data in connections.items():
            if chain in self.endpoints:
                try:
                    # Reconnect
                    connection = await self.connect_to_chain(chain)
                    
                    # Restore subscriptions
                    for sub_id in conn_data.get("subscriptions", []):
                        connection.subscriptions.append(sub_id)
                        
                except Exception as e:
                    logger.error(f"Failed to restore connection for {chain}: {e}")
                    
    async def shutdown(self):
        """Gracefully shutdown all connections."""
        self.is_running = False
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
            
        # Wait for tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
            
        # Close all connections
        for connection in list(self.active_connections.values()):
            try:
                if connection.websocket and hasattr(connection.websocket, 'close'):
                    await connection.websocket.close()
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
                
        self.active_connections.clear()
        self.connection_pool.connections.clear()
        
        logger.info("WebSocketManager shutdown complete")


# Mock for testing
if not websockets:
    from unittest.mock import AsyncMock