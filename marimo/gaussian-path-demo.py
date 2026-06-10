"""Marimo reactive demo: 2D animated path slider driving Gaussian PDF.

Based on @marimo_io reel pattern. Auto-animated 2D slider navigates configurable
parametric paths; its position (x=mu, y=sigma) drives a live Gaussian probability
density plot. Runs in WASM mode (no backend).

Export:
    marimo export html-wasm gaussian-path-demo.py --output ../public/marimo-demos/index.html
"""

import marimo

__generated_with = "0.23.1"
app = marimo.App(width="full", app_title="Gaussian Path Explorer")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from io import BytesIO
    import base64
    return mo, np, plt, BytesIO, base64


@app.cell(hide_code=True)
def _(mo):
    # Animation refresh control
    refresh = mo.ui.refresh(
        options=["0.2s", "0.5s", "1s", "2s", "5s"],
        default_interval="0.5s",
        label="Animation interval",
    )
    return (refresh,)


@app.cell(hide_code=True)
def _(mo):
    # Path shape selector
    path_type = mo.ui.dropdown(
        options={
            "circle": "Circle",
            "sine": "Sine Wave",
            "lissajous": "Lissajous",
            "spiral": "Spiral",
            "figure8": "Figure-8",
            "bowtie": "Bowtie",
            "star": "Star",
        },
        value="circle",
        label="Animation Path",
    )
    return (path_type,)


@app.cell(hide_code=True)
def _(mo):
    # Speed multiplier and loop toggle
    speed = mo.ui.slider(start=1, stop=10, step=1, value=3, label="Speed multiplier")
    loop = mo.ui.checkbox(value=True, label="Loop path")
    smoothing = mo.ui.dropdown(
        options={"none": "None", "ease_in_out": "Ease In-Out", "linear": "Linear"},
        value="ease_in_out",
        label="Smoothing",
    )
    show_cdf = mo.ui.checkbox(value=False, label="Show CDF")
    return loop, show_cdf, smoothing, speed


@app.cell(hide_code=True)
def _(mo, refresh, speed, loop, path_type, smoothing):
    # Frame state: auto-increments on each refresh tick
    get_frame, set_frame = mo.state(0)

    # Manual phase override (pauses auto when scrubbed)
    manual_phase = mo.ui.slider(
        start=0, stop=360, step=1, value=0,
        label="Manual phase override",
    )

    # Playback controls
    play_btn = mo.ui.run_button(label="Play", kind="primary")
    reset_btn = mo.ui.button(label="Reset")

    return get_frame, manual_phase, play_btn, reset_btn, set_frame


@app.cell(hide_code=True)
def _(get_frame, manual_phase, mo, refresh, reset_btn, set_frame, speed, play_btn):
    # Auto-increment logic with manual override detection
    _tick = refresh.value
    auto_frame = get_frame()

    if reset_btn.value:
        set_frame(0)
        auto_frame = 0
    elif play_btn.value:
        set_frame(lambda v: (v + speed.value) % 360)

    manual_val = manual_phase.value
    diff = abs((manual_val - auto_frame + 180) % 360 - 180)
    if diff <= 5:
        phase = auto_frame
    else:
        phase = manual_val

    mo.md(f"**Phase:** {phase:.0f}deg | **Auto:** {auto_frame:.0f}deg")
    return phase,


@app.cell(hide_code=True)
def _(mo, np, path_type, phase, smoothing):
    # Path computation: parametric 2D (mu, sigma) as a function of phase
    t = np.radians(phase)
    _path = path_type.value

    def smoothstep(edge0, edge1, x):
        x = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
        return x * x * (3 - 2 * x)

    if path == "circle":
        mu = 3.0 * np.cos(t)
        sigma = 1.0 + 0.5 * np.sin(t)
    elif _path == "sine":
        mu = 4.0 * np.sin(t)
        sigma = 0.8 + 0.6 * np.abs(np.cos(t))
    elif _path == "lissajous":
        mu = 3.0 * np.sin(3 * t)
        sigma = 1.0 + 0.8 * np.cos(2 * t)
    elif _path == "spiral":
        mu = 0.1 * phase * np.cos(t)
        sigma = 0.5 + 0.05 * phase
    elif _path == "figure8":
        mu = 3.0 * np.sin(t)
        sigma = 1.0 + 0.6 * np.sin(2 * t)
    elif _path == "bowtie":
        mu = 3.0 * np.sin(t)
        sigma = 1.0 + 0.6 * np.cos(2 * t)
    elif _path == "star":
        _r = 1.0 + 0.4 * np.cos(5 * t)
        mu = 3.0 * _r * np.cos(t)
        sigma = 1.0 + 0.5 * _r * np.sin(t)
    else:
        mu = 0.0
        sigma = 1.0

    # Apply smoothing envelope
    if smoothing.value == "ease_in_out":
        envelope = smoothstep(0, 1, np.sin(t) * 0.5 + 0.5)
        sigma = 0.5 + envelope * (sigma - 0.5)
    elif smoothing.value == "linear":
        pass

    sigma = max(float(sigma), 0.05)
    mu = float(mu)

    return mu, sigma


