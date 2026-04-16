# CRITICAL: Standalone content directories

These directories MUST survive Next.js builds:
- pen-plotter/
- tartanism/
- total-serialism/
- flow-viz/

**Always use `npm run build`, never `next build` directly.**
Run `./scripts/preserve-standalone.sh check` before committing.
