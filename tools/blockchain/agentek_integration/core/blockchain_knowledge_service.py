"""BlockchainKnowledgeService - Core orchestration for blockchain pattern capture and storage.

This service integrates with AgentekWrapper to capture blockchain operation patterns,
enrich them with metadata, generate embeddings, and store them in ChromaDB for
intelligent retrieval and recommendations.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set, Union
from collections import defaultdict, deque
import hashlib

from .agentek_wrapper import AgentekWrapper
from .pattern_capture import (
    PatternCapture,
    CaptureConfig,
    PatternType,
    PatternMetadata,
    PatternExtractor,
    PatternCategorizer,
    QualityScorer
)
from .chain_configuration import ChainManager, ChainId
# ChromaDB imports would be from the main tools.integration package
# For demo purposes, these will be mocked
# from tools.integration.chroma_collections import ChromaCollectionManager
# from tools.integration.chroma_embeddings import ChromaEmbeddingPipeline

# Mock ChromaDB classes for standalone functionality
class ChromaCollectionManager:
    """Mock ChromaDB collection manager."""
    pass

class ChromaEmbeddingPipeline:
    """Mock embedding pipeline."""
    pass


logger = logging.getLogger(__name__)


class KnowledgeServiceError(Exception):
    """Error raised by BlockchainKnowledgeService."""
    pass


@dataclass
class ServiceConfig:
    """Configuration for BlockchainKnowledgeService."""
    # Pattern capture settings
    capture_enabled: bool = True
    capture_failed_txs: bool = True
    min_value_threshold_eth: float = 0.001
    min_gas_threshold: int = 21000
    
    # Pattern types to capture
    pattern_types: List[PatternType] = field(default_factory=lambda: [
        PatternType.TOKEN_TRANSFER,
        PatternType.DEFI_SWAP,
        PatternType.NFT_MINT,
        PatternType.NFT_TRANSFER,
        PatternType.GAS_OPTIMIZATION,
        PatternType.FAILED_TRANSACTION
    ])
    
    # Quality and filtering
    quality_threshold: float = 0.6
    deduplication_window: int = 300  # 5 minutes
    interesting_contracts: List[str] = field(default_factory=list)
    excluded_contracts: List[str] = field(default_factory=list)
    
    # Storage settings
    chroma_persist_dir: str = "./chroma_blockchain_data"
    collection_name: str = "blockchain_patterns"
    embedding_model: str = "all-MiniLM-L6-v2"
    batch_size: int = 50
    
    # Cache settings
    cache_ttl: int = 3600  # 1 hour
    max_cache_size: int = 1000
    
    # Analytics settings
    enable_analytics: bool = True
    analytics_interval: int = 3600  # 1 hour
    
    def validate(self) -> bool:
        """Validate configuration."""
        if not 0 <= self.quality_threshold <= 1:
            raise ValueError("Quality threshold must be between 0 and 1")
        
        if self.batch_size <= 0:
            raise ValueError("Batch size must be positive")
        
        if self.min_value_threshold_eth < 0:
            raise ValueError("Min value threshold cannot be negative")
        
        return True


class PatternEnricher:
    """Enrich patterns with additional metadata and context."""
    
    def __init__(self):
        self.token_prices = {}  # Mock price cache
        self.gas_price_history = defaultdict(list)
    
    def enrich(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich pattern with additional metadata."""
        enriched = pattern.copy()
        metadata = enriched.setdefault("metadata", {})
        
        # Add USD values if token amounts present
        if "amount" in metadata and "token" in metadata:
            price = self.get_token_price(metadata["token"])
            if price and metadata.get("token_decimals"):
                amount_decimal = int(metadata["amount"]) / (10 ** metadata["token_decimals"])
                metadata["usd_value"] = amount_decimal * price
        
        # Add gas price in gwei
        if "gasPrice" in metadata:
            metadata["gas_price_gwei"] = int(metadata["gasPrice"]) / 1e9
        
        # Calculate gas efficiency score
        if "gasUsed" in metadata:
            metadata["gas_efficiency_score"] = self._calculate_gas_efficiency(
                pattern.get("type"),
                int(metadata["gasUsed"])
            )
        
        # Add timestamp if not present
        if "timestamp" not in metadata:
            metadata["timestamp"] = datetime.now().isoformat()
        
        # Add chain info
        if "chainId" not in metadata:
            metadata["chainId"] = 1  # Default to mainnet
        
        return enriched
    
    def get_token_price(self, token_symbol: str) -> Optional[float]:
        """Get token price in USD."""
        # Mock implementation - would connect to price oracle
        mock_prices = {
            "USDC": 1.0,
            "USDT": 1.0,
            "DAI": 1.0,
            "ETH": 2500.0,
            "WETH": 2500.0,
            "UNKNOWN": 0.0
        }
        return mock_prices.get(token_symbol, 0.0)
    
    def get_gas_price_stats(self) -> Dict[str, float]:
        """Get current gas price statistics."""
        # Mock implementation
        return {
            "fast": 30,
            "standard": 20,
            "slow": 15
        }
    
    def _calculate_gas_efficiency(self, pattern_type: Optional[PatternType], gas_used: int) -> float:
        """Calculate gas efficiency score."""
        if not pattern_type:
            return 0.5
        
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
        
        efficiency = expected / gas_used
        return min(max(efficiency, 0.0), 2.0) / 2.0


