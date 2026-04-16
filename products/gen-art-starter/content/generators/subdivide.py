#!/usr/bin/env python3
"""
Recursive Subdivision Generator
================================
Starts with a single rectangle (the canvas), then recursively splits it
into smaller rectangles with random cut positions. Each leaf rectangle
gets a fill pattern: hatching, cross-hatching, dots, or empty.

The result looks like an abstract composition in the tradition of Mondrian
or Sol LeWitt, but with organic randomness in the proportions. On a pen
plotter, the hatching patterns create beautiful tonal variation through
line density alone.

Usage:
    python subdivide.py
    python subdivide.py --max_depth 6 --min_size 40 --fill_chance 0.7
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
DEFAULT_MAX_DEPTH = 5         # Maximum recursion depth
DEFAULT_MIN_SIZE = 50         # Minimum rectangle dimension before stopping
DEFAULT_SPLIT_CHANCE = 0.85   # Probability of splitting at each level
DEFAULT_FILL_CHANCE = 0.6     # Probability of filling a leaf rectangle
DEFAULT_HATCH_SPACING = 5     # Distance between hatch lines
DEFAULT_DOT_SPACING = 8       # Distance between dots in dot fill
DEFAULT_DOT_RADIUS = 1.2      # Radius of fill dots
DEFAULT_LINE_WIDTH = 0.4
DEFAULT_MARGIN = 20
DEFAULT_SEED = None


def subdivide(x, y, w, h, depth, max_depth, min_size, split_chance):
    """
    Recursively subdivide a rectangle.
    Returns a list of (x, y, w, h) leaf rectangles.
    """
    # Stop conditions
    if depth >= max_depth:
        return [(x, y, w, h)]
    if w < min_size * 2 and h < min_size * 2:
        return [(x, y, w, h)]
    if random.random() > split_chance:
        return [(x, y, w, h)]

    rects = []

    # Choose split direction based on aspect ratio (bias toward splitting
    # the longer dimension to avoid extreme slivers)
    if w > h * 1.3:
        split_horizontal = False
    elif h > w * 1.3:
        split_horizontal = True
    else:
        split_horizontal = random.random() < 0.5

    if split_horizontal:
        # Split top/bottom
        split_pos = random.uniform(max(min_size, h * 0.25), min(h - min_size, h * 0.75))
        rects.extend(subdivide(x, y, w, split_pos, depth + 1, max_depth, min_size, split_chance))
        rects.extend(subdivide(x, y + split_pos, w, h - split_pos, depth + 1, max_depth, min_size, split_chance))
    else:
        # Split left/right
        split_pos = random.uniform(max(min_size, w * 0.25), min(w - min_size, w * 0.75))
        rects.extend(subdivide(x, y, split_pos, h, depth + 1, max_depth, min_size, split_chance))
        rects.extend(subdivide(x + split_pos, y, w - split_pos, h, depth + 1, max_depth, min_size, split_chance))

    return rects


def hatch_fill(x, y, w, h, spacing, angle_deg=45):
    """Generate hatch lines within a rectangle at a given angle."""
    angle = math.radians(angle_deg)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    diag = math.sqrt(w ** 2 + h ** 2)

    lines = []
    offset = -diag / 2
    cx, cy = x + w / 2, y + h / 2

    while offset < diag / 2:
        # Line perpendicular to hatch angle
        px = cx + cos_a * 0 - sin_a * offset
        py = cy + sin_a * 0 + cos_a * offset
        x1 = px - cos_a * diag
        y1 = py - sin_a * diag
        x2 = px + cos_a * diag
        y2 = py + sin_a * diag

        # Clip to rectangle bounds
        clipped = _clip_line_to_rect(x1, y1, x2, y2, x, y, x + w, y + h)
        if clipped:
            lines.append(clipped)

        offset += spacing

    return lines


def _clip_line_to_rect(x1, y1, x2, y2, rx, ry, rx2, ry2):
    """Cohen-Sutherland line clipping to rectangle."""
    INSIDE, LEFT, RIGHT, BOTTOM, TOP = 0, 1, 2, 4, 8

    def outcode(x, y):
        code = INSIDE
        if x < rx: code |= LEFT
        elif x > rx2: code |= RIGHT
        if y < ry: code |= TOP
        elif y > ry2: code |= BOTTOM
        return code

    c1, c2 = outcode(x1, y1), outcode(x2, y2)
    for _ in range(20):
        if not (c1 | c2):
            return ((x1, y1), (x2, y2))
        if c1 & c2:
            return None
        c = c1 or c2
        if c & BOTTOM:
            x = x1 + (x2 - x1) * (ry2 - y1) / (y2 - y1) if y2 != y1 else x1
            y = ry2
        elif c & TOP:
            x = x1 + (x2 - x1) * (ry - y1) / (y2 - y1) if y2 != y1 else x1
            y = ry
        elif c & RIGHT:
            y = y1 + (y2 - y1) * (rx2 - x1) / (x2 - x1) if x2 != x1 else y1
            x = rx2
        elif c & LEFT:
            y = y1 + (y2 - y1) * (rx - x1) / (x2 - x1) if x2 != x1 else y1
            x = rx
        if c == c1:
            x1, y1, c1 = x, y, outcode(x, y)
        else:
            x2, y2, c2 = x, y, outcode(x, y)
    return None


def dot_fill(x, y, w, h, spacing, radius):
    """Generate dot positions within a rectangle on a grid."""
    dots = []
    dx = x + spacing / 2
    while dx < x + w:
        dy = y + spacing / 2
        while dy < y + h:
            dots.append((dx, dy, radius))
            dy += spacing
        dx += spacing
    return dots


def render_svg(rects, width, height, fill_chance, hatch_spacing,
               dot_spacing, dot_radius, line_width, output_path):
    """Render subdivided rectangles with fill patterns to SVG."""
    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{width}px", f"{height}px"),
        viewBox=f"0 0 {width} {height}",
    )
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    fill_types = ["hatch_45", "hatch_135", "crosshatch", "dots", "empty"]

    for (rx, ry, rw, rh) in rects:
        # Draw rectangle outline
        dwg.add(dwg.rect(
            insert=(rx, ry), size=(rw, rh),
            stroke="black", stroke_width=line_width, fill="none",
        ))

        # Maybe add a fill pattern
        if random.random() < fill_chance:
            fill_type = random.choice(fill_types[:-1])  # Exclude "empty"
        else:
            fill_type = "empty"

        if fill_type == "hatch_45":
            for (p1, p2) in hatch_fill(rx, ry, rw, rh, hatch_spacing, 45):
                dwg.add(dwg.line(start=p1, end=p2,
                                 stroke="black", stroke_width=line_width * 0.7))

        elif fill_type == "hatch_135":
            for (p1, p2) in hatch_fill(rx, ry, rw, rh, hatch_spacing, 135):
                dwg.add(dwg.line(start=p1, end=p2,
                                 stroke="black", stroke_width=line_width * 0.7))

        elif fill_type == "crosshatch":
            for (p1, p2) in hatch_fill(rx, ry, rw, rh, hatch_spacing, 45):
                dwg.add(dwg.line(start=p1, end=p2,
                                 stroke="black", stroke_width=line_width * 0.5))
            for (p1, p2) in hatch_fill(rx, ry, rw, rh, hatch_spacing, 135):
                dwg.add(dwg.line(start=p1, end=p2,
                                 stroke="black", stroke_width=line_width * 0.5))

        elif fill_type == "dots":
            for (dx, dy, dr) in dot_fill(rx, ry, rw, rh, dot_spacing, dot_radius):
                dwg.add(dwg.circle(center=(dx, dy), r=dr,
                                   fill="black", stroke="none"))

    dwg.save()
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Recursive subdivision generator")
    parser.add_argument("--output", "-o", default=None)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--max_depth", type=int, default=DEFAULT_MAX_DEPTH)
    parser.add_argument("--min_size", type=int, default=DEFAULT_MIN_SIZE)
    parser.add_argument("--split_chance", type=float, default=DEFAULT_SPLIT_CHANCE)
    parser.add_argument("--fill_chance", type=float, default=DEFAULT_FILL_CHANCE)
    parser.add_argument("--hatch_spacing", type=float, default=DEFAULT_HATCH_SPACING)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    parser.add_argument("--margin", type=int, default=DEFAULT_MARGIN)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "subdivide.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    margin = args.margin
    rects = subdivide(
        margin, margin,
        args.width - 2 * margin, args.height - 2 * margin,
        0, args.max_depth, args.min_size, args.split_chance,
    )

    render_svg(rects, args.width, args.height, args.fill_chance,
               args.hatch_spacing, DEFAULT_DOT_SPACING, DEFAULT_DOT_RADIUS,
               args.line_width, output)
    print(f"Generated {len(rects)} rectangles -> {output}")


if __name__ == "__main__":
    main()
