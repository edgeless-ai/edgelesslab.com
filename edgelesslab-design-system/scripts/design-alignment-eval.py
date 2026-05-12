#!/usr/bin/env python3
"""
AUTOREASON: Design Alignment Evaluator
Rubric-based scoring for Edgeless Lab Design System compliance.

Usage:
    python scripts/design-alignment-eval.py --component src/components/Input.tsx
    python scripts/design-alignment-eval.py --image public/courier/cyan-relay-v1.png
    python scripts/design-alignment-eval.py --all
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# === CANONICAL DESIGN TOKENS (source of truth) ===
TOKENS = {
    "colors": {
        "bg_primary": "#0a0a0a",
        "bg_secondary": "#111111",
        "bg_tertiary": "#1a1a1a",
        "bg_elevated": "#222222",
        "fg_primary": "#ffffff",
        "fg_secondary": "rgba(255,255,255,0.7)",
        "fg_tertiary": "rgba(255,255,255,0.5)",
        "fg_quaternary": "rgba(255,255,255,0.25)",
        "accent": "#6366f1",
        "accent_secondary": "#8b5cf6",
        "accent_tertiary": "#06b6d4",
        "success": "#22c55e",
        "warning": "#f59e0b",
        "error": "#ef4444",
        "info": "#3b82f6",
    },
    "fonts": {
        "sans": "Inter",
        "mono": "JetBrains Mono",
        "display": "Cal Sans",
    },
    "spacing_base": 4,
    "radius": {
        "sm": "0.25rem",
        "md": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
    },
    "motion": {
        "fast": "100ms",
        "normal": "200ms",
        "slow": "300ms",
    },
}

# === RUBRIC DEFINITIONS ===
COMPONENT_RUBRIC = {
    "token_color_usage": 0.30,
    "tailwind_utility_alignment": 0.25,
    "prop_interface_quality": 0.20,
    "accessibility_patterns": 0.15,
    "motion_consistency": 0.10,
}

IMAGE_RUBRIC = {
    "color_palette_match": 0.35,
    "typography_fidelity": 0.25,
    "aesthetic_alignment": 0.25,
    "brand_coherence": 0.15,
}


def score_component(path: Path) -> Dict:
    """Evaluate a React/TSX component against design tokens."""
    source = path.read_text()
    scores = {}
    notes = []

    # 1. Token color usage (30%) - check relevant tokens per component type
    token_hits = 0
    token_checks = []
    name = path.name.lower()
    
    # Smart detection: check for Tailwind token classes OR CSS utility references
    def _has_token(src, patterns):
        return any(p in src for p in patterns)
    
    if 'input' in name or 'select' in name:
        token_checks = [
            (["bg-background-secondary", "bg-background-primary"], "bg field"),
            (["border-border-default", "border-border-subtle", "border-border-strong"], "border"),
            (["text-foreground-primary", "text-foreground-secondary", "text-white"], "fg text"),
            (["text-foreground-quaternary", "placeholder:"], "placeholder"),
            (["focus:border-accent", "focus:ring-accent", "focus:outline-none"], "focus state"),
            (["disabled:opacity-50", "disabled:cursor-not-allowed"], "disabled"),
        ]
    elif 'modal' in name:
        token_checks = [
            (["bg-background-elevated", "bg-background-secondary"], "bg modal surface"),
            (["bg-background-primary/80", "bg-black/80"], "backdrop"),
            (["border-border-default", "border-border-subtle"], "border"),
            (["text-foreground-primary", "text-white", "text-foreground-secondary"], "fg text"),
            (["z-modal", "z-"], "z-index"),
            (["backdrop-blur"], "backdrop blur"),
        ]
    elif 'toast' in name:
        token_checks = [
            (["bg-background-secondary", "bg-background-tertiary"], "bg toast"),
            (["text-foreground-primary", "text-white"], "fg message"),
            (["text-foreground-secondary"], "fg desc"),
            (["border-accent/20", "border-success/20", "border-error/20", "border-warning/20"], "semantic border"),
            (["z-toast", "z-"], "z-index"),
        ]
    elif 'button' in name:
        token_checks = [
            (["bg-accent", "btn-primary", "bg-background-elevated", "btn-secondary"], "bg token"),
            (["text-white", "text-foreground-primary", "text-foreground-secondary"], "fg token"),
            (["border-border-default", "border-error/20"], "border token"),
            (["hover:bg-accent/90", "hover:bg-background-tertiary", "hover:text-foreground-primary"], "hover state"),
        ]
    elif 'card' in name:
        token_checks = [
            (["bg-background-elevated", "bg-background-secondary", "bg-background-tertiary"], "bg token"),
            (["border-border-default", "border-border-subtle", "border-border-strong"], "border token"),
            (["hover:-translate-y-1", "hover:shadow-lg", "transition-all"], "motion"),
        ]
    elif 'badge' in name:
        token_checks = [
            (["bg-accent/10", "bg-success/10", "bg-error/10", "bg-warning/10", "bg-background-tertiary"], "bg variant"),
            (["text-accent", "text-success", "text-error", "text-warning", "text-foreground-tertiary"], "fg variant"),
            (["border-accent/20", "border-success/20"], "border variant"),
            (["rounded-full"], "radius"),
        ]
    else:
        token_checks = [
            (["bg-background", "bg-accent", "bg-background-secondary"], "bg token"),
            (["text-foreground", "text-white", "text-accent"], "fg token"),
            (["border-border", "border-accent"], "border token"),
        ]
    
    for patterns, desc in token_checks:
        if _has_token(source, patterns):
            token_hits += 1
        else:
            notes.append(f"Missing: {desc}")

    # Also check for raw hex usage that should be tokens
    raw_hex_violations = []
    hex_pattern = re.compile(r"['\"](#[0-9a-fA-F]{6})['\"]")
    for match in hex_pattern.finditer(source):
        hex_val = match.group(1).lower()
        if hex_val in [v.lower() for v in TOKENS["colors"].values() if v.startswith("#")]:
            raw_hex_violations.append(hex_val)
    if raw_hex_violations:
        notes.append(f"Raw hex usage (should use tokens): {set(raw_hex_violations)}")

    scores["token_color_usage"] = min(token_hits / max(len(token_checks) * 0.5, 1), 1.0)

    # 2. Tailwind utility alignment (25%)
    utility_hits = 0
    utility_checks = [
        "rounded-", "px-", "py-", "gap-", "transition", "duration-",
        "hover:", "focus:", "active:", "disabled:", "cursor-",
    ]
    for util in utility_checks:
        if util in source:
            utility_hits += 1
    scores["tailwind_utility_alignment"] = utility_hits / len(utility_checks)

    # 3. Prop interface quality (20%)
    has_interface = "interface" in source and "Props" in source
    has_forward_ref = "forwardRef" in source
    has_display_name = "displayName" in source
    has_defaults = "=" in source and "default" in source.lower()
    prop_score = sum([has_interface, has_forward_ref, has_display_name]) / 3
    scores["prop_interface_quality"] = prop_score
    if not has_interface:
        notes.append("Missing Props interface")
    if not has_forward_ref:
        notes.append("Missing forwardRef")

    # 4. Accessibility patterns (15%)
    a11y_hits = 0
    a11y_checks = [
        "aria-", "role=", "disabled", "tabIndex", "htmlFor",
        "focus-visible", "screen-reader", "sr-only",
    ]
    for check in a11y_checks:
        if check in source:
            a11y_hits += 1
    scores["accessibility_patterns"] = min(a11y_hits / 3, 1.0)

    # 5. Motion consistency (10%)
    motion_hits = 0
    motion_checks = ["duration-normal", "duration-fast", "duration-slow", "ease-out", "ease-in"]
    for check in motion_checks:
        if check in source:
            motion_hits += 1
    scores["motion_consistency"] = motion_hits / len(motion_checks)

    # Weighted total
    total = sum(scores[k] * COMPONENT_RUBRIC[k] for k in COMPONENT_RUBRIC)

    return {
        "file": str(path),
        "type": "component",
        "scores": scores,
        "weighted_total": round(total, 3),
        "grade": _grade(total),
        "notes": notes,
    }


def score_image(path: Path, prompt_source: str = None) -> Dict:
    """Evaluate a generated image for design alignment.
    Uses prompt fidelity + metadata. Tries to read .prompt.txt next to image."""
    scores = {}
    notes = []

    # Try to read prompt from sidecar file
    prompt_file = path.with_suffix('').with_suffix('.prompt.txt')
    if not prompt_file.exists():
        prompt_file = path.parent / (path.stem + '.prompt.txt')
    if prompt_file.exists():
        prompt_source = prompt_file.read_text()

    if prompt_source:
        prompt_lower = prompt_source.lower()
        color_hits = 0
        color_checks = [
            ("#0a0a0a", "void black"),
            ("#6366f1", "indigo accent"),
            ("#06b6d4", "cyan accent"),
            ("#8b5cf6", "violet accent"),
            ("#ffffff", "white foreground"),
        ]
        for hex_val, desc in color_checks:
            if hex_val in prompt_source or desc in prompt_lower:
                color_hits += 1
            else:
                notes.append(f"Prompt missing: {desc} ({hex_val})")
        scores["color_palette_match"] = color_hits / len(color_checks)

        font_hits = 0
        for font in ["inter", "jetbrains mono", "courier", "monospace"]:
            if font in prompt_lower:
                font_hits += 1
        scores["typography_fidelity"] = min(font_hits / 2, 1.0)

        aesthetic_hits = 0
        aesthetic_checks = [
            "minimal", "dark", "high contrast", "futuristic",
            "geometric", "grid", "swiss", "brutalist",
        ]
        for term in aesthetic_checks:
            if term in prompt_lower:
                aesthetic_hits += 1
        scores["aesthetic_alignment"] = min(aesthetic_hits / 3, 1.0)

        brand_hits = 0
        brand_checks = ["edgeless", "courier", "signal", "swarm", "agent"]
        for term in brand_checks:
            if term in prompt_lower:
                brand_hits += 1
        scores["brand_coherence"] = min(brand_hits / 2, 1.0)
    else:
        # No prompt available — flag for manual review
        scores = {k: 0.0 for k in IMAGE_RUBRIC}
        notes.append("No generation prompt available for fidelity scoring")

    total = sum(scores[k] * IMAGE_RUBRIC[k] for k in IMAGE_RUBRIC)

    return {
        "file": str(path),
        "type": "image",
        "scores": scores,
        "weighted_total": round(total, 3),
        "grade": _grade(total),
        "notes": notes,
    }


def _grade(score: float) -> str:
    if score >= 0.90:
        return "S"
    if score >= 0.80:
        return "A"
    if score >= 0.70:
        return "B"
    if score >= 0.60:
        return "C"
    if score >= 0.50:
        return "D"
    return "F"


def run_all(project_root: Path) -> List[Dict]:
    """Evaluate all components and images in the project."""
    results = []

    # Components
    components_dir = project_root / "src" / "components"
    if components_dir.exists():
        for f in sorted(components_dir.glob("*.tsx")):
            results.append(score_component(f))

    # Images — scan all asset directories
    for asset_dir_name in ["courier", "originals", "flora-v2"]:
        asset_dir = project_root / "public" / asset_dir_name
        if asset_dir.exists():
            for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
                for f in sorted(asset_dir.glob(ext)):
                    results.append(score_image(f))

    return results


def print_report(results: List[Dict]):
    print("=" * 70)
    print("AUTOREASON: Design Alignment Report")
    print("=" * 70)

    components = [r for r in results if r["type"] == "component"]
    images = [r for r in results if r["type"] == "image"]

    if components:
        print(f"\n📦 COMPONENTS ({len(components)})")
        print("-" * 50)
        for r in components:
            name = Path(r["file"]).name
            print(f"  {name:25} | {r['grade']:>2} | {r['weighted_total']:.2f}")
            if r["notes"]:
                for note in r["notes"][:3]:
                    print(f"    ⚠️  {note}")

    if images:
        print(f"\n🖼️  IMAGES ({len(images)})")
        print("-" * 50)
        for r in images:
            name = Path(r["file"]).name
            print(f"  {name:35} | {r['grade']:>2} | {r['weighted_total']:.2f}")
            if r["notes"]:
                for note in r["notes"][:2]:
                    print(f"    ⚠️  {note}")

    all_totals = [r["weighted_total"] for r in results]
    if all_totals:
        avg = sum(all_totals) / len(all_totals)
        print(f"\n📊 OVERALL: {avg:.2f} average | {len([x for x in all_totals if x >= 0.80])}/{len(all_totals)} ≥ A-grade")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Design alignment evaluator")
    parser.add_argument("--component", help="Path to component file")
    parser.add_argument("--image", help="Path to image file")
    parser.add_argument("--all", action="store_true", help="Evaluate entire project")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    root = Path(__file__).parent.parent

    if args.component:
        result = score_component(Path(args.component))
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_report([result])
    elif args.image:
        result = score_image(Path(args.image))
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_report([result])
    elif args.all:
        results = run_all(root)
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print_report(results)
    else:
        results = run_all(root)
        print_report(results)


if __name__ == "__main__":
    main()
