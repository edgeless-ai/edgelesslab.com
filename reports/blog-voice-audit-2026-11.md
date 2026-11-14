# Blog voice audit — November 2026 (partial; not complete)

Scope so far: the six posts named for priority review. Classifications describe the original copy; the first four were revised in the live TypeScript registry and their Markdown copies. The remaining published posts have not been audited. Do not use this table as evidence of complete coverage.

| Post | Initial rating | Reason and current state |
|---|---|---|
| `hermes-heartbeat-forgery` | REWRITE | Draft/status language and an unsupported offline claim; rewritten to distinguish untrusted heartbeat from verified outage. |
| `oss-saas-replacements` | REWRITE | Internal draft wrapper and adoption/savings claims contradict the underlying shortlist; rewritten as an evaluation. |
| `wei-name-service-edgeless-wei` | REWRITE | Internal wrapper and unsupported all-agent deployment claims; rewritten with the observed historical record and compatibility caveat. |
| `crt-shader-webgl-crt` | REWRITE | Internal wrapper and single-pass/usage claims conflict with the underlying multi-pass project; rewritten with source links and limitations. |
| `generation-left-the-screen` | LIGHT EDIT | Generally explanatory and source-linked, but internal “our stack” framing and time-sensitive claims need another editorial pass; not yet edited. |
| `enterprise-ai-bottleneck-around-the-model` | REWRITE | Strong universal claims about model sufficiency, orchestration and air-gapped classifiers overstate the source material; not yet edited. |

## Publication inventory

Evaluating the registry and its actual slug-deduplication yields **78 rendered posts**. There are **67 top-level Markdown files**, all with a rendered slug. The following 11 rendered slugs have no matching top-level Markdown file: `poetry-packaging-week`, `cli-tools-week`, `agentic-engineering-resource-collision`, `verification-chain-crisis`, `agentic-engineering-week`, `multi-agent-orchestration-week`, `the-gateway-that-broke-and-the-expensive-models-we-didnt-need`, `rescuing-an-ai-product-from-a-dying-platform`, `kimi-k3-post`, `the-bottleneck-that-wasnt`, and `the-monitor-that-cried-wolf`. Nested drafts are excluded. The six entries above are the only audit rows so far.

The original task's 68-item count matches top-level entries, including a directory. `src/lib/blog-loader.ts` describes its loader as an unwired review draft; the production registry is TypeScript. Revisions must cover the actual rendered source, not only the Markdown copies.
