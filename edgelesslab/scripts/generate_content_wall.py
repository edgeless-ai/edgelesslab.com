#!/usr/bin/env python3
"""Generate living content wall data from Paperclip API and Hugo content."""
import json
import os
import subprocess
import urllib.request
from datetime import datetime
from pathlib import Path

PAPERCLIP_API = "http://127.0.0.1:3100/api"
COMPANY_ID = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"

# Resolve paths relative to this script
SCRIPT_DIR = Path(__file__).parent.parent
DATA_DIR = SCRIPT_DIR / "data"
STATIC_DIR = SCRIPT_DIR / "static"
PUBLIC_DIR = SCRIPT_DIR / "public"

OUTPUT = DATA_DIR / "content_wall.json"
SHIP_LOG = DATA_DIR / "ship_log.json"
STATIC_OUTPUT = STATIC_DIR / "content-wall.json"

def get_paperclip_data(endpoint, timeout=30):
    """Fetch data from Paperclip API using urllib (more reliable than curl subprocesses)."""
    url = f"{PAPERCLIP_API}/{endpoint}"
    req = urllib.request.Request(url)
    req.add_header('User-Agent', 'EdgelessLab-ContentWall/1.0')
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            elif isinstance(data, list):
                return data
            else:
                print(f"Warning: unexpected response format for {endpoint}")
                return []
    except Exception as e:
        print(f"Error fetching {endpoint}: {e}")
        return []

def get_hugo_content():
    """Parse Hugo content directory for recent posts."""
    posts_dir = SCRIPT_DIR / "content" / "posts"
    posts = []
    if posts_dir.exists():
        for f in posts_dir.glob("*.md"):
            if f.name == "_index.md":
                continue
            content = f.read_text()
            # Extract title from frontmatter
            title = f.stem.replace("-", " ").title()
            for line in content.split('\n')[:20]:
                if line.lower().startswith('title:'):
                    title = line.split(':', 1)[1].strip().strip('"\'')
                    break
            posts.append({
                "title": title,
                "slug": f.stem,
                "path": f"/posts/{f.stem}/",
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            })
    return sorted(posts, key=lambda x: x.get("modified", ""), reverse=True)


def build_ship_log(max_items=10):
    """Generate ship_log.json from Paperclip done issues + Hugo posts + optional GitHub PRs."""
    now = datetime.now().isoformat()
    print(f"  Generating ship log at {now}...")

    # --- Source 1: Paperclip done issues with workProducts ---
    print("  Fetching Paperclip done issues for ship log...")
    issues = get_paperclip_data(f"companies/{COMPANY_ID}/issues?status=done&limit=50")
    if not isinstance(issues, list):
        issues = []
    ships = []
    for issue in issues:
        title = issue.get("title", "")
        # Filter out bot housekeeping noise: need meaningful title (>=3 words)
        if len(title.split()) < 3:
            continue
        agent_id = issue.get("assigneeAgentId", "") or ""
        ships.append({
            "id": issue.get("identifier", ""),
            "title": title,
            "agent": (agent_id[:8] + "...") if len(agent_id) > 8 else (agent_id or "Unassigned"),
            "completed": issue.get("completedAt") or issue.get("updatedAt") or now,
            "source": "paperclip",
            "url": f"https://paperclip.internal/issues/{issue.get('identifier', '')}",
        })
    print(f"    Paperclip: {len(ships)} qualifying issues")

    # --- Source 2: Hugo blog posts ---
    print("  Scanning Hugo posts...")
    post_ships = get_hugo_posts_for_ships()
    print(f"    Blog posts: {len(post_ships)}")
    ships.extend(post_ships)

    # --- Source 3: GitHub merged PRs (if token available) ---
    print("  Checking GitHub PRs...")
    pr_ships = get_github_merged_prs()
    print(f"    GitHub PRs: {len(pr_ships)}")
    ships.extend(pr_ships)

    # Sort by completed date descending, take top N
    ships.sort(key=lambda x: x.get("completed", ""), reverse=True)
    ships = ships[:max_items]

    ship_log = {
        "generated_at": now,
        "count": len(ships),
        "ships": ships,
    }

    # Write to data/ for Hugo
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(SHIP_LOG, "w") as f:
        json.dump(ship_log, f, indent=2)
    print(f"  Ship log written: {SHIP_LOG} ({len(ships)} entries)")
    return ship_log


def get_github_merged_prs(repo="edgeless-ai/edgelesslab.com", limit=10):
    """Fetch recently merged PRs from GitHub API. Requires GITHUB_TOKEN env var."""
    import os
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PAT")
    if not token:
        return []
    try:
        url = f"https://api.github.com/repos/{repo}/pulls?state=closed&per_page={limit}&sort=updated&direction=desc"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"token {token}")
        req.add_header("User-Agent", "EdgelessLab-ShipLog/1.0")
        with urllib.request.urlopen(req, timeout=15) as resp:
            prs = json.loads(resp.read().decode("utf-8"))
        result = []
        for pr in prs:
            if pr.get("merged_at"):
                result.append({
                    "id": f"PR-{pr['number']}",
                    "title": pr.get("title", ""),
                    "agent": pr.get("user", {}).get("login", "unknown"),
                    "completed": pr["merged_at"],
                    "source": "github",
                    "url": pr.get("html_url", f"https://github.com/{repo}/pull/{pr['number']}"),
                })
        return result
    except Exception as e:
        print(f"  GitHub PR fetch error: {e}")
        return []


