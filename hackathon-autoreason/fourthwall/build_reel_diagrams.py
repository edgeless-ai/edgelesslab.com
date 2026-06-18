#!/usr/bin/env python3
"""Generate the 4 reel-workflow diagrams as a single .excalidraw file."""
import json

# ---- palette ----
BLUE   = "#a5d8ff"   # data
PURPLE = "#d0bfff"   # agents
GREEN  = "#b2f2bb"   # scrapers
TEAL   = "#c3fae8"   # storage / notebooklm source
ORANGE = "#ffd8a8"   # external / mcp
YELLOW = "#fff3bf"   # outputs / notes
INK    = "#1e1e1e"

els = []

def box(eid, x, y, w, h, text, fill=BLUE, group=None, fs=18, shape="rectangle"):
    tid = "t_" + eid
    b = {"type": shape, "id": eid, "x": x, "y": y, "width": w, "height": h,
         "backgroundColor": fill, "fillStyle": "solid", "strokeColor": INK,
         "strokeWidth": 2, "roughness": 1, "roundness": {"type": 3},
         "boundElements": [{"id": tid, "type": "text"}]}
    if group:
        b["groupIds"] = [group]
    els.append(b)
    t = {"type": "text", "id": tid, "x": x + 8, "y": y + h/2 - fs/2,
         "width": w - 16, "height": fs + 6, "text": text, "fontSize": fs,
         "fontFamily": 1, "strokeColor": INK, "textAlign": "center",
         "verticalAlign": "middle", "containerId": eid,
         "originalText": text, "autoResize": True}
    if group:
        t["groupIds"] = [group]
    els.append(t)
    return eid

def label(eid, x, y, text, fs=20, color=INK, group=None):
    t = {"type": "text", "id": eid, "x": x, "y": y, "text": text,
         "fontSize": fs, "fontFamily": 1, "strokeColor": color,
         "originalText": text, "autoResize": True}
    if group:
        t["groupIds"] = [group]
    els.append(t)
    return eid

def arrow(eid, src, dst, group=None, dashed=False, sp=[0.5,1], ep=[0.5,0], label_txt=None):
    a = {"type": "arrow", "id": eid, "x": 0, "y": 0, "width": 0, "height": 0,
         "points": [[0,0],[0,0]], "endArrowhead": "arrow", "strokeColor": INK,
         "strokeWidth": 2, "roughness": 1,
         "startBinding": {"elementId": src, "focus": 0, "gap": 4, "fixedPoint": sp},
         "endBinding": {"elementId": dst, "focus": 0, "gap": 4, "fixedPoint": ep}}
    if dashed:
        a["strokeStyle"] = "dashed"
    if group:
        a["groupIds"] = [group]
    if label_txt:
        tid = "t_" + eid
        a["boundElements"] = [{"id": tid, "type": "text"}]
    els.append(a)
    if label_txt:
        t = {"type": "text", "id": "t_"+eid, "x": 0, "y": 0, "width": 80, "height": 22,
             "text": label_txt, "fontSize": 14, "fontFamily": 1, "strokeColor": "#495057",
             "textAlign": "center", "verticalAlign": "middle", "containerId": eid,
             "originalText": label_txt, "autoResize": True}
        if group:
            t["groupIds"] = [group]
        els.append(t)
    return eid

# ===== TITLE =====
label("title", 60, 20, "Reel Workflow Diagrams  —  @enterprisevibecode", fs=30)
label("subtitle", 60, 60, 'Instagram Reel DZsdJ6oxAQl  ·  "Stop practicing. Start scraping."', fs=16, color="#495057")

# ============================================================
# DIAGRAM A — Plug a scraper into your AI agent
# ============================================================
G = "group-a"
ax = 80
label("a_hdr", ax, 120, "A · Plug a scraper into your AI agent", fs=22, group=G)
label("a_cap", ax, 150, "One link. Your agent can scrape anything.", fs=14, color="#495057", group=G)

box("a_agent", ax+60, 190, 240, 70, "YOUR AI AGENT", PURPLE, G)
box("a_mcp",   ax+120, 320, 120, 60, "MCP", ORANGE, G, fs=18)
box("a_scraper", ax+30, 440, 300, 70, "Apify  (+ ANY SCRAPER)", GREEN, G, fs=18)

arrow("a_ar1", "a_agent", "a_mcp", G, label_txt="one connection")
arrow("a_ar2", "a_mcp", "a_scraper", G, label_txt="Model Context Protocol")

