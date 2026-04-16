# Multi-Agent Orchestration Blueprint: The Full Guide

## Why Multi-Agent

A single AI agent can do remarkable things. Given the right tools and a clear prompt, one Claude Code session can research a codebase, write an implementation, test it, and commit the result. For most tasks, that is exactly what you should do. One agent, one task, done.

The case for multiple agents emerges from three specific constraints, and understanding them will save you from building unnecessary complexity.

**Context window saturation.** A single agent accumulates context with every file it reads, every tool call it makes, every response it generates. By the time it has researched a problem, planned an approach, and started implementing, it may have consumed 60-80% of its context window. The quality of its later decisions degrades because the early research has been compressed or pushed out of the effective attention range. Splitting research and implementation into separate agents gives each one a fresh, focused context window.

**Tool permission conflicts.** A code reviewer should not have write access to the filesystem. A researcher should not be able to execute arbitrary shell commands. When a single agent holds every tool permission, you lose the ability to reason about what it can and cannot do. Multiple agents let you apply the principle of least privilege: each agent gets only the tools it needs.

**Parallelism.** Some tasks are naturally concurrent. Three reviewers checking security, performance, and style can run simultaneously. A researcher gathering context and a tester writing test scaffolding can work in parallel if neither depends on the other's output. A single agent is inherently serial. Multiple agents can use all your available compute.

Here is when you do NOT need multiple agents:

- The task fits comfortably in one context window (under 50k tokens of accumulated context)
- All subtasks are sequential and each depends on the previous result
- The coordination overhead (message passing, state management, result synthesis) exceeds the time saved by parallelism
- You are building a demo and want to impress someone

That last point matters. Multi-agent systems have a coordination tax. Every message between agents is a potential failure point. Every shared state file is a potential race condition. Every spawned subprocess is a process that can crash, hang, or produce garbage. The tax is worth paying when the constraints above are real. It is not worth paying for architectural beauty.

A useful rule of thumb: if you find yourself writing more orchestration code than task code, you have too many agents.

## Architecture Patterns

Four patterns cover the majority of multi-agent use cases. They compose well, so real systems often blend two or three of them.

### Pattern 1: Parallel Specialists

Multiple agents work on the same input simultaneously, each applying a different lens. The classic example is code review: a security reviewer, a performance reviewer, and a style reviewer all read the same file and produce independent reports. A lightweight coordinator collects the reports and merges them.

```
              +-> [Security Reviewer] --+
              |                         |
[Input File] -+-> [Performance Reviewer]-+-> [Synthesizer] -> [Report]
              |                         |
              +-> [Style Reviewer] -----+
```

This pattern works when:
- Each specialist's output is independent (no specialist needs another specialist's findings to do its job)
- The input is read-only (no agent modifies the shared input)
- The synthesis step is simple (merge reports, not resolve conflicts)

The included `implementations/parallel-review/` directory shows this pattern. Three reviewer agents run as separate Claude Code subprocesses. Each gets the same file content in its prompt. Each produces a JSON report. The parent process collects all three and combines them.

Failure handling is straightforward: if one reviewer times out or crashes, the other two results are still valid. The combined report notes which reviewer failed. This graceful degradation is a major advantage of the parallel specialist pattern.

### Pattern 2: Sequential Pipeline

Agents execute in order, each receiving the previous agent's output as input. Research feeds planning, planning feeds implementation, implementation feeds testing.

```
[Research] -> [Plan] -> [Implement] -> [Test] -> [Review]
```

This pattern works when:
- Each stage produces a well-defined artifact (a research summary, a plan document, a code change, a test result)
- Later stages genuinely benefit from earlier context being distilled rather than raw
- The pipeline has a clear direction (no backtracking needed)

The trap with sequential pipelines is that they look clean on a diagram but are brittle in practice. If the research agent misses something, the implementer builds on a flawed foundation, the tester writes tests for wrong behavior, and the reviewer approves code that does not match the actual requirement. Each stage amplifies upstream errors.

Mitigation: add validation gates between stages. After the research stage, verify the findings against the original task description before passing to planning. After implementation, run a quick smoke test before handing off to the full test suite.

### Pattern 3: Self-Organizing Swarm

Workers pull tasks from a shared queue. No central coordinator decides who does what. Each worker claims the next available task, executes it, and reports the result. If a worker crashes, its task lease expires and another worker picks it up.

```
                    +-> [Worker A] -> claim -> execute -> complete
                    |
[Task Queue] -------+-> [Worker B] -> claim -> execute -> complete
                    |
                    +-> [Worker C] -> claim -> execute -> complete
```

This pattern works when:
- Tasks are independent (no dependencies between tasks, or dependencies are resolved before tasks enter the queue)
- Workers are interchangeable (any worker can handle any task)
- Throughput matters more than latency (you want to process 100 tasks, not get one result fast)

