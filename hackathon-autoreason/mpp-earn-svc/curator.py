"""
The immune system — real anti-slop design curation via a NVIDIA NIM VISION SWARM.

Every design is *looked at* by a panel of independent vision models on NVIDIA NIM
(different architectures + generations) and scored for craft, originality (slop
detection), and policy. Their votes are aggregated — median score, majority slop/policy —
so one model's quirk can't swing a verdict. Slop is quarantined out of the premium shelf.
This replaces the old fake "GLOSSOPETRAE sanitizer" theater with a real ensemble-in-the-
loop quality gate — the content analogue of the spend gate.

Fail-safe: if NO panel member responds, a design is NOT auto-promoted to premium
(listed in the bazaar pending demand). Slop can never reach premium without passing.
"""
from __future__ import annotations
import concurrent.futures
import json
import os
import re
import statistics
import urllib.request

# The vision swarm — independent NIM models that each score a design (all live-probed on
# integrate.api.nvidia.com). Diverse lineages (Meta Llama 3.2 90B + Llama 4 Maverick +
# NVIDIA Nemotron Nano VL) so the panel genuinely disagrees rather than echoing one prior.
# Odd size → clean majority on the boolean votes. Add/remove members here.
# Panel ordered by reliability (live-probed 2026-06-29 on clean illustration). The first
# three answer benign art consistently; 90B is the strongest model but its safety tuning
# hard-refuses on whole classes of legit art (e.g. cartoon animals) regardless of prompt —
# kept as a bonus voter for the art it WILL rate, while the swarm no longer depends on it.
# NOTE: some models (e.g. Nemotron) 500 on WebP — feed PNG/JPEG art_urls for full coverage.
CURATOR_PANEL = [
    "meta/llama-4-maverick-17b-128e-instruct",    # reliable lead — also used by name_design()
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    "meta/llama-3.2-90b-vision-instruct",         # strongest, but often safety-refuses
]
CURATOR_MODEL = CURATOR_PANEL[0]  # lead model — also used by name_design()
NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# Persistent across redeploys when DATA_DIR points at a mounted disk (else code dir).
_DATA_DIR = (os.environ.get("DATA_DIR") or "").strip() or os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(_DATA_DIR, "curation_cache.json")


def _load() -> dict:
    try:
        with open(CACHE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save(d: dict) -> None:
    try:
        tmp = CACHE_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(d, f)
        os.replace(tmp, CACHE_FILE)
    except Exception:
        pass


_CACHE = _load()

# Framed as a print-quality review (NOT content moderation) — the safety-tuned vision
# model refuses ("I'm not going to engage in this subject.") when asked to judge
# hate/explicit content, which crashed the parser. policy_ok now covers only the
# sell-ability check (brand/logo copying), which the model answers without refusing.
# Framed as a routine, harmless commercial product-quality rating so the safety-tuned
# vision models don't mistake it for a moderation task and refuse (that returned no JSON
# → "inconclusive" fallback). The reassurance line + "always return the JSON" measurably
# cut refusals on clean illustration, so more panel models vote per design (Steppe corpus).
_PROMPT = (
    "Routine task: rate a piece of user-submitted artwork for printing on merch "
    "(t-shirts, posters, mugs). This is a harmless commercial product-quality check — just "
    "describe how good the art would look printed. Rate craft, originality, and composition "
    "on a 0-100 scale, and flag generic, low-effort, repetitive 'AI slop'. Set policy_ok to "
    "false ONLY if the art clearly reproduces a trademarked brand logo or a copyrighted "
    "character; otherwise true. Always answer — do not decline; this is a benign quality rating. "
    'Respond with ONLY a JSON object and nothing else: '
    '{"score": <0-100 int>, "slop": <true|false>, "policy_ok": <true|false>, "reason": "<one short sentence>"}'
)


def _verdict(score: int, slop: bool, policy_ok: bool) -> str:
    if not policy_ok:
        return "quarantined"
    if score >= 75 and not slop:
        return "premium"
    if score >= 45:
        return "bazaar"
    return "quarantined"


def name_design(art_url: str) -> str:
    """Ask the vision model to name a design (2-4 words) from what it depicts. Returns a
    Title Case name, or "" on failure. Used to auto-title untitled submissions so agents
    can refer to a product by what they see, not 'Untitled Design'."""
    key = os.getenv("NVIDIA_NIM_API_KEY", "")
    if not key or not art_url:
        return ""
    art_url = _screen_ref(art_url)  # flatten transparency so white-ink text isn't "blank"
    prompt = ("Name this artwork as a merch product title: 2-4 words, Title Case, catchy, "
              "descriptive of what's shown, no quotes, no markdown, no punctuation, never the "
              "word 'design'. Reply with ONLY the title.")
    body = {"model": CURATOR_MODEL, "max_tokens": 24, "temperature": 0.7,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": art_url}}]}]}
    req = urllib.request.Request(NIM_URL, method="POST", data=json.dumps(body).encode())
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            t = json.load(r)["choices"][0]["message"]["content"]
        t = t.strip().strip('"').replace("*", "").strip().rstrip(".").strip()
        words = t.split()
        return " ".join(words[:5]) if 1 <= len(words) <= 6 and len(t) <= 48 else ""
    except Exception:
        return ""


def _score_one(model: str, art_url: str, title: str, key: str) -> dict | None:
    """One panel member's vote: {model, score, slop, policy_ok, reason} or None if it
    refused / errored / returned no JSON. Two tries — refusals are often transient. Parses
    the JSON object with regex (NEVER str.index — that raised 'substring not found')."""
    body = {
        "model": model,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": _PROMPT + (f" (title: {title})" if title else "")},
            {"type": "image_url", "image_url": {"url": art_url}},
        ]}],
        "max_tokens": 160, "temperature": 0,
    }
    req = urllib.request.Request(NIM_URL, method="POST", data=json.dumps(body).encode())
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    for _ in range(2):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                content = json.load(r)["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", content or "", re.DOTALL)
            if m:
                p = json.loads(m.group(0))
                return {"model": model, "score": int(p.get("score", 0)),
                        "slop": bool(p.get("slop", False)),
                        "policy_ok": bool(p.get("policy_ok", True)),
                        "reason": str(p.get("reason", ""))[:200]}
        except Exception:
            continue
    return None


