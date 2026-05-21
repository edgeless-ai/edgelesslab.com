# NGA Art Collection Analysis with Marimo

## Overview

This project demonstrates the integration of **marimo-pair** and **marimo reactive notebooks** into the Edgeless Lab workflow, analyzing the National Gallery of Art's open dataset of 145,653 artworks.

## What is marimo-pair?

[marimo-pair](https://github.com/marimo-team/marimo-pair) enables AI agents to drop into running marimo notebook sessions as collaborative environments. This represents a new paradigm where:

- Agents interact with live data environments
- Reactive computation updates cascade automatically
- Humans and AI collaborate in the same computational space

## The Dataset

**Source**: [National Gallery of Art Open Data](https://github.com/NationalGalleryOfArt/opendata)
- 145,653 artworks
- 23,932 unique mediums
- Date range: 499 BCE — 2025 CE
- CC0 licensed (public domain dedication)

## Tufte Visualization Principles Applied

1. **Maximize data-ink ratio**: Every pixel serves data communication
2. **No chart junk**: Removed all non-data ink
3. **Small multiples**: Efficient comparison across categories
4. **Layered information**: Built from simple to complex

## Files

- `nga_art_analysis.py` — Marimo notebook (runnable with `marimo run`)
- `nga_analysis.html` — Static export for web embedding
- `objects.csv` — NGA artworks dataset (78MB)
- `constituents.csv` — Artist/constituent data (4.3MB)

## Usage

### Run the interactive notebook:
```bash
marimo run nga_art_analysis.py
```

### Export to HTML:
```bash
marimo export html nga_art_analysis.py --output nga_analysis.html
```

## Marimo-Pair Integration

This notebook can be used with marimo-pair for agent collaboration:

```bash
# Install the skill
npx skills add marimo-team/marimo-pair

# Start marimo with no token for auto-discovery
marimo run nga_art_analysis.py --no-token

# Agents can now discover and interact with this session
```

## Website Integration

Copy the HTML export to the edgelesslab site for embed:
```bash
cp nga_analysis.html ../static/
```

---

*Built for Edgeless Lab — exploring AI-native creative workflows*
