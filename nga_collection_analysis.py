# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "marimo",
#     "pandas",
#     "matplotlib",
#     "seaborn",
#     "numpy",
#     "pillow",
# ]
# ///

import marimo

__generated_with = "0.12.9"
app = marimo.App(width="medium")


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        """
        # 🎨 NGA Collection Analysis
        ## National Gallery of Art Open Data Explorer

        **Tufte-inspired data visualization** using the National Gallery of Art's open dataset.
        
        This notebook demonstrates:
        - **Data-ink maximization** — every pixel tells a story
        - **Small multiples** for comparison
        - **Sparklines** for temporal trends  
        - **Layering and separation** for clarity
        
        *Built with [marimo](https://marimo.io) + [marimo-pair](https://github.com/marimo-team/marimo-pair) for real-time collaboration*
        """
    )
    return


@app.cell
async def _():
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import matplotlib
    from datetime import datetime
    import marimo as mo

    # Tufte-inspired style configuration
    plt.style.use('default')
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.sans-serif'] = ['Helvetica Neue', 'Arial', 'sans-serif']
    plt.rcParams['axes.spines.top'] = False
    plt.rcParams['axes.spines.right'] = False
    plt.rcParams['axes.linewidth'] = 0.5
    plt.rcParams['axes.edgecolor'] = '#333333'
    plt.rcParams['xtick.major.size'] = 2
    plt.rcParams['ytick.major.size'] = 2
    plt.rcParams['xtick.major.width'] = 0.5
    plt.rcParams['ytick.major.width'] = 0.5
    plt.rcParams['figure.facecolor'] = 'white'
    plt.rcParams['axes.facecolor'] = 'white'
    plt.rcParams['axes.labelcolor'] = '#333333'
    plt.rcParams['text.color'] = '#333333'
    plt.rcParams['savefig.dpi'] = 150

    return datetime, matplotlib, mo, np, pd, plt


@app.cell
async def _(mo, pd):
    # Load data with progress indicator
    with mo.status.spinner("Loading NGA collection data..."):
        constituents = pd.read_csv('data/constituents.csv')
        objects = pd.read_csv('data/objects.csv', low_memory=False)
        objects_constituents = pd.read_csv('data/objects_constituents.csv', low_memory=False)
    
    mo.md(f"""
    ### 📊 Dataset Overview
    
    | Metric | Value |
    |--------|-------|
    | **Artists** | {len(constituents):,} |
    | **Artworks** | {len(objects):,} |
    | **Artist-Artwork Links** | {len(objects_constituents):,} |
    """)
    return constituents, objects, objects_constituents


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    
    ## I. Temporal Distribution: When Was Art Made?
    
    *Sparkline visualization following Tufte's principles:*
    - Minimal axis framing
    - High data-ink ratio
    - Clear trend revelation
    """)
    return


@app.cell
async def _(mo, np, objects, plt):
    # Parse years from displaydate
    def extract_year(date_str):
        if pd.isna(date_str):
            return None
        date_str = str(date_str)
        # Extract 4-digit years
        import re
        years = re.findall(r'\b\d{4}\b', date_str)
        if years:
            return int(years[0])
        return None

    objects['year'] = objects['displaydate'].apply(extract_year)
    valid_years = objects[objects['year'].notna() & (objects['year'] >= 1000) & (objects['year'] <= 2025)]
    
    # Create decade buckets for sparkline
    year_counts = valid_years['year'].value_counts().sort_index()
    
    fig_spark, ax_spark = plt.subplots(figsize=(14, 3))
    
    # Tufte-style sparkline
    ax_spark.fill_between(year_counts.index, year_counts.values, alpha=0.3, color='#2E86AB')
    ax_spark.plot(year_counts.index, year_counts.values, color='#2E86AB', linewidth=1.2)
    
    # Minimal framing
    ax_spark.set_xlabel('Year', fontsize=10)
    ax_spark.set_ylabel('Artworks', fontsize=10)
    ax_spark.set_title('Artworks by Year Created (Sparkline)', fontsize=12, fontweight='normal', loc='left')
    
    # Highlight peaks
    peak_idx = year_counts.idxmax()
    peak_val = year_counts.max()
    ax_spark.annotate(f'{int(peak_idx)}: {peak_val} works', 
                xy=(peak_idx, peak_val), 
                xytext=(peak_idx + 50, peak_val),
                fontsize=8,
                color='#333333',
                arrowprops=dict(arrowstyle='->', color='#666666', lw=0.5))
    
    plt.tight_layout()
    
    mo.mpl(fig_spark)
    return extract_year, peak_idx, peak_val, valid_years, year_counts


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    
    ## II. Century Distribution: Small Multiples
    
    *Faceted comparison across time periods — Tufte's "small multiples" principle*
    """)
    return


