# Chroma MCP User Guide

## Overview
The Chroma MCP (Model Context Protocol) server provides vector database capabilities within Claude Code, enabling semantic search, embeddings storage, and similarity matching for AI/ML applications.

## Key Features
- **Persistent Vector Storage**: Store embeddings with metadata
- **Similarity Search**: Find semantically similar content
- **Collections Management**: Organize vectors into collections
- **Metadata Filtering**: Query vectors with metadata constraints
- **Multi-modal Support**: Store text, code, and document embeddings

## Installation Status
✅ **Installed**: The Chroma MCP server is now configured in Claude Code
- **Data Directory**: `/Users/djm/claude-projects/chroma-data`
- **Mode**: Persistent (data survives restarts)

## Basic Usage

### 1. Creating a Collection
Collections are like tables in a database. Each collection stores vectors of a specific type.

```python
# Example: Create a collection for code snippets
collection_name = "code_snippets"
# Use Chroma MCP to create collection with appropriate embedding function
```

### 2. Adding Documents
Add documents with their embeddings and metadata:

```python
# Example: Store a Python function with metadata
documents = ["def calculate_similarity(vec1, vec2): ..."]
metadatas = [{"language": "python", "type": "function", "topic": "ml"}]
ids = ["func_001"]
```

### 3. Querying Vectors
Find similar documents using semantic search:

```python
# Example: Find similar code snippets
query_texts = ["function to compute vector similarity"]
n_results = 5
# Returns the most similar documents with scores
```

### 4. Metadata Filtering
Query with specific metadata constraints:

```python
# Example: Find only Python functions
where = {"language": "python", "type": "function"}
# Combines semantic search with metadata filtering
```

## Common Use Cases

### 1. Code Search Engine
- Store function definitions with documentation
- Search by natural language descriptions
- Filter by programming language or framework

### 2. Knowledge Base
- Store documentation chunks
- Enable semantic Q&A
- Link related concepts

### 3. RAG (Retrieval Augmented Generation)
- Store context documents
- Retrieve relevant information for prompts
- Improve response accuracy

### 4. Duplicate Detection
- Find similar code patterns
- Identify redundant documentation
- Detect plagiarism

## Best Practices

### Collection Design
- **One topic per collection**: Don't mix unrelated content
- **Consistent metadata**: Use standard fields across documents
- **Meaningful IDs**: Use descriptive, unique identifiers

### Performance Tips
- **Batch operations**: Add multiple documents at once
- **Index appropriately**: Use metadata for faster filtering
- **Clean old data**: Remove outdated embeddings periodically

### Data Management
- **Backup regularly**: Copy `/Users/djm/claude-projects/chroma-data`
- **Version collections**: Include version in collection names
- **Document schemas**: Track metadata field definitions

## Troubleshooting

### Common Issues

1. **Collection Already Exists**
   - Solution: Use `get_or_create_collection()` instead of `create_collection()`

2. **Embedding Dimension Mismatch**
   - Solution: Ensure all vectors in a collection have the same dimensions

3. **Memory Usage**
   - Solution: Use pagination for large result sets
   - Monitor data directory size

4. **Slow Queries**
   - Solution: Add metadata indices
   - Reduce result count (`n_results`)

### Debug Mode
The Word and Excel servers have `MCP_DEBUG=1` enabled. To enable for Chroma:
```bash
claude mcp remove chroma
claude mcp add-json "chroma" '{"command": "uvx", "args": ["chroma-mcp", "--client-type", "persistent", "--data-dir", "/Users/djm/claude-projects/chroma-data"], "env": {"MCP_DEBUG": "1"}}'
```

## Integration Examples

### With Serena (Code Analysis)
```python
# Store function embeddings from analyzed code
# Enable "find similar functions" across projects
```

### With GitHub MCP
```python
# Index repository documentation
# Search across multiple repos semantically
```

### With File System MCP
```python
# Process local documents
# Build searchable knowledge base
```

## Advanced Features

### Custom Embeddings
- Use different embedding models
- Fine-tune for specific domains
- Optimize vector dimensions

### Hybrid Search
- Combine vector similarity with keyword search
- Weight different search strategies
- Implement re-ranking

### Multi-tenancy
- Separate collections per project
- User-specific namespaces
- Access control via metadata

## Resources
- [Chroma Documentation](https://docs.trychroma.com/)
- [MCP Integration Guide](https://github.com/chroma-mcp)
- [Vector Database Best Practices](https://www.pinecone.io/learn/vector-database/)

---

**Note**: After adding new MCPs, restart Claude Code to activate them:
```bash
exit
claude
```