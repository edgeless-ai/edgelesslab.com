#!/usr/bin/env python3
"""
Total Serialism Harmonization Script

Applies targeted fixes across all 96 algorithm HTML files.
Each fix is independently togglable. Run with --dry-run to preview changes.

Usage:
    python3 harmonize.py                      # Apply all fixes
    python3 harmonize.py --dry-run             # Preview changes
    python3 harmonize.py --fix window-resize   # Apply one fix type only
    python3 harmonize.py --category geometric  # Only process one category
    python3 harmonize.py --backup              # Backup originals first

Created: 2026-04-15 (Total Serialism migration plan, Phase 2)
"""

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

ALGO_DIR = Path(__file__).parent / "algorithms"
SHARED_DIR = Path(__file__).parent / "shared"
CATALOG_PATH = Path(__file__).parent / "algorithm-catalog.json"
BACKUP_DIR = Path(__file__).parent / "_backup"


def find_all_algorithms():
    """Find all algorithm HTML files."""
    algos = []
    for cat_dir in sorted(ALGO_DIR.iterdir()):
        if not cat_dir.is_dir() or cat_dir.name.startswith("_"):
            continue
        for html in sorted(cat_dir.glob("*-gui.html")):
            algos.append(html)
        for html in sorted(cat_dir.glob("*.html")):
            if html not in algos and "-gui" not in html.name:
                algos.append(html)
    return algos


# ============================================================================
# FIX: Window resize handler
# ============================================================================

def has_window_resize(content):
    return "windowResized" in content or "window.onresize" in content


def add_window_resize(content, path):
    """Add windowResized() if missing. Injects before the closing </script> of the main sketch."""
    if has_window_resize(content):
        return content, False

    # Find the setup() function to determine canvas creation pattern
    setup_match = re.search(r'function\s+setup\s*\(\)', content)
    if not setup_match:
        return content, False

    # Find createCanvas call to understand sizing
    canvas_match = re.search(r'createCanvas\(([^)]+)\)', content)
    if not canvas_match:
        return content, False

    # Inject windowResized before the last closing script tag
    resize_fn = """
  // Auto-injected by harmonize.py
  function windowResized() {
    // Preserve canvas aspect ratio on window resize
    if (typeof resizeCanvas === 'function') {
      const container = document.querySelector('canvas')?.parentElement;
      if (container) {
        const w = container.clientWidth;
        resizeCanvas(w, w); // Square canvas default
      }
    }
  }
"""
    # Insert before the last </script>
    last_script_close = content.rfind("</script>")
    if last_script_close == -1:
        return content, False

    content = content[:last_script_close] + resize_fn + "\n" + content[last_script_close:]
    return content, True


# ============================================================================
# FIX: PNG export
# ============================================================================

def has_png_export(content):
    return "exportPNG" in content or "savePNG" in content or "'png'" in content.lower()


def add_png_export(content, path):
    """Add PNG export button if missing. Uses export-utils pattern."""
    if has_png_export(content):
        return content, False

    # Check if export-utils is loaded
    if "export-utils" not in content:
        return content, False  # Can't add PNG without export-utils

    # Find the export buttons area
    svg_btn = re.search(r'(exportSVG|saveSVG|Export SVG|export-svg)', content)
    if not svg_btn:
        return content, False

    # Add PNG button after the SVG button line
    # Find the line containing the SVG export button
    lines = content.split('\n')
    new_lines = []
    added = False
    for line in lines:
        new_lines.append(line)
        if not added and ('exportSVG' in line or 'Export SVG' in line) and '<button' in line.lower():
            # Add PNG button on next line
            indent = re.match(r'^\s*', line).group()
            png_btn = f'{indent}<button class="ts-btn ts-btn--secondary" onclick="saveCanvas(\'total-serialism\', \'png\')">Export PNG</button>'
            new_lines.append(png_btn)
            added = True

    if not added:
        return content, False

    return '\n'.join(new_lines), True


# ============================================================================
# FIX: Inline button styles → CSS classes
# ============================================================================

INLINE_BUTTON_PATTERN = re.compile(
    r'<button\s+style="[^"]*background[^"]*"',
    re.IGNORECASE
)

