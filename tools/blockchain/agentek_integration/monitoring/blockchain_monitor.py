"""Real-time blockchain monitoring with pattern detection and alerts.

This module provides comprehensive blockchain monitoring capabilities:
- Real-time block and transaction monitoring
- Pattern detection from live data
- Mempool analysis for MEV detection
- Chain reorganization handling
- Alert system for significant events
"""

import asyncio
import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, List, Optional, Callable, Set, Tuple
import statistics

from .websocket_manager import WebSocketManager

# Handle both relative and absolute imports
try:
    from ..core.pattern_capture import PatternType, PatternMetadata, PatternCapture, CaptureConfig
    from ..core.blockchain_knowledge_service import BlockchainKnowledgeService
except ImportError:
    from core.pattern_capture import PatternType, PatternMetadata, PatternCapture, CaptureConfig
    from core.blockchain_knowledge_service import BlockchainKnowledgeService

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    HIGH = "high"
    CRITICAL = "critical"


class MonitoringError(Exception):
    """Exception raised by monitoring operations."""
    pass


@dataclass
class MonitorConfig:
    """Configuration for blockchain monitoring."""
    chains: List[str]
    block_confirmations: int = 3
    pattern_detection_enabled: bool = True
    mempool_monitoring: bool = True
    reorg_detection: bool = True
    alert_config: Dict[str, Any] = field(default_factory=lambda: {
        "email_enabled": False,
        "webhook_url": None,
        "alert_cooldown": 300  # 5 minutes
    })
    filters: Dict[str, Any] = field(default_factory=lambda: {
        "min_value_eth": 0.1,
        "interesting_addresses": [],
        "pattern_types": []
    })
    max_block_history: int = 1000
    mempool_cache_size: int = 10000


@dataclass
class PatternAlert:
    """Alert for detected patterns."""
    pattern_type: PatternType
    level: AlertLevel
    message: str
    metadata: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    chain: Optional[str] = None
    block_number: Optional[int] = None
    transaction_hash: Optional[str] = None


class PatternAlertSystem:
    """System for managing pattern alerts."""
    
    def __init__(self, cooldown_seconds: int = 300):
        self.cooldown_seconds = cooldown_seconds
        self._alert_history: Dict[str, datetime] = {}
        self.on_alert: Optional[Callable] = None
        
    def determine_level(self, pattern: Dict[str, Any]) -> AlertLevel:
        """Determine alert level based on pattern characteristics."""
        pattern_type = pattern.get("type", PatternType.UNKNOWN)
        metadata = pattern.get("metadata", {})
        
        # Critical alerts
        if pattern_type == PatternType.MEV_OPERATION:
            if metadata.get("mev_type") == "sandwich":
                return AlertLevel.CRITICAL
            return AlertLevel.HIGH
            
        # High alerts
        if pattern_type == PatternType.ARBITRAGE:
            profit = metadata.get("profit_usd", 0)
            if profit > 1000:
                return AlertLevel.HIGH
            return AlertLevel.WARNING
            
        # Warning alerts
        if pattern_type == PatternType.FAILED_TRANSACTION:
            return AlertLevel.WARNING
            
        # Info alerts
        return AlertLevel.INFO
        
    async def create_alert(self, pattern: Dict[str, Any]) -> Optional["PatternAlert"]:
        """Create alert if not in cooldown period."""
        # Generate alert key
        pattern_type = pattern.get("type", PatternType.UNKNOWN)
        key_parts = [str(pattern_type.value)]
        
        metadata = pattern.get("metadata", {})
        if "protocols" in metadata:
            key_parts.extend(sorted(metadata["protocols"]))
            
        alert_key = ":".join(key_parts)
        
        # Check cooldown
        if alert_key in self._alert_history:
            last_alert = self._alert_history[alert_key]
            if (datetime.now() - last_alert).total_seconds() < self.cooldown_seconds:
                return None
                
        # Create alert
        level = self.determine_level(pattern)
        message = self._generate_message(pattern)
        
        alert = PatternAlert(
            pattern_type=pattern_type,
            level=level,
            message=message,
            metadata=metadata
        )
        
        # Update history
        self._alert_history[alert_key] = datetime.now()
        
        return alert
        
    def _generate_message(self, pattern: Dict[str, Any]) -> str:
        """Generate human-readable alert message."""
        pattern_type = pattern.get("type", PatternType.UNKNOWN)
        metadata = pattern.get("metadata", {})
        
        if pattern_type == PatternType.MEV_OPERATION:
            mev_type = metadata.get("mev_type", "unknown")
            return f"MEV {mev_type} detected with victim loss: ${metadata.get('victim_loss_usd', 0):,.2f}"
            
        elif pattern_type == PatternType.ARBITRAGE:
            return f"Arbitrage opportunity detected: ${metadata.get('profit_usd', 0):,.2f} profit"
            
        else:
            return f"{pattern_type.value} pattern detected"


