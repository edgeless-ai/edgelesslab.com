#!/usr/bin/env python3
"""
SVG Scoring Pipeline
====================
Evaluates generated SVG files on 5 signals and returns a composite
0-100 score. Designed to filter large batches: run all your outputs
through the scorer, sort by score, and look at the top 10%.

Signals:
  1. Ink Coverage (0-20)     - How much of the canvas has marks on it
  2. Line Complexity (0-20)  - Total path length and segment count
  3. Composition Balance (0-20) - Distribution of marks across quadrants
  4. Visual Entropy (0-20)   - Variation in mark density across regions
  5. Plot Feasibility (0-20) - Whether a pen plotter can execute this cleanly

A score of 70+ typically means a piece is worth printing. Below 40 usually
means something went wrong with the parameters (too sparse, too dense,
all marks in one corner, or paths that would take 6 hours to plot).

Usage:
    python score.py path/to/file.svg
    python score.py output/*.svg --json
"""

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

# SVG namespace
SVG_NS = "http://www.w3.org/2000/svg"
NS = {"svg": SVG_NS}


def parse_svg(filepath):
    """
    Parse an SVG file and extract geometry information.
    Returns a dict with canvas dimensions and lists of geometric elements.
    """
    tree = ET.parse(filepath)
    root = tree.getroot()

    # Get canvas dimensions from viewBox or width/height
    viewbox = root.get("viewBox", "")
    if viewbox:
        parts = viewbox.split()
        width = float(parts[2])
        height = float(parts[3])
    else:
        width = float(root.get("width", "800").replace("px", ""))
        height = float(root.get("height", "800").replace("px", ""))

    # Collect all points from all geometric elements
    points = []
    segments = []
    circles = []

    for elem in root.iter():
        tag = elem.tag.replace(f"{{{SVG_NS}}}", "")

        if tag == "polyline":
            pts_str = elem.get("points", "")
            pts = _parse_points(pts_str)
            points.extend(pts)
            for i in range(len(pts) - 1):
                segments.append((pts[i], pts[i + 1]))

        elif tag == "line":
            x1 = float(elem.get("x1", 0))
            y1 = float(elem.get("y1", 0))
            x2 = float(elem.get("x2", 0))
            y2 = float(elem.get("y2", 0))
            points.extend([(x1, y1), (x2, y2)])
            segments.append(((x1, y1), (x2, y2)))

        elif tag == "circle":
            cx = float(elem.get("cx", 0))
            cy = float(elem.get("cy", 0))
            r = float(elem.get("r", 0))
            if r > 0:
                circles.append((cx, cy, r))
                # Sample points around the circle for spatial analysis
                for a in range(0, 360, 15):
                    rad = math.radians(a)
                    points.append((cx + r * math.cos(rad), cy + r * math.sin(rad)))

        elif tag == "path":
            # Rough extraction of coordinates from path data
            d = elem.get("d", "")
            pts = _parse_path_points(d)
            points.extend(pts)
            for i in range(len(pts) - 1):
                segments.append((pts[i], pts[i + 1]))

    return {
        "width": width,
        "height": height,
        "points": points,
        "segments": segments,
        "circles": circles,
    }


def _parse_points(pts_str):
    """Parse SVG polyline points attribute."""
    pts = []
    pairs = pts_str.strip().split()
    for pair in pairs:
        # Handle both "x,y" and "x y" formats
        if "," in pair:
            parts = pair.split(",")
            if len(parts) == 2:
                try:
                    pts.append((float(parts[0]), float(parts[1])))
                except ValueError:
                    continue
    return pts


def _parse_path_points(d):
    """Extract coordinate pairs from SVG path data (rough extraction)."""
    pts = []
    numbers = re.findall(r"[-+]?\d*\.?\d+", d)
    for i in range(0, len(numbers) - 1, 2):
        try:
            pts.append((float(numbers[i]), float(numbers[i + 1])))
        except (ValueError, IndexError):
            continue
    return pts


# ---------------------------------------------------------------------------
# Scoring signals
# ---------------------------------------------------------------------------

