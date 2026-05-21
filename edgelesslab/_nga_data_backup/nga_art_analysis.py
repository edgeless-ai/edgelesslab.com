# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pandas",
#     "marimo",
#     "altair",
#     "numpy",
# ]
# ///

import marimo

__generated_with = "0.11.0"
app = marimo.App(width="medium", app_title="NGA Art Collection Analysis")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    return (mo,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        # National Gallery of Art Collection Analysis

        *A Tufte-inspired exploration of 130,000+ artworks using marimo reactive notebooks*

        ---
        """
    )
    return


@app.cell(hide_code=True)
def _():
    import pandas as pd
    import numpy as np
    import altair as alt

    # Tufte-inspired theme
    alt.themes.register("tufte", lambda: {
        "config": {
            "background": "#fafafa",
            "view": {"stroke": "transparent"},
            "axis": {
                "domain": False,
                "gridColor": "#e0e0e0",
                "gridWidth": 0.5,
                "labelColor": "#333",
                "titleColor": "#333",
                "titleFont": "Georgia",
                "labelFont": "Helvetica",
            },
            "title": {
                "font": "Georgia",
                "color": "#333",
                "fontSize": 16,
                "fontWeight": "normal",
            },
        }
    })
    alt.themes.enable("tufte")
    return alt, np, pd


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ## Data Loading

        The National Gallery of Art maintains a collection of **130,000+ artworks** spanning centuries of human creativity.
        """
    )
    return


@app.cell
def _(pd):
    # Load the artworks data
    objects = pd.read_csv("objects.csv", low_memory=False)

    # Basic stats
    total_works = len(objects)
    date_range = (objects["beginyear"].min(), objects["beginyear"].max())
    mediums = objects["medium"].dropna().nunique()

    print(f"Total artworks: {total_works:,}")
    print(f"Date range: {int(date_range[0])} — {int(date_range[1])}")
    print(f"Unique mediums: {mediums:,}")
    return date_range, mediums, objects, total_works


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ## 1. Temporal Distribution: Art Through Time

        *Data-ink ratio maximized — no chart junk*
        """
    )
    return


@app.cell
def _(alt, mo, objects):
    # Clean year data for temporal analysis
    year_data = objects["beginyear"].dropna()
    year_data = year_data[(year_data > 1000) & (year_data < 2100)]

    # Create century bins
    century_data = pd.DataFrame({
        "century": (year_data // 100) * 100,
        "count": 1
    }).groupby("century").size().reset_index(name="count")

    chart = alt.Chart(century_data).mark_bar(color="#2c3e50", width=20).encode(
        x=alt.X("century:O", title="Century", axis=alt.Axis(labelAngle=0)),
        y=alt.Y("count:Q", title="Number of Works"),
        tooltip=["century", "count"]
    ).properties(
        width=600,
        height=300,
        title="Artworks by Century"
    )

    chart
    return century_data, chart, year_data


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ## 2. Medium Distribution: What Materials?

        *Small multiples approach to categorical data*
        """
    )
    return


@app.cell
def _(alt, objects, pd):
    # Top mediums by frequency
    medium_counts = objects["medium"].value_counts().head(10).reset_index()
    medium_counts.columns = ["medium", "count"]

    # Truncate long medium descriptions for display
    medium_counts["medium_short"] = medium_counts["medium"].str[:40] + "..."

    chart2 = alt.Chart(medium_counts).mark_bar(color="#8b4513").encode(
        x=alt.X("count:Q", title="Number of Works"),
        y=alt.Y("medium_short:N", sort="-x", title=None),
        tooltip=["medium", "count"]
    ).properties(
        width=600,
        height=250,
        title="Top 10 Mediums in Collection"
    )

    chart2
    return chart2, medium_counts


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ## 3. Classification Taxonomy

        *Layered information with minimal visual weight*
        """
    )
    return


@app.cell
def _(alt, objects, pd):
    # Classification analysis
    class_counts = objects["classification"].value_counts().head(12)

    class_data = pd.DataFrame({
        "classification": class_counts.index,
        "count": class_counts.values
    })

    chart3 = alt.Chart(class_data).mark_circle(color="#1a5276", opacity=0.7).encode(
        x=alt.X("classification:N", sort="-y", title=None, axis=alt.Axis(labelAngle=45)),
        y=alt.Y("count:Q", title="Number of Works"),
        size=alt.Size("count:Q", scale=alt.Scale(range=[50, 800]), title="Count"),
        tooltip=["classification", "count"]
    ).properties(
        width=600,
        height=280,
        title="Works by Classification (Proportional Size)"
    )

    chart3
    return chart3, class_counts, class_data


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ## 4. Interactive Exploration: Filter by Time Period

        *Marimo's reactive cells enable exploration*
        """
    )
    return


@app.cell
def _(mo, objects):
    # Interactive slider for year filtering
    slider = mo.ui.slider(
        start=1200,
        stop=2000,
        step=50,
        value=1500,
        label="Minimum Year"
    )
    slider
    return (slider,)


@app.cell
def _(mo, objects, pd, slider):
    # Filter artworks based on slider
    filtered = objects[
        (objects["beginyear"] >= slider.value) &
        (objects["beginyear"] < slider.value + 200)
    ].copy()

    count = len(filtered)

    mo.md(f"""
    **{count:,} artworks** from {int(slider.value)} — {int(slider.value + 200)}
    """)
    return count, filtered


@app.cell
def _(alt, filtered, mo, pd, slider):
    if len(filtered) > 0:
        period_class = filtered["classification"].value_counts().head(8).reset_index()
        period_class.columns = ["classification", "count"]

        period_chart = alt.Chart(period_class).mark_bar(color="#5d4037").encode(
            x=alt.X("count:Q", title="Number of Works"),
            y=alt.Y("classification:N", sort="-x", title=None),
            tooltip=["classification", "count"]
        ).properties(
            width=500,
            height=200,
            title=f"Classifications {int(slider.value)}-{int(slider.value+200)}"
        )

        period_chart
    else:
        mo.md("*No artworks in selected period*")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
        ---

        ## About This Analysis

        This notebook demonstrates:

        1. **Tufte Principles**: Minimal ink, maximum data, no chart junk
        2. **Reactive Computation**: Marimo's reactive cells update automatically
        3. **Agent Integration**: marimo-pair enables AI agents to collaborate in this environment
        4. **Real Data**: 130,000+ artworks from the National Gallery of Art

        *Built for Edgeless Lab — exploring the intersection of AI and creative tools*
        """
    )
    return


if __name__ == "__main__":
    app.run()
