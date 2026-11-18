# /// script
# requires-python = ">=3.11"
# dependencies = ["marimo==0.25.2", "polars==1.42.1", "altair==6.1.0"]
# ///

"""Frozen public aggregate snapshot; run: uvx marimo run --sandbox notebook.py"""

import marimo

__generated_with = "0.25.2"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import polars as pl
    import altair as alt
    return mo, pl, alt


@app.cell
def _(mo):
    day_selector = mo.ui.slider(0, 9, value=9, label="Last UTC start day shown")
    day_selector
    return (day_selector,)


@app.cell
def _(pl):
    # Literals copied from public daily.json; no private database or network required.
    rows = [
        ("2026-10-05", 847, 81, 422),
        ("2026-10-06", 1388, 102, 388),
        ("2026-10-07", 828, 95, 125),
        ("2026-10-08", 958, 657, 114),
        ("2026-10-09", 607, 446, 127),
        ("2026-10-10", 161, 3, 123),
        ("2026-10-11", 164, 23, 122),
        ("2026-10-12", 190, 14, 139),
        ("2026-10-13", 200, 6, 122),
        ("2026-10-14", 195, 8, 117),
    ]
    frame = pl.DataFrame(rows, schema=["day", "runs", "crashed", "done"], orient="row")
    return (frame,)


@app.cell
def _(alt, day_selector, frame, mo, pl):
    visible = frame.slice(0, day_selector.value + 1).with_columns(
        (pl.col("crashed") / pl.col("runs") * 100).alias("crash_share")
    )
    current = visible.row(-1, named=True)
    chart = alt.Chart(alt.Data(values=visible.to_dicts())).mark_line(point=True, color="#3F6212").encode(
        x=alt.X("day:N", title="UTC start day"),
        y=alt.Y("crash_share:Q", title="Crash share of runs (%)", scale=alt.Scale(domain=[0, 100])),
        tooltip=["day:N", "crashed:Q", "runs:Q", "done:Q", alt.Tooltip("crash_share:Q", format=".1f")],
    ).properties(width="container", height=320)
    mo.vstack([
        mo.md(f"## Crash status by UTC start day\n\n**{current['day']}: {current['crashed']} / {current['runs']} attempts ({current['crash_share']:.1f}%)**"),
        chart,
        mo.md("Attempts are not unique tasks. Statuses were recorded at the November 16 snapshot. 'Done' is not audited business success; other statuses are omitted. These counts do not prove downtime, cause, or a fix."),
    ])
    return


if __name__ == "__main__":
    app.run()