class PatternStorage:
    """Handle pattern storage and retrieval."""
    
    def __init__(self, chroma_manager: ChromaCollectionManager, collection_name: str):
        self.chroma_manager = chroma_manager
        self.collection_name = collection_name
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Ensure collection exists."""
        try:
            self.chroma_manager.get_or_create_collection(self.collection_name)
        except Exception as e:
            logger.error(f"Failed to ensure collection: {e}")
    
    async def store(self, pattern: Dict[str, Any]) -> bool:
        """Store pattern in ChromaDB."""
        try:
            # Prepare metadata
            metadata = {
                "pattern_type": str(pattern.get("type", PatternType.UNKNOWN).value),
                "quality_score": pattern.get("quality_score", 0.0),
                "timestamp": pattern.get("metadata", {}).get("timestamp", datetime.now().isoformat()),
                "chain": pattern.get("metadata", {}).get("chain", "ethereum")
            }
            
            # Add flattened pattern metadata
            for key, value in pattern.get("metadata", {}).items():
                if isinstance(value, (str, int, float, bool)):
                    metadata[f"meta_{key}"] = value
            
            # Store in ChromaDB
            self.chroma_manager.add_documents(
                collection_name=self.collection_name,
                documents=[json.dumps(pattern)],
                metadatas=[metadata],
                ids=[pattern.get("id", self._generate_pattern_id(pattern))],
                embeddings=[pattern.get("embedding")] if "embedding" in pattern else None
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to store pattern: {e}")
            return False
    
    async def search(self, query: str, limit: int = 10, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search patterns by query."""
        try:
            results = self.chroma_manager.query(
                collection_name=self.collection_name,
                query_texts=[query],
                n_results=limit,
                where=filters
            )
            
            patterns = []
            if results and "documents" in results and results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    pattern = json.loads(doc)
                    if "metadatas" in results and results["metadatas"][0]:
                        pattern["search_metadata"] = results["metadatas"][0][i]
                    if "distances" in results and results["distances"][0]:
                        pattern["similarity_score"] = 1 - results["distances"][0][i]
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to search patterns: {e}")
            return []
    
    def _generate_pattern_id(self, pattern: Dict[str, Any]) -> str:
        """Generate unique pattern ID."""
        # Create ID from key pattern attributes
        id_parts = [
            str(pattern.get("type", "unknown")),
            pattern.get("metadata", {}).get("transaction_hash", ""),
            str(pattern.get("metadata", {}).get("timestamp", datetime.now().isoformat()))
        ]
        
        id_string = "|".join(id_parts)
        return hashlib.sha256(id_string.encode()).hexdigest()[:16]


