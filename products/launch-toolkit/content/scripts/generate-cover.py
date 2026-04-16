#!/usr/bin/env python3
"""
generate-cover.py -- Create a minimal product cover image (1280x1280 PNG).

Usage:
    python3 generate-cover.py "Product Name" --color "#4A90D9" --output cover.png
    python3 generate-cover.py "API Boilerplate Kit" --color "#2ECC71"

Requires: pip install Pillow
"""

import argparse
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)


def hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def generate_cover(
    product_name: str,
    accent_color: str = "#4A90D9",
    brand_name: str = "Edgeless Labs",
    output_path: str = "cover.png",
    size: int = 1280,
):
    bg_color = (18, 18, 22)
    accent_rgb = hex_to_rgb(accent_color)

    img = Image.new("RGB", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Accent bar at top
    bar_height = 6
    draw.rectangle([0, 0, size, bar_height], fill=accent_rgb)

    # Try to load a clean font, fall back to default
    title_size = size // 14
    brand_size = size // 28

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", title_size)
        brand_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", brand_size)
    except (OSError, IOError):
        try:
            title_font = ImageFont.truetype("arial.ttf", title_size)
            brand_font = ImageFont.truetype("arial.ttf", brand_size)
        except (OSError, IOError):
            title_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()

    # Word-wrap product name
    words = product_name.split()
    lines = []
    current_line = ""
    max_width = size * 0.75

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=title_font)
        if bbox[2] - bbox[0] > max_width and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)

    # Calculate vertical position (centered, slightly above middle)
    line_height = title_size * 1.3
    total_text_height = len(lines) * line_height
    y_start = (size - total_text_height) / 2 - size * 0.05

    # Draw product name
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        x = (size - text_width) / 2
        y = y_start + i * line_height
        draw.text((x, y), line, fill=(245, 245, 245), font=title_font)

    # Draw accent line below title
    line_y = y_start + len(lines) * line_height + 20
    line_width = size * 0.15
    draw.rectangle(
        [(size - line_width) / 2, line_y, (size + line_width) / 2, line_y + 3],
        fill=accent_rgb,
    )

    # Draw brand name below accent line
    bbox = draw.textbbox((0, 0), brand_name, font=brand_font)
    brand_width = bbox[2] - bbox[0]
    brand_x = (size - brand_width) / 2
    brand_y = line_y + 30
    draw.text((brand_x, brand_y), brand_name, fill=(160, 160, 160), font=brand_font)

    img.save(output_path, "PNG")
    print(f"Cover saved to {output_path} ({size}x{size})")


def main():
    parser = argparse.ArgumentParser(description="Generate a minimal product cover image.")
    parser.add_argument("name", help="Product name (displayed on cover)")
    parser.add_argument("--color", default="#4A90D9", help="Accent color as hex (default: #4A90D9)")
    parser.add_argument("--brand", default="Edgeless Labs", help="Brand name (default: Edgeless Labs)")
    parser.add_argument("--output", default="cover.png", help="Output file path (default: cover.png)")
    parser.add_argument("--size", type=int, default=1280, help="Image size in pixels (default: 1280)")

    args = parser.parse_args()
    generate_cover(args.name, args.color, args.brand, args.output, args.size)


if __name__ == "__main__":
    main()
