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
    from wigglystuff import PlaySlider
    return mo, np, plt, json, PlaySlider


@app.cell
def _(json, mo):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player_names = [k for k in _data if k != "_all_players"]
    _player_names.sort()

    player_selector = mo.ui.dropdown(
        options=_player_names,
        value="LeBron James",
        label="Select Player",
        full_width=True,
    )
    window = mo.ui.slider(1, 20, value=5, step=1, label="Rolling Avg Window")
    player_selector, window
    return (player_selector, window,)


@app.cell
def _(json, mo, PlaySlider, player_selector):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player = _data[player_selector.value]
    _games = _player["games"]
    _n = len(_games)

    slider = mo.ui.anywidget(
        PlaySlider(
            value=_n - 1,
            min_value=0,
            max_value=_n - 1,
            step=1,
            playing=True,
            loop=True,
            interval=500,
        )
    )
    slider
    return (slider,)


@app.cell
def _(json, mo, np, plt, player_selector, window, slider):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player = _data[player_selector.value]
    _games = _player["games"]
    _n = len(_games)
    _w = window.value
    _current_idx = int(slider.widget.value)

    _pts = np.array([g["pts"] for g in _games])
    _reb = np.array([g["reb"] for g in _games])
    _ast = np.array([g["ast"] for g in _games])
    _game_nums = np.arange(1, _n + 1)

    _pts_ma = np.convolve(_pts, np.ones(_w) / _w, mode="valid")
    _reb_ma = np.convolve(_reb, np.ones(_w) / _w, mode="valid")
    _ast_ma = np.convolve(_ast, np.ones(_w) / _w, mode="valid")
    _ma_x = np.arange(_w, _n + 1)

    _fig, (_ax1, _ax2) = plt.subplots(2, 1, figsize=(10, 8), facecolor="#0a0a0f")
    for _ax in [_ax1, _ax2]:
        _ax.set_facecolor("#0a0a0f")
        _ax.tick_params(colors="#666")
        for _spine in _ax.spines.values():
            _spine.set_color("#333")

    _ax1.bar(_game_nums, _pts, color="#00d4ff44", edgecolor="#00d4ff88", linewidth=0.5, alpha=0.6, label="Game Score")
    _ax1.plot(_ma_x, _pts_ma, color="#ff6b9d", linewidth=2.5, label=f"{_w}-Game Avg")
    _ax1.axvline(_current_idx + 1, color="#00ff88", linestyle="--", linewidth=1.5, alpha=0.8)
    _ax1.set_ylabel("Points", color="#888", fontsize=12)
    _ax1.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)
    _ax1.set_title(f"{player_selector.value} — 2025-26 Game Log", color="#ccc", fontsize=14, fontweight="bold")

    _ax2.plot(_ma_x, _reb_ma, color="#00d4ff", linewidth=2, label=f"Rebounds ({_w}-g avg)")
    _ax2.plot(_ma_x, _ast_ma, color="#ff6b9d", linewidth=2, label=f"Assists ({_w}-g avg)")
    _ax2.axvline(_current_idx + 1, color="#00ff88", linestyle="--", linewidth=1.5, alpha=0.8)
    _ax2.set_ylabel("Per Game", color="#888", fontsize=12)
    _ax2.set_xlabel("Game Number", color="#888", fontsize=12)
    _ax2.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)

    _fig.tight_layout()
    _fig
    return


@app.cell
def _(json, mo, player_selector, slider):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player = _data[player_selector.value]
    _games = _player["games"]
    _current_idx = int(slider.widget.value)
    _g = _games[_current_idx]

    _fg_pct = f"{_g['fgm'] / _g['fga'] * 100:.1f}%" if _g['fga'] > 0 else "—"

    _detail = mo.md(
        f"""
        **Game {_current_idx + 1} of {len(_games)}** — {_g['date']}
        | Stat | Value |
        |------|-------|
        | Matchup | {_g['matchup']} |
        | Result | {'W' if _g['wl'] == 'W' else 'L'} |
        | Minutes | {_g['min']} |
        | Points | {_g['pts']} |
        | FG | {_g['fgm']}/{_g['fga']} ({_fg_pct}) |
        | 3PT | {_g['fg3m']}/{_g['fg3a']} |
        | FT | {_g['ftm']}/{_g['fta']} |
        | Rebounds | {_g['reb']} |
        | Assists | {_g['ast']} |
        | Steals | {_g['stl']} |
        | Blocks | {_g['blk']} |
        | +/- | {_g['plus_minus']:+d} |
        """
    )
    _detail
    return


@app.cell
def _(mo):
    mo.md(
        """---\n        🏀 **Auto-playing slider** walks through the season game by game.
        The green vertical line shows the current game. Bar charts show
        each game's score, with rolling averages smoothing the noise.

        Drag the slider manually or let it auto-play to see the arc
        of a player's season unfold.
        """
    )
    return


if __name__ == "__main__":
    app.run()