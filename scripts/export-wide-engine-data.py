#!/usr/bin/env python3
"""export-wide-engine-data.py -- wide.py (the monorepo MJ prompt engine) -> JSON for the TS port.

wide.py stays the SOURCE OF TRUTH. Both artifacts written here are GENERATED -- never
hand-edit them; rerun this script after wide.py / wide_banks.py / the museum packs / the
round log change, then run the vitest suite (the golden rolls pin byte-for-byte parity).

Artifacts (paths relative to this site checkout):
  1. src/lib/prompt-engine/data/wide.json                     -- every bank, cap and open-ended
                                                                 corpus (subjects, artists,
                                                                 srefs) the TS engine walks
  2. src/lib/prompt-engine/__tests__/fixtures/wide-golden.json -- cross-language parity fixtures:
                                                                 Mersenne Twister draws, crc32,
                                                                 walker picks, full rolls

Usage:
  python3.11 scripts/export-wide-engine-data.py [--src <dir containing wide.py>]
"""
import argparse
import hashlib
import json
import random
import sys
import tempfile
import zlib
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path("/Users/djm/claude-projects/generated/nous-mj-overnight")
DATA_PATH = SITE / "src/lib/prompt-engine/data/wide.json"
GOLDEN_PATH = SITE / "src/lib/prompt-engine/__tests__/fixtures/wide-golden.json"


def export_data(wide, W, src):
    c = wide.corpora()
    source_hash = hashlib.sha1(b"".join((src / f).read_bytes() for f in ("wide.py", "wide_banks.py")))
    return {
        "_generated": "scripts/export-wide-engine-data.py -- do not hand-edit",
        "sourceHash": source_hash.hexdigest()[:12],
        "block": wide.BLOCK,
        "caps": wide.CAPS,
        "cappedPhrases": wide.CAPPED_PHRASES,
        "stop": sorted(wide.STOP),
        "maxSubjectRounds": wide.MAX_SUBJECT_ROUNDS,
        "grammars": {name: list(axes) for name, (axes, _) in sorted(wide.GRAMMARS.items())},
        "registers": [list(r) for r in W.REGISTERS],
        "textObjects": W.TEXT_OBJECTS,
        "brandTokens": W.BRAND_TOKENS,
        "nicheTokens": W.NICHE_TOKENS,
        "modes": [list(m) for m in W.MODES],
        "processes": W.PROCESSES,
        "formats": W.FORMATS,
        "compositions": W.COMPOSITIONS,
        "palettes": W.PALETTES,
        "textures": W.TEXTURES,
        "arWeights": [list(p) for p in W.AR_WEIGHTS],
        "stylizeWeights": [list(p) for p in W.STYLIZE_WEIGHTS],
        "burrowMotifs": sorted(W.BURROW_MOTIFS),
        "places": W.PLACES,
        "verbs": W.VERBS,
        "corpora": c,
    }


def export_golden(wide):
    mt = []
    for seed in (0, 1, 2, 42, 1234567, 3141592653, 2**40 + 7):
        r = random.Random(seed)
        mt.append({
            "seed": seed,
            "random": [repr(r.random()) for _ in range(6)],
            "randint": [r.randint(2, 480) for _ in range(6)],
            "choiceIdx": [r.randrange(n) for n in (1, 2, 3, 5, 18, 226, 1719)],
            "choices": [r.choices(range(12), weights=[16, 13, 13, 12, 10, 8, 7, 7, 5, 4, 3, 2])[0]
                        for _ in range(8)],
        })
    samples = [{"salt": zlib.crc32(axis.encode()), "n": n,
                "perm": random.Random(zlib.crc32(axis.encode())).sample(range(n), n)}
               for axis, n in (("grammar", 18), ("register", 226), ("mode", 26), ("x", 5), ("y", 1))]
    crc = {a: zlib.crc32(a.encode()) for a in
           ("grammar", "register", "subject:museum", "subject:curated", "artist", "sref", "process",
            "texture", "mode", "format", "palette", "composition", "", "é")}
    c = wide.corpora()
    walk = wide.Walker({})
    walker = [{"axis": ax, "picks": [walk.pick(ax, pool) for _ in range(40)]}
              for ax, pool in (("grammar", wide.GRAMMAR_NAMES), ("subject:museum", c["museum"]),
                               ("artist", c["artists"]), ("sref", c["srefs"]))]
    walker.append({"axis": "register", "picks": [walk.pick("register", wide.W.REGISTERS)[0]
                                                 for _ in range(260)]})
    enforce = [(t, wide.enforce_brand(t)) for t in (
        'a ship, footer PSYCHE, sign "HERMES" and NOUS RESEARCH',
        "FORGE banner beside ATROPOS and DisTrO",
        'plate reading "NOUS RESEARCH" then HERMES loose',
    )]

    tmp = Path(tempfile.mkdtemp())
    rolls = []
    for seed, n, brand_rate, draft in ((1, 60, 0.45, True), (1, 300, 0.45, True), (7, 60, 0.8, False)):
        prompts, info = wide.roll(n, seed=seed, state_path=tmp / f"fresh-{seed}-{n}.json",
                                  brand_rate=brand_rate, persist=False, draft=draft)
        rolls.append({"seed": seed, "n": n, "brandRate": brand_rate, "draft": draft,
                      "generated": info["generated"], "prompts": prompts})
    # three consecutive persisted rounds (seed defaults to len(rounds)+1) -- the
    # cross-round coverage + recent-subject skip path
    st = tmp / "rounds.json"
    rounds = []
    for _ in range(3):
        prompts, info = wide.roll(100, state_path=st)
        rounds.append({"seed": info["seed"], "generated": info["generated"], "prompts": prompts})
    state = json.loads(st.read_text())
    return {
        "_generated": "scripts/export-wide-engine-data.py -- do not hand-edit",
        "mt": mt, "samples": samples, "crc32": crc, "walker": walker,
        "enforceBrand": [{"in": a, "out": b} for a, b in enforce],
        "rolls": rolls,
        "rounds": {"n": 100, "rounds": rounds, "finalState": state},
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    a = ap.parse_args()
    sys.path.insert(0, str(a.src))
    import wide            # noqa: E402
    import wide_banks as W  # noqa: E402
    for path, obj in ((DATA_PATH, export_data(wide, W, a.src)), (GOLDEN_PATH, export_golden(wide))):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(f"wrote {path.relative_to(SITE)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
