#!/usr/bin/env python3.11
"""
Discord Backroom Session Orchestrator

Creates a threaded multi-agent discussion in Discord #general where Paperclip agents
analyze a topic from different perspectives, then Hive synthesizes.

Usage:
    python3.11 scripts/backroom-session.py "Should we migrate from Fireworks to Groq?"
    python3.11 scripts/backroom-session.py --agents beau,cypher,scribe "Evaluate Meridian architecture"
    python3.11 scripts/backroom-session.py --preset security "Review VPS access controls"
    python3.11 scripts/backroom-session.py --synthesize THREAD_ID
    python3.11 scripts/backroom-session.py --status THREAD_ID
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# ── Constants ────────────────────────────────────────────────────────────────

PAPERCLIP_URL = "http://127.0.0.1:3100/api"
COMPANY_ID = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"
GENERAL_CHANNEL = "1463643624100335618"
SERVER_ID = "1463643623412465867"

AGENT_IDS = {
    "beau": "575260e2-9c2b-4c1d-abc6-1fff98c7abf1",
    "edgeless_cc": "97898794-ff86-48d5-9308-6e13cfa63c0b",
    "hive": "ff6991a2-d8f1-44f8-a77a-6ad581267b6f",
    "scribe": "7f8aa3c8-73db-465e-9f25-e2de8cf10802",
    "cypher": "544883d6-8e3a-4a5d-93c0-73b439ecbb8d",
    "hermes": "8a7dbde7-cee1-44b8-aebe-8d60fd84fd52",
    "ombudsman": "bc06b7ce-ed9e-4f78-8be6-2b587e064f10",
    "builder": "3cb3230a-06b2-4c0c-873a-265b963dbee5",
    "anomaly": "0b779ab3-ff29-425c-93c1-1fe4471ce3a0",
    "curator": "505a7438-a3f9-4146-bf58-bdafe9b0f7fc",
    "envoy": "375a17eb-7793-416e-a0bc-a66a3de4ae3f",
}

AGENT_LENSES = {
    "beau": (
        "Researcher",
        "What does the evidence say? What prior art exists? What are we missing? "
        "Search for relevant information. Cite sources. Compare alternatives.",
    ),
    "cypher": (
        "Security & Risk Analyst",
        "What are the risks? What could go wrong? What's the attack surface? "
        "What are the failure modes? What safeguards are missing?",
    ),
    "scribe": (
        "Technical Writer & Clarity Auditor",
        "Is this clear and well-defined? What's ambiguous? Can it be explained "
        "more simply? What questions would a newcomer ask? What's under-specified?",
    ),
    "curator": (
        "Research Analyst & Knowledge Connector",
        "How does this connect to what we already know? What patterns emerge? "
        "What context from our vault/KB is relevant? What precedents exist?",
    ),
    "envoy": (
        "External Liaison & Market Analyst",
        "How does the outside world approach this? What's the competitive landscape? "
        "What can we learn from others? What market forces are at play?",
    ),
    "anomaly": (
        "Operations Monitor",
        "Is this operationally sound? What breaks at scale? What needs monitoring? "
        "What are the infrastructure implications? What's the ops burden?",
    ),
    "builder": (
        "Engineer",
        "Is this buildable? What's the simplest implementation path? What are the "
        "technical tradeoffs? What would you prototype first? What's over-engineered?",
    ),
    "hermes": (
        "Generalist & Devil's Advocate",
        "What's your overall take? What angles are the others missing? "
        "Play devil's advocate. What's the pragmatic path forward?",
    ),
    "ombudsman": (
        "Mediator & Tradeoff Analyst",
        "Where might disagreements arise? What are the competing priorities? "
        "How do we balance the tradeoffs? Who are the stakeholders?",
    ),
}

PRESETS = {
    "strategy": ["beau", "envoy", "cypher"],
    "technical": ["builder", "cypher", "anomaly"],
    "research": ["beau", "curator", "scribe"],
    "security": ["cypher", "anomaly", "envoy"],
    "creative": ["scribe", "curator", "beau"],
    "ops": ["anomaly", "builder", "hermes"],
    "full": ["beau", "cypher", "scribe", "curator", "envoy"],
}

SCRIPTS_DIR = Path("/Users/djm/claude-projects/scripts")
SESSIONS_LOG = Path("/Users/djm/claude-projects/.runtime/backrooms/.backroom-sessions.jsonl")
WEBHOOKS_ENV = Path("/Users/djm/claude-projects/config/discord-webhooks.env")


# ── Helpers ──────────────────────────────────────────────────────────────────


def load_webhooks():
    webhooks = {}
    with open(WEBHOOKS_ENV) as f:
        for line in f:
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            val = val.strip('"').strip("'")
            if val:
                name = key.replace("DISCORD_WEBHOOK_", "").lower()
                webhooks[name] = val
    return webhooks


def load_bot_token():
    env_path = os.path.expanduser("~/.discli/.env")
    with open(env_path) as f:
        for line in f:
            if line.startswith("BOT_TOKEN="):
                return line.strip().split("=", 1)[1].strip('"').strip("'")
    raise RuntimeError("BOT_TOKEN not found in ~/.discli/.env")


def discord_api(method, endpoint, token, data=None):
    url = f"https://discord.com/api/v10{endpoint}"
    headers = {
        "Authorization": f"Bot {token}",
        "Content-Type": "application/json",
        "User-Agent": "DiscordBot (https://edgelesslab.com, 1.0)",
    }
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(req) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"Discord API error {e.code} on {method} {endpoint}: {body}", file=sys.stderr)
        raise RuntimeError(f"Discord API {e.code}: {body}")


def webhook_post(webhook_url, username, content, thread_id=None, embed=None):
    url = webhook_url
    if thread_id:
        url += f"?thread_id={thread_id}"
    payload = {"username": username}
    if content:
        # Discord limit: 2000 chars. Chunk if needed.
        if len(content) > 1950:
            # Post first chunk, then follow up
            chunks = chunk_content(content, 1950)
            for i, chunk in enumerate(chunks):
                p = {"username": username, "content": chunk}
                _do_webhook_post(url, p)
                if i < len(chunks) - 1:
                    time.sleep(0.5)
            return
        payload["content"] = content
    if embed:
        payload["embeds"] = [embed]
    _do_webhook_post(url, payload)


def _do_webhook_post(url, payload):
    body = json.dumps(payload).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "DiscordBot (https://edgelesslab.com, 1.0)",
    }
    req = Request(url, data=body, headers=headers, method="POST")
    with urlopen(req) as resp:
        return resp.status


def chunk_content(text, max_len):
    """Split text into chunks at paragraph boundaries."""
    chunks = []
    current = ""
    for line in text.split("\n"):
        if len(current) + len(line) + 1 > max_len:
            if current:
                chunks.append(current.strip())
            current = line + "\n"
        else:
            current += line + "\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks if chunks else [text[:max_len]]


def paperclip_wake(agent_id, instructions):
    url = f"{PAPERCLIP_URL}/agents/{agent_id}/wakeup"
    body = json.dumps({"instructions": instructions}).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except (URLError, HTTPError) as e:
        print(f"  Paperclip wake error: {e}", file=sys.stderr)
        return {"status": "error"}


def create_thread(token, topic):
    """Create a public thread in #general by posting a starter message first."""
    # Post a starter message
    starter = discord_api(
        "POST",
        f"/channels/{GENERAL_CHANNEL}/messages",
        token,
        {"content": f"**New Backroom Session** — _{topic[:150]}_"},
    )
    message_id = starter["id"]

    # Create thread from that message
    data = {
        "name": f"Backroom: {topic[:88]}",
        "auto_archive_duration": 1440,  # 24 hours
    }
    thread = discord_api(
        "POST",
        f"/channels/{GENERAL_CHANNEL}/messages/{message_id}/threads",
        token,
        data,
    )
    return thread


