# Implement persona vectors for agent consistency

**Status**: Not Started
**Priority**: High
**Category**: Enhancement/AI-Safety
**Effort**: 4 days

## Description
Implement Anthropic's persona vectors research to create consistent, controllable agent personalities across our multi-agent system, using the Obsidian vault as a persistent scratch pad for persona configurations.

## Background
Based on Anthropic's groundbreaking research (arXiv:2507.21509v1), persona vectors are patterns of neural network activity that represent character traits. This technology enables:
- Monitoring personality shifts during deployment
- Controlling agent behavior through vector manipulation
- Preventing undesirable trait acquisition
- Maintaining consistent agent characteristics

## Obsidian Vault as Persona Scratch Pad

### Your Key Insight
"Our Obsidian vault can act as a scratch pad, since it's all markdown" - This is **perfect** for implementing persistent persona management!

### Vault-Based Persona Storage Structure
```
claude-vault/
├── 04-Agents/
│   ├── Personas/
│   │   ├── Research-Agent-Persona.md
│   │   ├── Creative-Agent-Persona.md
│   │   ├── Quality-Agent-Persona.md
│   │   └── Templates/
│   │       └── Agent-Persona-Template.md
│   ├── Persona-History/
│   │   └── 2025-08-05-Research-Agent-Drift-Log.md
│   └── Persona-Analytics/
│       └── Trait-Stability-Dashboard.md
```

## Implementation Strategy

### Phase 1: Persona Configuration System
```python
class PersonaVector:
    """Represents a controllable personality trait"""
    def __init__(self, trait_name, weight, description):
        self.trait_name = trait_name
        self.weight = weight  # 0.0 to 1.0
        self.description = description
        self.history = []  # Track changes over time

class AgentPersona:
    """Complete persona profile for an agent"""
    def __init__(self, agent_name, base_model):
        self.agent_name = agent_name
        self.base_model = base_model
        self.traits = {}
        self.vault_path = f"04-Agents/Personas/{agent_name}-Persona.md"
        
    def add_trait(self, trait_name, weight, description):
        self.traits[trait_name] = PersonaVector(trait_name, weight, description)
        
    def save_to_vault(self):
        """Persist persona to Obsidian vault"""
        # Generate markdown representation
        # Save to vault with version history
        pass
```

### Phase 2: Agent Persona Profiles

#### Research Agent Persona
```markdown
# Research Agent Persona Profile

**Agent**: Research Agent
**Base Model**: Claude-3-Opus
**Created**: 2025-08-05
**Version**: 1.0

## Personality Vectors

### Core Traits
- **Analytical** (0.9): Deep, systematic analysis of information
- **Thorough** (0.95): Exhaustive exploration of topics
- **Skeptical** (0.8): Questions assumptions, seeks evidence
- **Objective** (0.85): Maintains neutral, unbiased perspective

### Task-Specific Traits
- **Citation-Focused** (0.9): Always provides sources
- **Hypothesis-Driven** (0.85): Forms and tests theories
- **Cross-Reference** (0.8): Connects disparate information

## Behavioral Guidelines
- Always cite sources with [[Source-Links]]
- Create hypothesis trees in vault
- Cross-reference with existing knowledge base
- Flag uncertainty levels explicitly

## Drift Monitoring
- Last stability check: 2025-08-05
- Drift threshold: 0.15
- Alert on: Reduced skepticism, increased confirmation bias
```

#### Creative Agent Persona
```markdown
# Creative Agent Persona Profile

**Agent**: Creative Agent
**Base Model**: Claude-3-Sonnet
**Created**: 2025-08-05
**Version**: 1.0

## Personality Vectors

### Core Traits
- **Innovative** (0.95): Generates novel solutions
- **Divergent** (0.9): Explores multiple perspectives
- **Experimental** (0.85): Willing to try unconventional approaches
- **Playful** (0.7): Brings levity and creative energy

### Task-Specific Traits
- **Pattern-Breaking** (0.85): Challenges conventional thinking
- **Synthesis** (0.9): Combines unrelated concepts
- **Visual-Thinking** (0.8): Uses diagrams and metaphors

## Behavioral Guidelines
- Generate 3+ alternative solutions
- Use metaphors and analogies freely
- Create visual representations
- Challenge assumptions explicitly
```

