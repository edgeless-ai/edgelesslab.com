import marimo

__generated_with = "0.23.1"
app = marimo.App(width="full", app_title="Reactive Slider Demo")


@app.cell(hide_code=True)
def __():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    return mo, np, plt


@app.cell(hide_code=True)
def __(mo):
    # Animation control
    refresh = mo.ui.refresh(
        options=["0.5s", "1s", "2s", "5s", "10s", "30s", "60s"],
        default_interval="10s",
        label="Refresh interval",
    )
    return refresh,


@app.cell(hide_code=True)
def __(mo):
    # Wave parameters
    wave_count = mo.ui.slider(
        start=1, stop=12, step=1, value=3,
        label="Wave count",
    )
    amplitude = mo.ui.slider(
        start=0.1, stop=2.0, step=0.05, value=1.0,
        label="Amplitude",
    )
    frequency = mo.ui.slider(
        start=0.5, stop=5.0, step=0.1, value=2.0,
        label="Frequency",
    )
    color_scheme = mo.ui.dropdown(
        options={"viridis": "Viridis", "plasma": "Plasma", "inferno": "Inferno", "magma": "Magma", "cividis": "Cividis"},
        value="viridis",
        label="Color scheme",
    )
    return amplitude, color_scheme, frequency, wave_count


@app.cell(hide_code=True)
def __(mo):
    # Auto-animated frame state (using mo.state for imperative updates)
    get_frame, set_frame = mo.state(0)
    return get_frame, set_frame


@app.cell(hide_code=True)
def __(get_frame, mo, refresh, set_frame):
    # Auto-increment the frame on each refresh tick
    _tick = refresh.value
    set_frame(lambda v: (v + 2) % 360)
    mo.md(f"**Frame:** {get_frame()}deg")
    return


@app.cell(hide_code=True)
def __(mo):
    # Manual override slider (pauses auto-animation when scrubbed)
    manual_frame = mo.ui.slider(
        start=0, stop=359, step=1, value=0,
        label="Manual phase override (degrees)",
    )
    return manual_frame,


@app.cell(hide_code=True)
def __(get_frame, manual_frame, mo):
    # Use manual frame if user has moved it away from the auto frame
    # Otherwise follow the auto-animated state
    auto_frame = get_frame()
    manual_val = manual_frame.value
    # If manual slider is within 4 degrees of auto, treat as synced
    diff = abs((manual_val - auto_frame + 180) % 360 - 180)
    if diff <= 4:
        # Sync manual slider to auto and use auto
        frame = auto_frame
    else:
        # User has manually overridden
        frame = manual_val
    mo.md(f"**Active phase:** {frame}deg")
    return frame,


@app.cell(hide_code=True)
def __(amplitude, color_scheme, frame, frequency, mo, np, plt, wave_count):
    # Generate the visualization
    phase_rad = np.radians(frame)
    t = np.linspace(0, 4 * np.pi, 1000)

    fig, axes = plt.subplots(2, 1, figsize=(14, 10), gridspec_kw={'height_ratios': [2, 1]})
    fig.patch.set_facecolor('#0a0a0a')

    # Main wave plot
    ax1 = axes[0]
    ax1.set_facecolor('#0a0a0a')
    cmap = plt.get_cmap(color_scheme.selected_key)

    y_total = np.zeros_like(t)
    for i in range(wave_count.value):
        freq = frequency.value * (i + 1)
        amp = amplitude.value * (1.0 / (i + 1))
        phase = phase_rad * (i + 1)
        y = amp * np.sin(freq * t + phase)
        y_total += y
        color = cmap(i / max(wave_count.value - 1, 1))
        ax1.plot(t, y, alpha=0.4, linewidth=1, color=color, label=f"Wave {i+1}")

    ax1.plot(t, y_total, color='#ffffff', linewidth=2.5, label="Sum", alpha=0.9)
    ax1.set_xlim(0, 4 * np.pi)
    ax1.set_ylim(-5, 5)
    ax1.set_xlabel("t", color='white', fontsize=12)
    ax1.set_ylabel("Amplitude", color='white', fontsize=12)
    ax1.tick_params(colors='white')
    ax1.spines['bottom'].set_color('white')
    ax1.spines['top'].set_color('white')
    ax1.spines['left'].set_color('white')
    ax1.spines['right'].set_color('white')
    ax1.legend(loc='upper right', facecolor='#1a1a1a', edgecolor='white', labelcolor='white')
    ax1.set_title("Superposition of Sine Waves", color='white', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.15, color='white')

    # Phase circle visualization
    ax2 = axes[1]
    ax2.set_facecolor('#0a0a0a')

    circle = plt.Circle((0, 0), 1, fill=False, color='white', alpha=0.3, linewidth=1)
    ax2.add_patch(circle)

    for i in range(wave_count.value):
        angle = phase_rad * (i + 1)
        x = np.cos(angle)
        y = np.sin(angle)
        color = cmap(i / max(wave_count.value - 1, 1))
        ax2.plot([0, x], [0, y], color=color, linewidth=2, alpha=0.7)
        ax2.plot(x, y, 'o', color=color, markersize=8)

    ax2.set_xlim(-1.5, 1.5)
    ax2.set_ylim(-1.5, 1.5)
    ax2.set_aspect('equal')
    ax2.set_title("Phase Vectors", color='white', fontsize=14, fontweight='bold')
    ax2.tick_params(colors='white')
    ax2.spines['bottom'].set_color('white')
    ax2.spines['top'].set_color('white')
    ax2.spines['left'].set_color('white')
    ax2.spines['right'].set_color('white')
    ax2.grid(True, alpha=0.15, color='white')

    plt.tight_layout()

    display = mo.vstack([
        mo.md("# Reactive Wave Demo"),
        mo.md("*A marimo notebook demonstrating auto-animated state and reactive computation. The phase increments automatically on each refresh tick, and every dependent cell re-executes in real time. Scrub the manual slider to override.*"),
        mo.hstack([
            mo.vstack([
                mo.md("### Animation Controls"),
                refresh,
                mo.md(f"**Auto frame:** {frame}deg"),
                manual_frame,
            ]),
            mo.vstack([
                mo.md("### Wave Parameters"),
                wave_count,
                amplitude,
                frequency,
                color_scheme,
            ]),
        ]),
        mo.mpl.interactive(fig),
    ])

    return display, fig


@app.cell(hide_code=True)
def __():
    return


if __name__ == "__main__":
    app.run()