@app.cell(hide_code=True)
def _(mo, np, plt, path_type, phase, mu, sigma):
    # 2D Path visualization with animated dot
    t_full = np.linspace(0, 2 * np.pi, 400)
    _path = path_type.value

    if _path == "circle":
        mu_path = 3.0 * np.cos(t_full)
        sigma_path = 1.0 + 0.5 * np.sin(t_full)
    elif _path == "sine":
        mu_path = 4.0 * np.sin(t_full)
        sigma_path = 0.8 + 0.6 * np.abs(np.cos(t_full))
    elif _path == "lissajous":
        mu_path = 3.0 * np.sin(3 * t_full)
        sigma_path = 1.0 + 0.8 * np.cos(2 * t_full)
    elif _path == "spiral":
        # Spiral: use normalized 0-2pi for the trace preview
        mu_path = 0.1 * np.degrees(t_full) * np.cos(t_full)
        sigma_path = 0.5 + 0.05 * np.degrees(t_full)
    elif _path == "figure8":
        mu_path = 3.0 * np.sin(t_full)
        sigma_path = 1.0 + 0.6 * np.sin(2 * t_full)
    elif _path == "bowtie":
        mu_path = 3.0 * np.sin(t_full)
        sigma_path = 1.0 + 0.6 * np.cos(2 * t_full)
    elif _path == "star":
        _r = 1.0 + 0.4 * np.cos(5 * t_full)
        mu_path = 3.0 * _r * np.cos(t_full)
        sigma_path = 1.0 + 0.5 * _r * np.sin(t_full)
    else:
        mu_path = np.zeros_like(t_full)
        sigma_path = np.ones_like(t_full)

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

    fig1, _ax1 = plt.subplots(figsize=(6, 6))
    _ax1.plot(mu_path, sigma_path, color="#00d4aa", alpha=0.3, linewidth=1.5)
    _ax1.scatter([mu], [sigma], color="#ff6b6b", s=120, zorder=5, edgecolors="white", linewidths=1.5)
    _ax1.set_xlabel("mu (mean)", fontsize=11)
    _ax1.set_ylabel("sigma (std dev)", fontsize=11)
    _ax1.set_title("Parameter Space Path", fontsize=13, color="#e0e0e0")
    _ax1.grid(True, alpha=0.3)
    _ax1.set_facecolor("#0a0a0f")
    fig1.patch.set_facecolor("#0a0a0f")

    # Add padding
    margin = 0.5
    _ax1.set_xlim(mu_path.min() - margin, mu_path.max() + margin)
    _ax1.set_ylim(max(0, sigma_path.min() - margin), sigma_path.max() + margin)
    plt.tight_layout()

    fig1
    return _ax1, fig1, mu_path, sigma_path, t_full


@app.cell(hide_code=True)
def _(mo, np, plt, mu, sigma, show_cdf):
    # Gaussian probability density plot
    x = np.linspace(-10, 10, 600)
    pdf = (1.0 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu) / sigma) ** 2)
    cdf = 0.5 * (1 + np.sign(x - mu) * np.sqrt(1 - np.exp(-2.0 / np.pi * ((x - mu) / sigma) ** 2)))
    # Use scipy-like CDF approximation (error function) for accuracy
    try:
        from scipy import special
        cdf = 0.5 * (1 + special.erf((x - mu) / (sigma * np.sqrt(2))))
    except Exception:
        pass

    fig2, _ax1_pdf = plt.subplots(figsize=(10, 4.5))
    _ax1_pdf.fill_between(x, pdf, alpha=0.25, color="#00d4aa")
    _ax1_pdf.plot(x, pdf, color="#00d4aa", linewidth=2.5, label="PDF")
    _ax1_pdf.axvline(mu, color="#ff6b6b", linestyle="--", linewidth=1.5, label=f"Mean = {mu:.2f}")
    _ax1_pdf.set_xlabel("x", fontsize=12)
    _ax1_pdf.set_ylabel("Probability Density", fontsize=12, color="#a0c0c0")
    _ax1_pdf.set_title(f"Gaussian PDF  —  N(mu={mu:.2f}, sigma={sigma:.2f})", fontsize=14, color="#e0e0e0")
    _ax1_pdf.set_xlim(-10, 10)
    _ax1_pdf.set_ylim(0, max(1.2, pdf.max() * 1.2))
    _ax1_pdf.legend(loc="upper right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")
    _ax1.grid(True, alpha=0.3)
    _ax1.set_facecolor("#0a0a0f")
    fig2.patch.set_facecolor("#0a0a0f")

    if show_cdf.value:
        ax2 = ax1.twinx()
        ax2.plot(x, cdf, color="#5b8def", linewidth=2, alpha=0.7, label="CDF")
        ax2.set_ylabel("CDF", fontsize=12, color="#5b8def")
        ax2.set_ylim(0, 1)
        ax2.tick_params(axis="y", labelcolor="#5b8def")
        ax2.legend(loc="lower right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")

    plt.tight_layout()
    fig2
    return cdf, fig2, pdf, x


