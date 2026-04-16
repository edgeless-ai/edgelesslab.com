#!/usr/bin/env python3
"""
Reaction-Diffusion Generator (Gray-Scott Model)
================================================
Simulates two chemicals (A and B) interacting on a 2D grid. Chemical A is
the substrate, B is the catalyst. They diffuse at different rates and react
according to two parameters:

  feed_rate (f): How fast A is replenished. Higher = more active growth.
  kill_rate (k): How fast B decays. Higher = sparser patterns.

The combination of f and k determines the morphology: spots, stripes,
coral branches, or maze-like networks. The "sweet spot" map is a narrow
diagonal band in (f, k) space where interesting patterns emerge. Outside
that band, you get either uniform fields or total extinction.

After simulation, contour lines are extracted from the B concentration
grid and written as SVG paths. These contours plot beautifully on pen
plotters because they are smooth, continuous, and never self-intersect
at a given contour level.

Usage:
    python reaction_diffusion.py
    python reaction_diffusion.py --feed_rate 0.035 --kill_rate 0.065 --iterations 8000
"""

import argparse
import math
import os
import sys

import numpy as np
import svgwrite

# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------
DEFAULT_WIDTH = 200           # Grid width (keep small: computation is O(w*h*iter))
DEFAULT_HEIGHT = 200          # Grid height
DEFAULT_FEED_RATE = 0.055     # Feed rate (f). Try 0.02-0.07.
DEFAULT_KILL_RATE = 0.062     # Kill rate (k). Try 0.045-0.07.
DEFAULT_DA = 1.0              # Diffusion rate of chemical A
DEFAULT_DB = 0.5              # Diffusion rate of chemical B
DEFAULT_ITERATIONS = 8000     # Simulation steps. More = more developed pattern.
DEFAULT_DT = 1.0              # Time step
DEFAULT_CONTOUR_LEVELS = 8    # Number of contour lines to extract
DEFAULT_SVG_SCALE = 4         # Scale factor from grid coords to SVG units
DEFAULT_LINE_WIDTH = 0.5      # Stroke width in SVG units
DEFAULT_SEED = None


def laplacian(grid):
    """
    Compute the discrete Laplacian using a 5-point stencil.
    This is the diffusion operator: it measures how much each cell
    differs from its neighbors.
    """
    return (
        np.roll(grid, 1, axis=0)
        + np.roll(grid, -1, axis=0)
        + np.roll(grid, 1, axis=1)
        + np.roll(grid, -1, axis=1)
        - 4 * grid
    )


def simulate(width, height, feed_rate, kill_rate, da, db, dt, iterations, seed=None):
    """
    Run the Gray-Scott simulation.
    Returns the B concentration grid (2D numpy array).
    """
    rng = np.random.default_rng(seed)

    # Initialize: A=1 everywhere, B=0 everywhere
    A = np.ones((height, width), dtype=np.float64)
    B = np.zeros((height, width), dtype=np.float64)

    # Seed B with several random square patches
    num_seeds = rng.integers(5, 15)
    for _ in range(num_seeds):
        cx = rng.integers(20, width - 20)
        cy = rng.integers(20, height - 20)
        size = rng.integers(3, 8)
        B[cy - size : cy + size, cx - size : cx + size] = 1.0
        A[cy - size : cy + size, cx - size : cx + size] = 0.0

    # Run simulation
    for i in range(iterations):
        la = laplacian(A)
        lb = laplacian(B)
        reaction = A * B * B

        A += dt * (da * la - reaction + feed_rate * (1 - A))
        B += dt * (db * lb + reaction - (kill_rate + feed_rate) * B)

        # Clamp to [0, 1]
        np.clip(A, 0, 1, out=A)
        np.clip(B, 0, 1, out=B)

    return B