def read_thread_messages(token, thread_id, limit=50):
    msgs = discord_api("GET", f"/channels/{thread_id}/messages?limit={limit}", token)
    if not isinstance(msgs, list):
        return []
    msgs.reverse()  # oldest first
    return msgs


# ── Agent Instructions ───────────────────────────────────────────────────────


def build_agent_instructions(agent_name, topic, thread_id, webhook_url):
    role, lens = AGENT_LENSES.get(
        agent_name, ("Agent", "Share your perspective on this topic.")
    )
    post_url = f"{webhook_url}?thread_id={thread_id}"

    # Two read paths: local script (Mac agents) and raw curl (VPS/Beau)
    read_script = f"{SCRIPTS_DIR}/discord-read-channel.sh {thread_id} --limit 20"
    read_curl = (
        f'curl -s -H "Authorization: Bot $(grep BOT_TOKEN ~/.discli/.env | cut -d= -f2)" '
        f'"https://discord.com/api/v10/channels/{thread_id}/messages?limit=20" | '
        f'python3 -c "import json,sys; msgs=json.load(sys.stdin); '
        f"[print(f\\\"{{m.get('author',{{}}).get('username','?')}}: "
        f"{{m.get('content','')[:500]}}\\\") for m in reversed(msgs)]\""
    )

    return f"""## Backroom Discussion — You are {agent_name.title()}, the {role}

**Topic**: {topic}

**Your analytical lens**: {lens}

### Steps

1. **Read the thread** to see the topic brief and what other agents have already said:
   ```bash
   {read_script}
   ```
   If that script is unavailable (e.g. you're on VPS), use curl directly:
   ```bash
   {read_curl}
   ```

2. **Analyze** the topic through your lens as {role}. Think deeply. Be substantive — aim for 200-500 words. Cite evidence where possible. Name specific tradeoffs. Give concrete recommendations, not vague platitudes.

3. **Post your analysis** to the Discord thread. Write your response to a temp file first (handles escaping properly), then post:
   ```bash
   cat > /tmp/backroom-response.txt << 'ANALYSIS_EOF'
   [YOUR ANALYSIS HERE — replace this with your actual response]
   ANALYSIS_EOF

   python3 -c "
   import json, os
   from urllib.request import Request, urlopen
   msg = open('/tmp/backroom-response.txt').read().strip()
   # Chunk if over 1900 chars
   chunks = [msg[i:i+1900] for i in range(0, len(msg), 1900)]
   for chunk in chunks:
       data = json.dumps({{'username': '{agent_name.title()}', 'content': chunk}}).encode()
       req = Request('{post_url}', data=data, headers={{'Content-Type': 'application/json'}}, method='POST')
       urlopen(req)
   print('Posted to backroom thread')
   "
   ```

4. **Rules**:
   - Take a position. You are the {role}, not a summarizer.
   - If you see other agents' responses in the thread, engage with them — agree, disagree, build on their points.
   - Don't repeat the topic statement. Jump straight into your analysis.
   - If you don't have enough information to form an opinion, say what information you'd need and why.
"""