def score_ink_coverage(data, max_score=20):
    """
    How much of the canvas area has marks?
    Grid the canvas into cells and count occupied cells.
    Ideal range: 15-70% coverage. Too sparse or too dense both score low.
    """
    w, h = data["width"], data["height"]
    if not data["points"]:
        return 0

    grid_size = 20
    cols = max(1, int(w / grid_size))
    rows = max(1, int(h / grid_size))
    occupied = set()

    for x, y in data["points"]:
        col = min(int(x / grid_size), cols - 1)
        row = min(int(y / grid_size), rows - 1)
        if 0 <= col < cols and 0 <= row < rows:
            occupied.add((col, row))

    coverage = len(occupied) / (cols * rows)

    # Bell curve scoring: peak at 40% coverage
    if coverage < 0.05:
        return int(max_score * coverage / 0.05 * 0.3)
    elif coverage < 0.15:
        return int(max_score * 0.5)
    elif coverage < 0.60:
        return int(max_score * (0.7 + 0.3 * (1 - abs(coverage - 0.40) / 0.20)))
    elif coverage < 0.85:
        return int(max_score * 0.6)
    else:
        return int(max_score * 0.3)


def score_line_complexity(data, max_score=20):
    """
    Total path length and segment count.
    Rewards pieces with substantial drawing content.
    """
    total_length = 0
    for (x1, y1), (x2, y2) in data["segments"]:
        total_length += math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    # Add circle circumferences
    for _, _, r in data["circles"]:
        total_length += 2 * math.pi * r

    num_elements = len(data["segments"]) + len(data["circles"])
    canvas_diag = math.sqrt(data["width"] ** 2 + data["height"] ** 2)

    # Normalize: a piece with total path length = 50x the canvas diagonal
    # is solidly complex
    length_ratio = min(total_length / (canvas_diag * 50), 1.0) if canvas_diag > 0 else 0
    element_ratio = min(num_elements / 2000, 1.0)

    return int(max_score * (length_ratio * 0.6 + element_ratio * 0.4))


def score_composition_balance(data, max_score=20):
    """
    How evenly are marks distributed across the canvas?
    Divides the canvas into 9 zones (3x3 grid) and measures uniformity.
    Perfect balance isn't the goal (that's boring), but heavy imbalance
    usually indicates a bug, not an artistic choice.
    """
    if not data["points"]:
        return 0

    w, h = data["width"], data["height"]
    zones = [[0] * 3 for _ in range(3)]

    for x, y in data["points"]:
        col = min(int(x / w * 3), 2)
        row = min(int(y / h * 3), 2)
        if 0 <= col <= 2 and 0 <= row <= 2:
            zones[row][col] += 1

    counts = [zones[r][c] for r in range(3) for c in range(3)]
    total = sum(counts)
    if total == 0:
        return 0

    # Calculate coefficient of variation
    mean = total / 9
    variance = sum((c - mean) ** 2 for c in counts) / 9
    std = math.sqrt(variance)
    cv = std / mean if mean > 0 else 0

    # Lower CV = more balanced. CV of 0.3-0.6 is the sweet spot
    # (some variation is good, total chaos is bad).
    if cv < 0.2:
        return int(max_score * 0.85)  # Very balanced, slightly less interesting
    elif cv < 0.5:
        return int(max_score * 1.0)   # Good balance with some variation
    elif cv < 0.8:
        return int(max_score * 0.7)
    elif cv < 1.2:
        return int(max_score * 0.4)
    else:
        return int(max_score * 0.15)


def score_visual_entropy(data, max_score=20):
    """
    Variation in mark density across the canvas.
    Higher entropy = more visual interest and tonal range.
    Uses a grid of density buckets and Shannon entropy.
    """
    if not data["points"]:
        return 0

    w, h = data["width"], data["height"]
    grid_size = 40
    cols = max(1, int(w / grid_size))
    rows = max(1, int(h / grid_size))
    grid = [[0] * cols for _ in range(rows)]

    for x, y in data["points"]:
        col = min(int(x / grid_size), cols - 1)
        row = min(int(y / grid_size), rows - 1)
        if 0 <= col < cols and 0 <= row < rows:
            grid[row][col] += 1

    # Flatten and compute Shannon entropy
    counts = [grid[r][c] for r in range(rows) for c in range(cols)]
    total = sum(counts)
    if total == 0:
        return 0

    entropy = 0
    for c in counts:
        if c > 0:
            p = c / total
            entropy -= p * math.log2(p)

    # Maximum possible entropy for this grid
    max_entropy = math.log2(len(counts)) if len(counts) > 1 else 1
    normalized = entropy / max_entropy if max_entropy > 0 else 0

    return int(max_score * min(normalized * 1.2, 1.0))