def extract_contours(grid, num_levels):
    """
    Extract contour lines from a 2D grid using marching squares.
    Returns a list of polylines (each a list of (x, y) tuples).

    This is a simplified marching squares that traces horizontal threshold
    crossings. For production use you might want matplotlib's contour
    extraction or scikit-image's find_contours, but this version has
    zero extra dependencies.
    """
    h, w = grid.shape
    b_min, b_max = grid.min(), grid.max()
    if b_max - b_min < 1e-10:
        return []

    levels = np.linspace(b_min + (b_max - b_min) * 0.2, b_max * 0.9, num_levels)
    all_contours = []

    for level in levels:
        # Binary mask: 1 where grid >= level
        mask = (grid >= level).astype(np.int8)

        # Find horizontal edges (transitions between 0 and 1)
        visited = set()
        for y in range(h - 1):
            for x in range(w - 1):
                # Check if this cell has a boundary crossing
                cell = mask[y, x] + mask[y, x + 1] + mask[y + 1, x] + mask[y + 1, x + 1]
                if cell > 0 and cell < 4 and (x, y) not in visited:
                    # Trace the contour from this point
                    contour = _trace_contour(grid, level, x, y, w, h, visited)
                    if len(contour) > 4:
                        all_contours.append(contour)

    return all_contours


def _trace_contour(grid, level, start_x, start_y, w, h, visited):
    """Trace a single contour line using simple boundary following."""
    points = []
    x, y = start_x, start_y
    dx, dy = 1, 0  # Initial direction: right

    for _ in range(w * h):  # Safety limit
        if (x, y) in visited:
            if len(points) > 2:
                break
        visited.add((x, y))

        # Interpolate the crossing point
        if 0 <= x < w - 1 and 0 <= y < h - 1:
            v = grid[y, x]
            # Horizontal interpolation
            if abs(grid[y, min(x + 1, w - 1)] - v) > 1e-10:
                t = (level - v) / (grid[y, min(x + 1, w - 1)] - v)
                t = max(0, min(1, t))
                px = x + t
            else:
                px = x + 0.5
            # Vertical interpolation
            if abs(grid[min(y + 1, h - 1), x] - v) > 1e-10:
                t = (level - v) / (grid[min(y + 1, h - 1), x] - v)
                t = max(0, min(1, t))
                py = y + t
            else:
                py = y + 0.5
            points.append((px, py))

        # Move to next cell, turning to follow the boundary
        nx, ny = x + dx, y + dy
        if 0 <= nx < w - 1 and 0 <= ny < h - 1:
            cell_val = grid[ny, nx]
            if (cell_val >= level) != (grid[y, x] >= level):
                # Turn left
                dx, dy = -dy, dx
            else:
                x, y = nx, ny
        else:
            # Turn right at boundary
            dx, dy = dy, -dx
            if not (0 <= x + dx < w - 1 and 0 <= y + dy < h - 1):
                break

    return points


def render_svg(contours, grid_w, grid_h, scale, line_width, output_path):
    """Render contour lines to SVG."""
    svg_w = grid_w * scale
    svg_h = grid_h * scale

    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{svg_w}px", f"{svg_h}px"),
        viewBox=f"0 0 {svg_w} {svg_h}",
    )
    dwg.add(dwg.rect(insert=(0, 0), size=(svg_w, svg_h), fill="white"))

    for contour in contours:
        scaled = [(x * scale, y * scale) for x, y in contour]
        if len(scaled) > 2:
            dwg.add(
                dwg.polyline(
                    points=scaled,
                    stroke="black",
                    stroke_width=line_width,
                    fill="none",
                    stroke_linecap="round",
                )
            )

    dwg.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Reaction-diffusion generator")
    parser.add_argument("--output", "-o", default=None)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--feed_rate", type=float, default=DEFAULT_FEED_RATE)
    parser.add_argument("--kill_rate", type=float, default=DEFAULT_KILL_RATE)
    parser.add_argument("--da", type=float, default=DEFAULT_DA)
    parser.add_argument("--db", type=float, default=DEFAULT_DB)
    parser.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS)
    parser.add_argument("--contour_levels", type=int, default=DEFAULT_CONTOUR_LEVELS)
    parser.add_argument("--scale", type=int, default=DEFAULT_SVG_SCALE)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "reaction_diffusion.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    print(f"Simulating ({args.width}x{args.height}, {args.iterations} iterations)...")
    grid = simulate(
        args.width, args.height,
        args.feed_rate, args.kill_rate,
        args.da, args.db, DEFAULT_DT,
        args.iterations, args.seed,
    )

    contours = extract_contours(grid, args.contour_levels)
    render_svg(contours, args.width, args.height, args.scale, args.line_width, output)
    print(f"Extracted {len(contours)} contour lines -> {output}")


if __name__ == "__main__":
    main()