def build_hive_instructions(topic, thread_id, webhook_url, agent_names):
    post_url = f"{webhook_url}?thread_id={thread_id}"
    main_url = webhook_url
    agent_list = ", ".join(a.title() for a in agent_names)
    read_script = f"{SCRIPTS_DIR}/discord-read-channel.sh {thread_id} --limit 50"

    return f"""## Backroom Synthesis — You are Hive, the Coordinator

**Topic**: {topic}
**Participating agents**: {agent_list}

### Steps

1. **Read the full thread** — every message matters:
   ```bash
   {read_script}
   ```

2. **Synthesize** all perspectives into a structured recommendation. Your synthesis should include:

   **Consensus** — Where do agents agree? These are high-confidence findings.
   **Contested** — Where do they disagree? Present both sides fairly, then state which you find more compelling and why.
   **Blind Spots** — What did nobody address? What's missing from the discussion?
   **Recommendation** — Your synthesis. Not a summary — a decision recommendation with reasoning.
   **Next Actions** — 2-4 concrete next steps, each assigned to a specific agent or David.

3. **Post your synthesis** to the thread:
   ```bash
   cat > /tmp/backroom-synthesis.txt << 'SYNTHESIS_EOF'
   [YOUR SYNTHESIS HERE]
   SYNTHESIS_EOF

   python3 -c "
   import json
   from urllib.request import Request, urlopen
   msg = open('/tmp/backroom-synthesis.txt').read().strip()
   chunks = [msg[i:i+1900] for i in range(0, len(msg), 1900)]
   for chunk in chunks:
       data = json.dumps({{'username': 'Hive', 'content': chunk}}).encode()
       req = Request('{post_url}', data=data, headers={{'Content-Type': 'application/json'}}, method='POST')
       urlopen(req)
   print('Synthesis posted to thread')
   "
   ```

4. **Post a brief summary** to the main #general channel (not the thread) so David sees it:
   ```bash
   python3 -c "
   import json
   from urllib.request import Request, urlopen
   data = json.dumps({{
       'username': 'Hive',
       'embeds': [{{
           'title': '🏁 Backroom Complete: {topic[:70]}',
           'description': '[1-2 sentence key finding and recommendation]\\n\\n{len(agent_names)} agents contributed. See thread for full analysis.',
           'color': 5763399,
           'footer': {{'text': 'Thread ID: {thread_id}'}}
       }}]
   }}).encode()
   req = Request('{main_url}', data=data, headers={{'Content-Type': 'application/json'}}, method='POST')
   urlopen(req)
   "
   ```

5. Be decisive. The backroom produces clarity, not more questions. If the evidence is ambiguous, say so — but still make a recommendation.
"""


