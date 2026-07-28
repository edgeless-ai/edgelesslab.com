# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "marimo",
#     "wigglystuff",
#     "numpy",
#     "matplotlib",
# ]
# ///

import marimo

__generated_with = "0.20.4"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    import json
    from wigglystuff import CurveEditor
    return mo, np, plt, json, CurveEditor


@app.cell
def _(json, mo):
    _path = "public/marimo-mlb-demos/pitch_arsenal_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    # Build pitcher list
    _pitchers = {}
    for _row in _data:
        _name = _row["last_name_first_name"].split(",")[0].strip()
        _pid = _row["player_id"]
        if _pid not in _pitchers:
            _pitchers[_pid] = {"name": _name, "total_pitches": _row["total_pitches"]}

    _names = sorted([p["name"] for p in _pitchers.values()], key=lambda n: n.split()[-1])
    pitcher = mo.ui.dropdown(
        options=_names, value="Skenes",
        label="Select Pitcher", full_width=True,
    )
    pitcher
    return (pitcher,)


@app.cell
def _(CurveEditor, json, mo, pitcher):
    _path = "public/marimo-mlb-demos/pitch_arsenal_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    # Default curve points
    mo.md("## 🎯 Pitch Tunnel Visualizer\n**Draw your ideal pitch profile** — then see which real pitchers match it.")
    curve = mo.ui.anywidget(CurveEditor())
    curve
    return (curve,)


@app.cell
def _(curve, json, mo, np, pitcher):
    _path = "public/marimo-mlb-demos/pitch_arsenal_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _pts = curve.widget.points
    if not _pts or len(_pts) < 2:
        _ = mo.md("Draw a curve above to see matching pitchers.")
    else:
        _draw_x = [p["x"] for p in _pts]
        _draw_y = [p["y"] for p in _pts]

        _pitcher_scores = {}
        for row in _data:
            _pid = row["player_id"]
            _name = row["last_name_first_name"].split(",")[0].strip()
            _usage = row["pitch_usage"] / 100.0
            _rv = max(0, min(1, (row["run_value_per_100"] + 5) / 10))
            _pitch = row["pitch_name"]

            if _pid not in _pitcher_scores:
                _pitcher_scores[_pid] = {"name": _name, "pitches": [], "score": 0, "count": 0}

            _pitcher_scores[_pid]["pitches"].append({
                "name": _pitch, "usage": _usage, "rv": _rv,
                "usage_pct": row["pitch_usage"], "rv_raw": row["run_value_per_100"],
                "whiff": row["whiff_percent"], "ba": row["ba"], "slg": row["slg"],
            })

        for _pid, _info in _pitcher_scores.items():
            _score = 0
            for _p in _info["pitches"]:
                _x = _p["usage"]
                _y = _p["rv"]
                _dists = [((_x - dx) ** 2 + (_y - dy) ** 2) ** 0.5 for dx, dy in zip(_draw_x, _draw_y)]
                _score += (1 - min(_dists)) * 100
            _info["score"] = _score / max(1, len(_info["pitches"]))

        _valid = {k: v for k, v in _pitcher_scores.items() if len(v["pitches"]) >= 3}
        _ranked = sorted(_valid.values(), key=lambda x: x["score"], reverse=True)[:15]

        if _ranked:
            _rows = "\n".join(
                f"| {i+1} | {p['name']} | {p['score']:.0f} | {len(p['pitches'])} | "
                + ", ".join(f"{pp['name']} ({pp['usage_pct']:.0f}%)" for pp in p['pitches'][:4])
                + " |"
                for i, p in enumerate(_ranked)
            )
            _ = mo.md(f"""### Best Matches — Your Curve vs. Real Pitchers

| # | Pitcher | Match% | Pitches | Arsenal |
|---|---------|--------|---------|---------|
{_rows}

*The curve maps **pitch usage %** (x-axis) to **run value** (y-axis). Higher curve = more effective pitches.*
""")
        else:
            _ = mo.md("No pitchers match your curve. Try drawing a different profile.")
    return


@app.cell
def _(mo):
    mo.md("""---\n⚾ **Draw a curve** in the editor above to define your ideal pitch profile. The tool finds real MLB pitchers whose arsenal (usage vs. effectiveness) best matches your curve.\n\nTip: A curve that rises to the right means you want pitchers whose most-used pitches are also their most effective.\n\n*Data from Statcast — 2025 season.*\n""")
    return


if __name__ == "__main__":
    app.run()