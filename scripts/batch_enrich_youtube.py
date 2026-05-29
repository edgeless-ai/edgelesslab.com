#!/usr/bin/env python3
"""
Batch enrich YouTube notes using DeepSeek V4 Flash (free) via Nous Research inference API.
Targets notes missing: context, vault_connections, or with tier < L4.
"""
import os, sys, json, re, time, traceback, yaml
from pathlib import Path
from datetime import datetime
import requests

# Config
VAULT_DIR = Path("/Users/djm/claude-projects/claude-vault/03-Knowledge/YouTube")
AUTH_PATH = Path("/Users/djm/.hermes/auth.json")
API_URL = "https://inference-api.nousresearch.com/v1/chat/completions"
MODEL = "deepseek/deepseek-v4-flash:free"
BATCH_SIZE = 5
SLEEP_BETWEEN = 2  # seconds
MAX_RETRIES = 3

# Get API key
with open(AUTH_PATH) as f:
    auth = json.load(f)
API_KEY = auth["providers"]["nous"]["access_token"]
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def parse_note(path):
    """Parse a note with dual frontmatter blocks."""
    text = path.read_text(encoding="utf-8")
    # Find all --- blocks
    parts = text.split("---")
    if len(parts) < 3:
        return None, None, text
    
    # First frontmatter
    try:
        fm1 = yaml.safe_load(parts[1].strip()) or {}
    except Exception:
        fm1 = {}
    
    # The file structure is: --- fm1 --- fm2 --- body
    fm2_text = ""
    body = ""
    if len(parts) >= 5:
        fm2_text = parts[3].strip()
        body = "---".join(parts[4:])
    else:
        # Try alternative: find second ---
        match = re.search(r"^---\s*\n(.*?)\n---\s*\n\s*---\s*\n(.*?)\n---", text, re.DOTALL)
        if match:
            fm2_text = match.group(2)
            body = text[match.end():]
        else:
            body = "---".join(parts[2:])
    
    try:
        fm2 = yaml.safe_load(fm2_text) or {}
    except Exception:
        fm2 = {}
    
    return fm1, fm2, body

def needs_enrichment(fm2):
    """Check if note needs enrichment."""
    if not fm2:
        return True
    tier = fm2.get("enrichment_tier", "")
    if isinstance(tier, str) and "L4" in tier:
        return False
    if tier == 4 or tier == "4" or tier == "L4":
        return False
    
    ctx = fm2.get("context", "")
    if not ctx or str(ctx).strip() in ("", ".", "video covering .", " video covering : ."):
        return True
    
    vc = fm2.get("vault_connections", [])
    if not vc or (isinstance(vc, list) and len(vc) == 0):
        return True
    
    if tier in (1, 2, 3, "1", "2", "3", "tier1", "tier2", "tier3"):
        return True
    
    return False

def extract_content_for_prompt(fm2, body):
    """Build prompt content from note."""
    title = fm2.get("title", "")
    channel = fm2.get("channel", "")
    summary = fm2.get("summary", "")
    one_liner = fm2.get("one_liner", "")
    
    # Get body summary (first 2000 chars)
    body_clean = body.strip()[:2000]
    
    content = f"""Title: {title}
Channel: {channel}
One-liner: {one_liner}
Summary: {summary}
Body excerpt: {body_clean}
"""
    return content

def enrich_note(content_text):
    """Call DeepSeek V4 Flash for enrichment."""
    prompt = f"""You are enriching a knowledge base note about a YouTube video.
Given the following note content, produce ONLY a JSON object with exactly these keys:
- "context": A rich 2-3 sentence paragraph explaining what this video covers and why it matters to someone building AI agents, creative technology, or Bitcoin/web3 infrastructure. Be specific and substantive.
- "vault_connections": An array of 3-5 wikilink-style connections to related topics (e.g., "[[Hermes Agent]]", "[[Claude Code]]", "[[RSS Intelligence]]", "[[Generative Art]]", "[[Bitcoin]]", "[[LLM Training]]", "[[iOS Development]]"). Pick the MOST relevant connections.
- "enrichment_tier": Always return "L4-FullyEnriched"

Note content:
{content_text}

Return ONLY valid JSON. No markdown, no explanation."""

    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
        "temperature": 0.3
    }
    
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(API_URL, headers=headers, json=payload, timeout=60)
            if r.status_code == 429:
                time.sleep(10)
                continue
            r.raise_for_status()
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            # Extract JSON
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            # Try parsing whole text
            return json.loads(text)
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                return {"error": str(e), "raw": text if "text" in dir() else "no text"}
            time.sleep(5)
    return {"error": "max_retries"}

def update_note(path, fm1, fm2, body, enrichment):
    """Write updated note back."""
    # Update fm2 fields
    fm2["context"] = enrichment.get("context", fm2.get("context", ""))
    fm2["vault_connections"] = enrichment.get("vault_connections", fm2.get("vault_connections", []))
    fm2["enrichment_tier"] = "L4-FullyEnriched"
    fm2["enrichment_model"] = MODEL
    fm2["enrichment_date"] = datetime.utcnow().isoformat() + "+00:00"
    
    # Build new content
    fm1_yaml = yaml.dump(fm1, default_flow_style=False, allow_unicode=True, sort_keys=False)
    fm2_yaml = yaml.dump(fm2, default_flow_style=False, allow_unicode=True, sort_keys=False)
    
    new_text = f"---\n{fm1_yaml}---\n\n---\n{fm2_yaml}---\n{body}"
    path.write_text(new_text, encoding="utf-8")

def main():
    # Find all notes
    all_notes = list(VAULT_DIR.rglob("*.md"))
    print(f"Total notes found: {len(all_notes)}")
    
    # Identify targets
    targets = []
    for path in all_notes:
        try:
            fm1, fm2, body = parse_note(path)
            if needs_enrichment(fm2):
                targets.append((path, fm1, fm2, body))
        except Exception as e:
            print(f"Parse error {path}: {e}")
    
    print(f"Notes needing enrichment: {len(targets)}")
    
    # Process in batches
    success = 0
    failed = 0
    skipped = 0
    
    for i, (path, fm1, fm2, body) in enumerate(targets):
        try:
            print(f"[{i+1}/{len(targets)}] {path.name}")
            content = extract_content_for_prompt(fm2, body)
            enrichment = enrich_note(content)
            
            if "error" in enrichment:
                print(f"  FAILED: {enrichment['error']}")
                failed += 1
                continue
            
            update_note(path, fm1, fm2, body, enrichment)
            print(f"  OK: tier=L4, ctx={len(enrichment.get('context',''))} chars, links={len(enrichment.get('vault_connections',[]))}")
            success += 1
            
            if (i + 1) % BATCH_SIZE == 0:
                print(f"  -- batch complete, sleeping {SLEEP_BETWEEN}s --")
                time.sleep(SLEEP_BETWEEN)
                
        except Exception as e:
            print(f"  ERROR: {e}")
            traceback.print_exc()
            failed += 1
    
    print(f"\nDone. Success: {success}, Failed: {failed}, Total: {len(targets)}")

if __name__ == "__main__":
    main()
