import marimo

__generated_with = "0.23.8"
app = marimo.App(
    width="full",
    app_title="Algorithm Whiteboard — Binary Search",
)


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    from wigglystuff import Excalidraw

    return Excalidraw, mo, np, plt


@app.cell(hide_code=True)
def _(mo):
    array_size = mo.ui.slider(start=8, stop=64, step=8, value=32, label="Array Size")
    target = mo.ui.slider(start=0, stop=100, step=1, value=47, label="Search Target")
    return array_size, target


@app.cell(hide_code=True)
def _(array_size, np, target):
    arr = np.sort(np.random.choice(range(1, 100), size=array_size.value, replace=False))
    target_val = target.value
    return arr, target_val


@app.cell(hide_code=True)
def _(arr, target_val):
    def binary_search_steps(arr, target):
        steps = []
        lo, hi = 0, len(arr) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            steps.append({"lo": lo, "hi": hi, "mid": mid, "val": arr[mid]})
            if arr[mid] == target:
                break
            elif arr[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return steps

    search_steps = binary_search_steps(arr, target_val)
    return (search_steps,)


@app.cell(hide_code=True)
def _(mo, search_steps):
    step_slider = mo.ui.slider(
        start=0, stop=max(0, len(search_steps) - 1),
        step=1, value=0, label="Search Step"
    )
    return (step_slider,)


@app.cell(hide_code=True)
def _(arr, np, plt, search_steps, step_slider, target_val):
    _step = min(step_slider.value, len(search_steps) - 1)
    _s = search_steps[_step]

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.set_facecolor('#0a0a0f')
    fig.patch.set_facecolor('#0a0a0f')

    colors = []
    for i in range(len(arr)):
        if i == _s["mid"]:
            colors.append('#ff6b35')
        elif _s["lo"] <= i <= _s["hi"]:
            colors.append('#00d4ff')
        else:
            colors.append('#444466')

    x_pos = np.arange(len(arr))
    ax.bar(x_pos, arr, color=colors, edgecolor='#1a1a2e', linewidth=0.5)

    for i, val in enumerate(arr):
        if val == target_val:
            ax.bar(i, arr[i], color='#00ff88', edgecolor='#1a1a2e', linewidth=1.5, zorder=5)
            ax.text(i, arr[i] + 2, f'🎯 {val}', ha='center', color='#00ff88', fontweight='bold', fontsize=10)

    ax.text(_s["mid"], arr[_s["mid"]] + 3, f'mid={arr[_s["mid"]]}',
            ha='center', color='#ff6b35', fontweight='bold', fontsize=9)

    ax.set_xticks(x_pos)
    ax.set_xticklabels([str(v) for v in arr], rotation=45, ha='right', color='white', fontsize=8)
    ax.set_ylim(0, max(arr) * 1.3)
    ax.set_ylabel('Value', color='white')
    ax.tick_params(colors='white')
    for spine in ax.spines.values():
        spine.set_color('white')

    _last = search_steps[-1]
    status = "✅ FOUND" if _last["val"] == target_val else "🔍 SEARCHING..."
    ax.set_title(
        f'Binary Search — Step {_step + 1}/{len(search_steps)} | '
        f'lo={_s["lo"]}, mid={_s["mid"]}, hi={_s["hi"]} | {status}',
        color='white', fontsize=13
    )
    plt.tight_layout()
    plt
    return


@app.cell(hide_code=True)
def _(Excalidraw, mo):
    whiteboard = mo.ui.anywidget(Excalidraw(height=550, theme="dark"))
    return (whiteboard,)


@app.cell(hide_code=True)
def _(array_size, mo, step_slider, target):
    mo.hstack([mo.vstack([array_size, target, step_slider])])
    return


@app.cell(hide_code=True)
def _(mo, search_steps, target_val):
    _last = search_steps[-1]
    found = _last["val"] == target_val
    mo.md(f"""
    ## Binary Search Visualizer

    **Array:** {len(search_steps)} search steps  
    **Target:** {target_val}  
    **Result:** {"✅ Found at index " + str(_last["mid"]) if found else "❌ Not found"}

    **How binary search works:**
    1. Start with the full range (`lo=0`, `hi=n-1`)
    2. Check the middle element (`mid`)
    3. If it matches the target → done!
    4. If target is larger → eliminate left half (`lo = mid + 1`)
    5. If target is smaller → eliminate right half (`hi = mid - 1`)
    6. Repeat until found or range is empty — **O(log n)**
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ## ✏️ Whiteboard — Annotate the Algorithm

    Use the Excalidraw canvas below to:
    - Draw the binary search decision tree
    - Annotate each step as you scrub through
    - Sketch data structure invariants
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
    ### Architecture

    This demo combines **algorithm visualization** with **freeform annotation**:

    1. **Reactive visualization**: Each binary search step is rendered as a colored bar chart
    2. **Excalidraw whiteboard**: Sketch decision trees, invariants, and notes alongside running code
    3. **Step-by-step**: Walk through the algorithm at your own pace

    *Built with [wigglystuff](https://github.com/koaning/wigglystuff) + [marimo](https://marimo.io)*

    #python #algorithms #binarysearch #excalidraw #opensource
    """)
    return


if __name__ == "__main__":
    app.run()
