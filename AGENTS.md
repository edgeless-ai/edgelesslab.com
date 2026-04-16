# Edgeless Website Agent Instructions

## CRITICAL: Standalone content directories

These directories contain non-Next.js content that MUST survive builds:

| Directory | Content |
|-----------|---------|
| `pen-plotter/` | Editorial field journal + image catalog |
| `tartanism/` | Editorial page + React studio app |
| `flow-viz/` | Flow visualization experiment |

**The `prebuild` and `postbuild` scripts in package.json automatically preserve these.** Always use `npm run build`, never `next build` directly.

**Never run `git add -A` after a build without verifying:** `./scripts/preserve-standalone.sh check`

## Voice rules

All prose follows `.claude/skills/_shared/writing-voice.md`. No em-dashes, no banned phrases, no bottom-line summaries. Run `npm run lint:voice` before committing.