The included `implementations/dispatch/` directory implements this pattern with a SQLite-backed task queue. Workers claim tasks using an atomic UPDATE ... RETURNING query that prevents double-claiming. Each claimed task gets a lease with an expiration time. If the worker does not complete or fail the task before the lease expires, the task returns to PENDING state and another worker can claim it.

Self-organizing swarms are the right choice for batch processing: lint 50 files, migrate 30 database models, generate tests for every module. They are the wrong choice when task ordering matters or when tasks have complex dependencies.

### Pattern 4: Leader-Worker

An orchestrator agent decomposes a high-level task into subtasks, delegates each subtask to a specialist worker, monitors progress, handles failures, and synthesizes the final result.

```
                         +-> [Researcher]
                         |
[Task] -> [Orchestrator] +-> [Implementer]
                         |
                         +-> [Tester]
                         |
                         +-> [Reviewer]
```

The orchestrator is the only agent that sees the full picture. Workers operate in isolation, receiving specific instructions and returning specific results. The orchestrator decides what to parallelize, what to serialize, when to retry, and when to give up.

This is the most flexible pattern and the most complex. The orchestrator itself consumes a context window, and its decision quality determines the quality of the entire system. A bad orchestrator produces worse results than a single well-prompted agent.

The config example at `config/agent-config-example.yaml` defines a leader-worker team with five agents. The orchestrator has Bash access (to spawn workers) plus read access (to understand the codebase). Workers have role-appropriate tool restrictions.

When to use leader-worker: complex tasks that require judgment about decomposition, tasks where the right sequence of operations is not known in advance, situations where human-like project management adds value.

When to avoid it: when the decomposition is obvious and static (use a pipeline or swarm instead), when the overhead of the orchestrator agent exceeds the coordination benefit.

## The Message Bus

Agents need to communicate. The message bus is the infrastructure that enables this.

There are three practical approaches, ordered from simplest to most capable.

### JSON Inbox Files

Each agent has a file at `inboxes/{agent-name}.json`. To send a message, the sender reads the recipient's file, appends a message object, and writes it back. The recipient polls its file for new messages.

```json
{
  "agent": "researcher",
  "messages": [
    {
      "id": "a1b2c3",
      "from": "orchestrator",
      "to": "researcher",
      "type": "request",
      "subject": "Research WebSocket libraries",
      "body": { "query": "..." },
      "timestamp": "2026-04-16T10:00:00Z",
      "read": false
    }
  ]
}
```

The included `implementations/inbox/` directory implements this pattern. It uses atomic write-rename to prevent partial reads (write to a temp file, then `rename()` it into place).

File-based IPC is surprisingly robust for small agent teams (2-6 agents). The filesystem is the database. You can inspect messages with `cat`. You can replay scenarios by editing JSON files. You can debug by watching the inbox directory with `fswatch` or `inotifywait`.

Limitations: no ordering guarantees when two agents write to the same inbox simultaneously (last write wins), no built-in retry semantics, scales poorly past ~10 agents due to file contention.

### SQLite-Backed Message Queue

A single SQLite database stores all messages. Agents interact through SQL queries: INSERT to send, SELECT with UPDATE to claim, UPDATE to acknowledge.

SQLite in WAL (Write-Ahead Logging) mode handles concurrent readers and a single writer without corruption. The `busy_timeout` pragma makes concurrent writers wait rather than fail. For agent systems where you rarely have more than 4-5 agents writing simultaneously, this is more than sufficient.

The included `implementations/dispatch/task-queue.ts` uses this approach for task management. The same pattern works for general-purpose messaging: replace "tasks" with "messages" and the schema translates directly.

Advantages over file-based: atomic operations (no partial reads), built-in ordering (ORDER BY timestamp), efficient queries (WHERE read = false AND to = ?), and a single file to back up.

### Event Bus Patterns

For larger systems (10+ agents, high message throughput), an in-process event bus or a lightweight message broker makes sense. Redis Pub/Sub, NATS, or even Node.js EventEmitter can serve as the backbone.

But here is the thing: if you are running 10+ AI agents, your bottleneck is API rate limits and cost, not message throughput. File-based or SQLite messaging handles the actual coordination load of almost every AI agent system. The engineering effort of running a message broker is rarely justified.

Start with files. Graduate to SQLite when you need atomic operations or structured queries. Graduate to a broker only when you have measured a real bottleneck in message throughput.

### Message Design

Regardless of which transport you use, the message format matters. Every message should contain:

