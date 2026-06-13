import marimo

__generated_with = "0.23.8"
app = marimo.App(width="full", app_title="TSP + Excalidraw Whiteboard")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from wigglystuff import Excalidraw

    return Excalidraw, mo, np, plt


@app.cell(hide_code=True)
def _(np):
    np.random.seed(42)
    n_cities = 12
    cities = np.random.rand(n_cities, 2) * 100
    return cities, n_cities


@app.cell(hide_code=True)
def _(cities, np):
    def _dist(city1, city2):
        return np.sqrt((city1[0] - city2[0])**2 + (city1[1] - city2[1])**2)

    def _solve_tsp(cities):
        n = len(cities)
        unvisited = set(range(1, n))
        path = [0]
        current = 0
        while unvisited:
            nearest = min(unvisited, key=lambda i: _dist(cities[current], cities[i]))
            path.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        path.append(0)
        return path

    tsp_path = _solve_tsp(cities)
    return (tsp_path,)


@app.cell(hide_code=True)
def _(mo, n_cities):
    slider = mo.ui.slider(
        start=0,
        stop=n_cities + 1,
        value=0,
        step=1,
        label="City Index",
        full_width=True
    )
    play_button = mo.ui.button(label="▶ Auto Play", kind="primary")
    reset_button = mo.ui.button(label="↺ Reset")
    return play_button, reset_button, slider


@app.cell(hide_code=True)
def _(Excalidraw, mo):
    draw = mo.ui.anywidget(Excalidraw(height=620, theme="dark"))
    return (draw,)


@app.cell(hide_code=True)
def _(cities, np, plt, slider, tsp_path):
    path_coords = np.array([cities[i] for i in tsp_path])
    total_cities = len(path_coords)
    _current_pos = slider.value

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.set_xlim(-10, 110)
    ax.set_ylim(-10, 110)
    ax.set_aspect('equal')
    ax.set_facecolor('#0a0a0f')
    fig.patch.set_facecolor('#0a0a0f')

    ax.scatter(cities[:, 0], cities[:, 1], c='#00d4ff', s=300, alpha=0.6, zorder=5)
    for idx, (x, y) in enumerate(cities):
        ax.text(x, y + 3, str(idx), ha='center', va='bottom', color='white', fontsize=10, fontweight='bold')

    ax.plot(path_coords[:, 0], path_coords[:, 1], 'c--', alpha=0.2, linewidth=2)

    if _current_pos > 0:
        active_path = path_coords[:_current_pos + 1]
        ax.plot(active_path[:, 0], active_path[:, 1], 'c-', linewidth=3, alpha=0.8)

    if _current_pos < total_cities:
        current_city = path_coords[_current_pos]
        ax.scatter(current_city[0], current_city[1], c='#ff6b35', s=500, zorder=10, edgecolors='white', linewidths=2)

    ax.set_title('Nearest-Neighbor TSP Solution', color='white', fontsize=13, pad=15)
    info_text = f"Step {_current_pos}/{total_cities - 1} | {' → '.join(map(str, tsp_path[:_current_pos + 1]))}"
    ax.text(50, -5, info_text, ha='center', va='top', color='#00d4ff', fontsize=9, fontweight='bold')

    ax.tick_params(colors='white')
    for spine in ax.spines.values():
        spine.set_color('white')
    plt.tight_layout()
    plt
    return


@app.cell(hide_code=True)
def _(cities, mo, np, slider, tsp_path):
    _total_distance = 0
    for _idx in range(len(tsp_path) - 1):
        dx = cities[tsp_path[_idx + 1]][0] - cities[tsp_path[_idx]][0]
        dy = cities[tsp_path[_idx + 1]][1] - cities[tsp_path[_idx]][1]
        _total_distance += np.sqrt(dx**2 + dy**2)

    _current_pos = slider.value
    _current_distance = 0
    for _idx in range(_current_pos):
        if _idx + 1 < len(tsp_path):
            dx = cities[tsp_path[_idx + 1]][0] - cities[tsp_path[_idx]][0]
            dy = cities[tsp_path[_idx + 1]][1] - cities[tsp_path[_idx]][1]
            _current_distance += np.sqrt(dx**2 + dy**2)

    stats_text = f"""
    ### Path Statistics
    - **Total distance:** {_total_distance:.1f} units
    - **Current distance:** {_current_distance:.1f} units
    - **Progress:** {_current_pos}/{len(tsp_path) - 1} cities visited
    - **Path:** {' → '.join(map(str, tsp_path))}
    """
    mo.md(stats_text)
    return


@app.cell(hide_code=True)
def _(mo, play_button, reset_button, slider):
    mo.hstack([play_button, reset_button, slider], justify="space-between")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(f"""
    ## 🎨 Sketch Your Own Route

    The **Excalidraw whiteboard** below lets you annotate, sketch alternative routes,
    or draw freehand. Export your drawing via the Excalidraw menu (top-left).

    **Try it:**
    1. Drag the slider to watch the computed path build
    2. Sketch your own path guess on the whiteboard
    3. Compare — is your intuition better than nearest-neighbor?

    *Built with [wigglystuff](https://github.com/koaning/wigglystuff) + [marimo](https://marimo.io)*
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.hstack([
        mo.md("### ✏️ Excalidraw Whiteboard"),
    ])
    return


@app.cell(hide_code=True)
def _(draw):
    draw
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    ### How It Works

    This notebook combines **reactive computation** with a **freeform whiteboard**:

    1. **Left**: The nearest-neighbor TSP algorithm runs reactively — drag the slider, the path updates instantly
    2. **Right**: An embedded Excalidraw canvas for sketching, annotation, and freeform exploration
    3. **Export**: Use Excalidraw's built-in export (top-left menu → "Export to image") to save your sketches

    The Excalidraw widget syncs its state back to Python via the `scene` traitlet,
    so you can programmatically access every element you draw.

    #python #engineering #travelingsalesman #excalidraw #opensource
    """)
    return


if __name__ == "__main__":
    app.run()
