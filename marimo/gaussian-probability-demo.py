"""Marimo reactive demo: Auto-animated Gaussian probability density.

Based on @marimo_io reel pattern. Run locally with:
    marimo edit gaussian-probability-demo.py
Export to WASM with:
    marimo export html-wasm gaussian-probability-demo.py --output index.html
"""

import marimo

__generated_with = "0.13.0"
app = marimo.App(width="medium")


@app.cell

def __():
    import marimo as mo
    import numpy as np
    from scipy import stats
    import matplotlib.pyplot as plt
    import math
    return math, mo, np, plt, stats


@app.cell

def __(mo):
    # Path selector and speed
    path_type = mo.ui.dropdown(
        options={"circle": "Circle", "sine": "Sine Wave", "lissajous": "Lissajous", "spiral": "Spiral", "figure8": "Figure-8"},
        value="circle",
        label="Animation Path",
    )
    speed = mo.ui.slider(1, 60, step=1, value=12, label="Speed (fps)")
    loop = mo.ui.checkbox(value=True, label="Loop")
    show_cdf = mo.ui.checkbox(value=True, label="Show CDF")
    return loop, path_type, show_cdf, speed


@app.cell

def __(mo, speed, loop, path_type):
    # Play / Pause / Reset controls
    play = mo.ui.run_button(label="Play")
    pause = mo.ui.stop_button(label="Pause")
    reset = mo.ui.button(label="Reset")

    # Timer-driven refresh for animation frames
    timer = mo.ui.refresh(interval=1000 // speed.value, max_runs=10000 if loop.value else 1)

    # Animation frame counter
    frame_counter = mo.state(0)

    controls = mo.hstack([play, pause, reset, timer, mo.md(f"**Frame:** {frame_counter.value}")], justify="start")
    return controls, frame_counter, pause, play, reset, timer


@app.cell

def __(mo, frame_counter, path_type, speed, timer, play, pause):
    import math
    # Compute path parameters for the current frame
    t = frame_counter.value / max(1, speed.value)
    path = path_type.value

    if path == "circle":
        mu = 3.0 * math.cos(t)
        sigma = 1.0 + 0.5 * math.sin(t)
    elif path == "sine":
        mu = 4.0 * math.sin(t)
        sigma = 0.8 + 0.6 * abs(math.cos(t))
    elif path == "lissajous":
        mu = 3.0 * math.sin(3 * t)
        sigma = 1.0 + 0.8 * math.cos(2 * t)
    elif path == "spiral":
        mu = 0.1 * t * math.cos(t)
        sigma = 0.5 + 0.05 * t
    elif path == "figure8":
        mu = 3.0 * math.sin(t)
        sigma = 1.0 + 0.6 * math.sin(2 * t)
    else:
        mu = 0.0
        sigma = 1.0

    # Update frame counter when timer fires (if play is active)
    if timer.value is not None and play.value and not pause.value:
        frame_counter.value = frame_counter.value + 1

    mo.hstack([
        mo.md(f"**mu = {mu:.2f}** | **sigma = {sigma:.2f}** | **t = {t:.2f}**"),
    ])
    return mu, path, sigma, t


@app.cell

def __(mo, np, plt, stats, mu, sigma, show_cdf):
    # Dark theme setup for Edgeless brand
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

    x = np.linspace(-10, 10, 600)
    pdf = stats.norm.pdf(x, loc=mu, scale=max(sigma, 0.05))
    cdf = stats.norm.cdf(x, loc=mu, scale=max(sigma, 0.05))

    fig, ax1 = plt.subplots(figsize=(10, 4.5))
    ax1.fill_between(x, pdf, alpha=0.25, color="#00d4aa")
    ax1.plot(x, pdf, color="#00d4aa", linewidth=2.5, label="PDF")
    ax1.axvline(mu, color="#ff6b6b", linestyle="--", linewidth=1.5, label=f"Mean = {mu:.2f}")
    ax1.set_xlabel("x", fontsize=12)
    ax1.set_ylabel("Probability Density", fontsize=12, color="#a0c0c0")
    ax1.set_title(f"Gaussian PDF  —  N(mu={mu:.2f}, sigma={sigma:.2f})", fontsize=14, color="#e0e0e0")
    ax1.set_xlim(-10, 10)
    ax1.set_ylim(0, 1.5)
    ax1.legend(loc="upper right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")
    ax1.grid(True, alpha=0.3)

    ax2 = None
    if show_cdf.value:
        ax2 = ax1.twinx()
        ax2.plot(x, cdf, color="#5b8def", linewidth=2, alpha=0.7, label="CDF")
        ax2.set_ylabel("CDF", fontsize=12, color="#5b8def")
        ax2.set_ylim(0, 1)
        ax2.tick_params(axis="y", labelcolor="#5b8def")
        ax2.legend(loc="lower right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")

    plt.tight_layout()
    fig
    return ax1, ax2, cdf, fig, pdf, x


@app.cell

def __(mo, mu, sigma, stats):
    # Numerical stats panel
    variance = sigma ** 2
    entropy = stats.norm.entropy(scale=sigma)
    mo.md(f"""
    | Statistic | Value |
    | --- | --- |
    | Mean | {mu:.4f} |
    | Std Dev | {sigma:.4f} |
    | Variance | {variance:.4f} |
    | Differential Entropy | {entropy:.4f} |
    | 68.3% interval | [{mu - sigma:.3f}, {mu + sigma:.3f}] |
    | 95.4% interval | [{mu - 2*sigma:.3f}, {mu + 2*sigma:.3f}] |
    """)
    return entropy, variance


@app.cell

def __(mo, mu, sigma, stats, np, plt):
    import math
    # Path trace visualization (parameter space trajectory)
    t_trace = np.linspace(0, 4 * np.pi, 200)
    path = []
    for tt in t_trace:
        mu_t = 3.0 * math.cos(tt)
        sigma_t = 1.0 + 0.5 * math.sin(tt)
        path.append((mu_t, sigma_t))
    mus, sigmas = zip(*path)

    fig2, ax2 = plt.subplots(figsize=(6, 3))
    ax2.plot(mus, sigmas, color="#00d4aa", alpha=0.4, linewidth=1)
    ax2.scatter([mu], [sigma], color="#ff6b6b", s=80, zorder=5)
    ax2.set_xlabel("mu", fontsize=11)
    ax2.set_ylabel("sigma", fontsize=11)
    ax2.set_title("Parameter Space Trajectory", fontsize=12, color="#e0e0e0")
    ax2.set_xlim(-4, 4)
    ax2.set_ylim(0, 3)
    ax2.grid(True, alpha=0.3)
    ax2.set_facecolor("#0a0a0f")
    fig2.patch.set_facecolor("#0a0a0f")
    plt.tight_layout()
    fig2
    return ax2, fig2, mus, sigmas, t_trace


@app.cell

def __(mo, mu, sigma, np, stats):
    # Export helpers (CSV data)
    x = np.linspace(-10, 10, 600)
    pdf = stats.norm.pdf(x, loc=mu, scale=max(sigma, 0.05))
    csv_data = "x,pdf\n" + "\n".join([f"{xi:.4f},{pi:.6f}" for xi, pi in zip(x, pdf)])
    mo.md(f"""
    [Download CSV](data:text/csv;charset=utf-8,{mo.url(csv_data.encode('utf-8'))})
    """)
    return csv_data, pdf, x


@app.cell

def __(mo):
    mo.md("""
    ## Edgeless Gaussian Explorer

    Built with [Marimo](https://marimo.io) in WASM mode.
    Select a path, hit Play, and watch the Gaussian parameters evolve.
    """)
    return


if __name__ == "__main__":
    app.run()