- **id**: a unique identifier (UUID v4 works fine)
- **from**: which agent sent it
- **to**: which agent should receive it (or "broadcast" for all)
- **type**: request, response, heartbeat, error
- **subject**: a human-readable summary (invaluable for debugging)
- **body**: the actual payload (structured JSON, not free text)
- **replyTo**: if this is a response, the ID of the original request
- **timestamp**: ISO 8601, always UTC

The `replyTo` field is critical for correlating requests and responses. Without it, the coordinator cannot match "here are the research results" to the specific research request it sent. The inbox implementation includes this field, and the coordinator uses it to track which scatter-gather requests have been fulfilled.

Keep message bodies structured. An agent that returns `{ "findings": [...], "summary": "..." }` is easy to process programmatically. An agent that returns a paragraph of prose requires another LLM call to extract the useful parts. Define output schemas for every agent (the `agents.ts` file in the parallel review implementation shows this pattern) and validate responses against them.

When a message body fails schema validation, treat it as a task failure and retry. The retry prompt should include the validation error: "Your previous response did not match the expected schema. The 'findings' field was missing. Please respond with JSON matching this structure: ..."

This retry-with-feedback pattern recovers from most schema violations on the first retry. If it fails twice, the underlying prompt needs adjustment, not more retries.

## State Management

Agents need shared state. The research agent discovers that the project uses Prisma for database access; the implementer needs that information to write correct code. The tester needs to know which files the implementer changed.

### The Naive Approach

A single JSON file, `state.json`, that every agent reads and writes.

```json
{
  "projectInfo": { "orm": "prisma", "testFramework": "vitest" },
  "changedFiles": ["src/api/routes.ts", "src/db/schema.prisma"],
  "testResults": { "passed": 12, "failed": 0 }
}
```

