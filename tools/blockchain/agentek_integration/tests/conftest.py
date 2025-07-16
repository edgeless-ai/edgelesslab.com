"""Pytest configuration for agentek integration tests."""

import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, AsyncMock, MagicMock
from typing import Any, Dict, List


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_node_process():
    """Mock Node.js subprocess for testing TypeScript bridge."""
    process = Mock()
    process.communicate = AsyncMock(return_value=(b'{"result": "success"}', b''))
    process.returncode = 0
    return process


@pytest.fixture
def mock_agentek_response():
    """Mock response from agentek tools."""
    return {
        "status": "success",
        "data": {
            "balance": "1000000000000000000",  # 1 ETH in wei
            "decimals": 18,
            "symbol": "ETH"
        },
        "chain": "mainnet",
        "blockNumber": 18500000,
        "timestamp": "2024-01-15T10:00:00Z"
    }


@pytest.fixture
def sample_blockchain_data():
    """Sample blockchain data for testing."""
    return {
        "transactions": [
            {
                "hash": "0x123...",
                "from": "0xabc...",
                "to": "0xdef...",
                "value": "1000000000000000000",
                "gasPrice": "20000000000",
                "gasUsed": "21000"
            }
        ],
        "tokens": {
            "ETH": {"price": 2500.50, "change24h": 2.5},
            "USDC": {"price": 1.00, "change24h": 0.01}
        },
        "gasPrice": {
            "slow": 15,
            "standard": 20,
            "fast": 30
        }
    }


@pytest.fixture
def mock_chroma_manager():
    """Mock ChromaCollectionManager for testing."""
    manager = Mock()
    manager.add_pattern = Mock(return_value=True)
    manager.search_patterns = Mock(return_value=[])
    manager.get_pattern = Mock(return_value=None)
    manager.create_collection = Mock(return_value=True)
    return manager


@pytest.fixture
def mock_embedding_pipeline():
    """Mock ChromaEmbeddingPipeline for testing."""
    pipeline = Mock()
    pipeline.embed_text = Mock(return_value=[0.1] * 768)
    pipeline.embed_batch = Mock(return_value=[[0.1] * 768])
    return pipeline


@pytest.fixture
def temp_test_dir():
    """Create a temporary directory for test files."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def agentek_config():
    """Configuration for agentek integration tests."""
    return {
        "chains": ["mainnet", "optimism", "arbitrum"],
        "tools": {
            "enabled": [
                "getERC20Balance",
                "getGasPrice", 
                "dexScreener",
                "uniswapV3",
                "aave"
            ]
        },
        "python_bridge": {
            "method": "subprocess",  # or "node-calls-python"
            "pool_size": 3,
            "timeout": 30000
        },
        "performance": {
            "cache_enabled": True,
            "batch_size": 50
        }
    }


@pytest.fixture
def mock_web3_data():
    """Mock Web3 responses for testing."""
    return {
        "eth_blockNumber": "0x11a7fb0",  # 18500000 in hex
        "eth_gasPrice": "0x4a817c800",  # 20 gwei in hex
        "eth_getBalance": "0xde0b6b3a7640000",  # 1 ETH in hex
        "eth_chainId": "0x1"  # Mainnet
    }


class MockAgentekClient:
    """Mock agentek client for testing."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.executed_calls = []
    
    async def execute(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock execute method."""
        self.executed_calls.append((tool_name, params))
        
        # Return different responses based on tool
        if tool_name == "getERC20Balance":
            return {
                "balance": "1000000000000000000",
                "decimals": 18,
                "symbol": "TEST"
            }
        elif tool_name == "getGasPrice":
            return {
                "gasPrice": "20000000000",
                "formatted": "20 gwei"
            }
        elif tool_name == "dexScreener":
            return {
                "pairs": [
                    {
                        "pair": "ETH/USDC",
                        "price": "2500.50",
                        "volume24h": "1000000"
                    }
                ]
            }
        else:
            return {"result": "success"}


@pytest.fixture
def mock_agentek_client():
    """Provide a mock agentek client."""
    return MockAgentekClient


@pytest.fixture
def performance_tracker():
    """Track performance metrics during tests."""
    class PerformanceTracker:
        def __init__(self):
            self.metrics = {}
        
        def start(self, operation: str):
            import time
            self.metrics[operation] = {"start": time.time()}
        
        def end(self, operation: str):
            import time
            if operation in self.metrics:
                self.metrics[operation]["end"] = time.time()
                self.metrics[operation]["duration"] = (
                    self.metrics[operation]["end"] - 
                    self.metrics[operation]["start"]
                )
        
        def get_duration(self, operation: str) -> float:
            return self.metrics.get(operation, {}).get("duration", 0)
    
    return PerformanceTracker()


# Markers for test categorization
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow tests")
    config.addinivalue_line("markers", "requires_network: Tests requiring network access")