### Phase 3: Trait Monitoring and Adjustment

```python
class PersonaMonitor:
    """Monitors agent behavior for trait drift"""
    
    def __init__(self, agent_persona, vault_path):
        self.persona = agent_persona
        self.vault = ObsidianVault(vault_path)
        self.drift_threshold = 0.15
        
    def analyze_conversation(self, messages):
        """Analyze conversation for trait expression"""
        trait_scores = {}
        for trait_name, vector in self.persona.traits.items():
            score = self.measure_trait_expression(messages, trait_name)
            trait_scores[trait_name] = score
            
            # Check for drift
            if abs(score - vector.weight) > self.drift_threshold:
                self.log_drift(trait_name, vector.weight, score)
                
        return trait_scores
        
    def log_drift(self, trait, expected, actual):
        """Log trait drift to vault for analysis"""
        drift_note = f"""
## Trait Drift Detected

**Agent**: {self.persona.agent_name}
**Trait**: {trait}
**Expected**: {expected}
**Actual**: {actual}
**Drift**: {abs(expected - actual)}
**Timestamp**: {datetime.now()}

### Recommended Actions
- Adjust system prompt
- Reinforce trait in next interaction
- Review recent conversation history
"""
        self.vault.append_to_note(
            f"Persona-History/{date.today()}-{self.persona.agent_name}-Drift-Log.md",
            drift_note
        )
```

### Phase 4: Integration with Existing Systems

#### 1. Multi-Agent Orchestration
```python
class PersonaAwareOrchestrator:
    """Orchestrates agents with persona management"""
    
    def __init__(self):
        self.agents = {}
        self.personas = {}
        
    def assign_task(self, task, required_traits):
        """Match task to agent based on persona traits"""
        best_agent = None
        best_score = 0
        
        for agent_name, persona in self.personas.items():
            score = self.calculate_trait_match(persona, required_traits)
            if score > best_score:
                best_score = score
                best_agent = agent_name
                
        return best_agent
```

#### 2. Vault Integration Benefits
- **Persistence**: Personas survive system restarts
- **Version Control**: Git tracks persona evolution
- **Transparency**: Human-readable configuration
- **Cross-Reference**: Link personas to agent outputs
- **Analytics**: Dataview queries on trait patterns

## Expected Benefits

### 1. Agent Consistency
- Predictable behavior across sessions
- Reduced personality drift
- Clear agent specialization

### 2. Task Optimization
- Match agents to tasks by trait requirements
- Improve output quality through specialization
- Reduce need for prompt engineering

### 3. Safety and Control
- Monitor for concerning trait emergence
- Prevent manipulation or jailbreaking
- Maintain ethical boundaries

### 4. System Intelligence
- Learn optimal trait combinations
- Evolve personas based on performance
- Create new specialist agents dynamically

## Implementation Tasks

### Week 1: Foundation
- [ ] Create persona vector classes
- [ ] Design vault storage schema
- [ ] Build trait monitoring system
- [ ] Create initial agent personas

### Week 2: Integration
- [ ] Integrate with existing agents
- [ ] Implement trait-based task routing
- [ ] Add drift detection and logging
- [ ] Create persona management UI

### Week 3: Optimization
- [ ] Analyze trait effectiveness
- [ ] Optimize trait weights
- [ ] Add dynamic adjustment
- [ ] Create trait combination testing

### Week 4: Production
- [ ] Deploy to all agents
- [ ] Monitor system stability
- [ ] Document best practices
- [ ] Create troubleshooting guides

## Success Metrics

### Quantitative
- **Trait Stability**: <15% drift over 7 days
- **Task Matching**: 85%+ accuracy in agent selection
- **Performance**: 20%+ improvement in specialized tasks
- **Safety**: Zero concerning trait emergences

### Qualitative
- Agents maintain distinct personalities
- Users report improved consistency
- Easier to predict agent behavior
- Simplified prompt engineering

## Dependencies
- Task 19: Develop persona system (existing)
- Task 81: Tiered agent intelligence system
- Obsidian vault infrastructure
- Agent monitoring capabilities

## Notes
- Start with 3 core personas (Research, Creative, Quality)
- Use vault's markdown for human oversight
- Consider privacy implications of trait logging
- Plan for persona backup and recovery
- This directly addresses the consistency challenge in long-running agents