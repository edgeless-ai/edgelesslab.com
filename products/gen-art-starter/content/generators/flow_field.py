#!/usr/bin/env python3
"""
Flow Field Generator
====================
Generates flow field art using Perlin noise. Each line follows the noise
gradient from a random starting point, creating smooth, organic curves.

The parameter space for flow fields is huge. Small changes to noise_scale
shift the output from calm rivers to turbulent storms. That sensitivity
is what makes them endlessly explorable.

Output: SVG file suitable for pen plotting or screen display.

Usage:
    python flow_field.py
    python flow_field.py --output my_flow.svg --noise_scale 0.008 --num_lines 1000
"""

import argparse
import math
import os
import random
import sys

import svgwrite
from noise import pnoise2

# ---------------------------------------------------------------------------
# Parameters
# ---------------------------------------------------------------------------
DEFAULT_WIDTH = 800           # Canvas width in pixels/units
DEFAULT_HEIGHT = 800          # Canvas height in pixels/units
DEFAULT_NOISE_SCALE = 0.005   # Lower = smoother, higher = more chaotic
DEFAULT_STEP_LENGTH = 3.0     # Distance each step moves along the field
DEFAULT_NUM_STEPS = 80        # Steps per line (longer = more flowing curves)
DEFAULT_NUM_LINES = 800       # Total number of lines to draw
DEFAULT_LINE_WIDTH = 0.3      # Stroke width (thin works best for plotters)
DEFAULT_MARGIN = 40           # Border margin to keep lines from edges
DEFAULT_SEED = None           # Random seed (None = random each run)


def generate_flow_field(
    width=DEFAULT_WIDTH,
    height=DEFAULT_HEIGHT,
    noise_scale=DEFAULT_NOISE_SCALE,
    step_length=DEFAULT_STEP_LENGTH,
    num_steps=DEFAULT_NUM_STEPS,
    num_lines=DEFAULT_NUM_LINES,
    line_width=DEFAULT_LINE_WIDTH,
    margin=DEFAULT_MARGIN,
    seed=None,
):
    """
    Generate flow field lines.

    Returns a list of polylines, where each polyline is a list of (x, y) tuples.
    """
    if seed is not None:
        random.seed(seed)
    # Perlin noise needs an offset so different seeds produce different fields
    offset_x = random.uniform(0, 1000)
    offset_y = random.uniform(0, 1000)

    lines = []
    for _ in range(num_lines):
        # Start at a random point within the margin
        x = random.uniform(margin, width - margin)
        y = random.uniform(margin, height - margin)
        points = [(x, y)]

        for _ in range(num_steps):
            # Sample Perlin noise at this position to get an angle
            angle = pnoise2(
                (x + offset_x) * noise_scale,
                (y + offset_y) * noise_scale,
                octaves=4,
                persistence=0.5,
                lacunarity=2.0,
            ) * math.pi * 2  # Map noise output (-1..1) to full rotation

            # Step in the direction of the angle
            x += math.cos(angle) * step_length
            y += math.sin(angle) * step_length

            # Stop if we leave the canvas
            if x < margin or x > width - margin or y < margin or y > height - margin:
                break

            points.append((x, y))

        # Only keep lines with enough points to be visible
        if len(points) > 3:
            lines.append(points)

    return lines


def render_svg(lines, width, height, line_width, output_path):
    """Render polylines to an SVG file."""
    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{width}px", f"{height}px"),
        viewBox=f"0 0 {width} {height}",
    )
    # White background
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    for points in lines:
        dwg.add(
            dwg.polyline(
                points=points,
                stroke="black",
                stroke_width=line_width,
                fill="none",
                stroke_linecap="round",
                stroke_linejoin="round",
            )
        )

    dwg.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Flow field generator")
    parser.add_argument("--output", "-o", default=None, help="Output SVG path")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--noise_scale", type=float, default=DEFAULT_NOISE_SCALE)
    parser.add_argument("--step_length", type=float, default=DEFAULT_STEP_LENGTH)
    parser.add_argument("--num_steps", type=int, default=DEFAULT_NUM_STEPS)
    parser.add_argument("--num_lines", type=int, default=DEFAULT_NUM_LINES)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    parser.add_argument("--margin", type=int, default=DEFAULT_MARGIN)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "flow_field.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    lines = generate_flow_field(
        width=args.width,
        height=args.height,
        noise_scale=args.noise_scale,
        step_length=args.step_length,
        num_steps=args.num_steps,
        num_lines=args.num_lines,
        line_width=args.line_width,
        margin=args.margin,
        seed=args.seed,
    )

    render_svg(lines, args.width, args.height, args.line_width, output)
    print(f"Generated {len(lines)} lines -> {output}")


if __name__ == "__main__":
    main()
