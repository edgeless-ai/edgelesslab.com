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
    from wigglystuff import TangleSlider
    return mo, np, plt, json, TangleSlider


@app.cell
def _(json, mo):
    _path = "public/marimo-mlb-demos/barrel_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _names = [b["full_name"] for b in _data if b["attempts"] > 200]
    _names.sort()

    player = mo.ui.dropdown(
        options=_names, value="Aaron Judge",
        label="Select Batter", full_width=True,
    )
    player
    return (player,)


@app.cell
def _(TangleSlider, json, mo, np, player):
    _path = "public/marimo-mlb-demos/barrel_data.json"
    with open(_path) as _f:
        _data = json.load(_f)
    _b = next(b for b in _data if b["full_name"] == player.value)

    _avg_la = float(_b["avg_hit_angle"])
    _avg_ev = float(_b["avg_hit_speed"])

    mo.md(
        f"""## 🔥 Barrel Zone Explorer
        **{player.value}** — 2025 season
        """)

    min_la = mo.ui.anywidget(TangleSlider(
        amount=_avg_la - 5, min_value=-30, max_value=50, step=1,
        suffix="°", prefix="Min LA: ", digits=0,
    ))
    max_la = mo.ui.anywidget(TangleSlider(
        amount=_avg_la + 5, min_value=-30, max_value=50, step=1,
        suffix="°", prefix="Max LA: ", digits=0,
    ))
    min_ev = mo.ui.anywidget(TangleSlider(
        amount=95, min_value=60, max_value=120, step=1,
        suffix=" mph", prefix="Min EV: ", digits=0,
    ))

    mo.hstack([min_la, max_la, min_ev], justify="space-around")
    return min_la, max_la, min_ev


@app.cell
def _(json, mo, np, player, min_la, max_la, min_ev):
    _path = "public/marimo-mlb-demos/barrel_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _mla = min_la.widget.amount
    _xla = max_la.widget.amount
    _mev = min_ev.widget.amount

    _matches = [
        b for b in _data
        if b["avg_hit_angle"] >= _mla
        and b["avg_hit_angle"] <= _xla
        and b["avg_hit_speed"] >= _mev
    ]
    _matches.sort(key=lambda b: b["avg_hit_speed"], reverse=True)

    _hdr = f"### {len(_matches)} batters match your zone"
    _hdr = _hdr + f" (LA: {_mla}°–{_xla}°, EV ≥ {_mev} mph)"

    if _matches:
        _rows = "\n".join(
            f"| {i+1} | {m['full_name']} | {m['avg_hit_angle']:.0f}° | {m['avg_hit_speed']:.0f} | {m['max_hit_speed']:.0f} | {m['barrels']} | {m['brl_percent']:.1f}% | {m.get('HR', 0)} | {m.get('OPS', 0):.3f} |"
            for i, m in enumerate(_matches[:25])
        )
        _table = f"""| # | Batter | Avg LA | Avg EV | Max EV | Barrels | Brl% | HR | OPS |
        |---|--------|--------|--------|--------|---------|------|----|-----|
        {_rows}"""
        mo.md(_hdr + "\n\n" + _table)
    else:
        mo.md(_hdr + "\n\nNo batters match your zone — try expanding the thresholds.")
    return


@app.cell
def _(json, np, plt, player, min_la, max_la, min_ev):
    _path = "public/marimo-mlb-demos/barrel_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _mla = min_la.widget.amount
    _xla = max_la.widget.amount
    _mev = min_ev.widget.amount

    _fig, _ax = plt.subplots(figsize=(10, 6), facecolor="#0a0a0f")
    _ax.set_facecolor("#0a0a0f")

    _la_vals = [b["avg_hit_angle"] for b in _data]
    _ev_vals = [b["avg_hit_speed"] for b in _data]

    _in_zone = [
        b["avg_hit_angle"] >= _mla and b["avg_hit_angle"] <= _xla and b["avg_hit_speed"] >= _mev
        for b in _data
    ]

    _ax.scatter(
        [_la_vals[i] for i in range(len(_data)) if not _in_zone[i]],
        [_ev_vals[i] for i in range(len(_data)) if not _in_zone[i]],
        c="#444", alpha=0.3, s=15, label="Other batters",
    )
    _ax.scatter(
        [_la_vals[i] for i in range(len(_data)) if _in_zone[i]],
        [_ev_vals[i] for i in range(len(_data)) if _in_zone[i]],
        c="#ff6b9d", alpha=0.8, s=40, edgecolors="#ff6b9d88", label="In your zone",
    )

    _ax.axhline(y=_mev, color="#ff6b9d", linestyle="--", alpha=0.5, linewidth=1)
    _ax.axvline(x=_mla, color="#00d4ff", linestyle="--", alpha=0.5, linewidth=1)
    _ax.axvline(x=_xla, color="#00d4ff", linestyle="--", alpha=0.5, linewidth=1)

    _ax.set_xlabel("Launch Angle (°)", color="#888", fontsize=12)
    _ax.set_ylabel("Avg Exit Velocity (mph)", color="#888", fontsize=12)
    _ax.tick_params(colors="#666")
    for _spine in _ax.spines.values():
        _spine.set_color("#333")
    _ax.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)
    _ax.set_title("Barrel Zone — Launch Angle vs Exit Velocity", color="#ccc", fontsize=14, fontweight="bold")
    _fig
    return


@app.cell
def _(mo):
    mo.md("""---\n⚾ **Drag the threshold values above** to search for batters in your custom barrel zone. The scatter plot highlights who fits your criteria.\n\n*Data from Statcast — 2025 season.*\n""")
    return


if __name__ == "__main__":
    app.run()