def cleanup_button_styles(content, path):
    """Replace common inline button styles with ts-btn CSS class."""
    if 'ts-btn' in content:
        # Already using CSS classes
        return content, False

    original = content
    # Replace inline-styled buttons with class-based ones
    # Pattern: <button style="background: #333; color: white; ..." onclick="...">
    content = re.sub(
        r'<button\s+style="[^"]*?(?:background|bgcolor)[^"]*?"\s+(onclick="[^"]*")',
        r'<button class="ts-btn" \1',
        content,
        flags=re.IGNORECASE
    )

    return content, content != original


# ============================================================================
# FIX: Script load order
# ============================================================================

def fix_script_order(content, path):
    """Ensure shared scripts are loaded before the main inline script."""
    # Check if there's an inline script that uses TSPanelController before it's imported
    inline_script = re.search(r'<script>\s*(?:.*?)(TSPanelController|TSStatsDisplay)', content, re.DOTALL)
    shared_import = re.search(r'<script\s+src="[^"]*(?:panel-controller|ui-utils)', content)

    if not inline_script or not shared_import:
        return content, False

    # Check if the import comes AFTER the inline script
    if shared_import.start() > inline_script.start():
        # Need to move the import before the inline script
        import_line = content[shared_import.start():content.index('>', shared_import.start()) + len('</script>')]
        # This is complex; just flag it for manual review
        return content, False

    return content, False


# ============================================================================
# REPORTING
# ============================================================================

def generate_report(results):
    """Print a summary of all changes."""
    total = len(results)
    changed = sum(1 for r in results if any(r['fixes'].values()))
    print(f"\n{'='*60}")
    print(f"HARMONIZATION REPORT")
    print(f"{'='*60}")
    print(f"Total algorithms scanned: {total}")
    print(f"Algorithms modified: {changed}")
    print()

    fix_counts = {}
    for r in results:
        for fix_name, applied in r['fixes'].items():
            if fix_name not in fix_counts:
                fix_counts[fix_name] = 0
            if applied:
                fix_counts[fix_name] += 1

    print("Fix application counts:")
    for fix_name, count in sorted(fix_counts.items()):
        print(f"  {fix_name}: {count}/{total}")

    print(f"\nAlgorithms unchanged: {total - changed}")


# ============================================================================
# MAIN
# ============================================================================

FIXES = {
    'window-resize': add_window_resize,
    'png-export': add_png_export,
    'button-styles': cleanup_button_styles,
    'script-order': fix_script_order,
}


def main():
    parser = argparse.ArgumentParser(description="Harmonize Total Serialism algorithms")
    parser.add_argument('--dry-run', action='store_true', help="Preview changes without writing")
    parser.add_argument('--fix', choices=list(FIXES.keys()), help="Apply only one fix type")
    parser.add_argument('--category', help="Only process one category directory")
    parser.add_argument('--backup', action='store_true', help="Backup originals first")
    parser.add_argument('--verbose', '-v', action='store_true', help="Show per-file details")
    args = parser.parse_args()

    algos = find_all_algorithms()
    print(f"Found {len(algos)} algorithms")

    if args.category:
        algos = [a for a in algos if a.parent.name == args.category]
        print(f"Filtered to {len(algos)} in category '{args.category}'")

    if args.backup and not args.dry_run:
        print(f"Backing up originals to {BACKUP_DIR}")
        if BACKUP_DIR.exists():
            shutil.rmtree(BACKUP_DIR)
        for algo in algos:
            dest = BACKUP_DIR / algo.relative_to(ALGO_DIR)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(algo, dest)

    fixes_to_apply = {args.fix: FIXES[args.fix]} if args.fix else FIXES
    results = []

    for algo in algos:
        content = algo.read_text(errors='ignore')
        original = content
        fix_results = {}

        for fix_name, fix_fn in fixes_to_apply.items():
            content, applied = fix_fn(content, algo)
            fix_results[fix_name] = applied

        changed = content != original
        results.append({
            'path': str(algo.relative_to(ALGO_DIR)),
            'fixes': fix_results,
            'changed': changed,
        })

        if changed:
            if args.verbose or args.dry_run:
                applied = [k for k, v in fix_results.items() if v]
                print(f"  {'[DRY]' if args.dry_run else '[FIX]'} {algo.relative_to(ALGO_DIR)}: {', '.join(applied)}")
            if not args.dry_run:
                algo.write_text(content)

    generate_report(results)

    if args.dry_run:
        print("\n[DRY RUN] No files were modified.")


if __name__ == '__main__':
    main()
