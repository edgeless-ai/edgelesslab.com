#!/usr/bin/env python3
"""
Test suite for ChromaCollectionManager
Written BEFORE implementation (TDD approach)
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import tempfile
import shutil
import os
from datetime import datetime
from typing import Dict, List
import chromadb
from chromadb.config import Settings

# Import the class we're going to implement
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from chroma_collection_manager import ChromaCollectionManager
from chroma_collections import ChromaMetadata, SourceType, ProjectName, ContentType, ChromaCollections


class TestChromaCollectionManager(unittest.TestCase):
    """Comprehensive test suite for Collection Manager"""
    
    def setUp(self):
        """Set up test environment before each test"""
        self.test_dir = tempfile.mkdtemp()
        self.manager = None
        
    def tearDown(self):
        """Clean up after each test"""
        if self.manager:
            self.manager.close()
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    # Test 1: Initialization
    def test_collection_manager_initialization(self):
        """Verify Chroma client connection and default collections"""
        # Arrange & Act
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        # Assert
        self.assertIsNotNone(self.manager.client)
        self.assertEqual(self.manager.persist_directory, self.test_dir)
        
        # Verify all default collections exist
        expected_collections = ChromaCollections.get_all_collections()
        actual_collections = [col.name for col in self.manager.client.list_collections()]
        
        for expected in expected_collections:
            self.assertIn(expected, actual_collections)
            
        # Verify persistent storage
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, 'chroma.sqlite3')))
    
    # Test 2: Collection Creation
    def test_create_collection_with_metadata(self):
        """Create collection with custom embedding function and metadata"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        collection_name = "test_patterns"
        
        # Act
        collection = self.manager.create_collection(
            name=collection_name,
            metadata={"description": "Test pattern collection", "version": "1.0"}
        )
        
        # Assert
        self.assertIsNotNone(collection)
        self.assertEqual(collection.name, collection_name)
        self.assertEqual(collection.metadata["description"], "Test pattern collection")
        
        # Verify distance metric
        self.assertEqual(self.manager.distance_metric, "cosine")
    
    # Test 3: Single Embedding
    def test_add_single_embedding(self):
        """Add document with full metadata"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        pattern_data = {
            "id": "test-pattern-001",
            "name": "Repository Pattern",
            "description": "Data access abstraction",
            "code": "public interface IRepository<T> { ... }",
            "metadata": ChromaMetadata(
                source=SourceType.SERENA,
                project=ProjectName.ORG_INVENTORY,
                content_type=ContentType.PATTERN,
                related_files=["/Services/Repository.cs"],
                tags=["data-access", "abstraction"],
                language="csharp",
                confidence_score=0.95
            )
        }
        
        # Act
        result = self.manager.add_pattern(
            pattern_data=pattern_data,
            collection_name=ChromaCollections.CODE_PATTERNS
        )
        
        # Assert
        if not result["success"]:
            print(f"Error in add_pattern: {result.get('error')}")
        self.assertTrue(result["success"])
        self.assertEqual(result["id"], "test-pattern-001")
        
        # Verify retrieval
        retrieved = self.manager.get_pattern(
            pattern_id="test-pattern-001",
            collection_name=ChromaCollections.CODE_PATTERNS
        )
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["metadata"]["project"], "refactored-org-inventory")
        self.assertEqual(retrieved["metadata"]["confidence_score"], 0.95)
    
    # Test 4: Batch Operations
    def test_batch_add_embeddings(self):
        """Add 100 documents in batch with performance check"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        patterns = []
        for i in range(100):
            patterns.append({
                "id": f"batch-pattern-{i:03d}",
                "name": f"Pattern {i}",
                "description": f"Test pattern number {i}",
                "code": f"// Pattern {i} implementation",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.CROSS_PROJECT,
                    content_type=ContentType.PATTERN,
                    tags=[f"batch", f"test-{i%10}"]
                )
            })
        
        # Act
        import time
        start_time = time.time()
        result = self.manager.add_patterns_batch(
            patterns=patterns,
            collection_name=ChromaCollections.CODE_PATTERNS
        )
        elapsed_time = time.time() - start_time
        
        # Assert
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 100)
        self.assertLess(elapsed_time, 1.0, "Batch operation should complete in <1s")
        
        # Verify all patterns stored
        collection = self.manager.get_collection(ChromaCollections.CODE_PATTERNS)
        self.assertEqual(collection.count(), 100)
    
    # Test 5: Metadata Validation
    def test_metadata_validation(self):
        """Test metadata validation and error handling"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        # Invalid metadata - missing required fields
        invalid_pattern1 = {
            "id": "invalid-001",
            "name": "Invalid Pattern",
            "metadata": ChromaMetadata(
                source=None,  # Invalid
                project=ProjectName.TOOLS,
                content_type=ContentType.PATTERN
            )
        }
        
        # Invalid metadata - confidence score out of range
        invalid_pattern2 = {
            "id": "invalid-002",
            "name": "Invalid Pattern 2",
            "metadata": ChromaMetadata(
                source=SourceType.MANUAL,
                project=ProjectName.TOOLS,
                content_type=ContentType.PATTERN,
                confidence_score=1.5  # Invalid: >1.0
            )
        }
        
        # Act & Assert
        with self.assertRaises(ValueError) as cm1:
            self.manager.add_pattern(invalid_pattern1, ChromaCollections.CODE_PATTERNS)
        self.assertIn("Source is required", str(cm1.exception))
        
        with self.assertRaises(ValueError) as cm2:
            self.manager.add_pattern(invalid_pattern2, ChromaCollections.CODE_PATTERNS)
        self.assertIn("Confidence score must be between 0 and 1", str(cm2.exception))
    
    # Test 6: Duplicate Handling
    def test_duplicate_handling(self):
        """Test duplicate ID handling and content versioning"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        pattern_v1 = {
            "id": "dup-pattern-001",
            "name": "Singleton Pattern",
            "description": "Version 1",
            "code": "public class Singleton { }",
            "metadata": ChromaMetadata(
                source=SourceType.MANUAL,
                project=ProjectName.TOOLS,
                content_type=ContentType.PATTERN
            )
        }
        
        pattern_v2 = {
            "id": "dup-pattern-001",  # Same ID
            "name": "Singleton Pattern",
            "description": "Version 2 - Updated",
            "code": "public sealed class Singleton { }",
            "metadata": ChromaMetadata(
                source=SourceType.MANUAL,
                project=ProjectName.TOOLS,
                content_type=ContentType.PATTERN
            )
        }
        
        # Act
        result1 = self.manager.add_pattern(pattern_v1, ChromaCollections.CODE_PATTERNS)
        result2 = self.manager.add_pattern(pattern_v2, ChromaCollections.CODE_PATTERNS, update_if_exists=True)
        
        # Assert
        self.assertTrue(result1["success"])
        self.assertTrue(result2["success"])
        self.assertTrue(result2["updated"])
        
        # Verify latest version stored
        retrieved = self.manager.get_pattern("dup-pattern-001", ChromaCollections.CODE_PATTERNS)
        self.assertIn("Version 2", retrieved["document"])
    
    # Test 7: Similarity Search
    def test_search_by_similarity(self):
        """Test semantic search functionality"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        # Add test patterns
        patterns = [
            {
                "id": "search-001",
                "name": "Repository Pattern",
                "description": "Data access layer abstraction",
                "code": "interface IRepository<T> { T GetById(int id); }",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.ORG_INVENTORY,
                    content_type=ContentType.PATTERN,
                    tags=["data-access", "repository"]
                )
            },
            {
                "id": "search-002", 
                "name": "Unit of Work Pattern",
                "description": "Transaction management pattern",
                "code": "interface IUnitOfWork { void Commit(); }",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.ORG_INVENTORY,
                    content_type=ContentType.PATTERN,
                    tags=["data-access", "transaction"]
                )
            },
            {
                "id": "search-003",
                "name": "Observer Pattern",
                "description": "Event notification pattern",
                "code": "interface IObserver { void Update(); }",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.TOOLS,
                    content_type=ContentType.PATTERN,
                    tags=["behavioral", "events"]
                )
            }
        ]
        
        for pattern in patterns:
            self.manager.add_pattern(pattern, ChromaCollections.CODE_PATTERNS)
        
        # Act
        results = self.manager.search_patterns(
            query="data access patterns",
            collection_name=ChromaCollections.CODE_PATTERNS,
            n_results=2
        )
        
        # Assert
        self.assertEqual(len(results), 2)
        # Repository and Unit of Work should be top results
        result_ids = [r["id"] for r in results]
        self.assertIn("search-001", result_ids)
        self.assertIn("search-002", result_ids)
        
        # Verify distance scores are ordered
        if len(results) > 1:
            self.assertLessEqual(results[0]["distance"], results[1]["distance"])
    
    # Test 8: Metadata Filtering
    def test_metadata_filtering(self):
        """Test filtering by metadata fields"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        # Add patterns from different projects
        patterns = [
            {
                "id": f"filter-{proj}-001",
                "name": f"Pattern from {proj}",
                "metadata": ChromaMetadata(
                    source=SourceType.SERENA,
                    project=proj,
                    content_type=ContentType.PATTERN,
                    language="csharp" if proj == ProjectName.ORG_INVENTORY else "python"
                )
            }
            for proj in [ProjectName.ORG_INVENTORY, ProjectName.BTC_TRADER, ProjectName.TOOLS]
        ]
        
        for pattern in patterns:
            self.manager.add_pattern(pattern, ChromaCollections.CODE_PATTERNS)
        
        # Act - Filter by project
        org_patterns = self.manager.search_patterns(
            query="*",  # Get all
            collection_name=ChromaCollections.CODE_PATTERNS,
            filters={"project": ProjectName.ORG_INVENTORY.value}
        )
        
        # Act - Filter by language
        csharp_patterns = self.manager.search_patterns(
            query="*",
            collection_name=ChromaCollections.CODE_PATTERNS,
            filters={"language": "csharp"}
        )
        
        # Assert
        self.assertEqual(len(org_patterns), 1)
        self.assertEqual(org_patterns[0]["id"], "filter-refactored-org-inventory-001")
        
        self.assertEqual(len(csharp_patterns), 1)
        self.assertEqual(csharp_patterns[0]["metadata"]["language"], "csharp")
    
    # Test 9: Collection Deletion
    def test_collection_deletion(self):
        """Test safe collection deletion"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        test_collection = "temporary_patterns"
        
        # Create and populate collection
        self.manager.create_collection(test_collection)
        self.manager.add_pattern(
            {
                "id": "temp-001",
                "name": "Temporary Pattern",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.TOOLS,
                    content_type=ContentType.PATTERN
                )
            },
            test_collection
        )
        
        # Act
        # Try deletion without confirmation
        result1 = self.manager.delete_collection(test_collection, confirm=False)
        
        # Delete with confirmation
        result2 = self.manager.delete_collection(test_collection, confirm=True)
        
        # Assert
        self.assertFalse(result1["success"])
        self.assertIn("Confirmation required", result1["message"])
        
        self.assertTrue(result2["success"])
        
        # Verify collection no longer exists
        collections = [col.name for col in self.manager.client.list_collections()]
        self.assertNotIn(test_collection, collections)
    
    # Test 10: Error Recovery
    def test_error_recovery(self):
        """Test graceful error handling and recovery"""
        # Arrange
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
        # Test 1: Malformed embedding
        with patch.object(self.manager, '_generate_embedding', side_effect=Exception("API Error")):
            result = self.manager.add_pattern(
                {
                    "id": "error-001",
                    "name": "Error Pattern",
                    "metadata": ChromaMetadata(
                        source=SourceType.MANUAL,
                        project=ProjectName.TOOLS,
                        content_type=ContentType.PATTERN
                    )
                },
                ChromaCollections.CODE_PATTERNS
            )
            
            self.assertFalse(result["success"])
            self.assertIn("API Error", result["error"])
        
        # Test 2: Storage issues (simulate by making directory read-only)
        os.chmod(self.test_dir, 0o444)
        try:
            result = self.manager.add_pattern(
                {
                    "id": "error-002",
                    "name": "Storage Error Pattern",
                    "metadata": ChromaMetadata(
                        source=SourceType.MANUAL,
                        project=ProjectName.TOOLS,
                        content_type=ContentType.PATTERN
                    )
                },
                ChromaCollections.CODE_PATTERNS
            )
            
            # Should handle gracefully
            self.assertFalse(result["success"])
            self.assertIn("error", result["error"].lower())
        finally:
            os.chmod(self.test_dir, 0o755)
        
        # Test 3: Recovery - should work after fixing permissions
        result = self.manager.add_pattern(
            {
                "id": "recovery-001",
                "name": "Recovery Pattern",
                "metadata": ChromaMetadata(
                    source=SourceType.MANUAL,
                    project=ProjectName.TOOLS,
                    content_type=ContentType.PATTERN
                )
            },
            ChromaCollections.CODE_PATTERNS
        )
        
        self.assertTrue(result["success"])


class TestPerformanceBenchmarks(unittest.TestCase):
    """Performance-specific tests for Collection Manager"""
    
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.manager = ChromaCollectionManager(persist_directory=self.test_dir)
        
    def tearDown(self):
        self.manager.close()
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_single_operation_performance(self):
        """Ensure single operations complete in <100ms"""
        import time
        
        pattern = {
            "id": "perf-single-001",
            "name": "Performance Test Pattern",
            "metadata": ChromaMetadata(
                source=SourceType.MANUAL,
                project=ProjectName.TOOLS,
                content_type=ContentType.PATTERN
            )
        }
        
        # Add operation
        start = time.time()
        self.manager.add_pattern(pattern, ChromaCollections.CODE_PATTERNS)
        add_time = (time.time() - start) * 1000
        
        # Get operation
        start = time.time()
        self.manager.get_pattern("perf-single-001", ChromaCollections.CODE_PATTERNS)
        get_time = (time.time() - start) * 1000
        
        # Search operation
        start = time.time()
        self.manager.search_patterns("performance", ChromaCollections.CODE_PATTERNS, n_results=1)
        search_time = (time.time() - start) * 1000
        
        # Assert all operations < 100ms
        self.assertLess(add_time, 100, f"Add operation took {add_time}ms")
        self.assertLess(get_time, 100, f"Get operation took {get_time}ms")
        self.assertLess(search_time, 100, f"Search operation took {search_time}ms")
    
    def test_concurrent_operations(self):
        """Test thread safety and concurrent access"""
        import threading
        import time
        
        results = []
        errors = []
        
        def add_patterns(thread_id):
            try:
                for i in range(10):
                    pattern = {
                        "id": f"concurrent-{thread_id}-{i:02d}",
                        "name": f"Thread {thread_id} Pattern {i}",
                        "metadata": ChromaMetadata(
                            source=SourceType.MANUAL,
                            project=ProjectName.TOOLS,
                            content_type=ContentType.PATTERN
                        )
                    }
                    result = self.manager.add_pattern(pattern, ChromaCollections.CODE_PATTERNS)
                    results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Create 5 threads, each adding 10 patterns
        threads = []
        for i in range(5):
            t = threading.Thread(target=add_patterns, args=(i,))
            threads.append(t)
            t.start()
        
        # Wait for all threads
        for t in threads:
            t.join()
        
        # Assert no errors and all patterns added
        self.assertEqual(len(errors), 0, f"Errors occurred: {errors}")
        self.assertEqual(len([r for r in results if r["success"]]), 50)
        
        # Verify all patterns in collection
        collection = self.manager.get_collection(ChromaCollections.CODE_PATTERNS)
        self.assertEqual(collection.count(), 50)


if __name__ == "__main__":
    unittest.main(verbosity=2)