def get_hugo_posts_for_ships(posts_dir=None):
    """Extract blog post dates from Hugo content/posts/ directory."""
    if posts_dir is None:
        posts_dir = SCRIPT_DIR / "content" / "posts"
    posts = []
    if posts_dir.exists():
        for f in sorted(posts_dir.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True)[:10]:
            if f.name == "_index.md":
                continue
            content = f.read_text()
            title = f.stem.replace("-", " ").title()
            lastmod = None
            for line in content.split("\n")[:30]:
                if line.lower().startswith("lastmod:"):
                    lastmod = line.split(":", 1)[1].strip().strip('"\'')
                    break
                elif line.lower().startswith("date:"):
                    date_val = line.split(":", 1)[1].strip().strip('"\'')
                    if lastmod is None:
                        lastmod = date_val
            if lastmod is None:
                lastmod = datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            posts.append({
                "id": f.stem,
                "title": title,
                "agent": "blog",
                "completed": lastmod,
                "source": "blog",
                "url": f"/posts/{f.stem}/",
            })
    return posts


def main():
    print(f"[{datetime.now().isoformat()}] Starting content wall generation...")
    
    # Fetch completed issues from Paperclip
    print("Fetching completed issues...")
    issues = get_paperclip_data(f"companies/{COMPANY_ID}/issues?status=done&limit=50")
    if not isinstance(issues, list):
        issues = []
    print(f"  Found {len(issues)} completed issues")
    
    # Fetch agent fleet status
    print("Fetching agent fleet status...")
    agents = get_paperclip_data(f"companies/{COMPANY_ID}/agents")
    if not isinstance(agents, list):
        agents = []
    print(f"  Found {len(agents)} agents")
    
    # Fetch in-progress work
    print("Fetching active work...")
    active_issues = get_paperclip_data(f"companies/{COMPANY_ID}/issues?status=in_progress&limit=20")
    if not isinstance(active_issues, list):
        active_issues = []
    print(f"  Found {len(active_issues)} active issues")
    
    # Ship log is generated dynamically by build_ship_log() below
    
    # Build ship log (prebuild data)
    build_ship_log()
    print()

    # Build content wall data
    content_wall = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_issues_done": len(issues),
            "total_agents": len(agents),
            "agents_active": sum(1 for a in agents if a.get("status") == "running"),
            "agents_idle": sum(1 for a in agents if a.get("status") == "idle"),
            "agents_error": sum(1 for a in agents if a.get("status") == "error"),
            "active_work": len(active_issues),
        },
        "recent_work": [
            {
                "id": i.get("identifier"),
                "title": i.get("title", ""),
                "priority": i.get("priority"),
                "updated": i.get("updatedAt"),
                "agent_name": i.get("assigneeAgentId", "")[:8] if i.get("assigneeAgentId") else "unassigned",
            }
            for i in sorted(issues, key=lambda x: x.get("updatedAt", ""), reverse=True)[:20]
        ],
        "active_work": [
            {
                "id": i.get("identifier"),
                "title": i.get("title", ""),
                "priority": i.get("priority"),
                "assignee": i.get("assigneeName", "unassigned"),
            }
            for i in active_issues[:15]
        ],
        "fleet_status": [
            {
                "name": a.get("name"),
                "status": a.get("status"),
                "role": a.get("description", ""),
            }
            for a in sorted(agents, key=lambda x: {"running": 0, "idle": 1, "error": 2}.get(x.get("status", ""), 3))
        ],
        "ship_log": (json.load(open(SHIP_LOG)).get("ships", []) if SHIP_LOG.exists() else [])[:30],
        "hugo_posts": get_hugo_content()[:10],
        "metrics": {
            "ships_this_month": (json.load(open(SHIP_LOG)).get("count", 0) if SHIP_LOG.exists() else 0),
            "active_agents": sum(1 for a in agents if a.get("status") in ["running", "idle"]),
            "health_score": round(sum(1 for a in agents if a.get("status") == "running") / max(len(agents), 1) * 100),
            "completion_rate": round(len(issues) / max(len(issues) + len(active_issues), 1) * 100),
        }
    }
    
    # Write to data/ for Hugo
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(content_wall, f, indent=2)
    
    # Duplicate to static/ for client-side loading
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATIC_OUTPUT, "w") as f:
        json.dump(content_wall, f, indent=2)
    
    # Write to public/ for direct serving
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_DIR / "content-wall.json", "w") as f:
        json.dump(content_wall, f, indent=2)
    
    # Print summary
    print(f"Content wall generated: {OUTPUT}")
    print(f"Static copy: {STATIC_OUTPUT}")
    print(f"Public copy: {PUBLIC_DIR}/content-wall.json")
    print(f"Summary: {content_wall['summary']}")
    print(f"Metrics: {content_wall['metrics']}")
    
    return 0

if __name__ == "__main__":
    exit(main())
