"""Unit tests for multi-chain configuration in agentek integration."""

import pytest
from unittest.mock import Mock, patch
from typing import Dict, List, Any

from ...core.chain_configuration import (
    ChainConfig,
    ChainManager,
    ChainId,
    NetworkError,
    GasStrategy
)


class TestChainConfiguration:
    """Test chain configuration management."""
    
    def test_chain_enum_values(self):
        """Test 1: Chain ID enum has correct values."""
        assert ChainId.MAINNET.value == 1
        assert ChainId.OPTIMISM.value == 10
        assert ChainId.ARBITRUM.value == 42161
        assert ChainId.POLYGON.value == 137
        assert ChainId.BASE.value == 8453
    
    def test_chain_config_initialization(self):
        """Test 2: ChainConfig initializes with proper values."""
        config = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key",
            explorer_url="https://etherscan.io",
            native_currency={"name": "Ether", "symbol": "ETH", "decimals": 18}
        )
        
        assert config.chain_id == ChainId.MAINNET
        assert config.name == "Ethereum Mainnet"
        assert config.native_currency["symbol"] == "ETH"
        assert config.is_testnet is False
    
    def test_testnet_detection(self):
        """Test 3: Correctly identify testnets."""
        # Mainnet should not be testnet
        mainnet = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key"
        )
        assert mainnet.is_testnet is False
        
        # Goerli testnet
        goerli = ChainConfig(
            chain_id=5,  # Goerli chain ID
            name="Goerli Testnet",
            rpc_url="https://eth-goerli.g.alchemy.com/v2/key",
            is_testnet=True
        )
        assert goerli.is_testnet is True
    
    def test_gas_strategy_configuration(self):
        """Test 4: Configure gas strategies per chain."""
        config = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key",
            gas_strategy=GasStrategy(
                base_multiplier=1.1,
                priority_multiplier=1.5,
                max_gas_price=500000000000,  # 500 gwei
                eip1559_enabled=True
            )
        )
        
        assert config.gas_strategy.base_multiplier == 1.1
        assert config.gas_strategy.eip1559_enabled is True
        assert config.gas_strategy.max_gas_price == 500000000000


