import marimo

__generated_with = "0.23.8"
app = marimo.App(width="full", app_title="Gaussian Sketch Lab")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from wigglystuff import Excalidraw

    return Excalidraw, mo, np, plt


@app.cell(hide_code=True)
def _(mo):
    mu = mo.ui.slider(start=-5, stop=5, step=0.1, value=0, label="Mean (μ)")
    sigma = mo.ui.slider(start=0.1, stop=4, step=0.1, value=1, label="Std Dev (σ)")
    show_cdf = mo.ui.checkbox(value=False, label="Show CDF")
    return mu, show_cdf, sigma


@app.cell(hide_code=True)
def _(mu, sigma):
    mu_value = mu.value
    sigma_value = sigma.value
    return mu_value, sigma_value


@app.cell(hide_code=True)
def _(mu_value, np, sigma_value):
    from scipy import stats
    x = np.linspace(-8, 8, 300)
    pdf = stats.norm.pdf(x, mu_value, sigma_value)
    cdf = stats.norm.cdf(x, mu_value, sigma_value)
    return cdf, pdf, x


@app.cell(hide_code=True)
def _(cdf, mu_value, pdf, plt, show_cdf, sigma_value, x):
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.set_facecolor('#0a0a0f')
    fig.patch.set_facecolor('#0a0a0f')

    ax.plot(x, pdf, color='#00d4ff', linewidth=2.5, label=f'PDF: μ={mu_value:.1f}, σ={sigma_value:.1f}')
    ax.fill_between(x, pdf, alpha=0.15, color='#00d4ff')

    if show_cdf.value:
        ax_twin = ax.twinx()
        ax_twin.plot(x, cdf, color='#ff6b35', linewidth=2, linestyle='--', label='CDF')
        ax_twin.set_ylabel('CDF', color='#ff6b35')
        ax_twin.tick_params(colors='#ff6b35')
        ax_twin.set_ylim(0, 1.05)

    # Mark key points
    ax.axvline(mu_value, color='white', linestyle=':', alpha=0.4, linewidth=1)
    for s in [1, 2, 3]:
        ax.axvline(mu_value + s * sigma_value, color='white', linestyle=':', alpha=0.15, linewidth=0.8)
        ax.axvline(mu_value - s * sigma_value, color='white', linestyle=':', alpha=0.15, linewidth=0.8)

    ax.set_xlabel('x', color='white')
    ax.set_ylabel('Density', color='white')
    ax.set_title(f'Gaussian Distribution: μ={mu_value:.1f}, σ={sigma_value:.1f}', color='white', fontsize=14)
    ax.tick_params(colors='white')
    ax.legend(loc='upper right', facecolor='#1a1a2e', edgecolor='#333', labelcolor='white')
    for spine in ax.spines.values():
        spine.set_color('white')
    ax.set_xlim(-7, 7)
    plt.tight_layout()
    plt
    return


@app.cell(hide_code=True)
def _(Excalidraw, mo):
    sketch = mo.ui.anywidget(Excalidraw(height=620, theme="dark"))
    return (sketch,)


@app.cell(hide_code=True)
def _(mo, mu, show_cdf, sigma):
    mo.hstack([
        mo.vstack([
            mo.md("## 🎛️ Controls"),
            mu, sigma, show_cdf,
        ], align="start"),
    ])
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ## ✏️ Sketch Your Intuition

    Use the **Excalidraw whiteboard** below to draw what you think the distribution looks like.
    Then adjust μ and σ to match the computed PDF to your sketch.

    **Try this:**
    1. Sketch a bell curve on the whiteboard
    2. Adjust μ to shift the peak left/right
    3. Adjust σ to widen or narrow the spread
    4. Toggle CDF to see cumulative probability

    *Built with [wigglystuff](https://github.com/koaning/wigglystuff) + [marimo](https://marimo.io)*
    """)
    return


@app.cell(hide_code=True)
def _(sketch):
    sketch
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    ### How It Works

    This notebook pairs a **reactive Gaussian PDF** with a **freeform whiteboard**:

    1. **Top**: Sliders for μ (mean) and σ (standard deviation) drive the PDF plot reactively
    2. **Bottom**: An embedded Excalidraw canvas for sketching, annotating, and exploring
    3. **Compare**: Sketch your intuition first, then adjust sliders to match — builds statistical intuition

    The Gaussian updates instantly when you move either slider. The Excalidraw canvas
    syncs back to Python via the `scene` traitlet.

    #python #statistics #gaussian #excalidraw #opensource
    """)
    return


if __name__ == "__main__":
    app.run()