class TransactionFilter:
    """Filter transactions based on configured criteria."""
    
    def __init__(self, filter_config: Dict[str, Any]):
        self.min_value_wei = int(filter_config.get("min_value_eth", 0) * 10**18)
        self.interesting_addresses = set(
            addr.lower() for addr in filter_config.get("interesting_addresses", [])
        )
        self.pattern_types = filter_config.get("pattern_types", [])
        
    def should_process(self, transaction: Dict[str, Any]) -> bool:
        """Check if transaction meets filter criteria."""
        # Check value threshold
        value = int(transaction.get("value", "0"), 16)
        if value < self.min_value_wei:
            # Check if it might be a token transfer
            input_data = transaction.get("input", "0x")
            if len(input_data) < 10:  # Not a contract call
                return False
                
        # Check interesting addresses
        if self.interesting_addresses:
            to_addr = transaction.get("to", "").lower()
            from_addr = transaction.get("from", "").lower()
            
            if to_addr in self.interesting_addresses or from_addr in self.interesting_addresses:
                return True
                
            # If no match and we have filters, skip
            if value < self.min_value_wei:
                return False
                
        return True


class BlockProcessor:
    """Process blocks and extract relevant data."""
    
    def __init__(self, confirmations_required: int = 3):
        self.confirmations_required = confirmations_required
        self.block_cache: Dict[str, Dict[int, Dict[str, Any]]] = defaultdict(dict)
        self.finalized_blocks: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
    def validate_block(self, block: Dict[str, Any]) -> bool:
        """Validate block structure."""
        required_fields = ["number", "hash", "timestamp"]
        
        if not all(field in block for field in required_fields):
            return False
            
        # Validate number format
        try:
            int(block["number"], 16)
            return True
        except (ValueError, TypeError):
            return False
            
    def extract_transactions(self, block: Dict[str, Any]) -> List[Any]:
        """Extract transactions from block."""
        transactions = block.get("transactions", [])
        
        # Return as-is whether full tx objects or just hashes
        return transactions
        
    def add_block(self, chain: str, block: Dict[str, Any]):
        """Add block to cache."""
        block_number = int(block["number"], 16)
        self.block_cache[chain][block_number] = block
        
        # Limit cache size
        if len(self.block_cache[chain]) > 1000:
            # Remove oldest blocks
            min_block = min(self.block_cache[chain].keys())
            del self.block_cache[chain][min_block]
            
    def get_finalized_blocks(self, chain: str, current_height: int) -> List[Dict[str, Any]]:
        """Get blocks that have reached finality."""
        finalized = []
        finalized_height = current_height - self.confirmations_required
        
        for block_num, block in list(self.block_cache[chain].items()):
            if block_num <= finalized_height:
                finalized.append(block)
                # Move to finalized list
                self.finalized_blocks[chain].append(block)
                del self.block_cache[chain][block_num]
                
        return finalized
        
    def is_finalized(self, chain: str, block_number: int) -> bool:
        """Check if block is finalized."""
        # Get latest block number from cache
        if not self.block_cache[chain]:
            return False
            
        latest = max(self.block_cache[chain].keys())
        return block_number <= latest - self.confirmations_required