class TestChainManager:
    """Test chain management functionality."""
    
    @pytest.fixture
    def chain_manager(self):
        """Create a chain manager with default chains."""
        manager = ChainManager()
        
        # Add default chains
        manager.add_chain(ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key",
            native_currency={"name": "Ether", "symbol": "ETH", "decimals": 18}
        ))
        
        manager.add_chain(ChainConfig(
            chain_id=ChainId.OPTIMISM,
            name="Optimism",
            rpc_url="https://opt-mainnet.g.alchemy.com/v2/key",
            native_currency={"name": "Ether", "symbol": "ETH", "decimals": 18}
        ))
        
        return manager
    
    def test_add_and_get_chain(self, chain_manager):
        """Test 5: Add and retrieve chain configurations."""
        # Get existing chain
        mainnet = chain_manager.get_chain(ChainId.MAINNET)
        assert mainnet.name == "Ethereum Mainnet"
        
        # Add new chain
        arbitrum_config = ChainConfig(
            chain_id=ChainId.ARBITRUM,
            name="Arbitrum One",
            rpc_url="https://arb1.arbitrum.io/rpc"
        )
        chain_manager.add_chain(arbitrum_config)
        
        # Retrieve new chain
        arbitrum = chain_manager.get_chain(ChainId.ARBITRUM)
        assert arbitrum.name == "Arbitrum One"
    
    def test_list_available_chains(self, chain_manager):
        """Test 6: List all available chains."""
        chains = chain_manager.list_chains()
        
        assert len(chains) == 2
        assert ChainId.MAINNET in chains
        assert ChainId.OPTIMISM in chains
        assert ChainId.ARBITRUM not in chains
    
    def test_get_nonexistent_chain(self, chain_manager):
        """Test 7: Handle request for non-configured chain."""
        with pytest.raises(NetworkError) as exc_info:
            chain_manager.get_chain(ChainId.POLYGON)
        
        assert "Chain 137 not configured" in str(exc_info.value)
    
    def test_multi_rpc_fallback(self):
        """Test 8: Configure multiple RPC endpoints for fallback."""
        config = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_urls=[
                "https://eth-mainnet.g.alchemy.com/v2/key1",
                "https://mainnet.infura.io/v3/key2",
                "https://cloudflare-eth.com"
            ]
        )
        
        assert len(config.rpc_urls) == 3
        assert config.primary_rpc == "https://eth-mainnet.g.alchemy.com/v2/key1"
    
    @pytest.mark.asyncio
    async def test_chain_switching(self, chain_manager):
        """Test 9: Switch between chains during operations."""
        # Set initial chain
        chain_manager.set_active_chain(ChainId.MAINNET)
        assert chain_manager.active_chain.chain_id == ChainId.MAINNET
        
        # Switch to different chain
        chain_manager.set_active_chain(ChainId.OPTIMISM)
        assert chain_manager.active_chain.chain_id == ChainId.OPTIMISM
        assert chain_manager.active_chain.name == "Optimism"
    
    def test_chain_specific_settings(self):
        """Test 10: Chain-specific settings and limits."""
        mainnet_config = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key",
            settings={
                "block_time": 12,
                "max_block_range": 10000,
                "supports_eip1559": True,
                "multicall_address": "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696"
            }
        )
        
        assert mainnet_config.settings["block_time"] == 12
        assert mainnet_config.settings["supports_eip1559"] is True
    
    def test_gas_price_by_chain(self, chain_manager):
        """Test 11: Different gas price strategies per chain."""
        # Mainnet with EIP-1559
        mainnet = chain_manager.get_chain(ChainId.MAINNET)
        mainnet.gas_strategy = GasStrategy(
            eip1559_enabled=True,
            base_multiplier=1.1,
            priority_fee=2000000000  # 2 gwei
        )
        
        # Optimism with lower gas
        optimism = chain_manager.get_chain(ChainId.OPTIMISM)
        optimism.gas_strategy = GasStrategy(
            eip1559_enabled=True,
            base_multiplier=1.05,
            priority_fee=1000000  # 0.001 gwei
        )
        
        assert mainnet.gas_strategy.priority_fee > optimism.gas_strategy.priority_fee
    
    def test_chain_validation(self):
        """Test 12: Validate chain configuration."""
        # Valid config
        valid_config = ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_url="https://eth-mainnet.g.alchemy.com/v2/key"
        )
        assert valid_config.validate() is True
        
        # Invalid config - missing RPC
        with pytest.raises(ValueError) as exc_info:
            invalid_config = ChainConfig(
                chain_id=ChainId.MAINNET,
                name="Ethereum Mainnet",
                rpc_url=""  # Empty RPC URL
            )
            invalid_config.validate()
        
        assert "RPC URL is required" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_concurrent_multi_chain_operations(self, chain_manager):
        """Test 13: Handle concurrent operations on multiple chains."""
        import asyncio
        
        async def operation_on_chain(chain_id: ChainId) -> Dict[str, Any]:
            """Simulate an operation on a specific chain."""
            config = chain_manager.get_chain(chain_id)
            # Simulate some async work
            await asyncio.sleep(0.1)
            return {
                "chain": config.name,
                "chain_id": config.chain_id.value,
                "success": True
            }
        
        # Run operations on multiple chains concurrently
        results = await asyncio.gather(
            operation_on_chain(ChainId.MAINNET),
            operation_on_chain(ChainId.OPTIMISM)
        )
        
        assert len(results) == 2
        assert results[0]["chain_id"] == 1
        assert results[1]["chain_id"] == 10
        assert all(r["success"] for r in results)
    
    def test_chain_config_serialization(self):
        """Test 14: Serialize/deserialize chain configurations."""
        config = ChainConfig(
            chain_id=ChainId.ARBITRUM,
            name="Arbitrum One",
            rpc_url="https://arb1.arbitrum.io/rpc",
            explorer_url="https://arbiscan.io",
            native_currency={"name": "Ether", "symbol": "ETH", "decimals": 18}
        )
        
        # Serialize to dict
        config_dict = config.to_dict()
        assert config_dict["chain_id"] == 42161
        assert config_dict["name"] == "Arbitrum One"
        
        # Deserialize from dict
        restored = ChainConfig.from_dict(config_dict)
        assert restored.chain_id == ChainId.ARBITRUM
        assert restored.name == config.name
        assert restored.rpc_url == config.rpc_url
    
    def test_custom_chain_addition(self, chain_manager):
        """Test 15: Add custom/private chains."""
        # Add a custom private chain
        custom_chain = ChainConfig(
            chain_id=1337,  # Common local chain ID
            name="Local Development",
            rpc_url="http://localhost:8545",
            is_testnet=True,
            native_currency={"name": "Test Ether", "symbol": "ETH", "decimals": 18}
        )
        
        chain_manager.add_chain(custom_chain)
        
        # Retrieve custom chain
        local = chain_manager.get_chain(1337)
        assert local.name == "Local Development"
        assert local.is_testnet is True
        assert "localhost" in local.rpc_url


class TestGasStrategy:
    """Test gas price strategies."""
    
    def test_gas_strategy_calculation(self):
        """Test 16: Calculate gas prices with strategies."""
        strategy = GasStrategy(
            base_multiplier=1.2,
            priority_multiplier=1.5,
            max_gas_price=500000000000,  # 500 gwei
            eip1559_enabled=True
        )
        
        # Test base gas calculation
        base_gas = 50000000000  # 50 gwei
        adjusted = strategy.adjust_gas_price(base_gas)
        assert adjusted == 60000000000  # 50 * 1.2 = 60 gwei
        
        # Test max gas cap
        high_gas = 450000000000  # 450 gwei
        adjusted_high = strategy.adjust_gas_price(high_gas)
        assert adjusted_high <= strategy.max_gas_price
    
    def test_eip1559_gas_calculation(self):
        """Test 17: EIP-1559 gas calculations."""
        strategy = GasStrategy(
            eip1559_enabled=True,
            base_multiplier=1.1,
            priority_fee=2000000000,  # 2 gwei
            max_priority_fee=5000000000  # 5 gwei
        )
        
        # Calculate max fee per gas
        base_fee = 30000000000  # 30 gwei
        max_fee = strategy.calculate_max_fee(base_fee)
        
        # Should be base_fee * multiplier + priority_fee
        expected = int(30000000000 * 1.1) + 2000000000
        assert max_fee == expected
    
    def test_legacy_gas_strategy(self):
        """Test 18: Legacy (non-EIP-1559) gas strategy."""
        strategy = GasStrategy(
            eip1559_enabled=False,
            base_multiplier=1.3,
            max_gas_price=200000000000  # 200 gwei
        )
        
        # Legacy just uses gas price
        gas_price = 40000000000  # 40 gwei
        adjusted = strategy.adjust_gas_price(gas_price)
        assert adjusted == 52000000000  # 40 * 1.3 = 52 gwei


if __name__ == "__main__":
    pytest.main([__file__, "-v"])