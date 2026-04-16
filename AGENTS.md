# Edgeless Website Agent Instructions

## CRITICAL: Standalone content directories

These directories contain non-Next.js content that MUST survive builds:

| Directory | Content |
|-----------|---------|
| `pen-plotter/` | Editorial field journal + R2-hosted image catalog |
| `tartanism/` | Editorial page + React studio app |
| `total-serialism/` | Editorial page + 96-algorithm toolkit |
| `flow-viz/` | Flow visualization experiment |

**Always use `npm run build`, never `next build` directly.**
The prebuild/postbuild hooks in package.json preserve these directories.

**Never run `git add -A` without verifying:** `./scripts/preserve-standalone.sh check`

## Voice rules

All prose follows `.claude/skills/_shared/writing-voice.md`. No em-dashes, no banned phrases. Run `npm run lint:voice` before committing.
