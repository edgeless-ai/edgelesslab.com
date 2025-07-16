#!/usr/bin/env python3
"""Demo script showing BlockchainKnowledgeService in action.

This demonstrates:
1. Pattern capture from blockchain transactions
2. Embedding generation and ChromaDB storage
3. Pattern search and retrieval
4. Recommendations based on historical patterns
5. Cross-chain analytics
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agentek_integration.core.blockchain_knowledge_service import (
    BlockchainKnowledgeService,
    ServiceConfig
)
from agentek_integration.core.pattern_capture import PatternType
from agentek_integration.core.chain_configuration import ChainId

# Mock data for demonstration
MOCK_TRANSACTIONS = [
    {
        "transactionHash": "0xdemo123abc...",
        "from": "0xUser123...",
        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
        "value": "0",
        "input": "0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000003b9aca00",  # transfer
        "gasUsed": "65000",
        "gasPrice": "20000000000",
        "status": "success",
        "blockNumber": 18500000,
        "timestamp": datetime.now().isoformat(),
        "logs": [{
            "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "topics": [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer
                "0x000000000000000000000000user123456789012345678901234567890123456",
                "0x0000000000000000000000001234567890123456789012345678901234567890"
            ],
            "data": "0x0000000000000000000000000000000000000000000000000000000000001388"  # 5000 USDC
        }]
    },
    {
        "transactionHash": "0xswap456def...",
        "from": "0xTrader456...",
        "to": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",  # Uniswap V3 Router
        "value": "1000000000000000000",  # 1 ETH
        "input": "0x7ff36ab5...",  # swapExactETHForTokens
        "gasUsed": "180000",
        "gasPrice": "30000000000",
        "status": "success",
        "blockNumber": 18500100,
        "timestamp": (datetime.now() + timedelta(minutes=5)).isoformat(),
        "logs": [{
            "event": "Swap",
            "args": {
                "sender": "0xTrader456...",
                "amountIn": "1000000000000000000",
                "amountOut": "3200000000"  # 3200 USDC
            }
        }]
    },
    {
        "transactionHash": "0xfailed789ghi...",
        "from": "0xFailed789...",
        "to": "0xToken789...",
        "value": "0",
        "input": "0xa9059cbb...",
        "gasUsed": "21000",
        "gasPrice": "25000000000",
        "status": "failed",
        "error": "Insufficient balance",
        "revertReason": "ERC20: transfer amount exceeds balance",
        "blockNumber": 18500200,
        "timestamp": (datetime.now() + timedelta(minutes=10)).isoformat()
    },
    {
        "transactionHash": "0xgas_opt_batch...",
        "from": "0xOptimizer123...",
        "to": "0xMultiSend...",
        "value": "0",
        "input": "0xac9650d8...",  # multicall
        "gasUsed": "150000",
        "gasPrice": "15000000000",
        "status": "success",
        "blockNumber": 18500300,
        "timestamp": (datetime.now() + timedelta(minutes=15)).isoformat(),
        "logs": [
            {
                "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
                "data": "0x0000000000000000000000000000000000000000000000000000000000001000"
            },
            {
                "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
                "data": "0x0000000000000000000000000000000000000000000000000000000000002000"
            },
            {
                "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
                "data": "0x0000000000000000000000000000000000000000000000000000000000003000"
            }
        ]
    }
]


class DemoBlockchainKnowledge:
    """Demo class to showcase BlockchainKnowledgeService features."""
    
    def __init__(self):
        self.service = None
        
    async def setup(self):
        """Initialize the service with mock components."""
        print("🚀 Initializing BlockchainKnowledgeService...\n")
        
        # Configuration
        config = ServiceConfig(
            capture_enabled=True,
            min_value_threshold_eth=0.001,
            pattern_types=[
                PatternType.TOKEN_TRANSFER,
                PatternType.DEFI_SWAP,
                PatternType.FAILED_TRANSACTION,
                PatternType.GAS_OPTIMIZATION,
                PatternType.BATCH_OPERATION
            ],
            quality_threshold=0.6,
            collection_name="demo_blockchain_patterns",
            chroma_persist_dir="./demo_chroma_data"
        )
        
        # Create service (would normally have real agentek_wrapper and chroma_manager)
        # For demo, we'll create a minimal working version
        from unittest.mock import Mock, AsyncMock
        
        self.service = BlockchainKnowledgeService(
            config=config,
            agentek_wrapper=Mock(),
            chroma_manager=Mock(),
            embedding_pipeline=Mock()
        )
        
        # Mock embedding generation
        self.service.embedding_pipeline.embed_text = Mock(return_value=[0.1] * 768)
        
        # Initialize pattern components
        from agentek_integration.core.pattern_capture import (
            PatternExtractor, PatternCategorizer, QualityScorer
        )
        self.service.pattern_extractor = PatternExtractor()
        self.service.pattern_categorizer = PatternCategorizer()
        self.service.pattern_scorer = QualityScorer()
        
        # Mock ChromaDB storage
        self.stored_patterns = []
        async def mock_store(pattern):
            self.stored_patterns.append(pattern)
            return True
        
        self.service._store_pattern = mock_store
        self.service._store_pattern_in_chroma = mock_store
        
        print("✅ Service initialized with demo configuration\n")
        
    async def demo_pattern_capture(self):
        """Demonstrate pattern capture from transactions."""
        print("📊 DEMO 1: Pattern Capture from Blockchain Transactions")
        print("=" * 60)
        
        for i, tx in enumerate(MOCK_TRANSACTIONS, 1):
            print(f"\n🔍 Processing Transaction {i}:")
            print(f"   Hash: {tx['transactionHash']}")
            print(f"   To: {tx['to'][:20]}...")
            print(f"   Status: {tx['status']}")
            
            # Extract pattern
            pattern = self.service.pattern_extractor.extract(tx)
            metadata = pattern["metadata"]
            
            print(f"   Pattern Type: {metadata.type.value}")
            print(f"   Gas Used: {metadata.gas_used:,}")
            
            # Calculate quality score
            quality_score = self.service.pattern_scorer.calculate_score(metadata)
            print(f"   Quality Score: {quality_score:.2f}")
            
            # Store pattern
            pattern_data = {
                "id": f"pattern_{i}",
                "type": metadata.type,
                "metadata": metadata.__dict__,
                "quality_score": quality_score
            }
            await self.service._store_pattern(pattern_data)
            
            if metadata.type == PatternType.TOKEN_TRANSFER:
                print(f"   Token: {metadata.token_symbol or 'Unknown'}")
                print(f"   Amount: {metadata.amount or 'N/A'}")
            elif metadata.type == PatternType.DEFI_SWAP:
                print(f"   Protocol: {metadata.protocol or 'Unknown'}")
            elif metadata.type == PatternType.BATCH_OPERATION:
                print(f"   Operations: {metadata.operation_count}")
                print(f"   Gas Saved: {metadata.gas_saved:,}")
            elif metadata.type == PatternType.FAILED_TRANSACTION:
                print(f"   Error: {metadata.error}")
                print(f"   Category: {metadata.error_category}")
        
        print(f"\n✅ Captured {len(self.stored_patterns)} patterns")
        
    async def demo_pattern_search(self):
        """Demonstrate pattern search and retrieval."""
        print("\n\n🔎 DEMO 2: Pattern Search and Retrieval")
        print("=" * 60)
        
        # Simulate search queries
        searches = [
            ("Token transfers with high quality", PatternType.TOKEN_TRANSFER, 0.7),
            ("Failed transactions", PatternType.FAILED_TRANSACTION, 0.0),
            ("Gas optimization patterns", PatternType.BATCH_OPERATION, 0.5)
        ]
        
        for query, pattern_type, min_quality in searches:
            print(f"\n🔍 Searching: {query}")
            print(f"   Pattern Type: {pattern_type.value}")
            print(f"   Min Quality: {min_quality}")
            
            # Filter stored patterns
            results = [
                p for p in self.stored_patterns
                if p["type"] == pattern_type and p["quality_score"] >= min_quality
            ]
            
            print(f"   Found: {len(results)} patterns")
            
            for i, result in enumerate(results[:2], 1):  # Show first 2
                print(f"\n   Result {i}:")
                print(f"     ID: {result['id']}")
                print(f"     Quality: {result['quality_score']:.2f}")
                print(f"     Gas Used: {result['metadata']['gas_used']:,}")
    
    async def demo_recommendations(self):
        """Demonstrate pattern-based recommendations."""
        print("\n\n💡 DEMO 3: Pattern-Based Recommendations")
        print("=" * 60)
        
        # Analyze gas patterns
        gas_patterns = [p for p in self.stored_patterns if p["metadata"]["gas_price"]]
        
        if gas_patterns:
            avg_gas_price = sum(p["metadata"]["gas_price"] for p in gas_patterns) / len(gas_patterns)
            min_gas_price = min(p["metadata"]["gas_price"] for p in gas_patterns)
            
            print("\n⛽ Gas Price Recommendations:")
            print(f"   Average Gas Price: {avg_gas_price/1e9:.1f} Gwei")
            print(f"   Lowest Gas Price: {min_gas_price/1e9:.1f} Gwei")
            print(f"   Recommendation: Consider executing transactions when gas < {avg_gas_price/1e9 * 0.8:.1f} Gwei")
        
        # Analyze success patterns
        successful = [p for p in self.stored_patterns if p["metadata"]["status"] == "success"]
        failed = [p for p in self.stored_patterns if p["metadata"]["status"] == "failed"]
        
        print("\n✅ Success Rate Analysis:")
        print(f"   Successful: {len(successful)}")
        print(f"   Failed: {len(failed)}")
        print(f"   Success Rate: {len(successful)/(len(successful)+len(failed))*100:.1f}%")
        
        # Batch operation insights
        batch_patterns = [p for p in self.stored_patterns if p["type"] == PatternType.BATCH_OPERATION]
        if batch_patterns:
            total_saved = sum(p["metadata"].get("gas_saved", 0) for p in batch_patterns)
            print(f"\n📦 Batch Operation Insights:")
            print(f"   Total Gas Saved: {total_saved:,}")
            print(f"   Recommendation: Consider batching similar operations to save gas")
    
    async def demo_analytics(self):
        """Demonstrate pattern analytics."""
        print("\n\n📈 DEMO 4: Pattern Analytics")
        print("=" * 60)
        
        # Pattern type distribution
        type_counts = {}
        for pattern in self.stored_patterns:
            pattern_type = pattern["type"].value
            type_counts[pattern_type] = type_counts.get(pattern_type, 0) + 1
        
        print("\n📊 Pattern Type Distribution:")
        for ptype, count in type_counts.items():
            percentage = count / len(self.stored_patterns) * 100
            print(f"   {ptype}: {count} ({percentage:.1f}%)")
        
        # Quality score distribution
        quality_scores = [p["quality_score"] for p in self.stored_patterns]
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        print(f"\n⭐ Quality Score Analysis:")
        print(f"   Average Quality: {avg_quality:.2f}")
        print(f"   High Quality (>0.8): {sum(1 for q in quality_scores if q > 0.8)}")
        print(f"   Medium Quality (0.6-0.8): {sum(1 for q in quality_scores if 0.6 <= q <= 0.8)}")
        print(f"   Low Quality (<0.6): {sum(1 for q in quality_scores if q < 0.6)}")
        
        # Gas usage insights
        gas_usage = [p["metadata"]["gas_used"] for p in self.stored_patterns]
        avg_gas = sum(gas_usage) / len(gas_usage) if gas_usage else 0
        
        print(f"\n⛽ Gas Usage Insights:")
        print(f"   Average Gas Used: {avg_gas:,.0f}")
        print(f"   Total Gas Used: {sum(gas_usage):,}")
        
        # Error analysis
        failed_patterns = [p for p in self.stored_patterns if p["metadata"]["status"] == "failed"]
        if failed_patterns:
            print(f"\n❌ Error Analysis:")
            error_categories = {}
            for p in failed_patterns:
                cat = p["metadata"].get("error_category", "unknown")
                error_categories[cat] = error_categories.get(cat, 0) + 1
            
            for cat, count in error_categories.items():
                print(f"   {cat}: {count}")
    
    async def demo_export(self):
        """Demonstrate knowledge export."""
        print("\n\n💾 DEMO 5: Knowledge Export")
        print("=" * 60)
        
        export_data = {
            "metadata": {
                "export_time": datetime.now().isoformat(),
                "version": "1.0",
                "pattern_count": len(self.stored_patterns),
                "quality_threshold": 0.6
            },
            "patterns": [
                {
                    "id": p["id"],
                    "type": p["type"].value,
                    "quality_score": p["quality_score"],
                    "gas_used": p["metadata"]["gas_used"],
                    "status": p["metadata"]["status"]
                }
                for p in self.stored_patterns
            ],
            "statistics": {
                "total_patterns": len(self.stored_patterns),
                "avg_quality": sum(p["quality_score"] for p in self.stored_patterns) / len(self.stored_patterns),
                "pattern_types": list(set(p["type"].value for p in self.stored_patterns))
            }
        }
        
        print("\n📄 Export Summary:")
        print(f"   Total Patterns: {export_data['metadata']['pattern_count']}")
        print(f"   Export Time: {export_data['metadata']['export_time']}")
        print(f"   Average Quality: {export_data['statistics']['avg_quality']:.2f}")
        print("\n   Pattern Types:")
        for ptype in export_data['statistics']['pattern_types']:
            print(f"     - {ptype}")
        
        # Save to file
        with open("demo_blockchain_knowledge_export.json", "w") as f:
            json.dump(export_data, f, indent=2, default=str)
        
        print("\n✅ Knowledge exported to: demo_blockchain_knowledge_export.json")
    
    async def run_demo(self):
        """Run the complete demo."""
        print("\n" + "🌟" * 30)
        print("   BLOCKCHAIN KNOWLEDGE SERVICE DEMO")
        print("🌟" * 30 + "\n")
        
        await self.setup()
        await self.demo_pattern_capture()
        await self.demo_pattern_search()
        await self.demo_recommendations()
        await self.demo_analytics()
        await self.demo_export()
        
        print("\n\n✨ Demo Complete! ✨")
        print("\nThe BlockchainKnowledgeService provides:")
        print("  ✅ Automatic pattern extraction from blockchain transactions")
        print("  ✅ Quality scoring and categorization")
        print("  ✅ Semantic search with ChromaDB integration")
        print("  ✅ Intelligent recommendations based on historical data")
        print("  ✅ Cross-chain analytics and insights")
        print("  ✅ Export/import for knowledge sharing")
        
        print("\n📚 Next Steps:")
        print("  1. Connect to real Agentek TypeScript bridge")
        print("  2. Enable real-time blockchain monitoring")
        print("  3. Build visualization dashboards")
        print("  4. Integrate with Obsidian for knowledge management")


async def main():
    """Run the demo."""
    demo = DemoBlockchainKnowledge()
    await demo.run_demo()


if __name__ == "__main__":
    asyncio.run(main())