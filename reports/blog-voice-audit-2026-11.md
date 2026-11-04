# Blog voice audit — November 2026 (partial; not complete)

Scope so far: the six posts named for priority review. Classifications describe the original copy; the first four were revised in this worktree. The remaining published posts have not been audited. Do not use this table as evidence of complete coverage.

| Post | Initial rating | Reason and current state |
|---|---|---|
| `hermes-heartbeat-forgery` | REWRITE | Draft/status language and an unsupported offline claim; rewritten to distinguish untrusted heartbeat from verified outage. |
| `oss-saas-replacements` | REWRITE | Internal draft wrapper and adoption/savings claims contradict the underlying shortlist; rewritten as an evaluation. |
| `wei-name-service-edgeless-wei` | REWRITE | Internal wrapper and unsupported all-agent deployment claims; rewritten with the observed historical record and compatibility caveat. |
| `crt-shader-webgl-crt` | REWRITE | Internal wrapper and single-pass/usage claims conflict with the underlying multi-pass project; rewritten with source links and limitations. |
| `generation-left-the-screen` | LIGHT EDIT | Generally explanatory and source-linked, but internal “our stack” framing and time-sensitive claims need another editorial pass; not yet edited. |
| `enterprise-ai-bottleneck-around-the-model` | REWRITE | Strong universal claims about model sufficiency, orchestration and air-gapped classifiers overstate the source material; not yet edited. |

Inventory at start: 67 top-level `content/blog/*.md` files; the directory also contains a nested drafts directory. The original task's 68-item count matches top-level entries, including that directory. Critically, `src/lib/blog-loader.ts` explicitly calls its loader an unwired review draft, and no production caller of `loadAllPosts` was found in `src/`. The production post registry is in TypeScript, so these Markdown edits alone do not establish a change to published articles. Reconcile the actual rendering sources and publication inventory before completing the audit or claiming deployment.
