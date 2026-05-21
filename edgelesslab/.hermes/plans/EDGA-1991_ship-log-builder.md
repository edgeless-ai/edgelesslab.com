# EDGA-1991: Living Content Dashboard — Auto-Ship Log on Homepage

## Goal
Add a "Recently Shipped" section to the homepage (`layouts/index.html`) and build a
dynamic `ship_log.json` generator that pulls live data from Paperclip API + blog posts
(runs at `prebuild`, rebuilds only when source data changes).

## Current State
- Hugo site at `/Users/djm/claude-projects/edgelesslab/`
- Ship-log shortcode exists: `layouts/shortcodes/ship-log.html`
- Static `data/ship_log.json` exists (last generated 2026-05-07, 10 hardcoded items)
- `scripts/generate_content_wall.py` generates `content_wall.json` but reads static `ship_log.json`
- Homepage (`themes/edgeless/layouts/index.html`) has: hero, recent work, content wall, lab notes
- **Missing**: dedicated "Recently Shipped" section on homepage, and ship_log.json is not auto-generated
- Pulse page and Dashboard page already use the ship-log shortcode
- GitHub token for PR fetching: NOT available (will leave hook for future)

## Proposed Approach
Extend `generate_content_wall.py` (already run via cron every 5min as `update-pulse-data.sh`)
to also generate `ship_log.json` dynamically.

### Data sources (in priority order):
1. Paperclip closed issues — fetch `status=done&limit=50`, filter for descriptive titles
2. Hugo blog posts — scan `content/posts/`, sort by `lastmod` in frontmatter or file mtime
3. GitHub merged PRs — deferred (no GITHUB_TOKEN found); parameterizable when token is set

## Step-by-Step Plan

### Phase 1: Data generator (scripts/generate_content_wall.py)
- Add `build_ship_log()` function to generate ship_log.json
- Fetch Paperclip done-closed issues (status=done&limit=50)
- Filter: keep items with >=3-word titles (skip bot housekeeping noise)
- Fetch Hugo posts from content/posts/ (read frontmatter lastmod or file mtime)
- Interleave all sources, sort by date desc, take top 10
- Detect GitHub token (env var) - if present, add merged PRs
- Write data/ship_log.json
- Keep existing content_wall.json generation intact
- Add verbose logging (counts per source)

### Phase 2: Homepage override
- Create layouts/index.html (override for themes/edgeless/layouts/index.html)
- Insert "{{< ship-log >}}" shortcode after "Latest Work" section and before content wall
- Ensure 5-item display limit via shortcode CSS

### Phase 3: Build script update
- Add prebuild npm script: python3 scripts/generate_content_wall.py
- Wire prebuild into existing build script (runs before hugo)

### Phase 4: Verification
- npm run build — confirms prebuild + hugo succeed
- Inspect public/index.html — ship-log section rendered
- Inspect data/ship_log.json — dynamic data
- Check generated_at timestamp is fresh

## Files to Change
| File | Change |
|------|--------|
| scripts/generate_content_wall.py | Add build_ship_log() function |
| layouts/index.html | NEW — homepage override with ship-log section |
| package.json | Add prebuild npm script |

## Risks / Open Questions
- GitHub PRs deferred. Ship-log still meaningful with Paperclip + blog data.
- If Paperclip API is down on build, script writes empty/graceful ship_log.