# ============================================================
# DIAGRAM B — THE LEARNING SKILL (orchestrator + 4 sub-agents)
# ============================================================
G = "group-b"
bx = 560
label("b_hdr", bx, 120, "B · THE LEARNING SKILL", fs=22, group=G)
label("b_cap", bx, 150, "One agent, many sub-agents — build it yourself.", fs=14, color="#495057", group=G)

box("b_orch", bx+360, 190, 240, 70, "ORCHESTRATOR", PURPLE, G)

subs = [("b_s1","TITLE\nPATTERNS"), ("b_s2","FIRST\nSENTENCE"),
        ("b_s3","STRUCTURE"), ("b_s4","IMAGE\nSTYLE")]
sx = bx+40
for i,(eid,txt) in enumerate(subs):
    box(eid, sx + i*230, 330, 190, 70, txt, PURPLE, G, fs=16)
    arrow("b_oa%d"%i, "b_orch", eid, G)

box("b_scraper", bx+260, 470, 440, 70, "SCRAPER LAYER  (Apify + Firecrawl)", GREEN, G, fs=18)
for i,(eid,_) in enumerate(subs):
    arrow("b_sa%d"%i, eid, "b_scraper", G)

box("b_report", bx+300, 600, 360, 70, "PATTERN REPORT", YELLOW, G, fs=18)
arrow("b_rep", "b_scraper", "b_report", G, label_txt="reports return-line")

# ============================================================
# DIAGRAM C — STEP TWO: Dump the whole field into NotebookLM
# ============================================================
G = "group-c"
cx = 80
label("c_hdr", cx, 580, "C · STEP TWO: Dump the field into NotebookLM", fs=22, group=G)

box("c_data", cx+20, 640, 340, 90, "EVERYTHING YOU SCRAPED\n(top 50 + bottom 50 posts)", BLUE, G, fs=16)
box("c_nlm", cx+70, 800, 240, 70, "NotebookLM", TEAL, G, fs=20)
arrow("c_ar", "c_data", "c_nlm", G)

# ============================================================
# DIAGRAM D — One source. Every way to learn (NotebookLM x 9)
# ============================================================
G = "group-d"
dx = 560
label("d_hdr", dx, 720, "D · One source. Every way to learn.", fs=22, group=G)
label("d_cap", dx, 750, "NotebookLM fans out to 9 study formats.", fs=14, color="#495057", group=G)

box("d_nlm", dx+520, 790, 240, 70, "NotebookLM", TEAL, G, fs=20)

outs = ["Audio Overview","Slide Deck","Video Overview","Mind Map","Reports",
        "Flashcards","Quiz","Infographic","Data Table"]
# 5 on top row, 4 on bottom row
ow, oh, gap = 220, 64, 24
row1 = outs[:5]
row2 = outs[5:]
def row_x(n, idx, total_w_start):
    return total_w_start + idx*(ow+gap)

start1 = dx + 40
for i,txt in enumerate(row1):
    eid = "d_o%d"%i
    box(eid, start1 + i*(ow+gap), 930, ow, oh, txt, YELLOW, G, fs=16)
    arrow("d_a%d"%i, "d_nlm", eid, G)

start2 = dx + 40 + (ow+gap)//2
for j,txt in enumerate(row2):
    i = 5+j
    eid = "d_o%d"%i
    box(eid, start2 + j*(ow+gap), 1050, ow, oh, txt, YELLOW, G, fs=16)
    arrow("d_a%d"%i, "d_nlm", eid, G)

# ===== envelope =====
doc = {
    "type": "excalidraw",
    "version": 2,
    "source": "https://github.com/thedavidmurray/edgeless",
    "elements": els,
    "appState": {"viewBackgroundColor": "#ffffff", "gridSize": None},
    "files": {},
}

out = "/tmp/reel-workflow-trees.excalidraw"
with open(out, "w") as f:
    json.dump(doc, f, indent=2)

# ---- validate ----
with open(out) as f:
    reloaded = json.load(f)
groups = set()
for e in reloaded["elements"]:
    for g in e.get("groupIds", []):
        groups.add(g)
assert {"group-a","group-b","group-c","group-d"} <= groups, f"missing groups: {groups}"
print(f"OK  file={out}")
print(f"groups={sorted(groups)}")
print(f"elements={len(reloaded['elements'])}")