@app.cell
async def _(mo, np, plt, valid_years):
    # Create century buckets
    valid_years['century'] = ((valid_years['year'] // 100) * 100).astype(int)
    century_counts = valid_years['century'].value_counts().sort_index()
    
    # Focus on main centuries with data
    main_centuries = century_counts[century_counts.index >= 1300].head(8)
    
    fig_multi, axes_multi = plt.subplots(2, 4, figsize=(14, 6))
    axes_flat = axes_multi.flatten()
    
    colors_century = ['#A23B72', '#F18F01', '#C73E1D', '#2E86AB', '#3B1F2B', '#95C623', '#8B4789', '#4ECDC4']
    
    for idx, (century, ax_c) in enumerate(zip(main_centuries.index, axes_flat)):
        century_data = valid_years[valid_years['century'] == century]['year'].value_counts().sort_index()
        
        # Tufte-style minimal bar chart
        ax_c.bar(century_data.index, century_data.values, 
               color=colors_century[idx], alpha=0.7, width=0.8, edgecolor='none')
        
        ax_c.set_title(f'{century}s', fontsize=10, loc='left', fontweight='normal')
        ax_c.set_xlim(century, century + 99)
        ax_c.spines['top'].set_visible(False)
        ax_c.spines['right'].set_visible(False)
        ax_c.spines['left'].set_visible(False)
        ax_c.set_yticks([])
        ax_c.tick_params(axis='x', labelsize=7)
        
        # Total annotation
        ax_c.text(0.95, 0.95, f'{century_data.sum():,}', 
                transform=ax_c.transAxes, ha='right', va='top',
                fontsize=11, fontweight='bold', color=colors_century[idx])
    
    fig_multi.suptitle('Artwork Distribution by Century (Small Multiples)', 
                 fontsize=14, fontweight='normal', y=1.02)
    plt.tight_layout()
    
    mo.mpl(fig_multi)
    return century_counts, main_centuries


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    
    ## III. Artist Nationality: Layered Analysis
    
    *Layering and separation — distinguishing data from annotation*
    """)
    return


@app.cell
async def _(constituents, mo, plt):
    # Clean and analyze nationalities
    nationality_counts = constituents['nationality'].value_counts().head(15)
    nationality_counts = nationality_counts[nationality_counts.index != 'unknown']
    
    fig_nat, ax_nat = plt.subplots(figsize=(10, 8))
    
    # Horizontal bar chart (Tufte prefers for readability)
    y_pos_nat = range(len(nationality_counts))
    bars_nat = ax_nat.barh(y_pos_nat, nationality_counts.values, 
                   color='#2E86AB', alpha=0.8, height=0.6, edgecolor='none')
    
    # Add subtle reference lines
    ax_nat.set_yticks(y_pos_nat)
    ax_nat.set_yticklabels(nationality_counts.index, fontsize=10)
    ax_nat.invert_yaxis()
    
    # Minimal grid
    ax_nat.grid(axis='x', alpha=0.3, linestyle='-', linewidth=0.5)
    ax_nat.set_axisbelow(True)
    
    # Labels directly on bars (Tufte: data-ink maximization)
    for i_nat, (bar_nat, value_nat) in enumerate(zip(bars_nat, nationality_counts.values)):
        ax_nat.text(value_nat + 20, i_nat, f'{value_nat:,}', 
                va='center', fontsize=9, color='#333333')
    
    ax_nat.set_xlabel('Number of Artists', fontsize=10)
    ax_nat.set_title('Top Artist Nationalities in NGA Collection', 
                 fontsize=12, fontweight='normal', loc='left')
    
    plt.tight_layout()
    
    mo.mpl(fig_nat)
    return nationality_counts


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    
    ## IV. Medium Classification: Visual Hierarchy
    
    *Clear visual hierarchy with appropriate color encoding*
    """)
    return


@app.cell
async def _(mo, np, objects, pd, plt):
    # Analyze mediums (cleaned)
    medium_counts_raw = objects['medium'].value_counts().head(20)
    
    # Create simplified medium categories
    def categorize_medium(m):
        if pd.isna(m):
            return 'Unknown'
        m = str(m).lower()
        if 'oil' in m and 'canvas' in m:
            return 'Oil on Canvas'
        elif 'watercolor' in m:
            return 'Watercolor'
        elif 'graphite' in m:
            return 'Graphite/Pencil'
        elif 'bronze' in m:
            return 'Bronze'
        elif 'marble' in m:
            return 'Marble'
        elif 'photograph' in m:
            return 'Photograph'
        elif 'pen' in m and 'ink' in m:
            return 'Pen & Ink'
        elif 'charcoal' in m:
            return 'Charcoal'
        elif 'etching' in m:
            return 'Print (Etching)'
        elif 'engraving' in m:
            return 'Print (Engraving)'
        elif 'lithograph' in m:
            return 'Print (Lithograph)'
        else:
            return 'Other'
    
    objects['medium_category'] = objects['medium'].apply(categorize_medium)
    medium_cat_counts = objects['medium_category'].value_counts()
    
    fig_med, ax_med = plt.subplots(figsize=(12, 6))
    
    # Treemap-style bars with area proportionality
    colors_med = plt.cm.RdYlBu(np.linspace(0.2, 0.8, len(medium_cat_counts)))
    
    bars_med = ax_med.bar(range(len(medium_cat_counts)), medium_cat_counts.values,
                  color=colors_med, alpha=0.85, edgecolor='white', linewidth=0.5)
    
    ax_med.set_xticks(range(len(medium_cat_counts)))
    ax_med.set_xticklabels(medium_cat_counts.index, rotation=45, ha='right', fontsize=9)
    ax_med.set_ylabel('Number of Artworks', fontsize=10)
    ax_med.set_title('Artworks by Medium Category', fontsize=12, fontweight='normal', loc='left')
    
    # Add value labels
    for bar_med, value_med in zip(bars_med, medium_cat_counts.values):
        height_med = bar_med.get_height()
        ax_med.text(bar_med.get_x() + bar_med.get_width()/2., height_med,
                f'{value_med:,}', ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    
    mo.mpl(fig_med)
    return categorize_medium, medium_cat_counts, medium_counts_raw


@app.cell(hide_code=True)
def _(mo):
    mo.md("""
    ---
    
    ## V. Artist-Artwork Network: Micro/Macro Readings
    
    *Dual-scale analysis — revealing both individual and aggregate patterns*
    """)
    return


@app.cell
async def _(constituents, mo, objects_constituents, pd, plt):
    # Merge to get artist-artwork relationships
    merged_art = objects_constituents.merge(
        constituents[['constituentid', 'preferredname', 'nationality', 'birthyear', 'deathyear']],
        on='constituentid',
        how='left'
    )
    
    # Count artworks per artist
    artist_work_counts = merged_art.groupby(['constituentid', 'preferredname']).size().reset_index(name='artwork_count')
    artist_work_counts = artist_work_counts.sort_values('artwork_count', ascending=False).head(20)
    
    fig_art, ax_art = plt.subplots(figsize=(12, 8))
    
    # Lollipop chart (cleaner than bars)
    y_pos_art = range(len(artist_work_counts))
    ax_art.hlines(y=y_pos_art, xmin=0, xmax=artist_work_counts['artwork_count'], 
              color='#666666', alpha=0.4, linewidth=1)
    ax_art.scatter(artist_work_counts['artwork_count'], y_pos_art, 
               color='#C73E1D', s=50, alpha=0.8, zorder=3)
    
    ax_art.set_yticks(y_pos_art)
    ax_art.set_yticklabels(artist_work_counts['preferredname'], fontsize=9)
    ax_art.invert_yaxis()
    
    ax_art.set_xlabel('Number of Artworks in Collection', fontsize=10)
    ax_art.set_title('Most Represented Artists (Top 20)', 
                 fontsize=12, fontweight='normal', loc='left')
    
    # Add count labels
    for i_art, count_art in enumerate(artist_work_counts['artwork_count']):
        ax_art.text(count_art + 1, i_art, str(count_art), va='center', fontsize=8, color='#333333')
    
    plt.tight_layout()
    
    mo.mpl(fig_art)
    return artist_work_counts, merged_art


@app.cell(hide_code=True)
def _(mo, datetime):
    mo.md(f"""
    ---
    
    ## Summary: Key Insights
    
    This analysis reveals several patterns in the National Gallery of Art collection:
    
    | Finding | Significance |
    |---------|-------------|
    | **Peak production in 17th-19th centuries** | Aligns with European art historical canon |
    | **American artists well-represented** | NGA's mission emphasizes American art |
    | **Oil on canvas dominates** | Traditional Western painting medium |
    | **Some artists represented by 100+ works** | Deep holdings allow comprehensive study |
    
    ---
    
    ### Technical Implementation Notes
    
    - **Data Source**: [National Gallery of Art Open Data](https://github.com/NationalGalleryOfArt/opendata)
    - **Visualization Principles**: Edward Tufte's *The Visual Display of Quantitative Information*
    - **Toolchain**: marimo + pandas + matplotlib
    - **Collaboration**: This notebook supports [marimo-pair](https://github.com/marimo-team/marimo-pair) for real-time editing
    
    *Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*
    """)
    return


if __name__ == "__main__":
    app.run()