class MempoolWatcher:
    """Monitor mempool for pending transactions."""
    
    def __init__(self, cache_size: int = 10000):
        self.pending_transactions: deque = deque(maxlen=cache_size)
        self.transaction_times: Dict[str, datetime] = {}
        self.mev_candidates: List[Dict[str, Any]] = []
        self.on_mev_candidate: Optional[Callable] = None
        
    async def analyze_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze pending transaction for patterns."""
        analysis = {
            "hash": transaction.get("hash"),
            "is_mev_candidate": False,
            "mev_score": 0.0,
            "flags": [],
            "likely_to_fail": False
        }
        
        # Gas analysis
        gas_price = int(transaction.get("gasPrice", "0"), 16)
        priority_fee = int(transaction.get("maxPriorityFeePerGas", "0"), 16) 
        
        if gas_price > 5 * 10**10:  # > 50 Gwei
            analysis["flags"].append("high_gas")
            analysis["mev_score"] += 0.3
            
        if gas_price < 1 * 10**9:  # < 1 Gwei
            analysis["flags"].append("low_gas")
            analysis["likely_to_fail"] = True
            
        # Value analysis
        value = int(transaction.get("value", "0"), 16)
        if value > 10 * 10**18:  # > 10 ETH
            analysis["flags"].append("high_value")
            analysis["mev_score"] += 0.3
            
        # Target analysis
        to_addr = transaction.get("to", "").lower()
        known_dex = [
            "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",  # Uniswap V2
            "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",  # Uniswap V3
        ]
        
        if to_addr in known_dex:
            analysis["flags"].append("dex_interaction")
            analysis["mev_score"] += 0.2
            
        # MEV determination
        if analysis["mev_score"] > 0.5 and "high_gas" in analysis["flags"]:
            analysis["is_mev_candidate"] = True
            
        return analysis
        
    def add_transaction(self, transaction: Dict[str, Any]):
        """Add transaction to mempool cache."""
        tx_hash = transaction.get("hash")
        self.pending_transactions.append(transaction)
        self.transaction_times[tx_hash] = transaction.get("timestamp", datetime.now())
        
    async def process_pending_transactions(self, chain: str, count: int):
        """Process pending transactions from WebSocket."""
        # This would be called by BlockchainMonitor
        # Implementation depends on WebSocket message format
        pass
        
    def get_mempool_stats(self) -> Dict[str, Any]:
        """Get mempool statistics."""
        if not self.pending_transactions:
            return {
                "total_pending": 0,
                "gas_price_percentiles": {},
                "avg_wait_time": 0,
                "mev_candidates": 0
            }
            
        gas_prices = []
        wait_times = []
        current_time = datetime.now()
        
        for tx in self.pending_transactions:
            # Gas price
            gas_price = int(tx.get("gasPrice", "0"), 16) / 10**9  # Convert to Gwei
            gas_prices.append(gas_price)
            
            # Wait time
            tx_hash = tx.get("hash")
            if tx_hash in self.transaction_times:
                wait_time = (current_time - self.transaction_times[tx_hash]).total_seconds()
                wait_times.append(wait_time)
                
        # Calculate percentiles
        gas_prices.sort()
        percentiles = {}
        
        if gas_prices:
            percentiles["p50"] = gas_prices[len(gas_prices) // 2]
            percentiles["p95"] = gas_prices[int(len(gas_prices) * 0.95)]
            percentiles["p99"] = gas_prices[int(len(gas_prices) * 0.99)]
            
        return {
            "total_pending": len(self.pending_transactions),
            "gas_price_percentiles": percentiles,
            "avg_wait_time": statistics.mean(wait_times) if wait_times else 0,
            "mev_candidates": len(self.mev_candidates)
        }


class ChainReorgHandler:
    """Handle blockchain reorganizations."""
    
    def __init__(self, max_depth: int = 10):
        self.max_depth = max_depth
        self.block_history: Dict[str, Dict[int, Dict[str, Any]]] = defaultdict(dict)
        self.reorg_events: Dict[str, List[Tuple[datetime, int]]] = defaultdict(list)
        self.on_reorganization: Optional[Callable] = None
        
    async def add_block(self, chain: str, block: Dict[str, Any]) -> bool:
        """Add block and check for reorg."""
        block_number = int(block["number"], 16)
        block_hash = block["hash"]
        
        # Check if we already have a block at this height
        if block_number in self.block_history[chain]:
            existing_block = self.block_history[chain][block_number]
            if existing_block["hash"] != block_hash:
                # Reorg detected!
                await self.process_reorg(chain, block_number, block)
                return True
                
        # Add to history
        self.block_history[chain][block_number] = block
        
        # Cleanup old blocks
        if len(self.block_history[chain]) > self.max_depth * 2:
            min_block = min(self.block_history[chain].keys())
            del self.block_history[chain][min_block]
            
        return False
        
    async def process_reorg(self, chain: str, fork_point: int, new_block: Dict[str, Any]):
        """Process detected reorganization."""
        # Find all affected blocks
        old_blocks = []
        for block_num in sorted(self.block_history[chain].keys()):
            if block_num >= fork_point:
                old_blocks.append(self.block_history[chain][block_num])
                
        # Calculate reorg depth
        reorg_depth = len(old_blocks)
        
        # Record event
        self.reorg_events[chain].append((datetime.now(), reorg_depth))
        
        # Notify handler
        if self.on_reorganization:
            await self.handle_reorganization(chain, old_blocks, [new_block])
            
        # Update history with new block
        self.block_history[chain][fork_point] = new_block
        
    async def handle_reorganization(self, chain: str, old_blocks: List[Dict[str, Any]], 
                                  new_blocks: List[Dict[str, Any]]):
        """Execute reorganization handler."""
        if self.on_reorganization:
            if asyncio.iscoroutinefunction(self.on_reorganization):
                await self.on_reorganization(chain, len(old_blocks), old_blocks, new_blocks)
            else:
                self.on_reorganization(chain, len(old_blocks), old_blocks, new_blocks)
                
    def get_reorg_depth(self, chain: str) -> int:
        """Get the depth of the last reorg."""
        if not self.reorg_events[chain]:
            return 0
            
        _, depth = self.reorg_events[chain][-1]
        return depth
        
    async def process_block(self, chain: str, block: Dict[str, Any]):
        """Process block for reorg detection (legacy method for tests)."""
        await self.add_block(chain, block)


class BlockchainMonitor:
    """Main blockchain monitoring orchestrator."""
    
    def __init__(self, config: MonitorConfig, websocket_manager: Optional[WebSocketManager] = None,
                 knowledge_service: Optional[BlockchainKnowledgeService] = None):
        self.config = config
        self.chains = config.chains
        self.pattern_detection_enabled = config.pattern_detection_enabled
        self.mempool_monitoring_enabled = config.mempool_monitoring
        
        self.websocket_manager = websocket_manager
        self.knowledge_service = knowledge_service
        
        self.is_running = False
        self.block_processor = BlockProcessor(config.block_confirmations)
        self.mempool_watcher = MempoolWatcher(config.mempool_cache_size)
        self.chain_reorg_handler = ChainReorgHandler()
        self.alert_system = PatternAlertSystem(config.alert_config.get("alert_cooldown", 300))
        self.transaction_filter = TransactionFilter(config.filters)
        
        self.pattern_capture = PatternCapture(CaptureConfig(
            capture_enabled=config.pattern_detection_enabled,
            interesting_contracts=config.filters.get("interesting_addresses", [])
        ))
        
        self.metrics_collector = MetricsCollector()
        self.error_stats = defaultdict(int)
        self._monitoring_tasks: Dict[str, asyncio.Task] = {}
        
    async def start(self):
        """Start monitoring all configured chains."""
        self.is_running = True
        
        # Subscribe to each chain
        for chain in self.chains:
            # Subscribe to new blocks
            await self.websocket_manager.subscribe(
                chain=chain,
                method="eth_subscribe",
                params=["newHeads"]
            )
            
            # Subscribe to pending transactions if enabled
            if self.mempool_monitoring_enabled:
                await self.websocket_manager.subscribe(
                    chain=chain,
                    method="eth_subscribe",
                    params=["pendingTransactions"]
                )
                
            # Start monitoring task for chain
            task = asyncio.create_task(self._monitor_chain(chain))
            self._monitoring_tasks[chain] = task
            
        logger.info(f"Started monitoring {len(self.chains)} chains")
        
    async def stop(self):
        """Stop monitoring."""
        self.is_running = False
        
        # Cancel monitoring tasks
        for task in self._monitoring_tasks.values():
            task.cancel()
            
        # Wait for tasks to complete
        await asyncio.gather(*self._monitoring_tasks.values(), return_exceptions=True)
        
        # Save state
        await self.save_state()
        
        # Shutdown websocket manager
        if self.websocket_manager:
            await self.websocket_manager.shutdown()
            
        # Flush pending patterns
        await self.flush_pending_patterns()
        
        logger.info("Blockchain monitoring stopped")
        
    async def _monitor_chain(self, chain: str):
        """Monitor a single chain for events."""
        while self.is_running:
            try:
                # Get next event from WebSocket
                event = await self.websocket_manager.get_next_event(chain)
                if not event:
                    await asyncio.sleep(0.1)
                    continue
                    
                # Process based on event type
                if self._is_block_event(event):
                    block = self._extract_block_from_event(event)
                    await self.process_block(chain, block)
                    
                elif self._is_transaction_event(event):
                    tx = self._extract_transaction_from_event(event)
                    await self.mempool_watcher.analyze_transaction(tx)
                    
            except Exception as e:
                logger.error(f"Error monitoring {chain}: {e}")
                self.error_stats[f"{chain}_monitor_error"] += 1
                await asyncio.sleep(1)
                
    def _is_block_event(self, event: Dict[str, Any]) -> bool:
        """Check if event is a new block."""
        return event.get("method") == "eth_subscription" and \
               event.get("params", {}).get("subscription", "").startswith("0x")
               
    def _is_transaction_event(self, event: Dict[str, Any]) -> bool:
        """Check if event is a pending transaction."""
        return event.get("method") == "eth_subscription" and \
               "pendingTransactions" in str(event)
               
    def _extract_block_from_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Extract block data from WebSocket event."""
        return event.get("params", {}).get("result", {})
        
    def _extract_transaction_from_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Extract transaction data from WebSocket event."""
        return event.get("params", {}).get("result", {})
        
    async def process_block(self, chain: str, block: Dict[str, Any]) -> List[PatternMetadata]:
        """Process new block and detect patterns."""
        start_time = datetime.now()
        patterns = []
        
        try:
            # Validate block
            if not self.block_processor.validate_block(block):
                logger.warning(f"Invalid block structure for {chain}")
                return patterns
                
            # Check for reorg
            reorg_detected = await self.chain_reorg_handler.add_block(chain, block)
            if reorg_detected:
                logger.warning(f"Reorg detected on {chain} at block {block['number']}")
                
            # Extract transactions
            transactions = self.block_processor.extract_transactions(block)
            
            # Process each transaction
            for tx in transactions:
                # Skip if just hash
                if isinstance(tx, str):
                    continue
                    
                # Apply filters
                if not self.transaction_filter.should_process(tx):
                    continue
                    
                # Capture patterns
                if self.pattern_detection_enabled:
                    try:
                        pattern = await self._capture_pattern_with_retry(tx)
                        if pattern:
                            patterns.append(pattern)
                            
                            # Check for alerts
                            await self.check_pattern_alerts({
                                "type": pattern.type,
                                "metadata": pattern.__dict__,
                                "quality_score": pattern.quality_score
                            })
                            
                    except Exception as e:
                        logger.error(f"Error capturing pattern: {e}")
                        self.error_stats["pattern_capture_errors"] += 1
                        
            # Store block
            self.block_processor.add_block(chain, block)
            
            # Record metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            self.metrics_collector.record_block_processing_time(chain, processing_time)
            self.metrics_collector.record_patterns_detected(chain, len(patterns))
            
        except Exception as e:
            logger.error(f"Error processing block on {chain}: {e}")
            self.error_stats["block_processing_errors"] += 1
            
        return patterns
        
    async def _capture_pattern_with_retry(self, transaction: Dict[str, Any], max_retries: int = 3) -> Optional[PatternMetadata]:
        """Capture pattern with retry logic."""
        for attempt in range(max_retries):
            try:
                if self.knowledge_service:
                    # Use knowledge service for pattern capture
                    result = await self.knowledge_service.capture_pattern(transaction)
                    if isinstance(result, dict):
                        # Convert to PatternMetadata
                        return PatternMetadata(**result.get("metadata", {}))
                    return result
                else:
                    # Use local pattern capture
                    return self.pattern_capture.capture_from_transaction(transaction)
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Pattern capture attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(0.1 * (attempt + 1))
                
        return None
        
    async def check_pattern_alerts(self, pattern: Dict[str, Any]):
        """Check if pattern should generate alert."""
        alert = await self.alert_system.create_alert(pattern)
        
        if alert and self.alert_system.on_alert:
            if asyncio.iscoroutinefunction(self.alert_system.on_alert):
                await self.alert_system.on_alert(alert)
            else:
                self.alert_system.on_alert(alert)
                
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get monitoring performance metrics."""
        return self.metrics_collector.get_summary()
        
    async def save_state(self):
        """Save monitoring state."""
        # Implementation would persist state to disk/database
        pass
        
    async def flush_pending_patterns(self):
        """Flush any pending patterns to storage."""
        # Implementation would ensure all patterns are stored
        pass