@app.cell(hide_code=True)
def _(mo, np, plt, mu, sigma, path_type, phase):
    # Parameter trace over full cycle
    phases = np.linspace(0, 360, 200)
    t_trace = np.radians(phases)
    _path = path_type.value

    if _path == "circle":
        mus_trace = 3.0 * np.cos(t_trace)
        sigmas_trace = 1.0 + 0.5 * np.sin(t_trace)
    elif _path == "sine":
        mus_trace = 4.0 * np.sin(t_trace)
        sigmas_trace = 0.8 + 0.6 * np.abs(np.cos(t_trace))
    elif _path == "lissajous":
        mus_trace = 3.0 * np.sin(3 * t_trace)
        sigmas_trace = 1.0 + 0.8 * np.cos(2 * t_trace)
    elif _path == "spiral":
        mus_trace = 0.1 * phases * np.cos(t_trace)
        sigmas_trace = 0.5 + 0.05 * phases
    elif _path == "figure8":
        mus_trace = 3.0 * np.sin(t_trace)
        sigmas_trace = 1.0 + 0.6 * np.sin(2 * t_trace)
    elif _path == "bowtie":
        mus_trace = 3.0 * np.sin(t_trace)
        sigmas_trace = 1.0 + 0.6 * np.cos(2 * t_trace)
    elif _path == "star":
        _r = 1.0 + 0.4 * np.cos(5 * t_trace)
        mus_trace = 3.0 * _r * np.cos(t_trace)
        sigmas_trace = 1.0 + 0.5 * _r * np.sin(t_trace)
    else:
        mus_trace = np.zeros_like(t_trace)
        sigmas_trace = np.ones_like(t_trace)

    fig3, ax3 = plt.subplots(figsize=(8, 2.5))
    ax3.plot(phases, mus_trace, color="#00d4aa", linewidth=1.5, label="mu", alpha=0.7)
    ax3.plot(phases, sigmas_trace, color="#ff6b6b", linewidth=1.5, label="sigma", alpha=0.7)
    ax3.axvline(phase, color="white", linestyle="--", alpha=0.3)
    ax3.set_xlabel("phase (degrees)", fontsize=10)
    ax3.set_ylabel("value", fontsize=10)
    ax3.set_title("Parameter Trace over Full Cycle", fontsize=11, color="#e0e0e0")
    ax3.legend(loc="upper right", facecolor="#0a0a0f", edgecolor="#1e3a3a", labelcolor="#e0e0e0")
    ax3.grid(True, alpha=0.3)
    ax3.set_facecolor("#0a0a0f")
    fig3.patch.set_facecolor("#0a0a0f")
    plt.tight_layout()
    fig3
    return ax3, fig3, mus_trace, phases, sigmas_trace


@app.cell(hide_code=True)
def _(mo, mu, sigma, np, pdf, x, base64):
    # Statistical summary and export
    variance = sigma ** 2
    entropy = 0.5 * np.log(2 * np.pi * np.e * variance)

    # CSV export
    csv_data = "x,pdf\n" + "\n".join([f"{xi:.4f},{pi:.6f}" for xi, pi in zip(x, pdf)])
    csv_b64 = base64.b64encode(csv_data.encode("utf-8")).decode("utf-8")

    stats_md = f"""
    | Statistic | Value |
    | --- | --- |
    | Mean (mu) | {mu:.4f} |
    | Std Dev (sigma) | {sigma:.4f} |
    | Variance | {variance:.4f} |
    | Differential Entropy | {entropy:.4f} |
    | 68.3% interval | [{mu - sigma:.3f}, {mu + sigma:.3f}] |
    | 95.4% interval | [{mu - 2*sigma:.3f}, {mu + 2*sigma:.3f}] |
    """

    export_md = f"""
    [Download CSV](data:text/csv;base64,{csv_b64})
    """

    mo.vstack([
        mo.md("### Statistics"),
        mo.md(stats_md),
        mo.md("### Export"),
        mo.md(export_md),
    ])
    return csv_data, entropy, variance


@app.cell(hide_code=True)
def _(mo, refresh, path_type, speed, loop, smoothing, show_cdf, manual_phase, play_btn, reset_btn, phase, mu, sigma):
    # Main layout
    header = mo.vstack([
        mo.md("# Gaussian Path Explorer"),
        mo.md("*A reactive marimo demo. The phase slider auto-navigates a 2D path in parameter space (mu, sigma). The live position drives the Gaussian PDF in real time. Built for Edgeless Lab.*"),
    ])

    controls = mo.hstack([
        mo.vstack([
            mo.md("### Animation"),
            refresh,
            play_btn,
            reset_btn,
            manual_phase,
            mo.md(f"**Phase:** {phase:.0f}deg | **mu:** {mu:.2f} | **sigma:** {sigma:.2f}"),
        ]),
        mo.vstack([
            mo.md("### Path"),
            path_type,
            speed,
            loop,
            smoothing,
            show_cdf,
        ]),
    ])

    layout = mo.vstack([
        header,
        controls,
    ])
    layout
    return controls, header, layout


if __name__ == "__main__":
    app.run()
