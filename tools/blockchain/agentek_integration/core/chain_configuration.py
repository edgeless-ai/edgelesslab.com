"""Chain configuration management for multi-chain blockchain operations.

This module provides configuration and management for different blockchain
networks, including gas strategies and network-specific settings.
"""

from enum import IntEnum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union


class ChainId(IntEnum):
    """Standard chain IDs for EVM-compatible blockchains."""
    MAINNET = 1
    OPTIMISM = 10
    BSC = 56
    POLYGON = 137
    ARBITRUM = 42161
    AVALANCHE = 43114
    BASE = 8453
    
    # Testnets
    GOERLI = 5
    SEPOLIA = 11155111
    MUMBAI = 80001


class NetworkError(Exception):
    """Error raised for network-related issues."""
    pass


@dataclass
class GasStrategy:
    """Gas pricing strategy for a specific chain."""
    base_multiplier: float = 1.1
    priority_multiplier: float = 1.5
    max_gas_price: int = 500000000000  # 500 gwei default max
    eip1559_enabled: bool = True
    priority_fee: int = 2000000000  # 2 gwei default priority
    max_priority_fee: int = 5000000000  # 5 gwei max priority
    
    def adjust_gas_price(self, base_gas_price: int) -> int:
        """Adjust gas price based on strategy."""
        adjusted = int(base_gas_price * self.base_multiplier)
        return min(adjusted, self.max_gas_price)
    
    def calculate_max_fee(self, base_fee: int) -> int:
        """Calculate max fee per gas for EIP-1559."""
        if not self.eip1559_enabled:
            return self.adjust_gas_price(base_fee)
        
        # Max fee = (base fee * multiplier) + priority fee
        adjusted_base = int(base_fee * self.base_multiplier)
        return adjusted_base + self.priority_fee


@dataclass
class ChainConfig:
    """Configuration for a blockchain network."""
    chain_id: Union[ChainId, int]
    name: str
    rpc_url: Optional[str] = None
    rpc_urls: Optional[List[str]] = None
    explorer_url: Optional[str] = None
    native_currency: Optional[Dict[str, Any]] = None
    gas_strategy: Optional[GasStrategy] = None
    is_testnet: bool = False
    settings: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        """Initialize with defaults."""
        if self.rpc_urls is None and self.rpc_url:
            self.rpc_urls = [self.rpc_url]
        
        if self.gas_strategy is None:
            self.gas_strategy = GasStrategy()
        
        if self.native_currency is None:
            self.native_currency = {
                "name": "Ether",
                "symbol": "ETH",
                "decimals": 18
            }
        
        if self.settings is None:
            self.settings = {}
        
        # Auto-detect testnet if not specified
        if isinstance(self.chain_id, int):
            testnet_ids = [5, 11155111, 80001, 421611, 43113]
            if self.chain_id in testnet_ids:
                self.is_testnet = True
    
    @property
    def primary_rpc(self) -> Optional[str]:
        """Get primary RPC URL."""
        if self.rpc_urls:
            return self.rpc_urls[0]
        return self.rpc_url
    
    def validate(self) -> bool:
        """Validate chain configuration."""
        if not self.rpc_url and not self.rpc_urls:
            raise ValueError("RPC URL is required")
        
        if not self.name:
            raise ValueError("Chain name is required")
        
        if self.chain_id <= 0:
            raise ValueError("Invalid chain ID")
        
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "chain_id": int(self.chain_id),
            "name": self.name,
            "rpc_urls": self.rpc_urls or [self.rpc_url] if self.rpc_url else [],
            "explorer_url": self.explorer_url,
            "native_currency": self.native_currency,
            "is_testnet": self.is_testnet,
            "settings": self.settings,
            "gas_strategy": {
                "base_multiplier": self.gas_strategy.base_multiplier,
                "priority_multiplier": self.gas_strategy.priority_multiplier,
                "max_gas_price": self.gas_strategy.max_gas_price,
                "eip1559_enabled": self.gas_strategy.eip1559_enabled,
                "priority_fee": self.gas_strategy.priority_fee
            } if self.gas_strategy else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChainConfig':
        """Create from dictionary."""
        gas_strategy = None
        if data.get("gas_strategy"):
            gas_strategy = GasStrategy(**data["gas_strategy"])
        
        return cls(
            chain_id=data["chain_id"],
            name=data["name"],
            rpc_urls=data.get("rpc_urls"),
            explorer_url=data.get("explorer_url"),
            native_currency=data.get("native_currency"),
            gas_strategy=gas_strategy,
            is_testnet=data.get("is_testnet", False),
            settings=data.get("settings", {})
        )


