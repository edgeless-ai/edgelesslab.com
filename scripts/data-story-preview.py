#!/usr/bin/env python3
"""Render public aggregate JSON into a static poster + looping mobile preview.

Run from the repository root: python3 scripts/data-story-preview.py
Requires matplotlib and Pillow. Never reads the private ledger.
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/data-stories/kanban-crash-wave"
rows = json.loads((DEST / "daily.json").read_text())["rows"]
shares = [100 * row["crashed"] / row["runs"] for row in rows]
frames = []
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 18})
for i, row in enumerate(rows):
    fig, ax = plt.subplots(figsize=(6.4, 6.4), dpi=100)
    fig.patch.set_facecolor("#10171b")
    ax.set_facecolor("#10171b")
    fig.subplots_adjust(left=.13, right=.95, top=.68, bottom=.28)
    fig.text(.08, .94, "The crash wave", color="#f1f3ef", fontsize=26, weight="bold")
    fig.text(.08, .87, f"{row['day']} UTC · {shares[i]:.1f}%", color="#a3d9bc", fontsize=21)
    fig.text(.08, .81, f"{row['crashed']:,} crashed / {row['runs']:,} run attempts", color="#d1dbd5", fontsize=18)
    fig.text(.13, .73, "Recorded crash share (%)", color="#d1dbd5", fontsize=16)
    ax.plot(range(len(rows)), shares, color="#87958c", linewidth=2)
    ax.plot(range(i + 1), shares[:i + 1], color="#a3d9bc", linewidth=4)
    ax.plot(i, shares[i], "o", markersize=10, color="#a3d9bc")
    ax.axvline(i, color="#a3d9bc", linewidth=1, alpha=.6)
    ax.set_ylim(0, 100)
    ax.set_xlim(-.2, len(rows) - .8)
    ax.set_yticks([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])
    tick_indices = [0, 2, 4, 6, 9]
    ax.set_xticks(tick_indices, ["Oct " + rows[t]["day"][-2:].lstrip("0") for t in tick_indices])
    ax.tick_params(colors="#d1dbd5", length=0, pad=10, labelsize=15)
    ax.grid(axis="y", color="#53615b", alpha=.4, linewidth=.8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.text(.08, .16, "Mint: through selected day · grey: full window", color="#d1dbd5", fontsize=13)
    fig.text(.08, .105, "UTC start-day cohorts · Not measured downtime", color="#d1dbd5", fontsize=13)
    fig.text(.08, .045, "Source: Edgeless aggregate run ledger", color="#d1dbd5", fontsize=13)
    fig.canvas.draw()
    frame = Image.frombuffer("RGBA", fig.canvas.get_width_height(), fig.canvas.buffer_rgba()).convert("RGB").copy()
    frames.append(frame)
    if i == 4:
        frame.save(DEST / "poster.png", optimize=True)
    plt.close(fig)
frames[0].save(DEST / "preview.gif", save_all=True, append_images=frames[1:], duration=[650] * (len(frames) - 1) + [1800], loop=0, optimize=True)
print(f"Rendered {len(frames)} source-derived frames: {DEST / 'poster.png'}, {DEST / 'preview.gif'}")
