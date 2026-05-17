---
id: task-93
title: Build RLM Infrastructure - Chunking, Aggregation, Monitoring
epic: 6-creative
status: pending
priority: P3
depends_on: [task-90, task-92]
blocks: []
created: 2026-01-27
owner: david
estimated_effort: 3-4 hours
---

# Task 93: RLM Infrastructure Components

## Goal
Build reusable infrastructure for RLM-enhanced agents: semantic chunking, result aggregation, and orchestration monitoring.

## Context
Once you have agents using RLM patterns, you'll need:
1. **Smart chunking** - Split code/markdown/logs semantically, not just by chars
2. **Result aggregation** - Merge JSON from multiple sub-agents intelligently
3. **Monitoring** - Track sub-calls, tokens, costs, latency

Without these, each agent reinvents the wheel.

---

## Prerequisites
- Completed task-90 (understand RLM basics)
- Completed task-92 (know which agents need this)

---

## Step-by-Step Instructions

### Step 1: Semantic Chunking Library
Create: `/tools/rlm-utils/chunking.py`

```python
"""Semantic chunking for different file types"""

def chunk_python_by_function(content: str) -> List[Tuple[int, int, str]]:
    """
    Split Python code by top-level functions/classes
    Returns: [(start_pos, end_pos, chunk_type), ...]
    """
    import ast
    # Parse AST, extract function/class boundaries
    # Return spans with semantic labels
    pass

def chunk_markdown_by_section(content: str) -> List[Tuple[int, int, str]]:
    """
    Split markdown by ## headers
    Returns: [(start_pos, end_pos, header_text), ...]
    """
    # Find header positions, split on ## or ###
    pass

def chunk_logs_by_entry(content: str, timestamp_pattern: str) -> List[Tuple[int, int, str]]:
    """
    Split logs by timestamp entries
    Returns: [(start_pos, end_pos, timestamp), ...]
    """
    import re
    # Find timestamp boundaries, keep entries together
    pass

def smart_chunk(
    content: str,
    file_type: str,
    max_chunk_size: int = 200_000,
    overlap: int = 0
) -> List[str]:
    """
    Auto-detect file type and chunk semantically
    Falls back to character chunking if type unknown
    """
    pass
```

### Step 2: Result Aggregation Utilities
Create: `/tools/rlm-utils/aggregation.py`

```python
"""Aggregate results from multiple sub-agent calls"""

from typing import List, Dict, Any

def merge_json_responses(
    responses: List[Dict[str, Any]],
    confidence_threshold: float = 0.5
) -> Dict[str, Any]:
    """
    Merge structured JSON from sub-agents

    Args:
        responses: List of sub-agent JSON responses
        confidence_threshold: Filter findings below this confidence

    Returns:
        Merged response with aggregated findings
    """
    # Merge 'relevant' arrays
    # Deduplicate findings
    # Aggregate confidence scores
    # Combine 'missing' fields
    pass

def calculate_consensus(
    responses: List[Dict[str, Any]],
    key: str = "answer_if_complete"
) -> Optional[str]:
    """
    Find consensus answer across sub-agents
    Returns None if no consensus
    """
    # Count identical answers
    # Return if >50% agree
    pass

def rank_findings_by_confidence(
    merged_response: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Sort findings by confidence score
    """
    pass
```

### Step 3: Orchestration Monitoring
Create: `/tools/rlm-utils/monitoring.py`

```python
"""Monitor RLM orchestration calls"""

import time
from dataclasses import dataclass, field
from typing import List

@dataclass
class SubCallMetrics:
    """Track metrics for a single sub-agent call"""
    agent_name: str
    chunk_id: str
    start_time: float
    end_time: float
    tokens_used: int = 0
    cost: float = 0.0
    success: bool = True
    error: str = ""

@dataclass
class OrchestrationSession:
    """Track entire RLM orchestration session"""
    session_id: str
    root_agent: str
    start_time: float = field(default_factory=time.time)
    sub_calls: List[SubCallMetrics] = field(default_factory=list)

    def add_sub_call(self, metrics: SubCallMetrics):
        self.sub_calls.append(metrics)

    def total_tokens(self) -> int:
        return sum(c.tokens_used for c in self.sub_calls)

    def total_cost(self) -> float:
        return sum(c.cost for c in self.sub_calls)

    def avg_latency(self) -> float:
        latencies = [c.end_time - c.start_time for c in self.sub_calls]
        return sum(latencies) / len(latencies) if latencies else 0.0

    def success_rate(self) -> float:
        if not self.sub_calls:
            return 1.0
        successes = sum(1 for c in self.sub_calls if c.success)
        return successes / len(self.sub_calls)

def log_orchestration(session: OrchestrationSession, output_path: str):
    """Save orchestration metrics to file"""
    import json
    # Convert to JSON, save to output_path
    pass
```