class RecommendationEngine:
    """Generate recommendations based on captured patterns."""
    
    def __init__(self, chroma_manager: ChromaCollectionManager):
        self.chroma_manager = chroma_manager
        self.recommendation_cache = {}
    
    async def get_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get recommendations based on current context."""
        # Search for similar patterns
        search_query = self._build_search_query(context)
        similar_patterns = await self._search_similar_patterns(search_query)
        
        recommendations = []
        
        # Analyze patterns for recommendations
        if similar_patterns:
            # Gas optimization recommendations
            gas_rec = self._analyze_gas_patterns(similar_patterns, context)
            if gas_rec:
                recommendations.append(gas_rec)
            
            # Timing recommendations
            timing_rec = self._analyze_timing_patterns(similar_patterns)
            if timing_rec:
                recommendations.append(timing_rec)
            
            # Protocol recommendations
            protocol_rec = self._analyze_protocol_patterns(similar_patterns, context)
            if protocol_rec:
                recommendations.append(protocol_rec)
        
        return recommendations
    
    async def get_gas_recommendations(self, operation_type: str) -> Dict[str, Any]:
        """Get gas optimization recommendations."""
        # Search for gas optimization patterns
        patterns = await self._search_similar_patterns(
            f"gas optimization {operation_type}",
            filters={"pattern_type": "GAS_OPTIMIZATION"}
        )
        
        if not patterns:
            return {}
        
        # Analyze gas patterns
        gas_prices = [p.get("metadata", {}).get("gas_price", 0) for p in patterns]
        gas_used = [p.get("metadata", {}).get("gas_used", 0) for p in patterns]
        
        # Find optimal times
        time_patterns = defaultdict(list)
        for p in patterns:
            timestamp = p.get("metadata", {}).get("timestamp")
            if timestamp:
                dt = datetime.fromisoformat(timestamp)
                hour = dt.hour
                time_patterns[hour].append(p.get("metadata", {}).get("gas_price", 0))
        
        # Find cheapest hour
        cheapest_hour = min(time_patterns.items(), key=lambda x: sum(x[1])/len(x[1]) if x[1] else float('inf'))
        
        return {
            "optimal_time": f"{cheapest_hour[0]:02d}:00",
            "expected_gas_price": str(int(sum(cheapest_hour[1])/len(cheapest_hour[1]))),
            "average_gas_used": int(sum(gas_used)/len(gas_used)) if gas_used else 0,
            "confidence": min(len(patterns) / 10, 1.0)  # More patterns = higher confidence
        }
    
    def _build_search_query(self, context: Dict[str, Any]) -> str:
        """Build search query from context."""
        query_parts = []
        
        if "operation" in context:
            query_parts.append(context["operation"])
        
        if "protocol" in context:
            query_parts.append(context["protocol"])
        
        if "token" in context:
            query_parts.append(context["token"])
        
        return " ".join(query_parts)
    
    async def _search_similar_patterns(self, query: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for similar patterns."""
        results = self.chroma_manager.query(
            collection_name="blockchain_patterns",
            query_texts=[query],
            n_results=20,
            where=filters
        )
        
        patterns = []
        if results and "documents" in results and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                pattern = json.loads(doc)
                if "distances" in results and results["distances"][0]:
                    pattern["distance"] = results["distances"][0][i]
                patterns.append(pattern)
        
        return patterns
    
    def _analyze_gas_patterns(self, patterns: List[Dict[str, Any]], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Analyze gas usage patterns."""
        gas_values = [p.get("metadata", {}).get("gas_used", 0) for p in patterns]
        if not gas_values:
            return None
        
        avg_gas = sum(gas_values) / len(gas_values)
        min_gas = min(gas_values)
        
        current_estimate = context.get("estimated_gas", 0)
        if current_estimate and int(current_estimate) > avg_gas * 1.2:
            return {
                "type": "gas_optimization",
                "suggested_gas": str(int(avg_gas)),
                "potential_savings": str(int(int(current_estimate) - avg_gas)),
                "confidence": 0.85,
                "based_on_patterns": len(patterns)
            }
        
        return None
    
    def _analyze_timing_patterns(self, patterns: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Analyze timing patterns."""
        # Group by hour of day
        hourly_success = defaultdict(lambda: {"success": 0, "total": 0})
        
        for p in patterns:
            timestamp = p.get("metadata", {}).get("timestamp")
            status = p.get("metadata", {}).get("status", "success")
            
            if timestamp:
                dt = datetime.fromisoformat(timestamp)
                hour = dt.hour
                hourly_success[hour]["total"] += 1
                if status == "success":
                    hourly_success[hour]["success"] += 1
        
        if not hourly_success:
            return None
        
        # Find best success rate
        best_hour = max(
            hourly_success.items(),
            key=lambda x: x[1]["success"] / x[1]["total"] if x[1]["total"] > 0 else 0
        )
        
        if best_hour[1]["total"] >= 3:  # Need at least 3 samples
            return {
                "type": "timing_optimization",
                "best_hour": best_hour[0],
                "success_rate": best_hour[1]["success"] / best_hour[1]["total"],
                "sample_size": best_hour[1]["total"]
            }
        
        return None
    
    def _analyze_protocol_patterns(self, patterns: List[Dict[str, Any]], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Analyze protocol usage patterns."""
        protocol_stats = defaultdict(lambda: {"count": 0, "avg_cost": 0, "success_rate": 0})
        
        for p in patterns:
            protocol = p.get("metadata", {}).get("protocol")
            if protocol:
                stats = protocol_stats[protocol]
                stats["count"] += 1
                
                gas_cost = p.get("metadata", {}).get("gas_used", 0) * p.get("metadata", {}).get("gas_price", 0)
                stats["avg_cost"] = (stats["avg_cost"] * (stats["count"] - 1) + gas_cost) / stats["count"]
                
                if p.get("metadata", {}).get("status") == "success":
                    stats["success_rate"] = (stats["success_rate"] * (stats["count"] - 1) + 1) / stats["count"]
        
        if len(protocol_stats) < 2:
            return None
        
        # Find most cost-effective protocol
        best_protocol = min(
            protocol_stats.items(),
            key=lambda x: x[1]["avg_cost"] if x[1]["avg_cost"] > 0 else float('inf')
        )
        
        current_protocol = context.get("protocol")
        if current_protocol and current_protocol != best_protocol[0]:
            return {
                "type": "protocol_recommendation",
                "suggested_protocol": best_protocol[0],
                "current_protocol": current_protocol,
                "potential_savings_percentage": (
                    (protocol_stats[current_protocol]["avg_cost"] - best_protocol[1]["avg_cost"]) /
                    protocol_stats[current_protocol]["avg_cost"] * 100
                ) if current_protocol in protocol_stats else 0,
                "confidence": min(best_protocol[1]["count"] / 10, 1.0)
            }
        
        return None


class BlockchainKnowledgeService:
    """Main service for blockchain knowledge capture and management."""
    
    def __init__(
        self,
        config: Optional[ServiceConfig] = None,
        agentek_wrapper: Optional[AgentekWrapper] = None,
        chroma_manager: Optional[ChromaCollectionManager] = None,
        embedding_pipeline: Optional[ChromaEmbeddingPipeline] = None,
        pattern_extractor: Optional[PatternExtractor] = None,
        pattern_enricher: Optional[PatternEnricher] = None,
        pattern_storage: Optional[PatternStorage] = None,
        recommendation_engine: Optional[RecommendationEngine] = None
    ):
        self.config = config or ServiceConfig()
        self.config.validate()
        
        # Core components
        self.agentek_wrapper = agentek_wrapper
        self.chroma_manager = chroma_manager
        self.embedding_pipeline = embedding_pipeline
        
        # Pattern processing
        self.pattern_extractor = pattern_extractor or PatternExtractor()
        self.pattern_enricher = pattern_enricher or PatternEnricher()
        self.pattern_capture = PatternCapture(
            CaptureConfig(
                capture_enabled=self.config.capture_enabled,
                capture_failed_txs=self.config.capture_failed_txs,
                min_gas_threshold=self.config.min_gas_threshold,
                min_value_wei=int(self.config.min_value_threshold_eth * 1e18),
                deduplication_window=self.config.deduplication_window,
                interesting_contracts=self.config.interesting_contracts,
                excluded_contracts=self.config.excluded_contracts
            )
        )
        
        # Storage and recommendations
        if chroma_manager:
            self.pattern_storage = pattern_storage or PatternStorage(
                chroma_manager, 
                self.config.collection_name
            )
            self.recommendation_engine = recommendation_engine or RecommendationEngine(
                chroma_manager
            )
        else:
            self.pattern_storage = pattern_storage
            self.recommendation_engine = recommendation_engine
        
        # Chain management
        self.chain_manager = ChainManager()
        
        # Pattern queue for batch processing
        self.pattern_queue = asyncio.Queue(maxsize=self.config.batch_size * 2)
        self._pattern_processor_task = None
        
        # Failed pattern recovery
        self._failed_pattern_queue = deque(maxlen=1000)
        
        # Cache
        self._pattern_cache = {}
        self._cache_timestamps = {}
        
        # Analytics
        self._analytics_data = defaultdict(int)
        self._last_analytics_time = datetime.now()
    
    @property
    def capture_enabled(self) -> bool:
        """Check if pattern capture is enabled."""
        return self.config.capture_enabled
    
    async def start(self):
        """Start the knowledge service."""
        if self.config.capture_enabled and not self._pattern_processor_task:
            self._pattern_processor_task = asyncio.create_task(self._process_pattern_queue())
            logger.info("BlockchainKnowledgeService started")
    
    async def stop(self):
        """Stop the knowledge service."""
        if self._pattern_processor_task:
            self._pattern_processor_task.cancel()
            try:
                await self._pattern_processor_task
            except asyncio.CancelledError:
                pass
            
            # Process remaining patterns
            remaining = []
            while not self.pattern_queue.empty():
                try:
                    remaining.append(await self.pattern_queue.get())
                except:
                    break
            
            if remaining:
                await self._batch_store_patterns(remaining)
            
            logger.info("BlockchainKnowledgeService stopped")
    
    async def execute_and_capture(
        self,
        tool_name: str,
        params: Dict[str, Any],
        chain_id: Optional[Union[ChainId, int]] = None
    ) -> Dict[str, Any]:
        """Execute blockchain operation and capture patterns."""
        try:
            # Set chain if specified
            if chain_id:
                self.chain_manager.set_active_chain(chain_id)
            
            # Execute operation
            result = await self.agentek_wrapper.execute(tool_name, params)
            
            # Capture pattern if enabled
            if self.config.capture_enabled:
                asyncio.create_task(self._capture_pattern_async(result))
            
            # Update analytics
            self._analytics_data["operations_executed"] += 1
            if result.get("status") == "success":
                self._analytics_data["operations_successful"] += 1
            
            return result
            
        except Exception as e:
            self._analytics_data["operations_failed"] += 1
            logger.error(f"Failed to execute and capture: {e}")
            raise KnowledgeServiceError(f"Execution failed: {e}")
    
    async def _capture_pattern_async(self, operation_result: Dict[str, Any]):
        """Capture pattern asynchronously from operation result."""
        try:
            # Extract pattern
            pattern = self.pattern_capture.capture_from_transaction(operation_result)
            if not pattern:
                return
            
            # Convert to dict
            pattern_dict = {
                "type": pattern.type,
                "metadata": pattern.__dict__,
                "quality_score": pattern.quality_score or 0.0
            }
            
            # Enrich pattern
            pattern_dict = self.pattern_enricher.enrich(pattern_dict)
            
            # Generate embedding
            if self.embedding_pipeline:
                pattern_dict["embedding"] = await self._generate_pattern_embedding(pattern_dict)
            
            # Queue for storage
            await self.pattern_queue.put(pattern_dict)
            
            self._analytics_data["patterns_captured"] += 1
            
        except Exception as e:
            logger.error(f"Failed to capture pattern: {e}")
            self._analytics_data["patterns_failed"] += 1
    
    async def _generate_pattern_embedding(self, pattern: Dict[str, Any]) -> List[float]:
        """Generate embedding for pattern."""
        # Create text representation of pattern
        text_parts = [
            f"Pattern Type: {pattern.get('type', 'unknown')}"
        ]
        
        metadata = pattern.get("metadata", {})
        
        # Add key metadata to embedding text
        if "protocol" in metadata:
            text_parts.append(f"Protocol: {metadata['protocol']}")
        
        if "token" in metadata:
            text_parts.append(f"Token: {metadata['token']}")
        elif "tokenIn" in metadata and "tokenOut" in metadata:
            text_parts.append(f"Swap: {metadata['tokenIn']} to {metadata['tokenOut']}")
        
        if "gas_efficiency_score" in metadata:
            text_parts.append(f"Gas Efficiency: {metadata['gas_efficiency_score']:.2f}")
        
        if "error_category" in metadata:
            text_parts.append(f"Error: {metadata['error_category']}")
        
        if "optimization_type" in metadata:
            text_parts.append(f"Optimization: {metadata['optimization_type']}")
        
        embedding_text = " | ".join(text_parts)
        
        # Generate embedding
        return self.embedding_pipeline.embed_text(embedding_text)
    
    async def _process_pattern_queue(self):
        """Process queued patterns in batches."""
        batch = []
        
        while True:
            try:
                # Collect batch
                timeout = 5.0 if batch else None  # Wait indefinitely for first item
                
                try:
                    pattern = await asyncio.wait_for(
                        self.pattern_queue.get(),
                        timeout=timeout
                    )
                    batch.append(pattern)
                except asyncio.TimeoutError:
                    pass
                
                # Process batch if full or timeout
                if len(batch) >= self.config.batch_size or (batch and self.pattern_queue.empty()):
                    await self._batch_store_patterns(batch)
                    batch = []
                
            except asyncio.CancelledError:
                # Store remaining batch before exit
                if batch:
                    await self._batch_store_patterns(batch)
                raise
            except Exception as e:
                logger.error(f"Error in pattern processor: {e}")
                await asyncio.sleep(1)
    
    async def _batch_store_patterns(self, patterns: List[Dict[str, Any]]):
        """Store patterns in batch."""
        if not patterns or not self.pattern_storage:
            return
        
        stored_count = 0
        failed_patterns = []
        
        for pattern in patterns:
            try:
                # Add unique ID if not present
                if "id" not in pattern:
                    pattern["id"] = self._generate_pattern_id(pattern)
                
                # Store pattern
                success = await self.pattern_storage.store(pattern)
                if success:
                    stored_count += 1
                    # Update cache
                    self._pattern_cache[pattern["id"]] = pattern
                    self._cache_timestamps[pattern["id"]] = datetime.now()
                else:
                    failed_patterns.append(pattern)
                    
            except Exception as e:
                logger.error(f"Failed to store pattern: {e}")
                failed_patterns.append(pattern)
        
        # Queue failed patterns for retry
        for pattern in failed_patterns:
            self._failed_pattern_queue.append(pattern)
        
        self._analytics_data["patterns_stored"] += stored_count
        self._analytics_data["patterns_storage_failed"] += len(failed_patterns)
        
        logger.info(f"Stored {stored_count}/{len(patterns)} patterns")
    
    async def _store_pattern_in_chroma(self, pattern: Dict[str, Any]):
        """Store a single pattern in ChromaDB."""
        await self.pattern_storage.store(pattern)
    
    def _generate_pattern_id(self, pattern: Dict[str, Any]) -> str:
        """Generate unique pattern ID."""
        id_parts = [
            str(pattern.get("type", "unknown")),
            pattern.get("metadata", {}).get("transaction_hash", ""),
            str(datetime.now().timestamp())
        ]
        
        id_string = "|".join(id_parts)
        return f"pat_{hashlib.sha256(id_string.encode()).hexdigest()[:12]}"
    
    async def search_patterns(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for patterns."""
        if not self.pattern_storage:
            return []
        
        return await self.pattern_storage.search(query, limit, filters)
    
    async def search_similar_patterns(
        self,
        pattern_type: PatternType,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for similar patterns of a specific type."""
        query = f"{pattern_type.value} pattern"
        
        if not filters:
            filters = {}
        filters["pattern_type"] = pattern_type.value
        
        return await self.search_patterns(query, limit, filters)
    
    async def find_similar_patterns(
        self,
        reference_pattern_id: str,
        similarity_threshold: float = 0.7,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Find patterns similar to a reference pattern."""
        # Get reference pattern
        reference = self._pattern_cache.get(reference_pattern_id)
        if not reference:
            # Try to fetch from storage
            results = await self.search_patterns(f"id:{reference_pattern_id}", limit=1)
            if results:
                reference = results[0]
            else:
                return []
        
        # Search using reference pattern text
        query_parts = [
            str(reference.get("type", "")),
            reference.get("metadata", {}).get("protocol", ""),
            reference.get("metadata", {}).get("token", "")
        ]
        query = " ".join(filter(None, query_parts))
        
        # Search and filter by similarity
        results = await self.search_patterns(query, limit=limit * 2)
        
        similar = [
            r for r in results
            if r.get("similarity_score", 0) >= similarity_threshold
            and r.get("id") != reference_pattern_id
        ]
        
        return similar[:limit]
    
    async def get_operation_recommendations(
        self,
        operation_type: str,
        current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get recommendations for an operation."""
        if not self.recommendation_engine:
            return {}
        
        context = {
            "operation": operation_type,
            "timestamp": (current_time or datetime.now()).isoformat()
        }
        
        recommendations = await self.recommendation_engine.get_recommendations(context)
        
        # Get gas recommendations
        gas_rec = await self.recommendation_engine.get_gas_recommendations(operation_type)
        
        result = {
            "recommendations": recommendations,
            "gas_optimization": gas_rec
        }
        
        # Add timing recommendation based on current time
        if gas_rec and current_time:
            optimal_hour = int(gas_rec.get("optimal_time", "00:00").split(":")[0])
            current_hour = current_time.hour
            
            if abs(optimal_hour - current_hour) > 2:
                result["timing_recommendation"] = {
                    "wait_hours": (optimal_hour - current_hour) % 24,
                    "optimal_time": gas_rec["optimal_time"],
                    "potential_savings": "20-30%"  # Estimate
                }
        
        return result
    
    async def aggregate_cross_chain_patterns(
        self,
        pattern_type: PatternType
    ) -> Dict[str, Any]:
        """Aggregate patterns across different chains."""
        # Search for patterns of the type across all chains
        patterns = await self.search_similar_patterns(pattern_type, limit=100)
        
        if not patterns:
            return {"chains": {}, "recommendations": []}
        
        # Group by chain
        chain_data = defaultdict(lambda: {
            "count": 0,
            "avg_gas_used": 0,
            "avg_gas_price": 0,
            "avg_execution_time": 0,
            "success_rate": 0
        })
        
        for pattern in patterns:
            chain = pattern.get("metadata", {}).get("chain", "ethereum")
            data = chain_data[chain]
            data["count"] += 1
            
            # Update averages
            metadata = pattern.get("metadata", {})
            if "gas_used" in metadata:
                data["avg_gas_used"] = (
                    (data["avg_gas_used"] * (data["count"] - 1) + int(metadata["gas_used"])) /
                    data["count"]
                )
            
            if "gas_price" in metadata:
                data["avg_gas_price"] = (
                    (data["avg_gas_price"] * (data["count"] - 1) + int(metadata["gas_price"])) /
                    data["count"]
                )
            
            if "execution_time" in metadata:
                data["avg_execution_time"] = (
                    (data["avg_execution_time"] * (data["count"] - 1) + metadata["execution_time"]) /
                    data["count"]
                )
            
            if metadata.get("status") == "success":
                data["success_rate"] = (
                    (data["success_rate"] * (data["count"] - 1) + 1) /
                    data["count"]
                )
        
        # Calculate cost effectiveness
        for chain, data in chain_data.items():
            if data["avg_gas_used"] and data["avg_gas_price"]:
                data["avg_cost_wei"] = data["avg_gas_used"] * data["avg_gas_price"]
                data["cost_effectiveness"] = 1 / data["avg_cost_wei"] if data["avg_cost_wei"] > 0 else 0
        
        # Rank by cost effectiveness
        ranked_chains = sorted(
            chain_data.items(),
            key=lambda x: x[1].get("cost_effectiveness", 0),
            reverse=True
        )
        
        return {
            "chains": dict(chain_data),
            "cost_effectiveness_ranking": [chain for chain, _ in ranked_chains],
            "recommendations": self._generate_cross_chain_recommendations(chain_data)
        }
    
    def _generate_cross_chain_recommendations(self, chain_data: Dict[str, Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on cross-chain analysis."""
        recommendations = []
        
        # Find cheapest chain
        if len(chain_data) >= 2:
            cheapest = min(
                chain_data.items(),
                key=lambda x: x[1].get("avg_cost_wei", float('inf'))
            )
            
            most_expensive = max(
                chain_data.items(),
                key=lambda x: x[1].get("avg_cost_wei", 0)
            )
            
            if cheapest[1]["avg_cost_wei"] < most_expensive[1]["avg_cost_wei"] * 0.5:
                savings_percent = (
                    (most_expensive[1]["avg_cost_wei"] - cheapest[1]["avg_cost_wei"]) /
                    most_expensive[1]["avg_cost_wei"] * 100
                )
                recommendations.append(
                    f"Consider using {cheapest[0]} instead of {most_expensive[0]} "
                    f"for up to {savings_percent:.0f}% cost savings"
                )
        
        # Check for speed differences
        fastest = min(
            chain_data.items(),
            key=lambda x: x[1].get("avg_execution_time", float('inf'))
        )
        
        if fastest[1]["avg_execution_time"] < 5:  # Less than 5 seconds
            recommendations.append(
                f"{fastest[0]} offers fastest execution times "
                f"(avg {fastest[1]['avg_execution_time']:.1f}s)"
            )
        
        return recommendations
    
    async def analyze_pattern_evolution(
        self,
        pattern_type: PatternType,
        time_range: Tuple[datetime, datetime],
        metric: str = "gas_price"
    ) -> Dict[str, Any]:
        """Analyze how patterns evolve over time."""
        # Search patterns in time range
        patterns = await self.search_similar_patterns(
            pattern_type,
            filters={
                "timestamp": {
                    "$gte": time_range[0].isoformat(),
                    "$lte": time_range[1].isoformat()
                }
            },
            limit=1000
        )
        
        if not patterns:
            return {"trend": "insufficient_data", "data_points": []}
        
        # Extract metric values over time
        data_points = []
        for pattern in patterns:
            timestamp_str = pattern.get("metadata", {}).get("timestamp")
            if timestamp_str and metric in pattern.get("metadata", {}):
                data_points.append({
                    "timestamp": datetime.fromisoformat(timestamp_str),
                    "value": pattern["metadata"][metric]
                })
        
        if len(data_points) < 2:
            return {"trend": "insufficient_data", "data_points": data_points}
        
        # Sort by time
        data_points.sort(key=lambda x: x["timestamp"])
        
        # Calculate trend
        values = [dp["value"] for dp in data_points]
        first_half_avg = sum(values[:len(values)//2]) / (len(values)//2)
        second_half_avg = sum(values[len(values)//2:]) / (len(values) - len(values)//2)
        
        if second_half_avg > first_half_avg * 1.1:
            trend = "increasing"
        elif second_half_avg < first_half_avg * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"
        
        # Calculate daily change
        time_span = (data_points[-1]["timestamp"] - data_points[0]["timestamp"]).days
        if time_span > 0:
            total_change = values[-1] - values[0]
            avg_daily_change = total_change / time_span
        else:
            avg_daily_change = 0
        
        # Simple prediction
        current_value = values[-1]
        next_day_estimate = current_value + avg_daily_change
        
        return {
            "trend": trend,
            "data_points": data_points,
            "current_value": current_value,
            "average_daily_change": avg_daily_change,
            "prediction": {
                "next_day_estimate": next_day_estimate,
                "confidence": "low"  # Simple linear prediction
            }
        }
    
    async def export_knowledge(
        self,
        filters: Optional[Dict[str, Any]] = None,
        format: str = "json"
    ) -> Dict[str, Any]:
        """Export captured knowledge."""
        # Search all patterns with filters
        patterns = await self.search_patterns("*", limit=10000, filters=filters)
        
        export_data = {
            "metadata": {
                "export_time": datetime.now().isoformat(),
                "version": "1.0",
                "pattern_count": len(patterns),
                "filters": filters
            },
            "patterns": patterns
        }
        
        if format == "json":
            return export_data
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def import_knowledge(self, import_data: Dict[str, Any]) -> Dict[str, Any]:
        """Import knowledge from export."""
        if "patterns" not in import_data:
            raise ValueError("Invalid import data: missing patterns")
        
        imported_count = 0
        failed_count = 0
        
        for pattern in import_data["patterns"]:
            try:
                # Re-generate embedding if needed
                if "embedding" not in pattern and self.embedding_pipeline:
                    pattern["embedding"] = await self._generate_pattern_embedding(pattern)
                
                # Store pattern
                success = await self.pattern_storage.store(pattern)
                if success:
                    imported_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to import pattern: {e}")
                failed_count += 1
        
        return {
            "imported_count": imported_count,
            "failed_count": failed_count,
            "total_patterns": len(import_data["patterns"])
        }
    
    async def clear_patterns(self, filters: Optional[Dict[str, Any]] = None):
        """Clear stored patterns."""
        # This would be implemented based on ChromaDB's delete capabilities
        logger.warning("Pattern clearing not fully implemented")
        self._pattern_cache.clear()
        self._cache_timestamps.clear()
    
    async def get_analytics(self) -> Dict[str, Any]:
        """Get service analytics."""
        # Calculate rates
        time_elapsed = (datetime.now() - self._last_analytics_time).total_seconds()
        
        analytics = {
            "operations": {
                "total": self._analytics_data["operations_executed"],
                "successful": self._analytics_data["operations_successful"],
                "failed": self._analytics_data["operations_failed"],
                "success_rate": (
                    self._analytics_data["operations_successful"] /
                    self._analytics_data["operations_executed"]
                ) if self._analytics_data["operations_executed"] > 0 else 0
            },
            "patterns": {
                "captured": self._analytics_data["patterns_captured"],
                "stored": self._analytics_data["patterns_stored"],
                "failed": self._analytics_data["patterns_failed"],
                "storage_failed": self._analytics_data["patterns_storage_failed"],
                "capture_rate": (
                    self._analytics_data["patterns_captured"] /
                    self._analytics_data["operations_executed"]
                ) if self._analytics_data["operations_executed"] > 0 else 0
            },
            "performance": {
                "operations_per_minute": (
                    self._analytics_data["operations_executed"] / time_elapsed * 60
                ) if time_elapsed > 0 else 0,
                "patterns_per_minute": (
                    self._analytics_data["patterns_captured"] / time_elapsed * 60
                ) if time_elapsed > 0 else 0
            },
            "cache": {
                "size": len(self._pattern_cache),
                "hit_rate": 0  # Would need to track cache hits
            },
            "queue": {
                "pattern_queue_size": self.pattern_queue.qsize(),
                "failed_queue_size": len(self._failed_pattern_queue)
            }
        }
        
        return analytics
    
    async def cluster_patterns(
        self,
        min_cluster_size: int = 3,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Cluster similar patterns together."""
        # This would use more sophisticated clustering algorithms
        # For now, simple grouping by pattern type and key attributes
        
        all_patterns = await self.search_patterns("*", limit=1000)
        
        # Group by pattern type first
        type_groups = defaultdict(list)
        for pattern in all_patterns:
            pattern_type = pattern.get("type", PatternType.UNKNOWN)
            type_groups[pattern_type].append(pattern)
        
        clusters = []
        
        for pattern_type, patterns in type_groups.items():
            if len(patterns) < min_cluster_size:
                continue
            
            # Further cluster by key attributes
            if pattern_type == PatternType.TOKEN_TRANSFER:
                # Cluster by token and amount range
                token_clusters = defaultdict(list)
                for p in patterns:
                    token = p.get("metadata", {}).get("token", "UNKNOWN")
                    token_clusters[token].append(p)
                
                for token, token_patterns in token_clusters.items():
                    if len(token_patterns) >= min_cluster_size:
                        # Further cluster by amount range
                        small_transfers = []
                        medium_transfers = []
                        large_transfers = []
                        
                        for p in token_patterns:
                            usd_value = p.get("metadata", {}).get("usd_value", 0)
                            if usd_value < 100:
                                small_transfers.append(p)
                            elif usd_value < 10000:
                                medium_transfers.append(p)
                            else:
                                large_transfers.append(p)
                        
                        for transfer_group, label in [
                            (small_transfers, "small_transfers"),
                            (medium_transfers, "medium_transfers"),
                            (large_transfers, "large_transfers")
                        ]:
                            if len(transfer_group) >= min_cluster_size:
                                clusters.append({
                                    "id": f"{pattern_type.value}_{token}_{label}",
                                    "label": f"{token} {label.replace('_', ' ')}",
                                    "size": len(transfer_group),
                                    "patterns": transfer_group[:10],  # Sample
                                    "characteristics": {
                                        "pattern_type": pattern_type.value,
                                        "token": token,
                                        "transfer_size": label
                                    }
                                })
            
            elif pattern_type == PatternType.DEFI_SWAP:
                # Cluster by protocol
                protocol_clusters = defaultdict(list)
                for p in patterns:
                    protocol = p.get("metadata", {}).get("protocol", "unknown")
                    protocol_clusters[protocol].append(p)
                
                for protocol, protocol_patterns in protocol_clusters.items():
                    if len(protocol_patterns) >= min_cluster_size:
                        clusters.append({
                            "id": f"{pattern_type.value}_{protocol}",
                            "label": f"{protocol} swaps",
                            "size": len(protocol_patterns),
                            "patterns": protocol_patterns[:10],
                            "characteristics": {
                                "pattern_type": pattern_type.value,
                                "protocol": protocol
                            }
                        })
        
        return clusters
    
    async def detect_anomalies(
        self,
        pattern_type: PatternType,
        sensitivity: float = 0.95
    ) -> List[Dict[str, Any]]:
        """Detect anomalous patterns."""
        # Get patterns of the specified type
        patterns = await self.search_similar_patterns(pattern_type, limit=500)
        
        if len(patterns) < 10:
            return []  # Need sufficient data
        
        anomalies = []
        
        # Calculate statistics for key metrics
        metrics = ["gas_used", "amount_usd", "slippage", "execution_time"]
        stats = {}
        
        for metric in metrics:
            values = [
                p.get("metadata", {}).get(metric, 0)
                for p in patterns
                if metric in p.get("metadata", {})
            ]
            
            if values:
                mean = sum(values) / len(values)
                variance = sum((x - mean) ** 2 for x in values) / len(values)
                std_dev = variance ** 0.5
                
                stats[metric] = {
                    "mean": mean,
                    "std_dev": std_dev,
                    "threshold_high": mean + (std_dev * 2),  # 2 sigma
                    "threshold_low": mean - (std_dev * 2)
                }
        
        # Check each pattern for anomalies
        for pattern in patterns:
            anomaly_features = []
            anomaly_score = 0
            
            metadata = pattern.get("metadata", {})
            
            for metric, metric_stats in stats.items():
                if metric in metadata:
                    value = metadata[metric]
                    
                    if value > metric_stats["threshold_high"] or value < metric_stats["threshold_low"]:
                        anomaly_features.append(metric)
                        # Calculate deviation in standard deviations
                        deviation = abs(value - metric_stats["mean"]) / metric_stats["std_dev"]
                        anomaly_score += deviation
            
            # Check quality score
            if pattern.get("quality_score", 1.0) < 0.3:
                anomaly_features.append("quality_score")
                anomaly_score += 2
            
            # Determine if anomalous based on sensitivity
            threshold = (1 - sensitivity) * 10  # Convert sensitivity to score threshold
            if anomaly_score > threshold and anomaly_features:
                anomalies.append({
                    "pattern_id": pattern.get("id"),
                    "pattern_type": pattern_type.value,
                    "anomaly_score": anomaly_score,
                    "anomaly_features": anomaly_features,
                    "metadata": metadata,
                    "detection_time": datetime.now().isoformat()
                })
        
        # Sort by anomaly score
        anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
        
        return anomalies
    
    async def analyze_pattern_quality_distribution(self) -> Dict[str, Any]:
        """Analyze the quality distribution of captured patterns."""
        patterns = await self.search_patterns("*", limit=1000)
        
        if not patterns:
            return {
                "average_quality": 0,
                "high_quality_count": 0,
                "medium_quality_count": 0,
                "low_quality_count": 0,
                "distribution": {}
            }
        
        quality_scores = [
            p.get("metadata", {}).get("quality_score", p.get("quality_score", 0))
            for p in patterns
        ]
        
        avg_quality = sum(quality_scores) / len(quality_scores)
        
        # Count by quality tier
        high_quality = sum(1 for s in quality_scores if s >= 0.8)
        medium_quality = sum(1 for s in quality_scores if 0.6 <= s < 0.8)
        low_quality = sum(1 for s in quality_scores if s < 0.6)
        
        # Create distribution buckets
        distribution = defaultdict(int)
        for score in quality_scores:
            bucket = int(score * 10) / 10  # Round to nearest 0.1
            distribution[bucket] += 1
        
        return {
            "average_quality": avg_quality,
            "high_quality_count": high_quality,
            "medium_quality_count": medium_quality,
            "low_quality_count": low_quality,
            "distribution": dict(distribution),
            "total_patterns": len(patterns)
        }


# Ensure all necessary exports
__all__ = [
    "BlockchainKnowledgeService",
    "ServiceConfig",
    "PatternExtractor",
    "PatternEnricher",
    "PatternStorage",
    "RecommendationEngine",
    "KnowledgeServiceError"
]