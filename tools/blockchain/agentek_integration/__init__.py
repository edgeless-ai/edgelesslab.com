"""Agentek-ChromaDB Integration for Blockchain Knowledge Capture.

This package provides intelligent pattern extraction, storage, and analysis
for blockchain operations using ChromaDB vector database.
"""

from .core import (
    # Agentek Wrapper
    AgentekWrapper,
    AgentekBridgeError,
    
    # Blockchain Knowledge Service
    BlockchainKnowledgeService,
    ServiceConfig,
    PatternEnricher,
    PatternStorage,
    RecommendationEngine,
    
    # Pattern Capture
    PatternCapture,
    CaptureConfig,
    PatternType,
    PatternMetadata,
    PatternExtractor,
    PatternCategorizer,
    QualityScorer,
    
    # Chain Configuration
    ChainConfig,
    ChainManager,
    ChainId,
    GasStrategy
)

__version__ = "0.2.0"
__author__ = "Agentek Integration Team"

__all__ = [
    # Main Service
    "BlockchainKnowledgeService",
    "ServiceConfig",
    
    # Pattern Components
    "PatternCapture",
    "PatternType",
    "PatternMetadata",
    
    # Chain Management
    "ChainManager",
    "ChainId",
    
    # Wrapper
    "AgentekWrapper",
]