### Step 4: Integration Example
Create: `/tools/rlm-utils/example_usage.py`

```python
"""Example: Using RLM utils in an agent"""

from chunking import smart_chunk
from aggregation import merge_json_responses, rank_findings_by_confidence
from monitoring import OrchestrationSession, SubCallMetrics

# Load large file
with open('large_codebase.py', 'r') as f:
    content = f.read()

# Semantic chunking
chunks = smart_chunk(content, file_type='python', max_chunk_size=100_000)

# Start monitoring
session = OrchestrationSession(
    session_id='research-001',
    root_agent='research'
)

# Process chunks with sub-agents
responses = []
for i, chunk in enumerate(chunks):
    start = time.time()

    # Call sub-agent (via Task tool)
    response = call_sub_agent(f"chunk_{i}", chunk)

    # Track metrics
    metrics = SubCallMetrics(
        agent_name='rlm-subcall',
        chunk_id=f"chunk_{i}",
        start_time=start,
        end_time=time.time(),
        tokens_used=estimate_tokens(response),
        success=True
    )
    session.add_sub_call(metrics)
    responses.append(response)

# Aggregate results
merged = merge_json_responses(responses, confidence_threshold=0.7)
ranked = rank_findings_by_confidence(merged)

# Log session
log_orchestration(session, 'rlm-sessions/research-001.json')

print(f"Processed {len(chunks)} chunks")
print(f"Total tokens: {session.total_tokens()}")
print(f"Avg latency: {session.avg_latency():.2f}s")
print(f"Success rate: {session.success_rate():.1%}")
```

### Step 5: Test Infrastructure
```bash
# Create test directory
mkdir -p /tools/rlm-utils/tests

# Test chunking
python -c "
from chunking import chunk_python_by_function
with open('test_file.py') as f:
    chunks = chunk_python_by_function(f.read())
print(f'Found {len(chunks)} functions/classes')
"

# Test aggregation
python -c "
from aggregation import merge_json_responses
responses = [
    {'relevant': [{'point': 'A', 'confidence': 0.9}]},
    {'relevant': [{'point': 'B', 'confidence': 0.8}]}
]
merged = merge_json_responses(responses)
print(merged)
"
```

---

## Acceptance Criteria
- [ ] Semantic chunking implemented for Python, Markdown, Logs
- [ ] Result aggregation handles JSON merging and confidence scoring
- [ ] Monitoring tracks tokens, latency, success rate
- [ ] Example usage demonstrates all components
- [ ] Basic tests pass

---

## Verification Checklist
- [ ] `/tools/rlm-utils/` directory exists
- [ ] Can chunk Python file by function
- [ ] Can merge multiple JSON responses
- [ ] Can track orchestration session metrics
- [ ] Example usage runs without errors

---

## Artifacts
- Chunking library: `/tools/rlm-utils/chunking.py`
- Aggregation utilities: `/tools/rlm-utils/aggregation.py`
- Monitoring tools: `/tools/rlm-utils/monitoring.py`
- Example usage: `/tools/rlm-utils/example_usage.py`
- Tests: `/tools/rlm-utils/tests/`

## Integration
Once built, agents can import:
```python
from rlm_utils.chunking import smart_chunk
from rlm_utils.aggregation import merge_json_responses
from rlm_utils.monitoring import OrchestrationSession
```

## Notes
- Start simple, enhance as you use it
- Chunking is most important first
- Monitoring helps debug orchestration issues
- Keep utils lightweight and dependency-free
