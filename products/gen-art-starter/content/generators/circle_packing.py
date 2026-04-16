#!/usr/bin/env python3
"""
Circle Packing Generator
=========================
Places circles on a canvas using random placement with collision detection.
Each candidate circle starts at maximum radius and shrinks until it fits
without overlapping any existing circle.

The result is a dense, organic-looking composition where large circles
anchor the piece and small circles fill the gaps. On a pen plotter, each
circle is drawn as a single continuous stroke.

Usage:
    python circle_packing.py
    python circle_packing.py --max_circles 1500 --min_radius 2 --max_radius 80
"""

import argparse
import math
import os
import random
import sys

import svgwrite

# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------
DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 800
DEFAULT_MAX_CIRCLES = 1000    # Maximum circles to place
DEFAULT_MIN_RADIUS = 2.0      # Smallest allowed circle
DEFAULT_MAX_RADIUS = 60.0     # Largest allowed circle
DEFAULT_MAX_ATTEMPTS = 5000   # Placement attempts before giving up
DEFAULT_PADDING = 1.5         # Gap between circles (pen width buffer)
DEFAULT_LINE_WIDTH = 0.4
DEFAULT_MARGIN = 20
DEFAULT_SEED = None


def pack_circles(
    width, height, max_circles, min_radius, max_radius,
    max_attempts, padding, margin, seed=None,
):
    """
    Place non-overlapping circles on the canvas.

    Strategy: for each attempt, pick a random point and find the largest
    circle that fits there without overlapping existing circles or the
    canvas boundary. If it's larger than min_radius, keep it.

    Returns a list of (cx, cy, r) tuples.
    """
    if seed is not None:
        random.seed(seed)

    circles = []
    attempts = 0

    while len(circles) < max_circles and attempts < max_attempts:
        attempts += 1

        # Random candidate center
        cx = random.uniform(margin, width - margin)
        cy = random.uniform(margin, height - margin)

        # Maximum radius that fits within the canvas boundary
        r = min(
            cx - margin,
            width - margin - cx,
            cy - margin,
            height - margin - cy,
            max_radius,
        )

        # Shrink to avoid collision with every existing circle
        for (ox, oy, or_) in circles:
            dist = math.sqrt((cx - ox) ** 2 + (cy - oy) ** 2)
            available = dist - or_ - padding
            r = min(r, available)

        # Keep the circle if it's big enough
        if r >= min_radius:
            circles.append((cx, cy, r))
            attempts = 0  # Reset attempt counter on success

    return circles


def render_svg(circles, width, height, line_width, output_path):
    """Render circles to SVG."""
    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{width}px", f"{height}px"),
        viewBox=f"0 0 {width} {height}",
    )
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    # Sort by radius (draw large circles first for visual layering)
    for cx, cy, r in sorted(circles, key=lambda c: -c[2]):
        dwg.add(
            dwg.circle(
                center=(cx, cy),
                r=r,
                stroke="black",
                stroke_width=line_width,
                fill="none",
            )
        )

    dwg.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Circle packing generator")
    parser.add_argument("--output", "-o", default=None)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--max_circles", type=int, default=DEFAULT_MAX_CIRCLES)
    parser.add_argument("--min_radius", type=float, default=DEFAULT_MIN_RADIUS)
    parser.add_argument("--max_radius", type=float, default=DEFAULT_MAX_RADIUS)
    parser.add_argument("--max_attempts", type=int, default=DEFAULT_MAX_ATTEMPTS)
    parser.add_argument("--padding", type=float, default=DEFAULT_PADDING)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    parser.add_argument("--margin", type=int, default=DEFAULT_MARGIN)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "circle_packing.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    circles = pack_circles(
        args.width, args.height, args.max_circles,
        args.min_radius, args.max_radius,
        args.max_attempts, args.padding, args.margin, args.seed,
    )

    render_svg(circles, args.width, args.height, args.line_width, output)
    print(f"Packed {len(circles)} circles -> {output}")


if __name__ == "__main__":
    main()
