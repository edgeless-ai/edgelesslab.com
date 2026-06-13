import marimo

__generated_with = "0.23.8"
app = marimo.App(width="full", app_title="Curve Editor Lab")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from wigglystuff import Excalidraw, CurveEditor, BezierCurve

    return CurveEditor, Excalidraw, mo, np, plt


@app.cell(hide_code=True)
def _(CurveEditor, mo):
    editor = mo.ui.anywidget(CurveEditor(
        x_bounds=(0.0, 10.0),
        y_bounds=(-5.0, 5.0),
        width=700, height=400,
        show_axes=True,
        n_samples=200,
    ))
    return (editor,)


@app.cell(hide_code=True)
def _(Excalidraw, mo):
    whiteboard = mo.ui.anywidget(Excalidraw(height=500, theme="dark"))
    return (whiteboard,)


@app.cell(hide_code=True)
def _(np):
    def sample_curve(widget, n_pts=200):
        """Extract sampled curve points from the CurveEditor widget."""
        try:
            pts = widget.points
            if pts is None or len(pts) < 2:
                return None, None
            # points is [(x, y), ...] from the editor
            xs = np.array([p[0] for p in pts])
            ys = np.array([p[1] for p in pts])
            return xs, ys
        except Exception:
            return None, None

    return (sample_curve,)


@app.cell(hide_code=True)
def _(editor, mo, plt, sample_curve):
    xs, ys = sample_curve(editor)

    mo.stop(xs is None or len(xs) == 0,
            mo.md("> 👆 **Drag the control points** on the CurveEditor above to shape a curve."))

    fig, ax = plt.subplots(figsize=(8, 4))
    fig.patch.set_facecolor('#0a0a0f')
    ax.set_facecolor('#0a0a0f')

    ax.plot(xs, ys, color='#00d4ff', linewidth=2.5, label='Your Curve')
    ax.fill_between(xs, ys, alpha=0.1, color='#00d4ff')
    ax.axhline(0, color='white', alpha=0.2, linewidth=0.5)
    ax.set_xlabel('x', color='white', fontsize=12)
    ax.set_ylabel('y', color='white', fontsize=12)
    ax.set_title('Sampled Curve Output', color='white', fontsize=14)
    ax.tick_params(colors='white')
    for spine in ax.spines.values():
        spine.set_color('white')
    ax.legend(facecolor='#1a1a2e', edgecolor='#333', labelcolor='white')
    plt.tight_layout()
    plt
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ## 🎛️ Curve Editor + Excalidraw Lab

    A dual-surface exploration environment:

    **Top**: The **CurveEditor** widget — drag control points to shape smooth curves.
      - Natural cubic spline interpolation
      - Configurable bounds, sampling resolution, and axes
      - Real-time reactive updates

    **Bottom**: Full **Excalidraw whiteboard** for sketching, annotating, and freeform math.

    ### Try This
    1. Drag the control points on the CurveEditor to shape a curve
    2. Watch the sampled output update reactively below
    3. Use the Excalidraw whiteboard to annotate features, sketch derivatives, or design companion curves
    4. Export your work — CurveEditor state is available programmatically, Excalidraw exports to PNG
    """)
    return


@app.cell(hide_code=True)
def _(editor):
    editor
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ## ✏️ Excalidraw Whiteboard
    """)
    return


@app.cell(hide_code=True)
def _(whiteboard):
    whiteboard
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    ### How It Works

    This demo pairs two interactive surfaces:

    1. **CurveEditor** (`wigglystuff.CurveEditor`): A spline-based curve editor with draggable control points.
       Points are synced to Python via the `points` traitlet — you can access them programmatically
       for further analysis, fitting, or export.

    2. **Excalidraw** (`wigglystuff.Excalidraw`): A full whiteboard for freeform annotation.
       The `scene` traitlet gives you every element as structured JSON, and `get_pil()` returns
       the current drawing as a PIL Image.

    3. **Reactivity**: Both widgets sync bi-directionally with Python — the curve editor updates
       the sampled output cell, and the Excalidraw canvas is always available for programmatic access.

    *Built with [wigglystuff](https://github.com/koaning/wigglystuff) + [marimo](https://marimo.io)*

    #python #curves #splines #excalidraw #opensource
    """)
    return


if __name__ == "__main__":
    app.run()