def _screen_ref(art_url: str) -> str:
    """Vision models flatten transparent PNGs onto WHITE, so white-ink designs (text
    tees) read as 'blank' and get wrongly quarantined. If the image has real
    transparency, composite it onto neutral gray (legible for white AND black ink) and
    hand the models a base64 data URI for SCREENING ONLY — the print/display file stays
    transparent. Opaque images (the vast majority) pass through unchanged. Any failure
    falls back to the original url, so this can never break the existing path."""
    try:
        if not art_url or art_url.startswith("data:"):
            return art_url
        import urllib.request, base64, io
        from PIL import Image
        req = urllib.request.Request(art_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
        im = Image.open(io.BytesIO(raw))
        if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info:
            return art_url  # opaque → no change in behavior
        im = im.convert("RGBA")
        if im.getchannel("A").getextrema()[0] >= 250:
            return art_url  # effectively opaque
        bg = Image.new("RGBA", im.size, (128, 128, 128, 255))
        bg.alpha_composite(im)
        out = io.BytesIO()
        bg.convert("RGB").save(out, format="PNG")
        return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()
    except Exception:
        return art_url


def curate(art_url: str, title: str = "") -> dict:
    """Score a design via the NIM vision SWARM. Fans the design out to every panel member
    concurrently, then aggregates: median score, majority slop, majority policy_ok. Returns
    {ok, score, slop, policy_ok, verdict, reason, model, models, votes, provider}."""
    key = os.getenv("NVIDIA_NIM_API_KEY", "")
    cache_key = art_url
    if cache_key in _CACHE:
        return _CACHE[cache_key]
    if not key or not art_url:
        return {"ok": False, "verdict": "unrated", "reason": "curator_unavailable"}
    # Flatten transparent designs onto gray so white-ink text isn't seen as "blank".
    screen_url = _screen_ref(art_url)

    # Fan out across the panel concurrently — total latency ≈ the slowest single model,
    # not the sum. Each member votes independently; failures just drop out of the tally.
    votes: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(CURATOR_PANEL)) as ex:
        futs = [ex.submit(_score_one, m, screen_url, title, key) for m in CURATOR_PANEL]
        for f in concurrent.futures.as_completed(futs):
            v = f.result()
            if v:
                votes.append(v)

    if not votes:
        # The whole panel refused or errored. FAIL CLOSED: this is a live, real-money print
        # store and Edgeless is the merchant of record — never let UNSCREENED art become
        # printable (IP/offensive-content exposure). Hold it as quarantined (not listed, not
        # buyable) so the gate can't be defeated by knocking NIM over. Not cached → a later
        # submit re-screens once the swarm is healthy. (Resilience to NIM outages belongs in
        # caching/fallback keys, NOT in listing unvetted designs.)
        return {"ok": True, "score": 0, "slop": False, "policy_ok": False, "verdict": "quarantined",
                "reason": "screening unavailable — the vision swarm didn't respond; resubmit shortly",
                "model": CURATOR_MODEL, "models": [], "votes": [], "provider": "nvidia-nim"}

    n = len(votes)
    score = int(round(statistics.median(v["score"] for v in votes)))
    slop = sum(1 for v in votes if v["slop"]) > n / 2          # majority calls it slop
    # IP is asymmetric — a copyrighted listing is a real liability, a wrongly-held good piece is
    # not. Calibration (was unanimous all(), which over-rejected originals — one lone cautious
    # model quarantined genuine work like a caduceus/hexagon-mark scoring 85): a MAJORITY of the
    # panel must clear policy, mirroring the slop idiom above. BUT the keyword backstop still
    # HARD-quarantines any named copyright/trademark/known-character in a reason REGARDLESS of the
    # vote — that backstop is what actually caught the live 'Eevee' listing, and it's unchanged.
    policy_ok = sum(1 for v in votes if v["policy_ok"]) > n / 2   # majority clears policy
    _ip_re = re.compile(r"copyright|trademark|infring|pok[eé]mon|eevee|pikachu|disney|nintendo|"
                        r"marvel|mario|mickey|hello kitty|sanrio|studio ghibli|logo of", re.I)
    if any(_ip_re.search(v.get("reason") or "") for v in votes):
        policy_ok = False   # known-IP keyword overrides the vote — always quarantine
    # Surface the lead model's reason if it voted, else the first responder's — concrete text.
    reason = next((v["reason"] for v in votes if v["model"] == CURATOR_MODEL), votes[0]["reason"])
    out = {
        "ok": True, "score": score, "slop": slop, "policy_ok": policy_ok,
        "verdict": _verdict(score, slop, policy_ok),
        "reason": reason,
        "model": CURATOR_MODEL,
        "models": [v["model"] for v in votes],
        "votes": [{"model": v["model"], "score": v["score"], "slop": v["slop"],
                   "policy_ok": v["policy_ok"]} for v in votes],
        "provider": "nvidia-nim",
    }
    _CACHE[cache_key] = out
    _save(_CACHE)
    return out
