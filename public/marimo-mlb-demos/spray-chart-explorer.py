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
    _path = "public/marimo-mlb-demos/spray_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    # Get all player names
    _names = sorted(set(d["player_name"] for d in _data if d["player_name"]))
    player = mo.ui.dropdown(
        options=_names, value="Judge, Aaron",
        label="Select Batter", full_width=True,
    )
    hits = mo.ui.range_slider(0, len(_data), value=(0, len(_data)), label="Hit Range", show_value=True)
    player, hits
    return (player, hits)


@app.cell
def _(TangleSlider, json, mo, np, player):
    _path = "public/marimo-mlb-demos/spray_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player_hits = [d for d in _data if d["player_name"] == player.value]
    _la_vals = [d["launch_angle"] for d in _player_hits if d["launch_angle"] is not None]
    _ev_vals = [d["launch_speed"] for d in _player_hits if d["launch_speed"] is not None]

    _avg_la = float(np.mean(_la_vals)) if _la_vals else 15
    _avg_ev = float(np.mean(_ev_vals)) if _ev_vals else 90

    mo.md(f"## 🎯 Spray Chart Explorer — {player.value}")
    min_la = mo.ui.anywidget(TangleSlider(
        amount=_avg_la - 10, min_value=-60, max_value=60, step=1,
        suffix="°", prefix="Min LA: ", digits=0,
    ))
    max_la = mo.ui.anywidget(TangleSlider(
        amount=_avg_la + 10, min_value=-60, max_value=60, step=1,
        suffix="°", prefix="Max LA: ", digits=0,
    ))
    min_ev = mo.ui.anywidget(TangleSlider(
        amount=80, min_value=50, max_value=120, step=1,
        suffix=" mph", prefix="Min EV: ", digits=0,
    ))

    mo.hstack([min_la, max_la, min_ev], justify="space-around")
    return min_la, max_la, min_ev


@app.cell
def _(json, mo, np, plt, player, min_la, max_la, min_ev):
    _path = "public/marimo-mlb-demos/spray_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player_hits = [d for d in _data if d["player_name"] == player.value]
    _mla = min_la.widget.amount
    _xla = max_la.widget.amount
    _mev = min_ev.widget.amount

    _filtered = [
        d for d in _player_hits
        if d["launch_angle"] is not None and d["launch_speed"] is not None
        and d["launch_angle"] >= _mla and d["launch_angle"] <= _xla
        and d["launch_speed"] >= _mev
    ]

    _total = len(_player_hits)
    _shown = len(_filtered)

    _fig, _ax = plt.subplots(figsize=(8, 8), facecolor="#0a0a0f")
    _ax.set_facecolor("#0a0a0f")

    # Draw the baseball field (overhead view)
    # hc_x, hc_y are the Statcast coordinates (0-250ish, 0-200ish)
    # Home plate is at roughly (125, 0-10), field extends upward
    # Draw a simple diamond outline
    _field_x = [0, 125, 250, 125, 0]
    _field_y = [0, 200, 0, 200, 0]
    _ax.plot(_field_x, _field_y, color="#1a3a1a", linewidth=2, alpha=0.5)

    # Draw infield arc
    _theta = np.linspace(0, np.pi, 100)
    _inf_x = 125 + 60 * np.cos(_theta)
    _inf_y = 60 * np.sin(_theta)
    _ax.plot(_inf_x, _inf_y, color="#1a3a1a", linewidth=1.5, alpha=0.4)

    # Draw outfield wall
    _out_x = 125 + 120 * np.cos(_theta)
    _out_y = 120 * np.sin(_theta)
    _ax.plot(_out_x, _out_y, color="#1a3a1a", linewidth=1.5, alpha=0.4)

    # Plot hits
    _event_colors = {
        "single": "#00d4ff",
        "double": "#00ff88",
        "triple": "#ffaa00",
        "home_run": "#ff6b9d",
        "field_out": "#666",
        "field_error": "#ffaa00",
        "force_out": "#888",
        "grounded_into_double_play": "#555",
        "sac_fly": "#aaa",
        "sac_bunt": "#888",
    }

    for _d in _filtered:
        _c = _event_colors.get(_d.get("events", ""), "#888")
        _s = 60 if _d.get("events") == "home_run" else 20
        _alpha = 0.9 if _d.get("events") == "home_run" else 0.5
        _ax.scatter(_d["hc_x"], _d["hc_y"], c=_c, s=_s, alpha=_alpha, edgecolors="none")

    _ax.set_xlim(-20, 270)
    _ax.set_ylim(-20, 220)
    _ax.set_aspect("equal")
    _ax.axis("off")

    _ax.set_title(
        f"{player.value} — {_shown}/{_total} hits shown\n"
        f"LA: {_mla:.0f}°–{_xla:.0f}°, EV ≥ {_mev:.0f} mph\n"
        f"{'🏠' if any(d['events'] == 'home_run' for d in _filtered) else ''} "
        f"{sum(1 for d in _filtered if d['events'] == 'home_run')} HR"
        f"  |  {sum(1 for d in _filtered if d['events'] == 'single')} 1B"
        f"  |  {sum(1 for d in _filtered if d['events'] == 'double')} 2B"
        f"  |  {sum(1 for d in _filtered if d['events'] == 'triple')} 3B",
        color="#ccc", fontsize=13, fontweight="bold",
    )
    _fig
    return


@app.cell
def _(mo):
    mo.md("""---\n⚾ **Drag the LA and EV thresholds** to filter the batter's spray chart. 🟦 single 🟩 double 🟨 triple 🟥 home run ⚫ out\n\n*Statcast data from June 1–15, 2025.*\n""")
    return


if __name__ == "__main__":
    app.run()