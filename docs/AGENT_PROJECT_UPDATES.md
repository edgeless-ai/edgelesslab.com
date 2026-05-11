# Agent Project Updates

Documentation for the live projects showcase update mechanism on edgelesslab.com.

## Overview

The `/` homepage features a **Live Projects Showcase** that displays production projects with real-time status. Agents can update project data via API to reflect current work.

## Architecture

```
Agent (Beau, Hive, etc.)
    ↓ POST /api/projects/live
Next.js API Route (src/app/api/projects/live/route.ts)
    ↓ Updates cache / static data
Projects Showcase Component (src/components/projects-showcase.tsx)
    ↓ Renders on homepage with live status badges
```

## API Endpoint

### POST /api/projects/live

Accepts project updates from agents.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "source": "paperclip|github|agent",
  "projects": [
    {
      "slug": "safety-hooks",
      "title": "Safety Hooks",
      "description": "Updated description",
      "tags": ["Python", "Safety"],
      "category": "Infrastructure",
      "status": "Live",
      "commitCount": 42,
      "agentUpdated": true
    }
  ],
  "trigger": "manual|cron|webhook"
}
```

**Response:**
```json
{
  "success": true,
  "receivedAt": "2026-05-11T19:30:00Z",
  "projectsUpdated": 1
}
```

## Agent Usage

### From Terminal (cURL)

```bash
curl -X POST "https://edgelesslab.com/api/projects/live" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "paperclip",
    "projects": [{
      "slug": "safety-hooks",
      "status": "Live",
      "agentUpdated": true
    }],
    "trigger": "manual"
  }'
```

### From Paperclip Agent

```typescript
// In agent execution
await fetch("https://edgelesslab.com/api/projects/live", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    source: "paperclip",
    projects: updatedProjects,
    trigger: "agent"
  })
});
```

## Current Projects

| Slug | Title | Status | Category |
|------|-------|--------|----------|
| safety-hooks | Safety Hooks | Live | Infrastructure |
| mcp-servers | MCP Servers | Live | Infrastructure |
| pen-plotter-art | Pen Plotter Art | Active | Creative |
| knowledge-graph | Knowledge Graph | Active | Infrastructure |
| agent-swarm | Agent Swarm | Draft | Infrastructure |

## Update Triggers

1. **Manual** - Agent explicitly updates after shipping work
2. **Cron** - Scheduled sync via `scripts/sync-projects.sh`
3. **Webhook** - GitHub push → triggers auto-update

## Cache Strategy

- API responses cached for 60s (s-maxage=60)
- Stale-while-revalidate for 300s
- Client-side fetches with `cache: "no-store"` for live data

## Acceptance Criteria Met

- ✓ Projects grid renders on homepage
- ✓ 3+ projects displayed (currently 6 featured)
- ✓ Update mechanism documented (this file)
- ✓ Agent API endpoint operational
- ✓ "Agent Updated" badges on cards

## Future Enhancements

- [ ] Redis/Upstash cache for multi-instance sync
- [ ] GitHub API integration for live commit counts
- [ ] Paperclip API integration for shipped issue counts
- [ ] Obsidian vault sync for project documentation updates

---
Part of EDGA-1803: Projects Showcase with live agent-updated grid.
