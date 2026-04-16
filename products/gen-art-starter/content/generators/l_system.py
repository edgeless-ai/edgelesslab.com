#!/usr/bin/env python3
"""
L-System Generator
==================
Generates fractal and plant-like structures using Lindenmayer systems.

An L-system is a formal grammar: you start with an axiom (a string), then
repeatedly apply production rules that replace characters with longer strings.
After N iterations, you interpret the result as drawing instructions using
turtle graphics.

Standard alphabet:
  F  = draw forward
  +  = turn left by angle
  -  = turn right by angle
  [  = push position/angle to stack (branch start)
  ]  = pop position/angle from stack (branch end)

Includes 5 presets: Koch curve, Sierpinski triangle, plant, dragon curve,
and Hilbert curve. Each produces a distinct visual character from the same
rendering engine.

Usage:
    python l_system.py
    python l_system.py --preset dragon --iterations 12
    python l_system.py --axiom "F" --rules "F=F+F-F-F+F" --angle 90 --iterations 4
"""

import argparse
import math
import os
import sys

import svgwrite

# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------
PRESETS = {
    "koch": {
        "axiom": "F",
        "rules": {"F": "F+F-F-F+F"},
        "angle": 90,
        "iterations": 4,
        "description": "Koch curve. Square snowflake variant.",
    },
    "sierpinski": {
        "axiom": "F-G-G",
        "rules": {"F": "F-G+F+G-F", "G": "GG"},
        "angle": 120,
        "iterations": 6,
        "description": "Sierpinski triangle. Recursive triangular subdivision.",
    },
    "plant": {
        "axiom": "X",
        "rules": {"X": "F+[[X]-X]-F[-FX]+X", "F": "FF"},
        "angle": 25,
        "iterations": 6,
        "description": "Botanical branching. Looks like a fern or small tree.",
    },
    "dragon": {
        "axiom": "FX",
        "rules": {"X": "X+YF+", "Y": "-FX-Y"},
        "angle": 90,
        "iterations": 12,
        "description": "Dragon curve. Space-filling fractal with 90-degree turns.",
    },
    "hilbert": {
        "axiom": "A",
        "rules": {"A": "-BF+AFA+FB-", "B": "+AF-BFB-FA+"},
        "angle": 90,
        "iterations": 6,
        "description": "Hilbert curve. Space-filling with excellent plotter coverage.",
    },
}

DEFAULT_STEP_LENGTH = 5.0
DEFAULT_LINE_WIDTH = 0.4


def expand(axiom, rules, iterations):
    """Apply production rules to the axiom for N iterations."""
    current = axiom
    for _ in range(iterations):
        next_str = []
        for ch in current:
            next_str.append(rules.get(ch, ch))
        current = "".join(next_str)
    return current


def interpret(instructions, angle_deg, step_length):
    """
    Interpret an L-system string as turtle graphics.
    Returns a list of line segments: [((x1,y1),(x2,y2)), ...]
    """
    angle_rad = math.radians(angle_deg)
    x, y = 0.0, 0.0
    heading = -math.pi / 2  # Start pointing up
    stack = []
    segments = []

    for ch in instructions:
        if ch in ("F", "G"):
            nx = x + math.cos(heading) * step_length
            ny = y + math.sin(heading) * step_length
            segments.append(((x, y), (nx, ny)))
            x, y = nx, ny
        elif ch == "f":
            # Move without drawing
            x += math.cos(heading) * step_length
            y += math.sin(heading) * step_length
        elif ch == "+":
            heading += angle_rad
        elif ch == "-":
            heading -= angle_rad
        elif ch == "[":
            stack.append((x, y, heading))
        elif ch == "]":
            if stack:
                x, y, heading = stack.pop()

    return segments


def fit_to_canvas(segments, width, height, margin):
    """Scale and translate segments to fit within the canvas."""
    if not segments:
        return segments

    all_x = [p[0] for seg in segments for p in seg]
    all_y = [p[1] for seg in segments for p in seg]

    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)

    data_w = max_x - min_x or 1
    data_h = max_y - min_y or 1

    canvas_w = width - 2 * margin
    canvas_h = height - 2 * margin
    scale = min(canvas_w / data_w, canvas_h / data_h)

    # Center in canvas
    offset_x = margin + (canvas_w - data_w * scale) / 2 - min_x * scale
    offset_y = margin + (canvas_h - data_h * scale) / 2 - min_y * scale

    fitted = []
    for (x1, y1), (x2, y2) in segments:
        fitted.append((
            (x1 * scale + offset_x, y1 * scale + offset_y),
            (x2 * scale + offset_x, y2 * scale + offset_y),
        ))

    return fitted


def render_svg(segments, width, height, line_width, output_path):
    """Render line segments to SVG."""
    dwg = svgwrite.Drawing(
        output_path,
        size=(f"{width}px", f"{height}px"),
        viewBox=f"0 0 {width} {height}",
    )
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    # Collect connected paths for fewer SVG elements
    if not segments:
        dwg.save()
        return output_path

    # Build polylines from consecutive connected segments
    paths = []
    current_path = [segments[0][0], segments[0][1]]

    for i in range(1, len(segments)):
        (_, prev_end) = segments[i - 1]
        (cur_start, cur_end) = segments[i]

        # If this segment continues from the last one, extend the path
        if abs(prev_end[0] - cur_start[0]) < 0.01 and abs(prev_end[1] - cur_start[1]) < 0.01:
            current_path.append(cur_end)
        else:
            paths.append(current_path)
            current_path = [cur_start, cur_end]

    paths.append(current_path)

    for path in paths:
        if len(path) >= 2:
            dwg.add(
                dwg.polyline(
                    points=path,
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
    parser = argparse.ArgumentParser(description="L-system generator")
    parser.add_argument("--output", "-o", default=None)
    parser.add_argument("--preset", choices=list(PRESETS.keys()), default="plant")
    parser.add_argument("--axiom", default=None, help="Override preset axiom")
    parser.add_argument("--rules", default=None,
                        help='Override rules as "F=F+F,G=GG"')
    parser.add_argument("--angle", type=float, default=None)
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--step_length", type=float, default=DEFAULT_STEP_LENGTH)
    parser.add_argument("--width", type=int, default=800)
    parser.add_argument("--height", type=int, default=800)
    parser.add_argument("--line_width", type=float, default=DEFAULT_LINE_WIDTH)
    parser.add_argument("--margin", type=int, default=40)
    args = parser.parse_args()

    # Load preset, allow overrides
    preset = PRESETS[args.preset]
    axiom = args.axiom or preset["axiom"]
    angle = args.angle if args.angle is not None else preset["angle"]
    iterations = args.iterations if args.iterations is not None else preset["iterations"]

    if args.rules:
        rules = {}
        for pair in args.rules.split(","):
            k, v = pair.split("=")
            rules[k.strip()] = v.strip()
    else:
        rules = preset["rules"]

    output = args.output or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "output",
        "l_system.svg",
    )
    os.makedirs(os.path.dirname(output), exist_ok=True)

    # Generate
    print(f"Preset: {args.preset} ({preset['description']})")
    instructions = expand(axiom, rules, iterations)
    print(f"String length after {iterations} iterations: {len(instructions)}")

    segments = interpret(instructions, angle, args.step_length)
    segments = fit_to_canvas(segments, args.width, args.height, args.margin)

    render_svg(segments, args.width, args.height, args.line_width, output)
    print(f"Generated {len(segments)} segments -> {output}")


if __name__ == "__main__":
    main()
