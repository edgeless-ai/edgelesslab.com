#!/usr/bin/env python3
"""
ChromaCollectionManager - Manages Chroma collections for the knowledge system
Implements TDD approach - skeleton first, then make tests pass
"""

import os
import chromadb
from chromadb.config import Settings
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import json

from chroma_collections import (
    ChromaMetadata, 
    ChromaCollections, 
    MetadataValidator,
    SourceType,
    ProjectName,
    ContentType
)


class CollectionWrapper:
    """Wrapper for Chroma collection to add convenience methods"""
    def __init__(self, collection):
        self._collection = collection
        
    def count(self):
        """Get the count of items in the collection"""
        # Chromadb doesn't have a direct count method, so we get all IDs and count them
        result = self._collection.get()
        return len(result['ids']) if result and 'ids' in result else 0
    
    def __getattr__(self, name):
        """Delegate all other attributes to the wrapped collection"""
        return getattr(self._collection, name)


class ChromaCollectionManager:
    """Manages Chroma vector database collections and operations"""
    
    def __init__(self, persist_directory: str = None):
        """
        Initialize Chroma client and create default collections
        
        Args:
            persist_directory: Path to store Chroma data persistently
        """
        self.persist_directory = persist_directory or os.path.expanduser("~/claude-projects/chroma-data")
        self.distance_metric = "cosine"
        
        # Initialize Chroma client
        settings = Settings(
            persist_directory=self.persist_directory,
            anonymized_telemetry=False,
            is_persistent=True
        )
        self.client = chromadb.Client(settings)
        
        # Create default collections
        self._initialize_default_collections()
    
    def _initialize_default_collections(self):
        """Create all default collections if they don't exist"""
        for collection_name in ChromaCollections.get_all_collections():
            try:
                # Try to get collection first
                self.client.get_collection(collection_name)
            except Exception:
                # Collection doesn't exist, create it
                metadata = ChromaCollections.COLLECTION_METADATA.get(collection_name, {})
                self.client.create_collection(
                    name=collection_name,
                    metadata=metadata
                )
    
    def close(self):
        """Close the Chroma client connection"""
        # Chroma doesn't have explicit close, but we can clear references
        self.client = None
    
    def create_collection(self, name: str, metadata: Dict[str, Any] = None) -> Any:
        """
        Create a new collection with custom metadata
        
        Args:
            name: Collection name
            metadata: Optional metadata dictionary
            
        Returns:
            Collection object
        """
        collection = self.client.create_collection(
            name=name,
            metadata=metadata or {}
        )
        return collection
    
    def add_pattern(self, pattern_data: Dict[str, Any], collection_name: str, 
                   update_if_exists: bool = False) -> Dict[str, Any]:
        """
        Add a single pattern to the specified collection
        
        Args:
            pattern_data: Pattern data including metadata
            collection_name: Target collection name
            update_if_exists: Whether to update if ID exists
            
        Returns:
            Result dictionary with success status
        """
        # Validate metadata
        metadata = pattern_data.get("metadata")
        if metadata:
            issues = MetadataValidator.validate(metadata)
            if issues:
                raise ValueError(f"Metadata validation failed: {', '.join(issues)}")
        
        try:
            
            # Get collection
            collection = self.client.get_collection(collection_name)
            
            # Create document text from pattern data
            document_parts = []
            if pattern_data.get("name"):
                document_parts.append(f"Name: {pattern_data['name']}")
            if pattern_data.get("description"):
                document_parts.append(f"Description: {pattern_data['description']}")
            if pattern_data.get("code"):
                document_parts.append(f"Code: {pattern_data['code']}")
            document = "\n".join(document_parts)
            
            # Convert metadata to dict for storage, filtering out None values
            if metadata:
                metadata_dict = metadata.to_dict()
                # Chromadb doesn't accept None values, filter them out
                metadata_dict = {k: v for k, v in metadata_dict.items() if v is not None}
            else:
                metadata_dict = {}
            
            # Check if pattern exists
            pattern_id = pattern_data.get("id")
            updated = False
            
            if update_if_exists:
                try:
                    existing = collection.get(ids=[pattern_id])
                    if existing and existing['ids']:
                        # Update existing
                        collection.update(
                            ids=[pattern_id],
                            documents=[document],
                            metadatas=[metadata_dict]
                        )
                        updated = True
                except Exception:
                    # Pattern doesn't exist, will add it
                    pass
            
            if not updated:
                # Add new pattern
                collection.add(
                    documents=[document],
                    metadatas=[metadata_dict],
                    ids=[pattern_id]
                )
            
            return {
                "success": True,
                "id": pattern_id,
                "updated": updated
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pattern(self, pattern_id: str, collection_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a pattern by ID from the specified collection
        
        Args:
            pattern_id: Pattern identifier
            collection_name: Collection to search in
            
        Returns:
            Pattern data or None if not found
        """
        try:
            collection = self.client.get_collection(collection_name)
            result = collection.get(ids=[pattern_id])
            
            if result and result['ids'] and len(result['ids']) > 0:
                # Convert back from storage format
                metadata = result['metadatas'][0] if result['metadatas'] else {}
                document = result['documents'][0] if result['documents'] else ""
                
                return {
                    "id": result['ids'][0],
                    "document": document,
                    "metadata": metadata
                }
            return None
        except Exception:
            return None
    
    def add_patterns_batch(self, patterns: List[Dict[str, Any]], 
                          collection_name: str) -> Dict[str, Any]:
        """
        Add multiple patterns in batch for performance
        
        Args:
            patterns: List of pattern data
            collection_name: Target collection
            
        Returns:
            Result with success status and count
        """
        try:
            collection = self.client.get_collection(collection_name)
            
            # Prepare batch data
            documents = []
            metadatas = []
            ids = []
            
            for pattern in patterns:
                # Validate metadata if present
                metadata = pattern.get("metadata")
                if metadata:
                    issues = MetadataValidator.validate(metadata)
                    if issues:
                        raise ValueError(f"Metadata validation failed for {pattern.get('id')}: {', '.join(issues)}")
                
                # Create document
                document_parts = []
                if pattern.get("name"):
                    document_parts.append(f"Name: {pattern['name']}")
                if pattern.get("description"):
                    document_parts.append(f"Description: {pattern['description']}")
                if pattern.get("code"):
                    document_parts.append(f"Code: {pattern['code']}")
                
                documents.append("\n".join(document_parts))
                
                # Convert metadata, filtering out None values
                if metadata:
                    metadata_dict = metadata.to_dict()
                    metadata_dict = {k: v for k, v in metadata_dict.items() if v is not None}
                else:
                    metadata_dict = {}
                metadatas.append(metadata_dict)
                ids.append(pattern.get("id"))
            
            # Add all patterns in batch
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            return {
                "success": True,
                "count": len(patterns)
            }
        except Exception as e:
            return {
                "success": False,
                "count": 0,
                "error": str(e)
            }
    
    def get_collection(self, collection_name: str) -> Any:
        """
        Get a collection object by name
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            Collection object
        """
        collection = self.client.get_collection(collection_name)
        return CollectionWrapper(collection)
    
    def search_patterns(self, query: str, collection_name: str, 
                       n_results: int = 10, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Search for patterns using semantic similarity
        
        Args:
            query: Search query text
            collection_name: Collection to search
            n_results: Number of results to return
            filters: Optional metadata filters
            
        Returns:
            List of matching patterns with distances
        """
        # TODO: Implement search logic
        return []
    
    def delete_collection(self, collection_name: str, confirm: bool = False) -> Dict[str, Any]:
        """
        Delete a collection (requires confirmation)
        
        Args:
            collection_name: Collection to delete
            confirm: Confirmation flag
            
        Returns:
            Result with success status
        """
        if not confirm:
            return {
                "success": False,
                "message": "Confirmation required to delete collection"
            }
        
        try:
            self.client.delete_collection(collection_name)
            return {"success": True}
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text content
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        # TODO: Implement embedding generation
        # For now, return a dummy embedding for testing
        return [0.0] * 1536  # OpenAI embedding dimension


# Example usage
if __name__ == "__main__":
    # Initialize manager
    manager = ChromaCollectionManager()
    
    # Example pattern
    pattern = {
        "id": "example-001",
        "name": "Repository Pattern",
        "description": "Data access abstraction",
        "metadata": ChromaMetadata(
            source=SourceType.MANUAL,
            project=ProjectName.ORG_INVENTORY,
            content_type=ContentType.PATTERN,
            tags=["data-access", "repository"]
        )
    }
    
    # Add pattern
    result = manager.add_pattern(pattern, ChromaCollections.CODE_PATTERNS)
    print(f"Add result: {result}")
    
    # Clean up
    manager.close()