# ── Commands ─────────────────────────────────────────────────────────────────


def cmd_start(args):
    webhooks = load_webhooks()
    if "general" not in webhooks:
        print("ERROR: No webhook URL for #general", file=sys.stderr)
        sys.exit(1)

    # Determine agents
    if args.agents:
        agent_names = [a.strip().lower() for a in args.agents.split(",")]
    elif args.preset:
        agent_names = list(PRESETS[args.preset])
    else:
        agent_names = list(PRESETS["strategy"])

    # Validate
    invalid = [n for n in agent_names if n not in AGENT_IDS]
    if invalid:
        print(f"ERROR: Unknown agents: {', '.join(invalid)}", file=sys.stderr)
        print(f"Available: {', '.join(sorted(AGENT_IDS.keys()))}", file=sys.stderr)
        sys.exit(1)

    # Hive always synthesizes last — remove from research panel if present
    if "hive" in agent_names:
        agent_names.remove("hive")

    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║  BACKROOM SESSION                                          ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")
    print(f"  Topic:   {args.topic}")
    print(f"  Agents:  {', '.join(a.title() for a in agent_names)}")
    print(f"  Synth:   Hive (in {args.delay}s)")
    print()

    if args.dry_run:
        print("[DRY RUN] Would create thread, wake agents, schedule Hive")
        for name in agent_names:
            role, _ = AGENT_LENSES.get(name, ("Agent", ""))
            print(f"  → {name.title()} ({role})")
        return

    # 1. Create thread
    token = load_bot_token()
    thread = create_thread(token, args.topic)
    thread_id = thread["id"]
    print(f"  Thread:  {thread['name']} ({thread_id})")

    # 2. Post opening brief
    opening = (
        f"**Backroom Session** — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        f"**Topic**: {args.topic}\n\n"
        f"**Panel**: {', '.join(a.title() for a in agent_names)}\n"
        f"**Synthesizer**: Hive (arrives in ~{args.delay // 60} min)\n\n"
        f"Each agent analyzes from their unique lens. Hive synthesizes all viewpoints.\n\n"
        f"---"
    )
    webhook_post(webhooks["general"], "Orchestrator", opening, thread_id=thread_id)
    print(f"  Brief:   Posted")

    # 3. Wake research agents
    print(f"  Waking agents:")
    for name in agent_names:
        instructions = build_agent_instructions(
            name, args.topic, thread_id, webhooks["general"]
        )
        result = paperclip_wake(AGENT_IDS[name], instructions)
        status = result.get("status", "unknown")
        role, _ = AGENT_LENSES.get(name, ("Agent", ""))
        print(f"    → {name.title()} ({role}): {status}")
        time.sleep(1)  # slight stagger

    # 4. Schedule Hive synthesis
    if not args.no_hive:
        hive_instructions = build_hive_instructions(
            args.topic, thread_id, webhooks["general"], agent_names
        )
        hive_cmd_file = f"/tmp/backroom-hive-{thread_id}.json"
        with open(hive_cmd_file, "w") as f:
            json.dump({"instructions": hive_instructions}, f)

        # Background process: sleep, wake Hive, optionally notify
        wake_lines = [
            "#!/usr/bin/env bash",
            f"sleep {args.delay}",
            f'curl -s -X POST "{PAPERCLIP_URL}/agents/{AGENT_IDS["hive"]}/wakeup" '
            f'-H "Content-Type: application/json" -d @{hive_cmd_file} > /dev/null 2>&1',
            f'echo "[$(date -Iseconds)] Hive synthesis triggered for {thread_id}" >> /tmp/backroom-sessions.log',
        ]
        if args.notify:
            wake_lines.append(
                f'python3.11 /Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py '
                f'"🏁 Backroom complete: {args.topic[:60]}. Check Discord #general." 2>/dev/null || true'
            )
        wake_lines.append(f"rm -f {hive_cmd_file}")

        script_path = f"/tmp/backroom-hive-wake-{thread_id}.sh"
        with open(script_path, "w") as f:
            f.write("\n".join(wake_lines) + "\n")
        os.chmod(script_path, 0o755)

        subprocess.Popen(
            ["bash", script_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        print(f"  Hive:    Scheduled in {args.delay}s (background PID detached)")

    # 5. Log session
    session = {
        "thread_id": thread_id,
        "topic": args.topic,
        "agents": agent_names,
        "preset": args.preset,
        "started": datetime.now().isoformat(),
        "hive_delay": args.delay,
        "notify": args.notify,
    }
    with open(SESSIONS_LOG, "a") as f:
        f.write(json.dumps(session) + "\n")

    print()
    print(f"  🔗 https://discord.com/channels/{SERVER_ID}/{thread_id}")
    print(f"  Manual synth: python3.11 scripts/backroom-session.py --synthesize {thread_id}")


def cmd_synthesize(args):
    webhooks = load_webhooks()
    token = load_bot_token()
    thread_id = args.synthesize

    msgs = read_thread_messages(token, thread_id)
    if not msgs:
        print(f"ERROR: No messages found in thread {thread_id}", file=sys.stderr)
        sys.exit(1)

    # Extract topic and responding agents
    topic = "Unknown topic"
    agents_found = []
    for msg in msgs:
        author = msg.get("author", {}).get("username", "").lower()
        content = msg.get("content", "")
        if "**Topic**:" in content:
            topic = content.split("**Topic**:")[1].split("\n")[0].strip()
        if author in AGENT_IDS and author not in agents_found and author != "hive":
            agents_found.append(author)

    print(f"Synthesizing thread {thread_id}")
    print(f"  Topic: {topic}")
    print(f"  Agents who responded: {', '.join(a.title() for a in agents_found)}")

    if not agents_found:
        print("  WARNING: No agent responses found yet. Hive may have little to synthesize.")

    instructions = build_hive_instructions(
        topic, thread_id, webhooks["general"], agents_found
    )
    if not args.dry_run:
        result = paperclip_wake(AGENT_IDS["hive"], instructions)
        print(f"  Hive woken: {result.get('status', 'unknown')}")
    else:
        print("  [DRY RUN] Would wake Hive")


def cmd_status(args):
    token = load_bot_token()
    thread_id = args.status

    msgs = read_thread_messages(token, thread_id)
    if not msgs:
        print(f"No messages in thread {thread_id}")
        return

    topic = "?"
    agents_responded = []
    hive_responded = False

    for msg in msgs:
        author = msg.get("author", {}).get("username", "").lower()
        content = msg.get("content", "")
        if "**Topic**:" in content:
            topic = content.split("**Topic**:")[1].split("\n")[0].strip()
        if author in AGENT_IDS and author != "orchestrator":
            if author == "hive":
                hive_responded = True
            elif author not in agents_responded:
                agents_responded.append(author)

    # Find expected agents from session log
    expected = []
    if SESSIONS_LOG.exists():
        for line in open(SESSIONS_LOG):
            try:
                s = json.loads(line)
                if s.get("thread_id") == thread_id:
                    expected = s.get("agents", [])
            except json.JSONDecodeError:
                pass

    print(f"Thread: {thread_id}")
    print(f"Topic:  {topic}")
    print(f"Messages: {len(msgs)}")
    print()
    if expected:
        for name in expected:
            status = "✅ responded" if name in agents_responded else "⏳ pending"
            print(f"  {name.title():12} {status}")
        missing = [n for n in expected if n not in agents_responded]
        print()
        print(f"Hive synthesis: {'✅ done' if hive_responded else '⏳ pending'}")
        if missing and not hive_responded:
            print(f"\nStill waiting on: {', '.join(m.title() for m in missing)}")
            print(f"Force synthesis: python3.11 scripts/backroom-session.py --synthesize {thread_id}")
    else:
        print(f"Responded: {', '.join(a.title() for a in agents_responded)}")
        print(f"Hive: {'✅' if hive_responded else '⏳'}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Discord Backroom Session Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Presets:
  strategy   Beau, Envoy, Cypher          (business/direction decisions)
  technical  Builder, Cypher, Anomaly     (architecture/engineering)
  research   Beau, Curator, Scribe        (deep research/exploration)
  security   Cypher, Anomaly, Envoy       (threat/risk analysis)
  creative   Scribe, Curator, Beau        (content/creative decisions)
  ops        Anomaly, Builder, Hermes     (operations/infrastructure)
  full       Beau, Cypher, Scribe, Curator, Envoy  (all perspectives)

Hive always synthesizes last (not counted in panel).
""",
    )
    parser.add_argument("topic", nargs="?", help="Topic or question to discuss")
    parser.add_argument(
        "--agents", help="Comma-separated agent names (e.g. beau,cypher,scribe)"
    )
    parser.add_argument(
        "--preset",
        choices=list(PRESETS.keys()),
        help="Use a preset agent group",
    )
    parser.add_argument(
        "--synthesize",
        metavar="THREAD_ID",
        help="Trigger Hive synthesis on existing thread",
    )
    parser.add_argument(
        "--status",
        metavar="THREAD_ID",
        help="Check status of a backroom session",
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=600,
        help="Seconds before Hive synthesis (default: 600 = 10 min)",
    )
    parser.add_argument(
        "--no-hive", action="store_true", help="Skip Hive synthesis"
    )
    parser.add_argument(
        "--notify", action="store_true", help="Telegram notification when Hive completes"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show plan without executing"
    )
    args = parser.parse_args()

    if args.status:
        cmd_status(args)
    elif args.synthesize:
        cmd_synthesize(args)
    elif args.topic:
        cmd_start(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