class MetricsCollector:
    """Collect and aggregate monitoring metrics."""
    
    def __init__(self):
        self.metrics = {
            "blocks_processed": 0,
            "transactions_processed": 0,
            "patterns_detected": 0,
            "processing_times": [],
            "chain_metrics": defaultdict(lambda: {
                "blocks": 0,
                "transactions": 0,
                "patterns": 0,
                "avg_time": 0
            })
        }
        
    def record_block_processing_time(self, chain: str, time_seconds: float):
        """Record block processing time."""
        self.metrics["processing_times"].append(time_seconds)
        
        # Keep only recent times
        if len(self.metrics["processing_times"]) > 1000:
            self.metrics["processing_times"] = self.metrics["processing_times"][-1000:]
            
        self.metrics["chain_metrics"][chain]["blocks"] += 1
        
    def record_patterns_detected(self, chain: str, count: int):
        """Record number of patterns detected."""
        self.metrics["patterns_detected"] += count
        self.metrics["chain_metrics"][chain]["patterns"] += count
        
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary."""
        avg_time = 0
        if self.metrics["processing_times"]:
            avg_time = statistics.mean(self.metrics["processing_times"])
            
        return {
            "blocks_processed": sum(
                m["blocks"] for m in self.metrics["chain_metrics"].values()
            ),
            "transactions_processed": self.metrics["transactions_processed"],
            "patterns_detected": self.metrics["patterns_detected"],
            "average_block_time": avg_time,
            "chain_metrics": dict(self.metrics["chain_metrics"])
        }