class ChainManager:
    """Manage multiple blockchain configurations."""
    
    def __init__(self):
        self.chains: Dict[int, ChainConfig] = {}
        self._active_chain: Optional[ChainConfig] = None
        self._initialize_default_chains()
    
    def _initialize_default_chains(self):
        """Initialize with common chain configurations."""
        # Ethereum Mainnet
        self.add_chain(ChainConfig(
            chain_id=ChainId.MAINNET,
            name="Ethereum Mainnet",
            rpc_urls=[
                "https://eth-mainnet.g.alchemy.com/v2/",
                "https://mainnet.infura.io/v3/",
                "https://cloudflare-eth.com"
            ],
            explorer_url="https://etherscan.io",
            settings={
                "block_time": 12,
                "supports_eip1559": True,
                "multicall_address": "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696"
            }
        ))
        
        # Optimism
        self.add_chain(ChainConfig(
            chain_id=ChainId.OPTIMISM,
            name="Optimism",
            rpc_urls=[
                "https://opt-mainnet.g.alchemy.com/v2/",
                "https://mainnet.optimism.io"
            ],
            explorer_url="https://optimistic.etherscan.io",
            gas_strategy=GasStrategy(
                base_multiplier=1.05,
                priority_fee=1000000,  # 0.001 gwei
                max_gas_price=50000000000  # 50 gwei
            ),
            settings={
                "block_time": 2,
                "supports_eip1559": True
            }
        ))
        
        # Arbitrum
        self.add_chain(ChainConfig(
            chain_id=ChainId.ARBITRUM,
            name="Arbitrum One",
            rpc_urls=[
                "https://arb1.arbitrum.io/rpc",
                "https://arbitrum-mainnet.infura.io/v3/"
            ],
            explorer_url="https://arbiscan.io",
            gas_strategy=GasStrategy(
                base_multiplier=1.05,
                priority_fee=0,  # Arbitrum doesn't use priority fees
                max_gas_price=100000000000  # 100 gwei
            ),
            settings={
                "block_time": 0.25,  # ~250ms
                "supports_eip1559": False
            }
        ))
        
        # Polygon
        self.add_chain(ChainConfig(
            chain_id=ChainId.POLYGON,
            name="Polygon",
            rpc_urls=[
                "https://polygon-mainnet.g.alchemy.com/v2/",
                "https://polygon-rpc.com"
            ],
            explorer_url="https://polygonscan.com",
            native_currency={
                "name": "MATIC",
                "symbol": "MATIC",
                "decimals": 18
            },
            gas_strategy=GasStrategy(
                base_multiplier=1.2,  # Polygon can be volatile
                priority_fee=30000000000,  # 30 gwei
                max_gas_price=500000000000  # 500 gwei
            ),
            settings={
                "block_time": 2,
                "supports_eip1559": True
            }
        ))
        
        # Base
        self.add_chain(ChainConfig(
            chain_id=ChainId.BASE,
            name="Base",
            rpc_urls=[
                "https://base-mainnet.g.alchemy.com/v2/",
                "https://mainnet.base.org"
            ],
            explorer_url="https://basescan.org",
            gas_strategy=GasStrategy(
                base_multiplier=1.1,
                priority_fee=1000000,  # 0.001 gwei
                max_gas_price=10000000000  # 10 gwei
            ),
            settings={
                "block_time": 2,
                "supports_eip1559": True
            }
        ))
    
    def add_chain(self, config: ChainConfig) -> None:
        """Add a chain configuration."""
        config.validate()
        self.chains[int(config.chain_id)] = config
    
    def get_chain(self, chain_id: Union[ChainId, int]) -> ChainConfig:
        """Get chain configuration by ID."""
        chain_id_int = int(chain_id)
        if chain_id_int not in self.chains:
            raise NetworkError(f"Chain {chain_id_int} not configured")
        return self.chains[chain_id_int]
    
    def list_chains(self) -> List[Union[ChainId, int]]:
        """List all configured chain IDs."""
        return list(self.chains.keys())
    
    def set_active_chain(self, chain_id: Union[ChainId, int]) -> None:
        """Set the active chain for operations."""
        self._active_chain = self.get_chain(chain_id)
    
    @property
    def active_chain(self) -> ChainConfig:
        """Get the active chain configuration."""
        if self._active_chain is None:
            # Default to mainnet
            self._active_chain = self.get_chain(ChainId.MAINNET)
        return self._active_chain
    
    def get_rpc_url(self, chain_id: Union[ChainId, int], index: int = 0) -> str:
        """Get RPC URL for a chain."""
        config = self.get_chain(chain_id)
        if config.rpc_urls and index < len(config.rpc_urls):
            return config.rpc_urls[index]
        elif config.rpc_url:
            return config.rpc_url
        else:
            raise NetworkError(f"No RPC URL configured for chain {chain_id}")
    
    def get_gas_strategy(self, chain_id: Union[ChainId, int]) -> GasStrategy:
        """Get gas strategy for a chain."""
        config = self.get_chain(chain_id)
        return config.gas_strategy or GasStrategy()
    
    def estimate_transaction_cost(
        self,
        chain_id: Union[ChainId, int],
        gas_used: int,
        base_gas_price: int
    ) -> Dict[str, Any]:
        """Estimate transaction cost for a chain."""
        config = self.get_chain(chain_id)
        strategy = config.gas_strategy
        
        if strategy.eip1559_enabled:
            max_fee = strategy.calculate_max_fee(base_gas_price)
            priority_fee = strategy.priority_fee
            estimated_gas_price = base_gas_price + priority_fee
        else:
            estimated_gas_price = strategy.adjust_gas_price(base_gas_price)
            max_fee = estimated_gas_price
            priority_fee = 0
        
        total_cost_wei = gas_used * estimated_gas_price
        max_cost_wei = gas_used * max_fee
        
        return {
            "chain": config.name,
            "estimated_gas_price": estimated_gas_price,
            "max_gas_price": max_fee,
            "priority_fee": priority_fee,
            "gas_used": gas_used,
            "total_cost_wei": total_cost_wei,
            "max_cost_wei": max_cost_wei,
            "total_cost_gwei": total_cost_wei / 1e9,
            "total_cost_eth": total_cost_wei / 1e18
        }