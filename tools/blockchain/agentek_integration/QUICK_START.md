# Quick Start Guide - Agentek-ChromaDB Integration

## 🚀 5-Minute Setup

### 1. Install Dependencies
```bash
pip install chromadb asyncio dataclasses numpy
```

### 2. Run the Demo
```bash
python demo_blockchain_knowledge.py
```

### 3. Basic Usage

```python
from agentek_integration.core.blockchain_knowledge_service import (
    BlockchainKnowledgeService,
    ServiceConfig
)
from agentek_integration.core.pattern_capture import PatternType

# Initialize service
config = ServiceConfig(
    capture_enabled=True,
    pattern_types=[PatternType.TOKEN_TRANSFER, PatternType.DEFI_SWAP]
)

service = BlockchainKnowledgeService(config=config)

# Capture patterns from transactions
result = await service.execute_and_capture(
    tool_name="sendTransaction",
    params={"to": "0xToken...", "data": "0xtransfer..."}
)
```

## 📊 What It Does

1. **Captures Patterns**: Automatically extracts 14 types of blockchain patterns
2. **Scores Quality**: Evaluates patterns on gas efficiency, speed, and success rate
3. **Stores Intelligently**: Uses ChromaDB for semantic search capabilities
4. **Provides Insights**: Offers recommendations based on historical data

## 🔍 Pattern Types

- `TOKEN_TRANSFER` - ERC20/721/1155 transfers
- `DEFI_SWAP` - DEX swaps
- `NFT_MINT` - NFT creation
- `GAS_OPTIMIZATION` - Gas-efficient operations
- `FAILED_TRANSACTION` - Learn from failures
- `BATCH_OPERATION` - Multi-call optimizations
- And 8 more...

## 💡 Example Insights

```
⛽ Gas Price Recommendations:
   Average Gas Price: 22.5 Gwei
   Lowest Gas Price: 15.0 Gwei
   Recommendation: Execute when gas < 18.0 Gwei

📦 Batch Operation Insights:
   Total Gas Saved: 45,000
   Recommendation: Consider batching similar operations
```

## 📈 Next Steps

1. Connect real blockchain data source
2. Enable real-time monitoring (Phase 3)
3. Build custom visualizations
4. Integrate with your Obsidian vault

## 🛠️ Troubleshooting

- **Import Error**: Ensure you're in the correct directory
- **ChromaDB Error**: Install with `pip install chromadb`
- **Async Error**: Use Python 3.8+

## 📚 Learn More

- [Full Documentation](./README.md)
- [Phase 3 Plan](./docs/phase3-plan.md)
- [API Reference](./docs/api-reference.md)