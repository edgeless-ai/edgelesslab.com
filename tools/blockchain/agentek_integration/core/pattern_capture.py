"""Pattern capture functionality for blockchain operations.

This module provides pattern extraction, categorization, and quality scoring
for various types of blockchain operations.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime, timedelta
import hashlib
import json
import re
from collections import defaultdict


class PatternType(Enum):
    """Types of blockchain patterns."""
    TOKEN_TRANSFER = "token_transfer"
    DEFI_SWAP = "defi_swap"
    NFT_MINT = "nft_mint"
    NFT_TRANSFER = "nft_transfer"
    CONTRACT_DEPLOYMENT = "contract_deployment"
    GAS_OPTIMIZATION = "gas_optimization"
    FAILED_TRANSACTION = "failed_transaction"
    LIQUIDITY_PROVISION = "liquidity_provision"
    YIELD_FARMING = "yield_farming"
    ARBITRAGE = "arbitrage"
    MEV_OPERATION = "mev_operation"
    BATCH_OPERATION = "batch_operation"
    CROSS_CHAIN = "cross_chain"
    UNKNOWN = "unknown"


@dataclass
class PatternMetadata:
    """Metadata for a captured pattern."""
    type: PatternType
    chain: Optional[str] = None
    protocol: Optional[str] = None
    function_name: Optional[str] = None
    
    # Transaction details
    transaction_hash: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    contract_address: Optional[str] = None
    
    # Token/Asset details
    token_address: Optional[str] = None
    token_symbol: Optional[str] = None
    token_decimals: Optional[int] = None
    amount: Optional[str] = None
    amount_usd: Optional[float] = None
    
    # DeFi specific
    token_in: Optional[str] = None
    token_out: Optional[str] = None
    amount_in: Optional[str] = None
    amount_out: Optional[str] = None
    slippage: Optional[float] = None
    price_impact: Optional[float] = None
    liquidity_pool: Optional[str] = None
    
    # NFT specific
    collection_address: Optional[str] = None
    token_id: Optional[str] = None
    mint_price: Optional[str] = None
    
    # Gas details
    gas_used: Optional[int] = None
    gas_price: Optional[int] = None
    gas_efficiency_score: Optional[float] = None
    max_priority_fee: Optional[int] = None
    base_fee: Optional[int] = None
    
    # Optimization details
    optimization_type: Optional[str] = None
    gas_saved: Optional[int] = None
    operation_count: Optional[int] = None
    batch_size: Optional[int] = None
    
    # Failure details
    status: str = "success"
    error: Optional[str] = None
    revert_reason: Optional[str] = None
    failure_reason: Optional[str] = None
    error_category: Optional[str] = None
    
    # Timing
    timestamp: Optional[datetime] = None
    block_number: Optional[int] = None
    block_time: Optional[int] = None
    execution_time: Optional[float] = None
    
    # Quality metrics
    quality_score: Optional[float] = None
    confidence_score: Optional[float] = None
    
    # Additional data
    extra_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CaptureConfig:
    """Configuration for pattern capture."""
    capture_enabled: bool = True
    capture_failed_txs: bool = True
    min_gas_threshold: int = 21000
    min_value_wei: int = 0
    deduplication_window: int = 300  # 5 minutes
    quality_weights: Dict[str, float] = field(default_factory=lambda: {
        "gas_efficiency": 0.3,
        "execution_speed": 0.2,
        "success_rate": 0.3,
        "value_transferred": 0.2
    })
    interesting_contracts: List[str] = field(default_factory=list)
    excluded_contracts: List[str] = field(default_factory=list)


class PatternValidationError(Exception):
    """Error raised when pattern validation fails."""
    pass


class PatternExtractor:
    """Extract patterns from blockchain transactions."""
    
    # Known function signatures
    FUNCTION_SIGNATURES = {
        "0xa9059cbb": "transfer(address,uint256)",
        "0x23b872dd": "transferFrom(address,address,uint256)",
        "0x095ea7b3": "approve(address,uint256)",
        "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
        "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
        "0x18cbafe5": "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
        "0x5c11d795": "swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)",
        "0xac9650d8": "multicall(bytes[])",
        "0x1249c58b": "mint()",
        "0xa0712d68": "mint(uint256)",
        "0x40c10f19": "mint(address,uint256)",
    }
    
    # Known protocols by router address
    PROTOCOL_ROUTERS = {
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "uniswap_v2",
        "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45": "uniswap_v3",
        "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F": "sushiswap",
        "0x1111111254fb6c44bAC0beD2854e76F90643097d": "1inch",
        "0xDef1C0ded9bec7F1a1670819833240f027b25EfF": "0x",
    }
    
    # Token addresses
    KNOWN_TOKENS = {
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
        "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",
        "0x6B175474E89094C44Da98b954EedeAC495271d0F": "DAI",
        "0xC02aaA39b223FE8D0A0e5C4F2E460cC98E0095D7": "WETH",
    }
    
    def extract(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Extract pattern from transaction data."""
        pattern_type = self._identify_pattern_type(transaction)
        metadata = self._extract_metadata(transaction, pattern_type)
        
        return {
            "type": pattern_type,
            "metadata": metadata
        }
    
    def _identify_pattern_type(self, tx: Dict[str, Any]) -> PatternType:
        """Identify the pattern type from transaction."""
        # Contract deployment
        if tx.get("to") is None and tx.get("contractAddress"):
            return PatternType.CONTRACT_DEPLOYMENT
        
        # Failed transaction
        if tx.get("status") == "failed":
            return PatternType.FAILED_TRANSACTION
        
        # Check input data
        input_data = tx.get("input", "0x")
        if len(input_data) >= 10:
            method_id = input_data[:10]
            
            # Token transfers
            if method_id in ["0xa9059cbb", "0x23b872dd"]:
                return PatternType.TOKEN_TRANSFER
            
            # DeFi swaps
            if method_id in ["0x38ed1739", "0x7ff36ab5", "0x18cbafe5", "0x5c11d795"]:
                return PatternType.DEFI_SWAP
            
            # NFT mints
            if method_id in ["0x1249c58b", "0xa0712d68", "0x40c10f19"]:
                return PatternType.NFT_MINT
            
            # Multicall (potential batch/optimization)
            if method_id == "0xac9650d8":
                return PatternType.BATCH_OPERATION
        
        # Check logs for patterns
        logs = tx.get("logs", [])
        if logs:
            # Check for Transfer events
            transfer_events = [l for l in logs if l.get("topics") and 
                             l["topics"][0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
            
            if len(transfer_events) > 2:
                return PatternType.BATCH_OPERATION
            elif transfer_events:
                # Check if NFT transfer (from = 0x0)
                if any(self._is_mint_event(e) for e in transfer_events):
                    return PatternType.NFT_MINT
                return PatternType.TOKEN_TRANSFER
            
            # Check for Swap events
            swap_topics = [
                "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",  # Uniswap V2
                "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",  # Uniswap V3
            ]
            if any(l.get("topics") and l["topics"][0] in swap_topics for l in logs):
                return PatternType.DEFI_SWAP
        
        return PatternType.UNKNOWN
    
    def _is_mint_event(self, event: Dict[str, Any]) -> bool:
        """Check if Transfer event is a mint."""
        if len(event.get("topics", [])) >= 2:
            from_address = event["topics"][1]
            # Mint if from address is zero
            return from_address == "0x0000000000000000000000000000000000000000000000000000000000000000"
        return False
    
    def _extract_metadata(self, tx: Dict[str, Any], pattern_type: PatternType) -> PatternMetadata:
        """Extract metadata based on pattern type."""
        metadata = PatternMetadata(
            type=pattern_type,
            transaction_hash=tx.get("hash"),
            from_address=tx.get("from"),
            to_address=tx.get("to"),
            gas_used=int(tx.get("gasUsed", 0)),
            gas_price=int(tx.get("gasPrice", 0)),
            status=tx.get("status", "success"),
            timestamp=tx.get("timestamp"),
            block_number=tx.get("blockNumber")
        )
        
        # Extract function name
        input_data = tx.get("input", "0x")
        if len(input_data) >= 10:
            method_id = input_data[:10]
            metadata.function_name = self.extract_function_signature(input_data)
        
        # Pattern-specific extraction
        if pattern_type == PatternType.TOKEN_TRANSFER:
            self._extract_token_transfer_metadata(tx, metadata)
        elif pattern_type == PatternType.DEFI_SWAP:
            self._extract_defi_swap_metadata(tx, metadata)
        elif pattern_type == PatternType.NFT_MINT:
            self._extract_nft_mint_metadata(tx, metadata)
        elif pattern_type == PatternType.CONTRACT_DEPLOYMENT:
            self._extract_deployment_metadata(tx, metadata)
        elif pattern_type == PatternType.FAILED_TRANSACTION:
            self._extract_failure_metadata(tx, metadata)
        elif pattern_type == PatternType.BATCH_OPERATION:
            self._extract_batch_metadata(tx, metadata)
        
        # Calculate gas efficiency
        metadata.gas_efficiency_score = self._calculate_gas_efficiency(
            pattern_type, metadata.gas_used
        )
        
        return metadata
    
    def extract_function_signature(self, input_data: str) -> str:
        """Extract function signature from input data."""
        if len(input_data) < 10:
            return "unknown"
        
        method_id = input_data[:10]
        return self.FUNCTION_SIGNATURES.get(method_id, f"unknown_{method_id}")
    
    def _extract_token_transfer_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract token transfer specific metadata."""
        # Get token address from 'to' field or logs
        metadata.token_address = tx.get("to")
        
        # Parse Transfer events
        for log in tx.get("logs", []):
            if (log.get("topics") and 
                log["topics"][0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"):
                
                # Extract from/to from topics
                if len(log["topics"]) >= 3:
                    from_addr = "0x" + log["topics"][1][-40:]
                    to_addr = "0x" + log["topics"][2][-40:]
                    
                    # Extract amount from data
                    if log.get("data"):
                        amount_hex = log["data"]
                        metadata.amount = str(int(amount_hex, 16))
                
                metadata.token_address = log["address"]
                metadata.token_symbol = self.KNOWN_TOKENS.get(log["address"], "UNKNOWN")
                break
    
    def _extract_defi_swap_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract DeFi swap specific metadata."""
        metadata.protocol = self.identify_protocol(tx.get("to", ""))
        
        # Extract from Swap events
        for log in tx.get("logs", []):
            # Uniswap V3 Swap event
            if (log.get("topics") and 
                log["topics"][0] == "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"):
                # Parse swap data
                metadata.liquidity_pool = log["address"]
                # Additional parsing would go here
    
    def _extract_nft_mint_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract NFT mint specific metadata."""
        metadata.collection_address = tx.get("to")
        metadata.mint_price = tx.get("value", "0")
        
        # Extract token ID from Transfer events
        for log in tx.get("logs", []):
            if self._is_mint_event(log) and log.get("data"):
                # Token ID is typically in the data field
                token_id_hex = log["data"]
                metadata.token_id = str(int(token_id_hex, 16))
                break
    
    def _extract_deployment_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract contract deployment metadata."""
        metadata.contract_address = tx.get("contractAddress")
        metadata.extra_data["deployment_cost"] = metadata.gas_used * metadata.gas_price
        
        # Estimate bytecode size
        input_data = tx.get("input", "0x")
        metadata.extra_data["bytecode_size"] = len(input_data) // 2 - 1
    
    def _extract_failure_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract failure specific metadata."""
        metadata.error = tx.get("error", "Unknown error")
        metadata.revert_reason = tx.get("revertReason")
        
        # Categorize error
        if "insufficient" in metadata.error.lower() or "insufficient" in str(metadata.revert_reason).lower():
            metadata.error_category = "insufficient_balance"
        elif "gas" in metadata.error.lower():
            metadata.error_category = "out_of_gas"
        elif "revert" in metadata.error.lower():
            metadata.error_category = "reverted"
        else:
            metadata.error_category = "unknown"
        
        metadata.extra_data["gas_wasted"] = metadata.gas_used
    
    def _extract_batch_metadata(self, tx: Dict[str, Any], metadata: PatternMetadata):
        """Extract batch operation metadata."""
        # Count operations from logs
        transfer_count = sum(1 for log in tx.get("logs", [])
                           if log.get("topics") and 
                           log["topics"][0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")
        
        metadata.operation_count = transfer_count
        metadata.batch_size = transfer_count
        metadata.optimization_type = "batch_operation"
        
        if transfer_count > 0:
            metadata.extra_data["gas_per_operation"] = metadata.gas_used // transfer_count
            # Estimate gas saved (assuming 65k per individual transfer)
            metadata.gas_saved = (65000 * transfer_count) - metadata.gas_used
    
    def _calculate_gas_efficiency(self, pattern_type: PatternType, gas_used: int) -> float:
        """Calculate gas efficiency score."""
        # Define expected gas usage for each pattern type
        expected_gas = {
            PatternType.TOKEN_TRANSFER: 65000,
            PatternType.DEFI_SWAP: 150000,
            PatternType.NFT_MINT: 100000,
            PatternType.CONTRACT_DEPLOYMENT: 1000000,
            PatternType.BATCH_OPERATION: 200000,
        }
        
        expected = expected_gas.get(pattern_type, 100000)
        if gas_used == 0:
            return 0.0
        
        # Calculate efficiency (1.0 is expected, >1.0 is better, <1.0 is worse)
        efficiency = expected / gas_used
        
        # Normalize to 0-1 scale
        return min(max(efficiency, 0.0), 2.0) / 2.0
    
    def identify_protocol(self, address: str) -> str:
        """Identify DeFi protocol from contract address."""
        return self.PROTOCOL_ROUTERS.get(address.lower(), "unknown")
    
    def decode_event_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """Decode event log data."""
        # Simplified decoder - in production would use full ABI decoding
        result = {"event": "Unknown"}
        
        if not log.get("topics"):
            return result
        
        topic0 = log["topics"][0]
        
        # Transfer event
        if topic0 == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef":
            result["event"] = "Transfer"
            if len(log["topics"]) >= 3:
                result["from"] = "0x" + log["topics"][1][-40:]
                result["to"] = "0x" + log["topics"][2][-40:]
            if log.get("data"):
                result["value"] = str(int(log["data"], 16))
        
        return result


class PatternCategorizer:
    """Categorize patterns based on characteristics."""
    
    def categorize(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Categorize transaction patterns."""
        category = {
            "is_mev": False,
            "mev_type": None,
            "user_type": "regular",
            "urgency": "normal"
        }
        
        # MEV detection
        gas_price = int(transaction.get("gasPrice", 0))
        max_priority_fee = int(transaction.get("maxPriorityFeePerGas", 0))
        position = transaction.get("position", -1)
        
        # High priority and early position suggests MEV
        if (gas_price > 100000000000 or max_priority_fee > 50000000000) and position < 3:
            category["is_mev"] = True
            
            # Try to identify MEV type
            if position == 0:
                category["mev_type"] = "potential_sandwich"
            else:
                category["mev_type"] = "priority_transaction"
        
        # User type detection
        from_address = transaction.get("from", "").lower()
        if gas_price > 200000000000:
            category["user_type"] = "bot"
        elif self._is_known_protocol(from_address):
            category["user_type"] = "protocol"
        
        # Urgency detection
        if gas_price > 150000000000:
            category["urgency"] = "high"
        elif gas_price < 20000000000:
            category["urgency"] = "low"
        
        return category
    
    def _is_known_protocol(self, address: str) -> bool:
        """Check if address is a known protocol."""
        # Simplified check - would have comprehensive list
        known_protocols = [
            "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",  # Uniswap V2
            "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",  # Uniswap V3
        ]
        return address in known_protocols


class QualityScorer:
    """Score pattern quality."""
    
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or {
            "gas_efficiency": 0.3,
            "execution_speed": 0.2,
            "success_rate": 0.3,
            "value_transferred": 0.2
        }
    
    def calculate_score(self, pattern: PatternMetadata) -> float:
        """Calculate quality score for a pattern."""
        scores = {}
        
        # Gas efficiency score
        if pattern.gas_efficiency_score is not None:
            scores["gas_efficiency"] = pattern.gas_efficiency_score
        else:
            scores["gas_efficiency"] = self._calculate_gas_score(pattern)
        
        # Execution speed score
        scores["execution_speed"] = self._calculate_speed_score(pattern)
        
        # Success rate score
        scores["success_rate"] = 1.0 if pattern.status == "success" else 0.0
        
        # Value score
        scores["value_transferred"] = self._calculate_value_score(pattern)
        
        # Weighted average
        total_score = sum(
            scores.get(metric, 0) * weight 
            for metric, weight in self.weights.items()
        )
        
        return min(max(total_score, 0.0), 1.0)
    
    def _calculate_gas_score(self, pattern: PatternMetadata) -> float:
        """Calculate gas efficiency score."""
        if not pattern.gas_used:
            return 0.5
        
        # Pattern-specific thresholds
        if pattern.type == PatternType.TOKEN_TRANSFER:
            if pattern.gas_used < 50000:
                return 1.0
            elif pattern.gas_used < 70000:
                return 0.8
            elif pattern.gas_used < 100000:
                return 0.6
            else:
                return 0.4
        
        # Generic scoring
        if pattern.gas_used < 100000:
            return 0.9
        elif pattern.gas_used < 200000:
            return 0.7
        elif pattern.gas_used < 500000:
            return 0.5
        else:
            return 0.3
    
    def _calculate_speed_score(self, pattern: PatternMetadata) -> float:
        """Calculate execution speed score."""
        if not pattern.execution_time:
            return 0.7  # Default
        
        if pattern.execution_time < 3:
            return 1.0
        elif pattern.execution_time < 10:
            return 0.8
        elif pattern.execution_time < 30:
            return 0.6
        else:
            return 0.4
    
    def _calculate_value_score(self, pattern: PatternMetadata) -> float:
        """Calculate value transfer score."""
        if not pattern.amount_usd:
            return 0.5
        
        # Higher value transfers are considered higher quality
        if pattern.amount_usd > 10000:
            return 1.0
        elif pattern.amount_usd > 1000:
            return 0.8
        elif pattern.amount_usd > 100:
            return 0.6
        elif pattern.amount_usd > 10:
            return 0.4
        else:
            return 0.2


class PatternDeduplicator:
    """Deduplicate patterns within time windows."""
    
    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds
        self.seen_patterns: Dict[str, datetime] = {}
    
    def is_duplicate(self, pattern: PatternMetadata) -> bool:
        """Check if pattern is a duplicate."""
        # Create pattern signature
        signature = self._create_signature(pattern)
        
        # Check if seen recently
        if signature in self.seen_patterns:
            last_seen = self.seen_patterns[signature]
            if pattern.timestamp - last_seen < timedelta(seconds=self.window_seconds):
                return True
        
        # Record pattern
        self.seen_patterns[signature] = pattern.timestamp
        
        # Clean old patterns
        self._clean_old_patterns(pattern.timestamp)
        
        return False
    
    def _create_signature(self, pattern: PatternMetadata) -> str:
        """Create unique signature for pattern."""
        # Use key fields to create signature
        key_parts = [
            str(pattern.type.value),
            pattern.from_address or "",
            pattern.to_address or "",
            pattern.function_name or "",
            pattern.token_address or ""
        ]
        
        signature_string = "|".join(key_parts)
        return hashlib.sha256(signature_string.encode()).hexdigest()
    
    def _clean_old_patterns(self, current_time: datetime):
        """Remove patterns outside the deduplication window."""
        cutoff_time = current_time - timedelta(seconds=self.window_seconds)
        
        # Remove old entries
        self.seen_patterns = {
            sig: timestamp 
            for sig, timestamp in self.seen_patterns.items()
            if timestamp > cutoff_time
        }


class PatternCapture:
    """Main pattern capture orchestrator."""
    
    def __init__(self, config: Optional[CaptureConfig] = None):
        self.config = config or CaptureConfig()
        self.extractor = PatternExtractor()
        self.categorizer = PatternCategorizer()
        self.scorer = QualityScorer(self.config.quality_weights)
        self.deduplicator = PatternDeduplicator(self.config.deduplication_window)
    
    def capture_from_transaction(self, transaction: Dict[str, Any]) -> Optional[PatternMetadata]:
        """Capture pattern from a single transaction."""
        if not self.config.capture_enabled:
            return None
        
        # Check filters
        if not self._should_capture(transaction):
            return None
        
        # Extract pattern
        extracted = self.extractor.extract(transaction)
        pattern = extracted["metadata"]
        
        # Check for duplicates
        if self.deduplicator.is_duplicate(pattern):
            return None
        
        # Categorize
        category = self.categorizer.categorize(transaction)
        pattern.extra_data.update(category)
        
        # Score quality
        pattern.quality_score = self.scorer.calculate_score(pattern)
        
        return pattern
    
    def capture_batch(self, transactions: List[Dict[str, Any]]) -> List[PatternMetadata]:
        """Capture patterns from multiple transactions."""
        patterns = []
        
        for tx in transactions:
            pattern = self.capture_from_transaction(tx)
            if pattern:
                patterns.append(pattern)
        
        return patterns
    
    def _should_capture(self, transaction: Dict[str, Any]) -> bool:
        """Check if transaction should be captured."""
        # Check gas threshold
        gas_used = int(transaction.get("gasUsed", 0))
        if gas_used < self.config.min_gas_threshold:
            return False
        
        # Check value threshold
        value = int(transaction.get("value", 0))
        if value < self.config.min_value_wei:
            # Check if it's a token transfer with value
            has_token_transfer = any(
                log.get("topics") and 
                log["topics"][0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
                for log in transaction.get("logs", [])
            )
            if not has_token_transfer:
                return False
        
        # Check contract filters
        to_address = transaction.get("to", "").lower()
        if self.config.excluded_contracts and to_address in self.config.excluded_contracts:
            return False
        
        # Check failure filter
        if transaction.get("status") == "failed" and not self.config.capture_failed_txs:
            return False
        
        return True
    
    def aggregate_batch_patterns(self, patterns: List[PatternMetadata]) -> Dict[str, Any]:
        """Aggregate metrics from batch patterns."""
        if not patterns:
            return {
                "total_patterns": 0,
                "pattern_types": {},
                "avg_gas_used": 0,
                "avg_quality_score": 0
            }
        
        # Count by type
        type_counts = defaultdict(int)
        for pattern in patterns:
            type_counts[pattern.type.value] += 1
        
        # Calculate averages
        avg_gas = sum(p.gas_used or 0 for p in patterns) / len(patterns)
        avg_quality = sum(p.quality_score or 0 for p in patterns) / len(patterns)
        
        return {
            "total_patterns": len(patterns),
            "pattern_types": dict(type_counts),
            "avg_gas_used": avg_gas,
            "avg_quality_score": avg_quality,
            "time_range": {
                "start": min(p.timestamp for p in patterns if p.timestamp),
                "end": max(p.timestamp for p in patterns if p.timestamp)
            }
        }
    
    def correlate_cross_chain(self, patterns: List[PatternMetadata]) -> Dict[str, Any]:
        """Correlate patterns across different chains."""
        # Group by chain
        chain_patterns = defaultdict(list)
        for pattern in patterns:
            if pattern.chain:
                chain_patterns[pattern.chain].append(pattern)
        
        # Calculate correlations
        correlations = {}
        
        if len(chain_patterns) >= 2:
            chains = list(chain_patterns.keys())
            
            # Gas price ratios
            gas_ratios = {}
            for i, chain1 in enumerate(chains):
                for chain2 in chains[i+1:]:
                    avg_gas1 = sum(p.gas_price or 0 for p in chain_patterns[chain1]) / len(chain_patterns[chain1])
                    avg_gas2 = sum(p.gas_price or 0 for p in chain_patterns[chain2]) / len(chain_patterns[chain2])
                    
                    if avg_gas2 > 0:
                        ratio_key = f"{chain1}_to_{chain2}"
                        gas_ratios[ratio_key] = avg_gas1 / avg_gas2
            
            correlations["gas_price_ratio"] = gas_ratios
            
            # Speed ratios (if block time available)
            speed_ratios = {}
            for chain, patterns in chain_patterns.items():
                avg_block_time = sum(p.block_time or 12 for p in patterns) / len(patterns)
                speed_ratios[chain] = avg_block_time
            
            if len(speed_ratios) >= 2:
                fastest = min(speed_ratios.items(), key=lambda x: x[1])
                for chain, block_time in speed_ratios.items():
                    if chain != fastest[0]:
                        ratio_key = f"{chain}_to_{fastest[0]}"
                        correlations.setdefault("speed_ratio", {})[ratio_key] = block_time / fastest[1]
            
            # Cost effectiveness
            cost_effectiveness = {}
            for chain, patterns in chain_patterns.items():
                avg_gas_used = sum(p.gas_used or 0 for p in patterns) / len(patterns)
                avg_gas_price = sum(p.gas_price or 0 for p in patterns) / len(patterns)
                cost_effectiveness[chain] = 1 / (avg_gas_used * avg_gas_price) if avg_gas_used * avg_gas_price > 0 else 0
            
            correlations["cost_effectiveness"] = cost_effectiveness
        
        return correlations
    
    def analyze_temporal_patterns(self, patterns: List[PatternMetadata]) -> Dict[str, Any]:
        """Analyze patterns over time."""
        if not patterns:
            return {}
        
        # Sort by timestamp
        sorted_patterns = sorted(
            [p for p in patterns if p.timestamp],
            key=lambda x: x.timestamp
        )
        
        if not sorted_patterns:
            return {}
        
        # Hourly analysis
        hourly_stats = defaultdict(lambda: {"count": 0, "total_gas_price": 0, "total_volume": 0})
        
        for pattern in sorted_patterns:
            hour = pattern.timestamp.hour
            hourly_stats[hour]["count"] += 1
            hourly_stats[hour]["total_gas_price"] += pattern.gas_price or 0
            hourly_stats[hour]["total_volume"] += pattern.amount_usd or 0
        
        # Find patterns
        peak_hours = []
        low_gas_hours = []
        
        for hour, stats in hourly_stats.items():
            avg_gas = stats["total_gas_price"] / stats["count"] if stats["count"] > 0 else 0
            
            if stats["total_volume"] > sum(s["total_volume"] for s in hourly_stats.values()) / len(hourly_stats) * 1.5:
                peak_hours.append(hour)
            
            if avg_gas < sum(s["total_gas_price"] / s["count"] if s["count"] > 0 else 0 
                           for s in hourly_stats.values()) / len(hourly_stats) * 0.8:
                low_gas_hours.append(hour)
        
        # Daily patterns
        daily_counts = defaultdict(int)
        for pattern in sorted_patterns:
            day = pattern.timestamp.date()
            daily_counts[day] += 1
        
        return {
            "peak_hours": sorted(peak_hours),
            "low_gas_hours": sorted(low_gas_hours),
            "daily_patterns": [
                {"date": str(day), "count": count}
                for day, count in sorted(daily_counts.items())
            ],
            "weekly_trend": self._calculate_trend(daily_counts),
            "total_patterns": len(sorted_patterns)
        }
    
    def _calculate_trend(self, daily_counts: Dict) -> Optional[str]:
        """Calculate trend from daily counts."""
        if len(daily_counts) < 3:
            return None
        
        # Simple trend detection
        counts = [count for _, count in sorted(daily_counts.items())]
        
        # Calculate average change
        changes = [counts[i+1] - counts[i] for i in range(len(counts)-1)]
        avg_change = sum(changes) / len(changes)
        
        if avg_change > 0.1 * sum(counts) / len(counts):
            return "increasing"
        elif avg_change < -0.1 * sum(counts) / len(counts):
            return "decreasing"
        else:
            return "stable"