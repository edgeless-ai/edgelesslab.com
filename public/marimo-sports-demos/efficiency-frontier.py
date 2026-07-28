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
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _all_players = _data["_all_players"]

    stat_options = {
        "Points (PTS)": "pts",
        "Rebounds (REB)": "reb",
        "Assists (AST)": "ast",
        "Field Goal %": "fg_pct",
        "3-Point %": "fg3_pct",
        "Free Throw %": "ft_pct",
        "Steals (STL)": "stl",
        "Blocks (BLK)": "blk",
        "Minutes (MIN)": "min",
        "Plus/Minus": "plus_minus",
    }

    x_stat = mo.ui.dropdown(
        options=stat_options,
        value="Points (PTS)",
        label="X Axis",
        full_width=True,
    )
    y_stat = mo.ui.dropdown(
        options=stat_options,
        value="Rebounds (REB)",
        label="Y Axis",
        full_width=True,
    )
    team_filter = mo.ui.dropdown(
        options=["All"] + sorted(set(p["team"] for p in _all_players)),
        value="All",
        label="Team Filter",
        full_width=True,
    )
    min_games = mo.ui.slider(10, 82, value=20, step=1, label="Min Games Played")
    min_games, x_stat, y_stat, team_filter
    return stat_options, x_stat, y_stat, team_filter, min_games


@app.cell
def _(CurveEditor, mo, stat_options, x_stat, y_stat, json, np):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _all = _data["_all_players"]
    x_key = stat_options.get(x_stat.value, x_stat.value)
    y_key = stat_options.get(y_stat.value, y_stat.value)

    _x_vals = np.array([p[x_key] for p in _all])
    _y_vals = np.array([p[y_key] for p in _all])

    _x_min, _x_max = float(_x_vals.min()), float(_x_vals.max())
    _y_min, _y_max = float(_y_vals.min()), float(_y_vals.max())

    editor = mo.ui.anywidget(
        CurveEditor(
            x_bounds=(_x_min, _x_max),
            y_bounds=(_y_min, _y_max),
            width=700,
            height=400,
            show_axes=True,
            n_samples=100,
            curve="natural",
            closed=False,
            tension=0.0,
            alpha=0.5,
        )
    )
    editor
    return editor, x_key, y_key


@app.cell
def _(json, mo, np, plt, stat_options, x_stat, y_stat, team_filter, min_games, editor, x_key, y_key):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _all = _data["_all_players"]
    _team = team_filter.value

    _filtered = [p for p in _all if p["gp"] >= min_games.value]
    if _team != "All":
        _filtered = [p for p in _filtered if p["team"] == _team]

    _x_vals = np.array([p[x_key] for p in _filtered])
    _y_vals = np.array([p[y_key] for p in _filtered])

    _fig, _ax = plt.subplots(figsize=(10, 7), facecolor="#0a0a0f")
    _ax.set_facecolor("#0a0a0f")

    _ax.scatter(_x_vals, _y_vals, c="#00d4ff", alpha=0.5, s=25, edgecolors="none", zorder=3)

    _points = editor.widget.points
    if len(_points) > 1:
        _cx = [p["x"] for p in _points]
        _cy = [p["y"] for p in _points]
        _ax.plot(_cx, _cy, color="#ff6b9d", linewidth=2.5, zorder=4, label="Efficiency Frontier")
        _ax.fill_between(_cx, _cy, alpha=0.08, color="#ff6b9d", zorder=1)
        _ax.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)

    _ax.set_xlabel(x_stat.value, color="#888", fontsize=12)
    _ax.set_ylabel(y_stat.value, color="#888", fontsize=12)
    _ax.tick_params(colors="#666")
    for _spine in _ax.spines.values():
        _spine.set_color("#333")

    _ax.set_title("NBA Players — Efficiency Frontier", color="#ccc", fontsize=14, fontweight="bold")
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        """---\n        🏀 **Draw an efficiency frontier** by dragging the control points
        on the curve editor above. The frontier overlays real player data.

        Players above your curve are outperforming the frontier for their
        stat combination. Try different stat axes to find surprising patterns.

        *Data from NBA API — 2025‑26 regular season (min 20 games).*
        """
    )
    return


if __name__ == "__main__":
    app.run()