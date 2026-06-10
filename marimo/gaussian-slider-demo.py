"""Marimo reactive demo: auto-animated slider with Gaussian probability density.

An auto-animated slider increments automatically via mo.ui.refresh, and every
dependent cell re-executes in real time to show the evolving Gaussian PDF.

Export to WASM:
    marimo export html-wasm gaussian-slider-demo.py --output ../public/marimo-gaussian-demo/index.html
"""

import marimo

__generated_with = "0.23.1"
app = marimo.App(width="full", app_title="Gaussian Probability Density")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    from scipy import stats
    import matplotlib.pyplot as plt
    import math
    return mo, np, plt, stats


@app.cell(hide_code=True)
def _(mo):
    # Auto-animated phase slider
    # The refresh timer fires every interval, and the next cell auto-increments the slider
    refresh = mo.ui.refresh(
        options=[0.2, 0.5, 1, 2, 5],
        value=0.5,
        label="Animation interval (sec)",
    )
    return (refresh,)


@app.cell(hide_code=True)
def _(mo):
    # Phase slider: controls the animation frame
    # This is auto-incremented by the refresh cell below
    phase = mo.ui.slider(
        start=0, stop=360, step=1, value=0,
        label="Phase (degrees)",
    )
    return (phase,)


@app.cell(hide_code=True)
def _(mo, refresh, phase):
    # Auto-increment phase on each refresh tick
    # Using mo.state to avoid triggering infinite loops via direct .value assignment
    _tick = refresh.value
    _phase_state = mo.state(phase.value)
    _phase_state.value = (phase.value + 1) % 360
    phase.value = _phase_state.value
    return


@app.cell(hide_code=True)
def _(mo):
    # Distribution parameters
    sigma = mo.ui.slider(
        start=0.5, stop=3.0, step=0.05, value=1.5,
        label="Sigma (std dev)",
    )
    show_cdf = mo.ui.checkbox(value=True, label="Show CDF")
    return show_cdf, sigma


@app.cell(hide_code=True)
def _(mo, phase, sigma, show_cdf, np, plt, stats):
    # Edgeless dark theme
    plt.rcParams.update({
        "figure.facecolor": "#0a0a0f",
        "axes.facecolor": "#0a0a0f",
        "axes.edgecolor": "#1e3a3a",
        "axes.labelcolor": "#a0c0c0",
        "text.color": "#e0e0e0",
        "xtick.color": "#a0c0c0",
        "ytick.color": "#a0c0c0",
        "grid.color": "#1e3a3a",
        "grid.alpha": 0.4,
    })

    # Gaussian parameters from phase
    mu = 3.0 * np.cos(np.radians(phase.value))
    s = sigma.value

    x = np.linspace(-10, 10, 600)
    pdf = stats.norm.pdf(x, loc=mu, scale=s)
    cdf = stats.norm.cdf(x, loc=mu, scale=s)

    fig, ax1 = plt.subplots(figsize=(12, 5))
    ax1.fill_between(x, pdf, alpha=0.25, color="#00d4aa")
    ax1.plot(x, pdf, color="#00d4aa", linewidth=2.5, label="PDF")
    ax1.axvline(mu, color="#ff6b6b", linestyle="--", linewidth=1.5, label=f"Mean = {mu:.2f}")
    ax1.set_xlabel("x", fontsize=12)
    ax1.set_ylabel("Probability Density", fontsize=12, color="#a0c0c0")
    ax1.set_title(f"Gaussian PDF  —  N(mu={mu:.2f}, sigma={s:.2f})  —  Phase {phase.value}°", fontsize=14, color="#e0e0e0")
    ax1.set_xlim(-10, 10)
    ax1.set_ylim(0, 1.2)
    ax1.legend(loc="upper right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")
    ax1.grid(True, alpha=0.3)

    if show_cdf.value:
        ax2 = ax1.twinx()
        ax2.plot(x, cdf, color="#5b8def", linewidth=2, alpha=0.7, label="CDF")
        ax2.set_ylabel("CDF", fontsize=12, color="#5b8def")
        ax2.set_ylim(0, 1)
        ax2.tick_params(axis="y", labelcolor="#5b8def")
        ax2.legend(loc="lower right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")

    plt.tight_layout()
    fig
    return cdf, fig, mu, pdf, s, x


@app.cell(hide_code=True)
def _(mo, mu, s, stats):
    # Statistical summary panel
    variance = s ** 2
    entropy = stats.norm.entropy(scale=s)
    mo.md(f"""
    | Statistic | Value |
    | --- | --- |
    | Mean | {mu:.4f} |
    | Std Dev | {s:.4f} |
    | Variance | {variance:.4f} |
    | Differential Entropy | {entropy:.4f} |
    | 68.3% interval | [{mu - s:.3f}, {mu + s:.3f}] |
    | 95.4% interval | [{mu - 2*s:.3f}, {mu + 2*s:.3f}] |
    """)
    return entropy, variance


@app.cell(hide_code=True)
def _(mo, np, plt, mu, s):
    # Parameter space trace: mu vs sigma over the full circle
    phases = np.linspace(0, 360, 200)
    mus = 3.0 * np.cos(np.radians(phases))
    sigmas = np.full_like(mus, s)

    fig2, ax2 = plt.subplots(figsize=(6, 3))
    ax2.plot(mus, sigmas, color="#00d4aa", alpha=0.4, linewidth=1)
    ax2.scatter([mu], [s], color="#ff6b6b", s=80, zorder=5)
    ax2.set_xlabel("mu", fontsize=11)
    ax2.set_ylabel("sigma", fontsize=11)
    ax2.set_title("Parameter Space Trace", fontsize=12, color="#e0e0e0")
    ax2.set_xlim(-4, 4)
    ax2.set_ylim(0, 4)
    ax2.grid(True, alpha=0.3)
    ax2.set_facecolor("#0a0a0f")
    fig2.patch.set_facecolor("#0a0a0f")
    plt.tight_layout()
    fig2
    return ax2, fig2, mus, phases, sigmas


@app.cell(hide_code=True)
def _(mo, phase, mu, s, refresh, sigma, show_cdf):
    # Header and controls layout
    header = mo.vstack([
        mo.md("# Gaussian Probability Density"),
        mo.md("*A marimo reactive demo. The phase slider auto-increments on each refresh tick, and every dependent cell — the PDF plot, the stats table, and the parameter trace — re-executes in real time.*"),
    ])

    controls = mo.hstack([
        mo.vstack([
            mo.md("### Animation"),
            refresh,
            phase,
            mo.md(f"**Phase:** {phase.value}° | **mu:** {mu:.2f} | **sigma:** {s:.2f}"),
        ]),
        mo.vstack([
            mo.md("### Distribution"),
            sigma,
            show_cdf,
        ]),
    ])

    layout = mo.vstack([
        header,
        controls,
    ])
    layout
    return controls, header, layout


@app.cell(hide_code=True)
def _():
    return


if __name__ == "__main__":
    app.run()
