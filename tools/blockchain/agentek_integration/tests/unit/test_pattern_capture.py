"""Unit tests for blockchain pattern capture functionality.

These tests cover the extraction, categorization, and quality scoring
of various blockchain operation patterns.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from typing import Dict, Any, List
import json

from ...core.pattern_capture import (
    PatternCapture,
    CaptureConfig,
    PatternType,
    PatternMetadata,
    PatternExtractor,
    PatternCategorizer,
    QualityScorer,
    PatternDeduplicator,
    PatternValidationError
)


class TestPatternCapture:
    """Test pattern capture functionality for blockchain operations."""
    
    @pytest.fixture
    def capture_config(self):
        """Configuration for pattern capture testing."""
        return CaptureConfig(
            min_gas_threshold=21000,  # Minimum gas for capture
            min_value_wei=1000000000000000,  # 0.001 ETH
            capture_failed_txs=True,
            deduplication_window=300,  # 5 minutes
            quality_weights={
                "gas_efficiency": 0.3,
                "execution_speed": 0.2,
                "success_rate": 0.3,
                "value_transferred": 0.2
            }
        )
    
    @pytest.fixture
    def pattern_capture(self, capture_config):
        """Create PatternCapture instance."""
        return PatternCapture(config=capture_config)
    
    def test_capture_token_transfer_pattern(self, pattern_capture):
        """Test 1: Capture ERC20 token transfer patterns."""
        # Standard ERC20 transfer transaction
        transfer_tx = {
            "hash": "0x123abc...",
            "from": "0xSender123...",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
            "value": "0",
            "input": "0xa9059cbb000000000000000000000000recipient123000000000000000000000000000000000000000000000000000000000000000000000000000000000000003b9aca00",  # transfer(address,uint256)
            "gasUsed": "65000",
            "gasPrice": "20000000000",
            "status": "success",
            "logs": [{
                "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "topics": [
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer event
                    "0x000000000000000000000000sender123",
                    "0x000000000000000000000000recipient123"
                ],
                "data": "0x00000000000000000000000000000000000000000000000000000000003b9aca00"  # 1 USDC
            }],
            "blockNumber": 18500000,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(transfer_tx)
        
        assert pattern.type == PatternType.TOKEN_TRANSFER
        assert pattern.metadata.token_address == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        assert pattern.metadata.function_name == "transfer"
        assert pattern.metadata.amount == "1000000000"  # 1 USDC (6 decimals)
        assert pattern.metadata.gas_used == 65000
        assert pattern.metadata.gas_efficiency_score > 0
    
    def test_capture_defi_swap_pattern(self, pattern_capture):
        """Test 2: Capture DeFi swap patterns from various protocols."""
        # Uniswap V3 swap transaction
        swap_tx = {
            "hash": "0xswap123...",
            "from": "0xTrader123...",
            "to": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",  # Uniswap V3 Router
            "value": "1000000000000000000",  # 1 ETH
            "input": "0x5ae401dc...",  # multicall with swapExactETHForTokens
            "gasUsed": "185000",
            "gasPrice": "25000000000",
            "status": "success",
            "logs": [
                {
                    "address": "0xPoolAddress...",
                    "topics": [
                        "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",  # Swap event
                    ],
                    "data": "0x..." # Contains swap amounts
                }
            ],
            "blockNumber": 18500100,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(swap_tx)
        
        assert pattern.type == PatternType.DEFI_SWAP
        assert pattern.metadata.protocol == "uniswap_v3"
        assert pattern.metadata.token_in == "ETH"
        assert pattern.metadata.amount_in == "1000000000000000000"
        assert pattern.metadata.router_address == "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
        assert pattern.metadata.gas_used == 185000
    
    def test_capture_nft_operation_pattern(self, pattern_capture):
        """Test 3: Capture NFT minting and transfer patterns."""
        # NFT mint transaction
        nft_mint_tx = {
            "hash": "0xmint123...",
            "from": "0xMinter123...",
            "to": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",  # BAYC
            "value": "80000000000000000",  # 0.08 ETH mint price
            "input": "0x1249c58b",  # mint()
            "gasUsed": "150000",
            "gasPrice": "30000000000",
            "status": "success",
            "logs": [{
                "address": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
                "topics": [
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer event
                    "0x0000000000000000000000000000000000000000000000000000000000000000",  # from: null (mint)
                    "0x000000000000000000000000minter123"  # to: minter
                ],
                "data": "0x0000000000000000000000000000000000000000000000000000000000001234"  # tokenId
            }],
            "blockNumber": 18500200,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(nft_mint_tx)
        
        assert pattern.type == PatternType.NFT_MINT
        assert pattern.metadata.collection_address == "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
        assert pattern.metadata.token_id == "4660"  # 0x1234
        assert pattern.metadata.mint_price == "80000000000000000"
        assert pattern.metadata.gas_used == 150000
    
    def test_capture_contract_deployment_pattern(self, pattern_capture):
        """Test 4: Capture smart contract deployment patterns."""
        # Contract deployment transaction
        deployment_tx = {
            "hash": "0xdeploy123...",
            "from": "0xDeployer123...",
            "to": None,  # Contract creation
            "value": "0",
            "input": "0x608060405234801561001057600080fd5b50...",  # Contract bytecode
            "gasUsed": "1500000",
            "gasPrice": "20000000000",
            "status": "success",
            "contractAddress": "0xNewContract123...",
            "logs": [],
            "blockNumber": 18500300,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(deployment_tx)
        
        assert pattern.type == PatternType.CONTRACT_DEPLOYMENT
        assert pattern.metadata.deployed_address == "0xNewContract123..."
        assert pattern.metadata.deployment_cost == 1500000 * 20000000000
        assert pattern.metadata.bytecode_size == len(deployment_tx["input"]) // 2 - 1  # Hex to bytes
        assert pattern.metadata.gas_used == 1500000
    
    def test_capture_gas_optimization_pattern(self, pattern_capture):
        """Test 5: Capture gas optimization patterns from efficient operations."""
        # Batch transfer using multicall
        batch_tx = {
            "hash": "0xbatch123...",
            "from": "0xBatcher123...",
            "to": "0xMulticall...",
            "value": "0",
            "input": "0xac9650d8...",  # multicall
            "gasUsed": "120000",  # Much less than 5 individual transfers
            "gasPrice": "15000000000",
            "status": "success",
            "logs": [
                # Multiple Transfer events
                {"topics": ["0xddf252ad..."], "data": "0x..."},
                {"topics": ["0xddf252ad..."], "data": "0x..."},
                {"topics": ["0xddf252ad..."], "data": "0x..."},
                {"topics": ["0xddf252ad..."], "data": "0x..."},
                {"topics": ["0xddf252ad..."], "data": "0x..."}
            ],
            "blockNumber": 18500400,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(batch_tx)
        
        assert pattern.type == PatternType.GAS_OPTIMIZATION
        assert pattern.metadata.optimization_type == "batch_operation"
        assert pattern.metadata.operation_count == 5
        assert pattern.metadata.gas_per_operation == 24000  # 120000 / 5
        assert pattern.metadata.gas_saved > 0  # vs individual operations
    
    def test_capture_failed_transaction_pattern(self, pattern_capture):
        """Test 6: Capture patterns from failed transactions for learning."""
        # Failed transaction due to insufficient balance
        failed_tx = {
            "hash": "0xfailed123...",
            "from": "0xPoorUser123...",
            "to": "0xToken123...",
            "value": "0",
            "input": "0xa9059cbb...",  # transfer
            "gasUsed": "21000",
            "gasPrice": "20000000000",
            "status": "failed",
            "error": "execution reverted",
            "revertReason": "ERC20: transfer amount exceeds balance",
            "blockNumber": 18500500,
            "timestamp": datetime.now()
        }
        
        pattern = pattern_capture.capture_from_transaction(failed_tx)
        
        assert pattern.type == PatternType.FAILED_TRANSACTION
        assert pattern.metadata.failure_reason == "ERC20: transfer amount exceeds balance"
        assert pattern.metadata.error_category == "insufficient_balance"
        assert pattern.metadata.gas_wasted == 21000
        assert pattern.quality_score < 0.3  # Low quality due to failure
    
    def test_pattern_deduplication(self, pattern_capture):
        """Test 7: Prevent duplicate pattern capture within time window."""
        # First transaction
        tx1 = {
            "hash": "0xabc123...",
            "from": "0xUser123...",
            "to": "0xToken123...",
            "value": "0",
            "input": "0xa9059cbb...",
            "gasUsed": "65000",
            "timestamp": datetime.now()
        }
        
        # Duplicate transaction (same from, to, input within 5 minutes)
        tx2 = {
            "hash": "0xdef456...",  # Different hash
            "from": "0xUser123...",  # Same sender
            "to": "0xToken123...",   # Same recipient
            "value": "0",
            "input": "0xa9059cbb...",  # Same function
            "gasUsed": "65000",
            "timestamp": datetime.now() + timedelta(seconds=60)  # 1 minute later
        }
        
        pattern1 = pattern_capture.capture_from_transaction(tx1)
        pattern2 = pattern_capture.capture_from_transaction(tx2)
        
        assert pattern1 is not None
        assert pattern2 is None  # Deduplicated
        
        # Transaction after deduplication window
        tx3 = {
            "hash": "0xghi789...",
            "from": "0xUser123...",
            "to": "0xToken123...",
            "value": "0",
            "input": "0xa9059cbb...",
            "gasUsed": "65000",
            "timestamp": datetime.now() + timedelta(seconds=400)  # > 5 minutes
        }
        
        pattern3 = pattern_capture.capture_from_transaction(tx3)
        assert pattern3 is not None  # Not deduplicated
    
    def test_batch_pattern_capture(self, pattern_capture):
        """Test 8: Capture patterns from batch operations efficiently."""
        batch_transactions = [
            {
                "hash": f"0x{i:064x}",
                "from": f"0xUser{i:03d}...",
                "to": "0xToken123...",
                "value": "0",
                "input": "0xa9059cbb...",
                "gasUsed": str(65000 + i * 1000),
                "status": "success",
                "timestamp": datetime.now() + timedelta(seconds=i)
            }
            for i in range(10)
        ]
        
        patterns = pattern_capture.capture_batch(batch_transactions)
        
        assert len(patterns) == 10
        
        # Check aggregated metrics
        aggregated = pattern_capture.aggregate_batch_patterns(patterns)
        assert aggregated["total_patterns"] == 10
        assert aggregated["avg_gas_used"] == 69500  # 65000 + avg(0-9000)
        assert aggregated["pattern_types"]["TOKEN_TRANSFER"] == 10
    
    def test_pattern_quality_scoring(self, pattern_capture):
        """Test 9: Calculate quality scores for captured patterns."""
        scorer = QualityScorer()
        
        # High quality pattern - successful, gas efficient
        high_quality_pattern = PatternMetadata(
            type=PatternType.TOKEN_TRANSFER,
            gas_used=45000,  # Very efficient for token transfer
            gas_price=15000000000,  # Low gas price
            status="success",
            execution_time=2.5,  # Fast
            value_usd=1000
        )
        
        high_score = scorer.calculate_score(high_quality_pattern)
        assert high_score > 0.8
        
        # Low quality pattern - failed, high gas
        low_quality_pattern = PatternMetadata(
            type=PatternType.TOKEN_TRANSFER,
            gas_used=300000,  # Very high for simple transfer
            gas_price=100000000000,  # High gas price
            status="failed",
            execution_time=30,  # Slow
            value_usd=10
        )
        
        low_score = scorer.calculate_score(low_quality_pattern)
        assert low_score < 0.3
    
    def test_pattern_categorization(self, pattern_capture):
        """Test 10: Categorize patterns based on operation characteristics."""
        categorizer = PatternCategorizer()
        
        # MEV pattern - sandwich attack
        mev_tx = {
            "hash": "0xmev123...",
            "from": "0xBot123...",
            "to": "0xRouter...",
            "gasPrice": "500000000000",  # Very high priority
            "maxPriorityFeePerGas": "100000000000",
            "blockNumber": 18500000,
            "position": 0,  # First in block
            "timestamp": datetime.now()
        }
        
        category = categorizer.categorize(mev_tx)
        assert category["is_mev"] is True
        assert category["mev_type"] == "potential_sandwich"
        
        # Regular user transaction
        user_tx = {
            "hash": "0xuser123...",
            "from": "0xUser123...",
            "to": "0xToken...",
            "gasPrice": "20000000000",
            "blockNumber": 18500000,
            "position": 50,
            "timestamp": datetime.now()
        }
        
        category = categorizer.categorize(user_tx)
        assert category["is_mev"] is False
        assert category["user_type"] == "regular"
    
    def test_cross_chain_pattern_correlation(self, pattern_capture):
        """Test 11: Correlate patterns across different blockchains."""
        # Ethereum pattern
        eth_pattern = PatternMetadata(
            type=PatternType.TOKEN_TRANSFER,
            chain="ethereum",
            gas_used=65000,
            gas_price=30000000000,
            block_time=12
        )
        
        # Polygon pattern (same operation type)
        polygon_pattern = PatternMetadata(
            type=PatternType.TOKEN_TRANSFER,
            chain="polygon",
            gas_used=65000,
            gas_price=30000000,  # 1000x cheaper
            block_time=2
        )
        
        correlation = pattern_capture.correlate_cross_chain(
            [eth_pattern, polygon_pattern]
        )
        
        assert correlation["gas_price_ratio"]["ethereum_to_polygon"] == 1000
        assert correlation["speed_ratio"]["polygon_to_ethereum"] == 6
        assert correlation["cost_effectiveness"]["polygon"] > correlation["cost_effectiveness"]["ethereum"]
    
    def test_temporal_pattern_tracking(self, pattern_capture):
        """Test 12: Track patterns over time to identify trends."""
        # Generate patterns over time
        temporal_patterns = []
        base_time = datetime.now() - timedelta(days=7)
        
        for day in range(7):
            for hour in [2, 10, 18]:  # Different times of day
                pattern = PatternMetadata(
                    type=PatternType.DEFI_SWAP,
                    timestamp=base_time + timedelta(days=day, hours=hour),
                    gas_price=20000000000 + (hour * 1000000000),  # Higher during day
                    volume_usd=100000 * (2 if hour == 10 else 1)  # Peak at 10am
                )
                temporal_patterns.append(pattern)
        
        analysis = pattern_capture.analyze_temporal_patterns(temporal_patterns)
        
        assert analysis["peak_hours"] == [10]  # 10am is peak
        assert analysis["low_gas_hours"] == [2]  # 2am has lowest gas
        assert analysis["weekly_trend"] is not None
        assert len(analysis["daily_patterns"]) == 7


class TestPatternExtractor:
    """Test pattern extraction from raw transaction data."""
    
    def test_extract_function_signature(self):
        """Test 13: Extract function signatures from input data."""
        extractor = PatternExtractor()
        
        # ERC20 transfer
        transfer_input = "0xa9059cbb000000000000000000000000recipient0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003b9aca00"
        sig = extractor.extract_function_signature(transfer_input)
        assert sig == "transfer(address,uint256)"
        
        # Uniswap swap
        swap_input = "0x38ed1739..."  # swapExactTokensForTokens
        sig = extractor.extract_function_signature(swap_input)
        assert sig == "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
    
    def test_decode_event_logs(self):
        """Test 14: Decode event logs to extract pattern data."""
        extractor = PatternExtractor()
        
        # ERC20 Transfer event
        transfer_log = {
            "address": "0xToken...",
            "topics": [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x000000000000000000000000sender123",
                "0x000000000000000000000000recipient456"
            ],
            "data": "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"  # 1 ETH
        }
        
        decoded = extractor.decode_event_log(transfer_log)
        assert decoded["event"] == "Transfer"
        assert decoded["from"] == "0xsender123"
        assert decoded["to"] == "0xrecipient456"
        assert decoded["value"] == "1000000000000000000"
    
    def test_identify_protocol(self):
        """Test 15: Identify DeFi protocol from contract address."""
        extractor = PatternExtractor()
        
        protocols = {
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "uniswap_v2",
            "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45": "uniswap_v3",
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F": "sushiswap",
            "0x1111111254fb6c44bAC0beD2854e76F90643097d": "1inch"
        }
        
        for address, expected_protocol in protocols.items():
            protocol = extractor.identify_protocol(address)
            assert protocol == expected_protocol


if __name__ == "__main__":
    pytest.main([__file__, "-v"])