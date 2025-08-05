# Implement tiered agent intelligence system

**Status**: Not Started
**Priority**: High
**Category**: Enhancement/Architecture
**Effort**: 3 days

## Description
Implement a tiered agent intelligence system inspired by IndyDevDan's multi-agent approach, using Haiku (fast/cheap), Sonnet (balanced), and Opus (strong/expensive) models strategically across our multiagent system.

## Current State Analysis
- **Current Setup**: 5-agent system with uniform model usage
- **Limitation**: All agents use same intelligence level regardless of task complexity
- **Opportunity**: 12+ agent parallel processing with intelligent model routing

## Tiered Intelligence Architecture

### Tier 1: Haiku Agents (Fast/Cheap - $0.25/$1.25 per MTok)
**Use Cases**: High-frequency, simple tasks
- **CaptureAgent**: Basic file processing and tagging
- **LinkAgent**: Simple connection detection
- **TokenMonitor**: Status checks and health monitoring
- **FileWatcher**: Directory monitoring and basic categorization

### Tier 2: Sonnet Agents (Balanced - $3/$15 per MTok) 
**Use Cases**: Complex analysis requiring reasoning
- **ReviewAgent**: Daily summaries and insights
- **EmailAgent**: Content analysis and categorization
- **RSSAgent**: Article analysis and task extraction
- **CodeAgent**: Code refactoring and optimization

### Tier 3: Opus Agents (Strong/Expensive - $15/$75 per MTok)
**Use Cases**: Strategic decisions and complex reasoning
- **PlanningAgent**: Long-term strategy and architecture decisions
- **ResearchAgent**: Deep analysis and synthesis
- **QualityAgent**: Complex validation and quality assessment
- **MetaAgent**: System optimization and agent orchestration

## Implementation Strategy

### Phase 1: Agent Classification and Model Assignment
```python
agent_model_map = {
    # Tier 1 - High frequency, simple tasks
    "CaptureAgent": "claude-3-haiku-20240307",
    "LinkAgent": "claude-3-haiku-20240307", 
    "TokenMonitor": "claude-3-haiku-20240307",
    "FileWatcher": "claude-3-haiku-20240307",
    
    # Tier 2 - Balanced analysis tasks
    "ReviewAgent": "claude-3-5-sonnet-20241022",
    "EmailAgent": "claude-3-5-sonnet-20241022",
    "RSSAgent": "claude-3-5-sonnet-20241022",
    "CodeAgent": "claude-3-5-sonnet-20241022",
    
    # Tier 3 - Strategic and complex reasoning
    "PlanningAgent": "claude-3-opus-20240229",
    "ResearchAgent": "claude-3-opus-20240229", 
    "QualityAgent": "claude-3-opus-20240229",
    "MetaAgent": "claude-3-opus-20240229"
}
```

### Phase 2: Dynamic Model Switching
```python
class IntelligentAgent:
    def __init__(self, base_model, escalation_model=None):
        self.base_model = base_model
        self.escalation_model = escalation_model
        
    def process_task(self, task):
        # Try base model first
        result = self.execute_with_model(task, self.base_model)
        
        # Escalate if confidence low or task complex
        if result.confidence < 0.7 or task.complexity > 0.8:
            if self.escalation_model:
                result = self.execute_with_model(task, self.escalation_model)
                
        return result
```

### Phase 3: Parallel Processing Expansion
- **Current**: 5 agents running concurrently
- **Target**: 12+ agents with intelligent load balancing
- **Strategy**: Queue-based task distribution with priority routing

## Cost Impact Analysis

### Current Cost Structure (Estimated)
- **All Sonnet**: ~$50/day for current volume
- **Processing**: ~1000 operations/day

### Optimized Cost Structure
- **Tier 1 (60% of tasks)**: $5/day (80% cost reduction)
- **Tier 2 (35% of tasks)**: $25/day (same quality)
- **Tier 3 (5% of tasks)**: $15/day (premium for critical tasks)
- **Total**: ~$45/day (10% savings + better quality)

## Agent Expansion Plan

### New Agents to Add
1. **PlanningAgent**: Long-term strategy and roadmap planning
2. **QualityAgent**: Validation and quality assurance
3. **MetaAgent**: System optimization and performance monitoring
4. **FileWatcher**: Real-time directory monitoring
5. **AnalyticsAgent**: Usage patterns and insights
6. **SecurityAgent**: Security monitoring and alerts
7. **BackupAgent**: Automated backup and recovery

### Enhanced Existing Agents
- **CaptureAgent**: Faster processing with Haiku
- **RSSAgent**: Better analysis with Sonnet
- **ReviewAgent**: Strategic insights with optional Opus escalation

## Implementation Tasks
- [ ] Update agent base classes to support model selection
- [ ] Implement task complexity assessment
- [ ] Build escalation logic for low-confidence results
- [ ] Create cost tracking and optimization dashboard
- [ ] Test parallel processing with 12+ agents
- [ ] Implement intelligent task routing
- [ ] Build monitoring for agent performance by tier
- [ ] Create agent orchestration system

## Success Metrics
- **Cost Optimization**: 10%+ cost reduction while maintaining quality
- **Processing Speed**: 50%+ improvement in simple tasks
- **Quality Enhancement**: 20%+ improvement in complex tasks
- **Parallel Processing**: Support for 12+ concurrent agents
- **System Reliability**: 99%+ uptime with intelligent fallbacks

## Integration Points
- **Scheduler**: Update agent configuration with model assignments
- **Cost Tracking**: Monitor spending by tier and agent
- **Quality Monitoring**: Track performance across intelligence levels
- **Task Routing**: Intelligent distribution based on complexity

## Dependencies
- Multi-agent scheduler operational (completed)
- Cost tracking infrastructure
- Agent performance monitoring system
- Task complexity assessment algorithm

## Notes
- Start with existing agents, gradually add new ones
- Monitor cost impact closely during rollout
- Consider rate limiting strategies per tier
- Plan for intelligent queue management