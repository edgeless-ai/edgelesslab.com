#!/usr/bin/env python3
"""
Moire Interference Pattern Generator
=====================================
Overlays two grids of concentric circles (or parallel lines) with a slight
rotational offset. The interference between the two grids creates a moire
pattern: large-scale visual waves that emerge from the interaction of
fine-scale structure.

The effect is purely optical. Neither grid contains curves, but your eyes
construct them from the overlap. Rotation angle is the primary control.
Even 1-2 degrees of offset produces dramatic results.

These print beautifully because the individual lines are simple and
uniform, but the emergent pattern has striking visual depth.

Usage:
    python moire.py
    python moire.py --rotation 3.5 --spacing 6 --mode circles
"""

import argparse
import math
import os
import sys

import svgwrite

# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------
DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 800
DEFAULT_SPACING = 8           # Distance between grid lines
DEFAULT_ROTATION = 2.5        # Rotation offset in degrees for second grid
DEFAULT_MODE = "circles"      # "circles" or "lines"
DEFAULT_LINE_WIDTH = 0.3
DEFAULT_CENTER_X = None       # Defaults to canvas center
DEFAULT_CENTER_Y = None
DEFAULT_MAX_RADIUS = None     # Defaults to canvas diagonal / 2


def generate_circle_grid(cx, cy, max_radius, spacing, rotation_deg=0.0):
    """
    Generate concentric circles as SVG-compatible data.
    Returns a list of (cx, cy, r) tuples.
    Rotation is applied by shifting the center point.
    """
    # Rotation shifts the center of the second grid
    angle = math.radians(rotation_deg)
    offset = max_radius * 0.02 * rotation_deg  # Scale offset with rotation
    shifted_cx = cx + math.cos(angle) * offset
    shifted_cy = cy + math.sin(angle) * offset

    circles = []
    r = spacing
    while r < max_radius:
        circles.append((shifted_cx, shifted_cy, r))
        r += spacing

    return circles


def generate_line_grid(width, height, spacing, rotation_deg=0.0):
    """
    Generate parallel lines, optionally rotated.
    Returns a list of ((x1,y1), (x2,y2)) tuples.
    """
    angle = math.radians(rotation_deg)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    cx, cy = width / 2, height / 2
    diag = math.sqrt(width ** 2 + height ** 2)

    lines = []
    offset = -diag / 2
    while offset < diag / 2:
        # Line perpendicular to the angle direction
        px = cx + cos_a * 0 - sin_a * offset
        py = cy + sin_a * 0 + cos_a * offset
        x1 = px - cos_a * diag
        y1 = py - sin_a * diag
        x2 = px + cos_a * diag
        y2 = py + sin_a * diag
        lines.append(((x1, y1), (x2, y2)))
        offset += spacing

    return lines


def render_svg(width, height, spacing, rotation, mode, line_width, output_path):
    """Generate the moire pattern and render to SVG."""
    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{width}px", f"{height}px"),
        viewBox=f"0 0 {width} {height}",
    )
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    # Clip path to keep everything within canvas
    clip = dwg.defs.add(dwg.clipPath(id="canvas"))
    clip.add(dwg.rect(insert=(0, 0), size=(width, height)))

    group = dwg.add(dwg.g(clip_path="url(#canvas)"))

    cx, cy = width / 2, height / 2
    max_r = math.sqrt(cx ** 2 + cy ** 2)

    if mode == "circles":
        # First grid: centered, no rotation
        for _, _, r in generate_circle_grid(cx, cy, max_r, spacing, 0):
            group.add(dwg.circle(center=(cx, cy), r=r,
                                 stroke="black", stroke_width=line_width, fill="none"))
        # Second grid: offset by rotation
        for scx, scy, r in generate_circle_grid(cx, cy, max_r, spacing, rotation):
            group.add(dwg.circle(center=(scx, scy), r=r,
                                 stroke="black", stroke_width=line_width, fill="none"))
    else:
        # Line mode
        for (x1, y1), (x2, y2) in generate_line_grid(width, height, spacing, 0):
            group.add(dwg.line(start=(x1, y1), end=(x2, y2),
                               stroke="black", stroke_width=line_width))
        for (x1, y1), (x2, y2) in generate_line_grid(width, height, spacing, rotation):
            group.add(dwg.line(start=(x1, y1), end=(x2, y2),
                               stroke="black", stroke_width=line_width))

    dwg.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Moire pattern generator")
    parser.add_argument("--output", "-o", default=None)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--spacing", type=float, default=DEFAULT_SPACING)
    parser.add_argument("--rotation", type=float, default=DEFAULT_ROTATION)
    parser.add_argument("--mode", choices=["circles", "lines"], default=DEFAULT_MODE)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    args = parser.parse_args()

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "moire.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    render_svg(args.width, args.height, args.spacing, args.rotation,
               args.mode, args.line_width, output)
    print(f"Generated moire ({args.mode}, {args.rotation} deg) -> {output}")


if __name__ == "__main__":
    main()