def score_plot_feasibility(data, max_score=20):
    """
    Can a pen plotter execute this cleanly?

    Penalizes:
    - Excessive total path count (too many pen lifts = slow plotting)
    - Very short segments (the pen can't render sub-millimeter marks)
    - Extremely long total drawing time (estimated from path length)

    Rewards:
    - Continuous polylines (fewer pen lifts)
    - Reasonable total path length
    """
    num_segments = len(data["segments"])
    num_circles = len(data["circles"])
    total_elements = num_segments + num_circles

    if total_elements == 0:
        return 0

    # Count very short segments (< 1 unit)
    short_segments = sum(
        1 for (x1, y1), (x2, y2) in data["segments"]
        if math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) < 1.0
    )
    short_ratio = short_segments / max(num_segments, 1)

    # Total path length for time estimation
    total_length = sum(
        math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        for (x1, y1), (x2, y2) in data["segments"]
    )
    total_length += sum(2 * math.pi * r for _, _, r in data["circles"])

    # Estimate plot time: ~30mm/s drawing speed, ~50mm/s travel
    # For an 800x800 canvas, reasonable plots take 5-60 minutes
    canvas_area = data["width"] * data["height"]
    length_density = total_length / math.sqrt(canvas_area) if canvas_area > 0 else 0

    score = max_score

    # Penalize too many short segments
    if short_ratio > 0.3:
        score -= int(max_score * 0.3)
    elif short_ratio > 0.1:
        score -= int(max_score * 0.1)

    # Penalize excessive element count (>50k elements = very slow)
    if total_elements > 50000:
        score -= int(max_score * 0.4)
    elif total_elements > 20000:
        score -= int(max_score * 0.2)

    # Penalize if too little content to be worth plotting
    if length_density < 5:
        score -= int(max_score * 0.3)

    # Penalize extreme density (would take hours)
    if length_density > 500:
        score -= int(max_score * 0.3)

    return max(0, score)


def score_svg(filepath):
    """
    Score an SVG file on all 5 signals.
    Returns a dict with individual scores and composite.
    """
    data = parse_svg(filepath)

    scores = {
        "ink_coverage": score_ink_coverage(data),
        "line_complexity": score_line_complexity(data),
        "composition_balance": score_composition_balance(data),
        "visual_entropy": score_visual_entropy(data),
        "plot_feasibility": score_plot_feasibility(data),
    }
    scores["composite"] = sum(scores.values())
    scores["file"] = os.path.basename(filepath)

    return scores


def main():
    parser = argparse.ArgumentParser(description="Score SVG files for generative art quality")
    parser.add_argument("files", nargs="+", help="SVG files to score")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    results = []
    for filepath in args.files:
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found, skipping", file=sys.stderr)
            continue
        try:
            scores = score_svg(filepath)
            results.append(scores)
        except ET.ParseError as e:
            print(f"Warning: Failed to parse {filepath}: {e}", file=sys.stderr)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for r in sorted(results, key=lambda x: -x["composite"]):
            print(f"\n  {r['file']}")
            print(f"  {'='*40}")
            print(f"  Ink Coverage:          {r['ink_coverage']:>3}/20")
            print(f"  Line Complexity:       {r['line_complexity']:>3}/20")
            print(f"  Composition Balance:   {r['composition_balance']:>3}/20")
            print(f"  Visual Entropy:        {r['visual_entropy']:>3}/20")
            print(f"  Plot Feasibility:      {r['plot_feasibility']:>3}/20")
            print(f"  {'─'*40}")
            print(f"  COMPOSITE:             {r['composite']:>3}/100")


if __name__ == "__main__":
    main()
