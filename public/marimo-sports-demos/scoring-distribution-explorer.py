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
    from wigglystuff import TangleLatex
    return mo, np, plt, json, TangleLatex


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
    n_bins = mo.ui.slider(5, 40, value=25, step=1, label="Histogram Bins")
    player_selector, n_bins
    return (player_selector, n_bins,)


@app.cell
def _(json, mo, np, player_selector):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)

    _player = _data[player_selector.value]
    _pts = [g["pts"] for g in _player["games"]]

    _mu = float(np.mean(_pts))
    _sigma = float(np.std(_pts))
    _n = len(_pts)

    _stats = mo.md(
        f"""
        **{player_selector.value}** — 2025‑26 Season
        | Stat | Value |
        |------|-------|
        | Games | {_n} |
        | PPG | {_mu:.1f} |
        | σ | {_sigma:.1f} |
        | Min | {min(_pts)} |
        | Max | {max(_pts)} |
        """
    )
    _stats
    return


@app.cell
def _(TangleLatex, json, mo, np, player_selector):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)
    _player = _data[player_selector.value]
    _pts = [g["pts"] for g in _player["games"]]
    _mu = float(np.mean(_pts))
    _sigma = float(np.std(_pts))

    formula = mo.ui.anywidget(
        TangleLatex(
            latex=r"f(x) = \frac{1}{\tangle{sigma}\sqrt{2\pi}} "
                  r"e^{-\frac{(x - \tangle{mu})^2}{2\tangle{sigma}^2}}",
            parameters={
                "mu": {
                    "value": _mu,
                    "min_value": 0.0,
                    "max_value": 50.0,
                    "step": 0.5,
                    "display": "number",
                    "label": "Mean (PPG)",
                    "color": "#00d4ff",
                },
                "sigma": {
                    "value": _sigma,
                    "min_value": 0.5,
                    "max_value": 20.0,
                    "step": 0.5,
                    "display": "number",
                    "label": "Std Dev",
                    "color": "#ff6b9d",
                },
            },
            display_mode=True,
            editor="inline",
            reveal_all_on_drag=False,
            theme="dark",
        )
    )
    formula
    return (formula,)


@app.cell
def _(json, mo, np, plt, player_selector, n_bins, formula):
    _path = "public/marimo-sports-demos/nba_data.json"
    with open(_path) as _f:
        _data = json.load(_f)
    _player = _data[player_selector.value]
    _pts = [g["pts"] for g in _player["games"]]

    _fit_mu = formula.widget.values.get("mu", float(np.mean(_pts)))
    _fit_sigma = formula.widget.values.get("sigma", float(np.std(_pts)))
    _bins = n_bins.value

    _fig, _ax = plt.subplots(figsize=(10, 5), facecolor="#0a0a0f")
    _ax.set_facecolor("#0a0a0f")

    _ax.hist(_pts, bins=_bins, density=True, alpha=0.35, color="#00d4ff",
             edgecolor="#00d4ff88", linewidth=0.5, label="Actual Games")

    _x = np.linspace(max(0, _fit_mu - 4 * _fit_sigma), _fit_mu + 4 * _fit_sigma, 300)
    _y = (1 / (_fit_sigma * np.sqrt(2 * np.pi))) * np.exp(
        -0.5 * ((_x - _fit_mu) / _fit_sigma) ** 2
    )
    _ax.plot(_x, _y, color="#ff6b9d", linewidth=2.5, label="Normal Fit")

    _ax.axvline(_fit_mu, color="#ff6b9d", linestyle="--", linewidth=1.2, alpha=0.6)
    _ax.axvline(_fit_mu - _fit_sigma, color="#ff6b9d", linestyle=":", linewidth=0.8, alpha=0.3)
    _ax.axvline(_fit_mu + _fit_sigma, color="#ff6b9d", linestyle=":", linewidth=0.8, alpha=0.3)

    _ax.set_xlabel("Points Scored", color="#888", fontsize=12)
    _ax.set_ylabel("Density", color="#888", fontsize=12)
    _ax.tick_params(colors="#666")
    for _spine in _ax.spines.values():
        _spine.set_color("#333")
    _ax.legend(facecolor="#12121a", edgecolor="#1e1e2e", labelcolor="#ccc", fontsize=10)
    _ax.set_title(f"{player_selector.value} — Scoring Distribution 2025‑26", color="#ccc", fontsize=14, fontweight="bold")
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        """---\n        🏀 **Drag** the μ and σ values in the formula above to see
        how well a normal distribution fits the actual scoring data.
        The histogram shows real game results; the pink curve is your fit.

        *Data from NBA API — 2025‑26 regular season.*
        """
    )
    return


if __name__ == "__main__":
    app.run()