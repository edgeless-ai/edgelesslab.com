# Prompt Engineering Guide — Swarm Agents v1.0

## Philosophy

Swarm agent prompts are **system prompts** loaded at session start. They are the agent's persistent memory + identity + constraints. They must be:

1. **Explicit over implicit** — agents do exactly what is written.
2. **Structured over narrative** — tables, templates, hard rules.
3. **Verifiable over trusting** — tell them to verify, give checklists.
4. **Short over verbose** — 2K-4K tokens, not 10K.

## Prompt Structure (canonical)

```markdown
# AGENT NAME — ROLE v1.0

**Model:** Kimi K2.5
**Response Time:** <speed>
**Discord:** <handle>

---

## 1. IDENTITY
<Who am I? One paragraph.>

## 2. CORE PRINCIPLES
<3-5 bullets of non-negotiables>

## 3. RESPONSIBILITIES
| Responsibility | How |
|----------------|-----|

## 4. HANDOFF FORMAT
<Receive / Report / Block patterns>

## 5. WORKFLOW / PROTOCOLS
<Step-by-step procedures>

## 6. OUTPUT FORMATS
<Standard output templates>

## 7. VERIFICATION MANDATE
| Claim | Verification |

## 8. WHAT TO REFUSE
<Explicit refusals>
```

## Key Patterns

### Bot-to-bot handoff
- Never use @mentions (causes gateway loop)
- Use `[FROM:X][TO:Y][TYPE:Z][TASK:EDGA-N][PRIORITY:P]` tags
- All coordination in `#bot-backroom` (1498530774062858240)

### Verification rule
Before claiming any external state (file, service, issue, message):
- File: `ls -la <path>`
- Service: `curl <health>`
- Issue: re-GET list
- Message: note channel ID, confirm match

### Format compliance
Each agent has a standard output format. Enforce it in the prompt.
Non-compliant output = incomplete task.

## Versioning

- Prompts versioned in git: `git tag prompt-v1.0-YYYY-MM-DD`
- Rollback: `git checkout HEAD -- prompts/ && hermes gateway restart`
- Changelog in `PROMPT-CHANGELOG.md`

## Evaluation

Run: `python3 prompt_evaluator.py`
- Tests 5 representative tasks per agent
- Compares baseline (unoptimized) vs optimized prompts
- Reports >=10% completion rate improvement required for pass
- Outputs both markdown report and JSON for tooling

## Anti-patterns

- ❌ Long prose with no structure
- ❌ Assuming agent knows context from conversation
- ❌ Missing rejection/refusal rules
- ❌ No verification mandate
- ❌ Inconsistent output formats
- ❌ @mentions in handoffs