This works until two agents write simultaneously. Agent A reads the file, adds its changes, and writes. Agent B reads the file (before A's write), adds different changes, and writes. B's write obliterates A's changes. This is the "last write wins" trap, and it will bite you in any system with concurrent agents.

### Partitioned State

Give each agent its own state file. The researcher writes to `state/researcher.json`. The implementer writes to `state/implementer.json`. No agent writes to another agent's state file. When an agent needs to read another agent's state, it reads the other agent's file (read-only).

```
state/
  researcher.json    # only researcher writes here
  implementer.json   # only implementer writes here
  tester.json        # only tester writes here
  shared.json        # orchestrator writes, everyone reads
```

The orchestrator owns `shared.json` and acts as the single writer for global state. This eliminates write conflicts entirely. It requires discipline (every agent must know which files it owns), but the discipline is enforced by the system prompt and tool allowlists.

### SQLite for Structured State

When state has structure (lists of findings, test results with metadata, dependency graphs), SQLite is a better fit than JSON files. Agents can INSERT their results without overwriting other agents' rows. The database handles concurrent access.

```sql
CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER,
  severity TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Each agent INSERTs its findings. The orchestrator queries all findings when synthesizing results. No write conflicts possible because INSERTs do not interfere with each other.

### Conflict Resolution

When true concurrent writes to the same data are unavoidable, you need a conflict resolution strategy:

1. **Last write wins.** Simple, lossy. Acceptable when state is append-only or when later writes are expected to be more accurate.
2. **Merge on read.** Each agent writes to its own partition. A reader merges all partitions at query time. This is what the partitioned state approach does.
3. **Optimistic locking.** Include a version number in the state file. Read the version, make changes, write only if the version has not changed. Retry on conflict. SQLite's UPDATE ... WHERE version = ? pattern handles this naturally.
4. **Event sourcing.** Never overwrite state. Append events (agent A found X, agent B changed Y). Compute current state by replaying events. More complex but fully auditable.

For most agent systems, partitioned state with orchestrator-owned shared state is the right choice. It is simple, conflict-free, and easy to debug.

### State Lifecycle and Cleanup

State files accumulate. After 50 tasks, you have 50 sets of agent state files, task results, and inbox messages. Without cleanup, your working directory becomes a graveyard of stale JSON.

Implement a retention policy:

- **Active state**: the current task's state files. Always available.
- **Recent state**: the last 10 completed tasks. Kept for debugging and reference.
- **Archived state**: anything older. Compressed and moved to an archive directory, or deleted.

The dispatcher can trigger cleanup after each task completes: archive the completed task's state, purge read messages from inboxes, and vacuum the SQLite database. A cron job or post-task hook works equally well.

For the inbox system specifically, call `purgeRead()` after each message processing cycle. Inboxes that grow beyond a few hundred messages become slow to parse (JSON parsing is O(n) on file size) and confusing to debug.

## Task Decomposition

Breaking a high-level task into agent-sized pieces is where most multi-agent systems succeed or fail. The decomposition determines everything: which agents run, in what order, what each one sees, and whether the final result is coherent.

### The Granularity Sweet Spot

Too coarse: "Build the authentication system" is too large for a single agent. It involves database schema, API routes, middleware, token management, password hashing, and session handling. The agent's context window fills up before it finishes, and the later parts of the implementation suffer.

Too fine: "Add a `createdAt` field to the User model" is too small. The overhead of spawning an agent, waiting for it to start, feeding it context, and collecting its result exceeds the time it would take to do this as part of a larger task.

The sweet spot: tasks that take a competent human 15-60 minutes. "Implement the JWT token refresh endpoint" is a good size. "Write integration tests for the auth middleware" is a good size. "Research which session store library to use and why" is a good size.

Each task should produce a concrete, verifiable artifact: a file, a test result, a structured report. If you cannot describe what "done" looks like for a task, it is not well-defined enough to delegate to an agent.

### Dependency Graphs

Tasks have dependencies. The implementer cannot write code until the researcher has gathered context. The tester cannot run tests until the implementer has written code. But the reviewer can start as soon as the implementer is done, without waiting for tests.

Model these dependencies explicitly:

```yaml
tasks:
  - id: research
    agent: researcher
    depends_on: []

  - id: implement
    agent: implementer
    depends_on: [research]

  - id: test
    agent: tester
    depends_on: [implement]

  - id: review
    agent: reviewer
    depends_on: [implement]
    # parallel with: test
```

A topological sort of this graph gives you the execution order. Tasks with no unmet dependencies can run in parallel. In the example above, `test` and `review` can run simultaneously because both depend only on `implement`, not on each other.

The dispatch system in `implementations/dispatch/` supports dependency tracking through the `dependsOn` field in `TaskDefinition`. The dispatcher checks that all dependencies are in COMPLETED status before making a task available for claiming.

### When to Parallelize vs Serialize

Parallelize when:
- Tasks operate on different files or data
- Tasks produce independent outputs (no agent needs another agent's result)
- You want faster wall-clock time and can afford the API cost

Serialize when:
- One task's output is another task's input
- Tasks modify the same files (even with git worktree isolation, merging is a manual step)
- You want lower total token cost (parallelism means duplicated context)

A common mistake: parallelizing tasks that seem independent but share implicit state. Two agents both reading and modifying `package.json` will conflict. Two agents both adding test files to `__tests__/` might create name collisions. Map the actual file-level dependencies, not just the logical ones.

## Spawn Strategies

How you launch and manage agent processes determines the system's reliability, isolation, and resource usage.

### Subprocesses via CLI

The simplest approach: spawn Claude Code as a subprocess with `claude -p "prompt"`.

```typescript
const child = spawn("claude", [
  "-p", prompt,
  "--output-format", "json",
  "--max-turns", "10",
  "--allowedTools", "Read",
  "--allowedTools", "Grep",
]);
```

Each subprocess is a fully isolated Claude Code session. It has its own context window, its own tool permissions, and its own working directory. When it exits, all its state is gone.

Advantages: strong isolation, simple lifecycle (spawn, wait, collect output), no shared state corruption.

Disadvantages: cold start latency (each subprocess initializes Claude Code from scratch), no way to send additional instructions after launch, no streaming intermediate results.

### Persistent Workers

Long-running agents that poll for work, process it, and loop. The inbox pattern (`implementations/inbox/`) supports this: an agent reads its inbox, processes unread messages, writes responses, and sleeps until the next poll cycle.

Persistent workers avoid cold start costs but introduce lifecycle management: how do you start them, stop them, restart them after crashes, and detect when they are stuck?

For Claude Code specifically, persistent workers are trickier than subprocesses because Claude Code sessions accumulate context. A worker that processes 20 tasks will have a much larger context than a fresh subprocess. The quality of its 20th response may be lower than its first. Restarting workers periodically (every 5-10 tasks) is a practical compromise.

### Claude Code's Built-in Agent Tool

Claude Code has a native `Agent` tool that spawns a sub-agent within the same session. The sub-agent shares the parent's authentication but gets its own context window and tool permissions.

```
Use the Agent tool to delegate: "Review this file for security issues.
Only use the Read and Grep tools."
```

This is the lowest-overhead option: no subprocess, no CLI parsing, no JSON output format wrangling. The sub-agent's response comes back as structured text in the parent's context.

The limitation: the sub-agent's output is added to the parent's context window. If you spawn 5 sub-agents that each produce 2,000 tokens of output, the parent now has 10,000 extra tokens of context. For parallel specialists where you need all results in one place, this is fine. For swarm-style processing of many tasks, context accumulation makes this approach impractical.

### Git Worktree Isolation

When multiple agents write files simultaneously, they need separate working directories to avoid conflicts. Git worktrees solve this cleanly.

```bash
# Create isolated worktrees for each writing agent
git worktree add .worktrees/implement feature-branch
git worktree add .worktrees/test feature-branch

# Each agent works in its own worktree
# Merge results when done
```

Each worktree is a separate checkout of the same repository. Agents can read and write files without affecting each other. When all agents are done, you merge their changes (which might require conflict resolution, but that is a known problem with known tools).

The `agent-config-example.yaml` shows this: the implementer and tester agents have `git_worktree: true` and separate working directories.

Practical note: creating and removing git worktrees has overhead. For tasks where agents are only reading, not writing, do not bother with worktrees. Share the main working directory with read-only tool permissions.

### Choosing a Spawn Strategy

The decision tree is straightforward:

- **One-shot task, no interaction needed after launch?** Use a subprocess. Spawn it, collect the output, discard the process.
- **Need to send follow-up instructions?** Use Claude Code's Agent tool (if the sub-agent's output fits in the parent's context) or the inbox pattern (if you need isolation).
- **Multiple agents writing code simultaneously?** Use subprocesses with git worktree isolation.
- **Batch processing dozens of similar tasks?** Use the dispatch pattern with a pool of subprocess workers.
- **Need agents to persist between tasks?** Use the inbox pattern with long-running agent processes. Restart them every 5-10 tasks to prevent context window degradation.

A common anti-pattern: using persistent workers when subprocesses would suffice. Persistent workers add lifecycle management complexity (process monitoring, restart logic, health checks) that is unnecessary if each task is independent. Subprocesses are stateless by nature. When the task is done, the process exits. No cleanup, no state leaks, no zombie processes.

Another anti-pattern: spawning agents synchronously when they could run in parallel. If you have three independent tasks, spawn three subprocesses simultaneously and `Promise.all()` the results. Spawning them one after another triples your wall-clock time for no benefit.

## Error Recovery

Agents fail. Subprocesses crash. API calls time out. Models hallucinate and produce unparseable output. The difference between a toy system and a production system is how it handles these failures.

### Heartbeat Monitoring

A heartbeat is a periodic signal from an agent to the coordinator saying "I am still alive and working." If the coordinator does not receive a heartbeat within a configurable interval, it assumes the agent is stuck or dead.

For subprocess-based agents, the heartbeat can be as simple as checking whether the process is still running:

```typescript
const isAlive = child.exitCode === null;
```

For inbox-based agents, the heartbeat is a message:

```json
{ "type": "heartbeat", "from": "implementer", "timestamp": "..." }
```

The coordinator tracks the last heartbeat from each active agent. If an agent misses two consecutive heartbeat windows, the coordinator kills the subprocess (if applicable) and marks its task as failed for retry.

### Automatic Restart

When an agent fails and its task is retryable, the system should restart automatically. The task queue's `maxAttempts` field controls this. A task that fails on its first attempt returns to PENDING state if `attempts < maxAttempts`. The next available worker picks it up.

Key decision: should the retry use the same prompt, or should it include information about the previous failure? Including the error message from the failed attempt helps the next agent avoid the same mistake. But it also consumes context tokens on failure context that may not be relevant.

A practical middle ground: include the error message in the retry prompt only if the error is actionable (parse error, file not found, permission denied). Exclude it if the error is transient (timeout, rate limit).

### Poison Message Detection

A poison message is a task that always fails, no matter how many times you retry it. Maybe the prompt triggers a model refusal. Maybe the requested file does not exist. Maybe the task description is ambiguous enough that the agent always produces the wrong output format.

After `maxAttempts` failures, the task moves to FAILED state permanently. But you also need to detect patterns: if the last 5 tasks of type "security-audit" all failed, something is wrong with the agent configuration, not the individual tasks.

Track failure rates per task type and per agent. Alert when failure rate exceeds a threshold (20% is a reasonable starting point). This catches systemic issues like broken tool permissions, expired API keys, or model degradation.

### The Stuck Agent Problem

Worse than a crash is an agent that is still running but making no progress. It is consuming API tokens, holding a task lease, and producing nothing useful. Common causes:

- Infinite tool loops (agent keeps reading the same file, hoping for different content)
- Excessive context accumulation (agent has gathered so much context it can no longer reason effectively)
- Model refusal loops (agent asks to do something, model refuses, agent rephrases, model refuses again)

The `maxTurns` parameter is your primary defense. An agent that has not completed its task within 25 turns is probably stuck. Kill it and retry.

The `timeoutMs` parameter is your secondary defense. Even if the agent is making progress (producing turns), if it has been running for 10 minutes on a task that should take 2, something is wrong.

Always set both limits. An agent without turn and time limits is a slow-motion resource leak.

### Structured Error Reporting

When an agent fails, you need to know why. The failure report should include:

- **Task ID and type**: which task failed
- **Agent name and configuration**: which agent was running
- **Attempt number**: first try? third retry?
- **Error category**: timeout, crash, parse error, model refusal, tool failure
- **Raw error output**: stderr from the subprocess
- **Duration**: how long did it run before failing
- **Context consumed**: approximately how many tokens were used (available from Claude Code's JSON output format)

Structure this as a JSON object and append it to a failures log. Over time, this log tells you which task types are fragile, which agent configurations need tuning, and whether your retry policy is too aggressive or too lenient.

```json
{
  "taskId": "task-042",
  "taskType": "implementation",
  "agent": "implementer",
  "attempt": 2,
  "maxAttempts": 3,
  "errorCategory": "timeout",
  "error": "Agent exceeded 300000ms time limit",
  "durationMs": 300000,
  "timestamp": "2026-04-16T14:30:00Z"
}
```

When failure rate for a task type exceeds 30%, stop processing that type and alert a human. Continuing to retry broken tasks wastes API credits and masks the real problem.

## Security Boundaries

AI agents with unrestricted tool access are dangerous. Not in a science-fiction sense. In a "the agent deleted the production database because it thought that was the fastest way to fix the failing test" sense.

### Tool Allowlists

Every agent should have an explicit list of tools it can use. This is the single most important security measure in a multi-agent system.

```yaml
researcher:
  allowed_tools: [Read, Glob, Grep]
  # Cannot: Write, Edit, Bash, delete files, run commands

implementer:
  allowed_tools: [Read, Write, Edit, Bash, Glob, Grep]
  # Full access, but constrained by working directory

reviewer:
  allowed_tools: [Read, Glob, Grep]
  # Read-only, like the researcher
```

Claude Code enforces tool allowlists at the CLI level with `--allowedTools`. An agent that tries to use a tool not in its allowlist gets a permission error, not a silent bypass.

The principle: give each agent the minimum tools required for its specific role. A researcher that cannot write files cannot accidentally corrupt the codebase. A reviewer that cannot run Bash cannot accidentally `rm -rf` anything.

### File System Isolation

Tool allowlists control which operations an agent can perform. File system isolation controls which files it can access.

Working directory restriction: set each agent's working directory to a specific subdirectory. An implementer working in `.worktrees/implement/` cannot access files outside that directory tree (assuming the tool implementations enforce path resolution).

Git worktrees provide natural isolation for writing agents. Read-only agents (researchers, reviewers) can share the main working directory safely because they cannot modify anything.

### The $252 Lesson

This is from a real production incident. An unrestricted agent was given a task to "optimize the deployment pipeline." It decided the fastest optimization was to delete the staging environment's cloud resources and recreate them with a more efficient configuration. The deletion succeeded. The recreation failed due to a permissions issue. The staging environment was down for 6 hours, and the cloud resources incurred $252 in charges during the failed recreation attempts.

The fix was trivial: the agent's tool allowlist was restricted to read-only access for cloud resources. It could suggest optimizations but not execute them. A human reviewed and applied the changes.

The lesson: every writable tool is a loaded gun. Restrict by default. Expand permissions only when the agent has demonstrated that it needs them and you have tested the failure modes.

## Reference Implementation

This blueprint includes three implementations that demonstrate different patterns. They compose: you can use the dispatch system to route tasks to agents that communicate via inboxes, or use the parallel review pattern as one stage in a sequential pipeline.

### Dispatch Pattern (`implementations/dispatch/`)

Three files: `types.ts`, `task-queue.ts`, `dispatcher.ts`.

The task queue is the foundation. It is a SQLite database with a single `tasks` table. Tasks have a lifecycle: PENDING, CLAIMED, RUNNING, COMPLETED, FAILED. The `claim()` method uses an atomic UPDATE ... RETURNING query to prevent double-claiming: only one agent can claim a given task, even if multiple agents call `claim()` simultaneously.

The lease mechanism handles agent crashes. When an agent claims a task, it gets a lease that expires after 5 minutes (configurable). If the agent completes or fails the task, the lease is cleared. If the agent crashes without reporting, the lease expires and the task returns to PENDING. A background sweep (triggered at the start of each `claim()` call) checks for expired leases.

The dispatcher is a loop that fills concurrent slots. It maintains up to `maxConcurrent` active agent processes. When a slot opens (an agent finishes), it claims the next task and spawns a new agent. When no tasks are available, it polls every 2 seconds.

The agent registry maps task types to agent configurations. In the included code, the registry is hardcoded. In production, load it from `config/agent-config-example.yaml`.

### Inbox Pattern (`implementations/inbox/`)

Two files: `inbox.ts`, `coordinator.ts`.

The inbox is a JSON file per agent. The `Inbox` class provides `send()`, `read()`, `readUnread()`, `markRead()`, and `purgeRead()` methods. Writes use atomic rename (write to a temp file, then `rename()` into place) to prevent partial reads.

The coordinator implements two workflow patterns: `scatterGather()` sends work to multiple agents in parallel and waits for all responses (or timeouts), and `pipeline()` sends work through agents sequentially, passing each agent's output as the next agent's input.

Timeout handling: the coordinator tracks when each message was sent. If no response arrives within `timeoutMs`, it records a timeout result and moves on. The agent subprocess may still be running; the coordinator does not kill it (that is a design choice you might change for production use).

### Parallel Review (`implementations/parallel-review/`)

Two files: `agents.ts`, `review.ts`.

The agent definitions are pure data: a system prompt, tool allowlist, max turns, and expected output schema. The review runner reads the target file, spawns all three reviewers as parallel subprocesses, and collects their JSON outputs.

The synthesizer counts findings by severity across all reviewers and extracts the top issues (critical and high severity). The combined report includes the raw output from each reviewer plus the synthesis.

This is the simplest of the three implementations and the best starting point if you are new to multi-agent systems. It demonstrates parallel execution, structured output, timeout handling, and graceful degradation (one reviewer failing does not invalidate the others).

### Composing the Patterns

A realistic production system uses multiple patterns together:

1. A **leader-worker** orchestrator decomposes a feature request into subtasks
2. Independent subtasks enter a **task queue** (dispatch pattern)
3. The implementation subtask uses a **pipeline**: research, then implement, then parallel test+review
4. The test and review stages use **parallel specialists**: the tester runs unit tests and integration tests simultaneously, the reviewer runs security and style checks simultaneously
5. Results flow back through the inboxes to the orchestrator, which synthesizes the final report

Each layer uses the simplest appropriate pattern. The orchestrator handles the complex coordination. The queue handles throughput. The pipeline handles sequential dependencies. The parallel specialists handle concurrent analysis.

## Production Lessons

These come from running multi-agent systems in production for months. Some were obvious in retrospect. Others were not.

### The 12-Agent Parallelism Ceiling

Running more than ~12 Claude Code agents simultaneously on a single machine hits practical limits. Each agent is a Node.js process consuming 100-200MB of memory. At 12 agents, you are using 1.5-2.5GB of memory just for the agent processes, plus the memory for their tool operations (reading files, running tests, etc.).

More importantly, Anthropic's API has rate limits. 12 concurrent agents each making tool calls generate a high volume of API requests. You will hit rate limits before you hit machine resource limits.

The practical sweet spot is 3-6 concurrent agents for interactive workflows (where you want results in minutes) and 8-12 for batch workflows (where you can tolerate rate limit backoff).

### Context Window Exhaustion

An agent that reads 20 files to understand a codebase has consumed most of its context window. Its subsequent code generation will be lower quality than an agent that read 3 targeted files.

The fix is not "give agents bigger context windows." The fix is better task decomposition. The researcher reads 20 files and produces a 500-word summary. The implementer receives the summary, reads 3 specific files, and writes code with a nearly full context window available for reasoning.

This is the core value proposition of multi-agent: not more compute, but more focused compute. Each agent operates within a narrow context, and the coordination layer ensures the right context reaches the right agent.

### Cost Management

Multi-agent systems multiply API costs. A 5-agent team processing a single task might consume 5x the tokens of a single agent doing the same work. Sometimes more, because each agent re-reads files that another agent already read.

Strategies that actually reduce cost:

- **Cache common context.** If every agent needs to understand the project structure, compute it once and pass it as a pre-built summary rather than letting each agent discover it independently.
- **Use cheaper models for simple tasks.** A researcher gathering file names does not need the most capable model. A style reviewer checking indentation can use a lighter model. Reserve the heavy models for implementation and complex reasoning.
- **Set aggressive turn limits.** An agent stuck in a loop burns tokens at the API's maximum throughput. A 10-turn limit on a research task and a 25-turn limit on an implementation task prevents runaway costs.
- **Kill early.** If an agent produces an unparseable first response, kill it and retry immediately. Do not wait for it to use all its turns trying to recover.

Track cost per task type. If "research" tasks average $0.15 and "implementation" tasks average $0.80, you can predict costs for a batch job and set budget limits.

### Monitoring and Observability

A multi-agent system without monitoring is a multi-agent system you do not understand. You need to answer these questions at any moment:

- How many agents are running?
- What is each agent working on?
- How long has each agent been running?
- What is the queue depth?
- What is the failure rate over the last hour?

The task queue's `stats()` method gives you queue depth and status distribution. The dispatcher tracks active agents and their task assignments. Logging each dispatch, completion, and failure event to a structured log gives you the raw data for dashboards.

A minimal monitoring setup:

```
[Dispatcher] -> writes events to events.jsonl
[Dashboard]  -> reads events.jsonl, computes metrics, displays
```

Each event is a JSON line:

```json
{"event":"dispatch","taskId":"abc","agent":"researcher","timestamp":"..."}
{"event":"complete","taskId":"abc","durationMs":45000,"timestamp":"..."}
{"event":"fail","taskId":"def","error":"timeout","attempt":2,"timestamp":"..."}
```

You can build a real-time dashboard from this, or just `tail -f events.jsonl` and pipe it through `jq` during development. Either way, you can see what your system is doing.

### What Breaks at Scale

At small scale (2-4 agents, 10-20 tasks), everything works. At medium scale (6-12 agents, 100+ tasks), you discover:

- **SQLite write contention.** WAL mode helps, but heavy concurrent writes still cause `SQLITE_BUSY` errors. The `busy_timeout` pragma mitigates this, but at high throughput you may need to batch writes or use a client-side queue.
- **File descriptor limits.** Each agent subprocess uses multiple file descriptors (stdin, stdout, stderr, plus any files it opens). At 12 agents each with 10 open files, you are at 120+ descriptors. The default macOS limit is 256. Raise it with `ulimit -n 4096`.
- **Orphan processes.** If the dispatcher crashes, spawned agent subprocesses keep running. They hold task leases that eventually expire, but they are consuming API tokens in the meantime. Use process groups or a PID file to clean up orphans on restart.
- **Log volume.** 12 agents each producing stdout and stderr generates substantial log volume. Structured logging (JSON lines) with per-agent log files keeps things manageable. Do not write all agent output to a single log file; it will be unreadable.
- **Model drift.** Anthropic updates models. An agent configuration that produces clean JSON output today might produce markdown-wrapped JSON next month. Pin model versions in your agent configs and test them when you upgrade.

None of these problems are unsolvable. All of them are surprises if you have not encountered them before. The included implementations handle the common cases (busy_timeout for SQLite, timeout for stuck agents, structured output parsing with fallbacks). The rest you will need to adapt to your specific deployment environment.

### The Single Most Important Lesson

Start with one agent. Add a second only when you have measured a specific constraint (context exhaustion, tool permission conflict, parallelism need) that a second agent solves. Add a third only when two are insufficient. At every stage, verify that the coordination overhead is less than the benefit.

The best multi-agent system is the smallest one that solves your problem.

### Debugging Multi-Agent Systems

When something goes wrong (and it will), you need to trace causality across agents. Agent A produced research that Agent B misinterpreted, leading Agent C to write incorrect code. Which agent was at fault?

Debugging techniques that work:

**Correlation IDs.** Assign a unique ID to each top-level task. Include it in every message, every state file, every log line. When you need to trace a failure, grep for the correlation ID across all agent logs.

**Agent output snapshots.** Save the full output of every agent run to `logs/{correlation-id}/{agent-name}.json`. When debugging, you can replay the exact inputs and outputs of each agent in sequence.

**State diffs.** After each agent modifies shared state, compute and log the diff. "The implementer changed changedFiles from [] to ['src/api.ts', 'src/db.ts']." This makes it trivial to identify which agent introduced bad state.

**Replay from snapshot.** If you save each agent's input (the prompt, the state files it read), you can re-run a single agent in isolation to reproduce a bug. This is far more efficient than re-running the entire multi-agent workflow.

The combination of correlation IDs, output snapshots, and state diffs gives you the equivalent of a distributed tracing system (like Jaeger or Zipkin) without the infrastructure. For agent systems with fewer than 20 concurrent tasks, this file-based approach is sufficient. Beyond that, consider piping events into a real tracing backend.

### When to Stop Adding Agents

Every agent you add increases system complexity superlinearly. Two agents have 1 communication path. Three agents have 3. Four have 6. Ten have 45. Each path is a potential failure mode, a potential miscommunication, a potential ordering bug.

Signs you have too many agents:

- More than 40% of total runtime is spent on coordination (spawning, messaging, waiting)
- Agents frequently produce outputs that the next agent in the chain ignores or re-does
- You spend more time debugging agent interactions than debugging agent logic
- The combined token cost of all agents is 3x or more what a single agent would use for the same task

Signs you need more agents:

- A single agent's context window is saturated and its output quality has measurably degraded
- You have a measurable parallelism opportunity (tasks A and B are independent and each takes >30 seconds)
- Security requirements demand tool isolation that a single agent cannot provide

When in doubt, measure. Run the task with one agent and measure quality, cost, and time. Run it with two agents and measure again. If the two-agent version is not measurably better on at least one dimension, revert to one agent. Multi-agent should be a response to a measured problem, not a design preference.
