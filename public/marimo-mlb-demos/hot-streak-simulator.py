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
    _path = "public/marimo-mlb-demos/schedule_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    team = mo.ui.dropdown(
        options=list(_data.keys()), value="LAD",
        label="Select Team", full_width=True,
    )
    team
    return (team,)


@app.cell
def _(PlaySlider, json, mo, team):
    _path = "public/marimo-mlb-demos/schedule_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _games = _data[team.value]
    _max = len(_games) - 1

    mo.md(f"## 📅 Hot Streak Simulator — {team.value} 2025\n**{len(_games)} games** — press play to watch the season unfold")
    slider = mo.ui.anywidget(PlaySlider(
        min_value=0, max_value=float(_max), step=1,
        interval_ms=250, loop=True, width=600,
    ))
    slider
    return (slider,)


@app.cell
def _(json, mo, np, plt, slider, team):
    _path = "public/marimo-mlb-demos/schedule_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _games = _data[team.value]
    _idx = int(slider.widget.value)
    _up_to = _games[:_idx + 1]

    if not _up_to:
        _ = mo.md("Slide to start...")
    else:
        _runs = [g["R"] for g in _up_to]
        _ra = [g["RA"] for g in _up_to]
        _wl = [g["W/L"] for g in _up_to]

        _window = 10
        _run_avg = np.convolve(_runs, np.ones(_window) / _window, mode="valid") if len(_runs) >= _window else _runs
        _ra_avg = np.convolve(_ra, np.ones(_window) / _window, mode="valid") if len(_ra) >= _window else _ra
        _wins = sum(1 for w in _wl if w == "W" or w == "W-wo")
        _losses = sum(1 for w in _wl if w == "L" or w == "L-wo")
        _streak = _up_to[-1]["Streak"]
        _current_game = _up_to[-1]

        _record = f"{_wins}-{_losses}"
        _recent = _wl[-10:] if len(_wl) >= 10 else _wl
        _recent_str = "".join("W" if w == "W" or w == "W-wo" else "L" for w in _recent)
        _opp = _current_game["Opp"]
        _result = _current_game["W/L"]
        _score = f"{int(_current_game['R'])}-{int(_current_game['RA'])}"

        mo.md(f"""### Game {_idx + 1} — {_current_game['Date']}
**{team.value} vs {_opp}** → {'✅' if _result == 'W' or _result == 'W-wo' else '❌'} **{_result}** {_score}

| Record | Streak | Last 10 | Runs/G | RA/G |
|--------|--------|---------|--------|------|
| **{_record}** | {_streak} | {_recent_str} | {np.mean(_runs):.1f} | {np.mean(_ra):.1f} |
""")

        _fig, _ax = plt.subplots(figsize=(10, 5), facecolor="#0a0a0f")
        _ax.set_facecolor("#0a0a0f")

        _games_x = list(range(1, len(_runs) + 1))
        _ax.plot(_games_x, _runs, color="#00d4ff", alpha=0.4, linewidth=1, label="Runs Scored")
        _ax.plot(_games_x, _ra, color="#ff6b9d", alpha=0.4, linewidth=1, label="Runs Allowed")

        if len(_run_avg) > 0:
            _avg_x = list(range(_window, len(_runs) + 1)) if len(_runs) >= _window else _games_x
            _ax.plot(_avg_x, _run_avg, color="#00d4ff", linewidth=2.5, label=f"RS Rolling Avg ({_window}G)")
            _ax.plot(_avg_x, _ra_avg, color="#ff6b9d", linewidth=2.5, label=f"RA Rolling Avg ({_window}G)")

        _ax.axvline(x=_idx + 1, color="#fff", linestyle="--", alpha=0.3, linewidth=1)
        _ax.scatter([_idx + 1], [_runs[-1]], color="#00d4ff", s=80, zorder=5, edgecolors="white")
        _ax.scatter([_idx + 1], [_ra[-1]], color="#ff6b9d", s=80, zorder=5, edgecolors="white")

        _ax.set_xlabel("Game #", color="#888", fontsize=12)
        _ax.set_ylabel("Runs", color="#888", fontsize=12)
        _ax.tick_params(colors="#666")
        for _spine in _ax.spines.values():
            _spine.set_color("#333")
        _ax.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)
        _ax.set_title(f"{team.value} — 2025 Season Tracker", color="#ccc", fontsize=14, fontweight="bold")
        _fig
    return


@app.cell
def _(mo):
    mo.md("""---\n⚾ **Press play ▶️** to watch the season unfold game by game. Rolling averages (10-game window) reveal hot streaks and cold spells.\n\n*Data from Baseball Reference — 2025 season.*\n""")
    return


if __name__ == "__main__":
    app.run()