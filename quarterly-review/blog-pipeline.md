# Pass 5: Blog Pipeline Diagnosis

**Date**: 2026-05-18
**Auditor**: Claude Code quarterly review

---

## Executive Summary

The blog pipeline is **entirely manual with zero automation**. Posts are authored inline in a 3,131-line TypeScript file. No content engine exists -- the "unreliable blog posting" is because there IS no pipeline, just ad-hoc authoring. No editorial review gates. No staging. Commits to main go live in 1-3 minutes. The system works for a solo creator but is fragile if agents are involved.

---

## Current Lifecycle

```
IDEATION          No backlog, no editorial calendar. Ad-hoc.
    |
DRAFTING          Content written directly into src/lib/blog.ts (inline TypeScript)
    |
REVIEW            None. No PR process. No approval workflow.
    |
COMMIT            Push directly to main branch.
    |
DEPLOY            GitHub Actions auto-deploys on push to main. 1-3 min.
    |
LIVE              Published at edgelesslab.com/blog/[slug]/
```

---

## Authoring Model

**File**: `src/lib/blog.ts` (3,131 lines)

All 32 blog posts are defined as a TypeScript array of objects. Content is **inline markdown/HTML strings** in template literals. No markdown files, no CMS, no external data source.

```typescript
export const posts: BlogPost[] = [
  {
    slug: "envelope-protocol-...",
    title: "...",
    date: "2026-05-13",
    content: `## Section One\n\nFull post content here...`,
    // ... metadata
  },
  // ... 31 more posts
]
```

**Implications**:
- Single 3K+ line file is hard to diff, review, or manage
- No way to preview a draft without committing
- No markdown tooling (spell check, link validation, linting)
- Tightly coupled to the Next.js build -- can't migrate to a CMS without rewriting

---

## Content Engine: Does Not Exist

Searched for automated publishing infrastructure:
- No blog-related scripts in `/scripts/`
- No blog-related skills in `.claude/skills/`
- No cron jobs for content generation
- No editorial calendar or idea backlog

The "Scribe drafts, Editor approves" pattern mentioned in CLAUDE.md is **aspirational, not implemented**. Evidence:
- No Scribe skill file in the edgeless-website project
- No Editor approval workflow in code or CI
- One `site-activity.json` reference to a "Scribe" agent, but no pipeline code

---

## Git History (since April 2026)

| Date | Author | Commit |
|------|--------|--------|
| 2026-05-14 | Edgeless CC (agent) | 3 editorial posts added in one batch |
| 2026-05-12 | David Murray | 2 posts + link fixes |
| 2026-05-06 | David Murray | 1 post |
| 2026-05-05 | David Murray | 1 post |
| 2026-05-01 | djmclaudeassistant | 1 post (Hermes skill lifecycle) |
| 2026-04-29 | David Murray | 3 posts (Hermes + hooks) |
| 2026-04-16 | David Murray | Field journal posts |

**Patterns**:
- Mix of human and agent commits, all direct to main
- No PRs, no review, no draft branches
- Agent can commit directly with no human gate

---

## Where It Breaks

### 1. No content engine means no reliability
The user said "we haven't had reliable blog posting from the content engine." There IS no content engine. The blog relies entirely on manual authoring sessions. If David doesn't write, nothing publishes.

### 2. No quality gate
Posts go live immediately on commit. Typos, broken links, and formatting errors ship instantly. Evidence: multiple `fix(blog): correct internal links` commits show errors caught after publish.

### 3. Agent commits without review
"Edgeless CC" added 3 posts in one commit. No review step means agent-generated content could ship without human eyes.

### 4. Inline content is unmaintainable at scale
32 posts in 3,131 lines of TypeScript. At 4 posts/week, this file hits 10K+ lines by Q4. Diffs become meaningless. Git blame is useless.

### 5. No scheduling
No `publishedAt` or `status: "draft"` field. Every post in the array is live. No way to pre-write posts and schedule them.

---

## Recommendations

### Immediate (Fix Now)
1. **Add draft support**: Add optional `status: "draft" | "published"` field to BlogPost interface. Filter drafts from public rendering. Zero-effort way to stage content.
2. **Add link validation**: Pre-commit script that checks all internal `/blog/` links resolve to existing slugs.
3. **Fix broken productSlug references**: 4 posts reference non-existent slugs (identified in Pass 2).

### Short-term (This Quarter)
4. **Extract to markdown files**: Move content from inline TypeScript to `src/content/blog/[slug].md`. Keep metadata in a lightweight index. Enables markdown tooling, easier diffs, CMS migration path.
5. **Require PR for blog changes**: Branch protection on `src/lib/blog.ts` (or the content directory) requiring at least one approval.
6. **Build a content skill**: Create a `.claude/skills/blog-author/` skill that generates draft posts, validates formatting, and creates a PR for review -- not direct commits.

### Medium-term (Next Quarter)  
7. **Editorial calendar**: Paperclip issue board for planned posts with target dates.
8. **Staging preview**: Deploy branch previews (Vercel preview URLs or similar) so posts can be reviewed before merging to main.
9. **Scheduled publishing**: `publishedAt` field + build-time date filtering so posts can be pre-written and go live on a schedule.

---

## Cadence Assessment

**Current**: 32 posts in ~8 weeks = ~4/week.

**Recommendation**: 2/week is more sustainable and allows for deeper, higher-quality posts. The JJJJound curation principle applies to content too -- fewer, stronger pieces > volume.
