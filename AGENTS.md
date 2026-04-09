<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:voice-style-pack -->
# Voice

All prose drafted for this site (blog posts in `src/lib/blog.ts`, marketing copy, product descriptions) must follow the shared writing-voice style pack at `.claude/skills/_shared/writing-voice.md`. That file is the source of truth; the three load-bearing rules are quoted below so they travel with any draft prompt.

1. **Banned phrases.** Never produce these strings: "That's a great question", "As an AI language model", "You're absolutely right", "It's not just X, it's also Y" (and any "not just ... but also" / "not just ... it's also" variant), "It's important to note that", "Let me know if you need anything else", "Here's a..."/"Here are the..." as a body or section opener, "In conclusion,/To summarize,/In summary,", "Bottom line:".

2. **No em-dashes, anywhere.** Not the Unicode em-dash, not the en-dash, not the ASCII `--`. Substitute commas, colons, periods, or semicolons. Code blocks and inline backticks are exempt, so CLI flags like `--help` and shell snippets like `rm -rf` are fine.

3. **No bottom-line summary.** Do not close a post or section with a restatement of the body. Trust the reader. Concrete next-step suggestions (links to related posts, product pages, or specific commands) are allowed; generic "let me know" offers are not.

Run the lint before committing any change to `src/lib/blog.ts`:

```bash
npm run lint:voice
```

Exit 0 means clean, non-zero means violations printed to stderr as `path:line: violation`. A baseline of existing violations (not auto-rewritten per task-282) lives at `claude-vault/00-Inbox/kb-curator/voice-lint-baseline-2026-04-08.md`. Any change that adds a new violation against the baseline should be rejected in review.
<!-- END:voice-style-pack -->
