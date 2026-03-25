#!/usr/bin/env python3
"""
Edgeless Website Autoresearch Scorer
Karpathy-style: one mutable codebase + multi-axis scoring + ratcheting

Scores the built static site across 8 dimensions by analyzing HTML output.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from collections import defaultdict

SITE_DIR = Path(__file__).parent.parent
OUT_DIR = SITE_DIR / "out"
RESULTS_FILE = Path(__file__).parent / "results.tsv"

# All known routes
ROUTES = [
    "/", "/products", "/projects", "/about", "/blog", "/lab",
    "/privacy", "/terms",
    "/projects/pamela", "/projects/mcp-servers", "/projects/pen-plotter-art",
    "/projects/knowledge-api", "/projects/llm-client", "/projects/mastra-orchestrator",
    "/lab/strange-attractors", "/lab/knowledge-graph", "/lab/total-serialism",
    "/lab/tartanism",
]

# Forbidden patterns in production code
FORBIDDEN_PATTERNS = [
    r"console\.log\(",  # debug logging
    r"TODO\b",  # unfinished work
    r"FIXME\b",
    r"localhost:\d+",  # hardcoded local URLs
    r"password\s*=\s*['\"]",  # hardcoded passwords
]

WEIGHTS = {
    "SEO": 0.15,
    "PERF": 0.15,
    "A11Y": 0.15,
    "UX": 0.15,
    "SECURITY": 0.10,
    "CODE": 0.10,
    "CONTENT": 0.10,
    "MOBILE": 0.10,
}


def build_site():
    """Build the Next.js static export."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=SITE_DIR,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        print(f"BUILD FAILED:\n{result.stderr[-500:]}")
        return False
    return True


def read_html(route: str) -> str:
    """Read the HTML file for a given route."""
    if route == "/":
        path = OUT_DIR / "index.html"
    else:
        path = OUT_DIR / route.strip("/") / "index.html"
    if path.exists():
        return path.read_text()
    return ""


def read_all_source() -> dict[str, str]:
    """Read all .tsx/.ts source files."""
    sources = {}
    src_dir = SITE_DIR / "src"
    for ext in ("*.tsx", "*.ts"):
        for f in src_dir.rglob(ext):
            sources[str(f.relative_to(SITE_DIR))] = f.read_text()
    return sources


def count_js_size() -> int:
    """Total JS bundle size in bytes."""
    chunks_dir = OUT_DIR / "_next" / "static" / "chunks"
    if not chunks_dir.exists():
        return 999999
    total = sum(f.stat().st_size for f in chunks_dir.glob("*.js"))
    return total


def count_css_size() -> int:
    """Total CSS size in bytes."""
    chunks_dir = OUT_DIR / "_next" / "static" / "chunks"
    if not chunks_dir.exists():
        return 999999
    total = sum(f.stat().st_size for f in chunks_dir.glob("*.css"))
    return total


# ── SCORING FUNCTIONS ──


def score_seo(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score SEO signals across all pages."""
    issues = []
    points = 0
    max_points = 0

    for route, html in pages.items():
        if not html:
            issues.append(f"MISSING: {route} has no HTML output")
            continue

        # Title tag
        max_points += 1
        title_match = re.search(r"<title>([^<]+)</title>", html)
        if title_match:
            title = title_match.group(1)
            if len(title) <= 60 and title != "":
                points += 1
            else:
                issues.append(f"TITLE_LENGTH: {route} title is {len(title)} chars (max 60)")
        else:
            issues.append(f"NO_TITLE: {route} missing title tag")

        # Meta description
        max_points += 1
        desc_match = re.search(r'<meta name="description" content="([^"]*)"', html)
        if desc_match:
            desc = desc_match.group(1)
            if 50 <= len(desc) <= 160:
                points += 1
            elif len(desc) > 160:
                issues.append(f"DESC_LONG: {route} description is {len(desc)} chars")
            elif len(desc) < 50:
                issues.append(f"DESC_SHORT: {route} description is only {len(desc)} chars")
        else:
            issues.append(f"NO_DESC: {route} missing meta description")

        # Canonical URL
        max_points += 1
        if 'rel="canonical"' in html:
            points += 1
        else:
            issues.append(f"NO_CANONICAL: {route} missing canonical URL")

        # OG tags
        max_points += 1
        og_tags = ["og:title", "og:description", "og:image", "og:url"]
        og_found = sum(1 for tag in og_tags if f'property="{tag}"' in html)
        if og_found == 4:
            points += 1
        else:
            missing = [t for t in og_tags if f'property="{t}"' not in html]
            issues.append(f"OG_MISSING: {route} missing {', '.join(missing)}")

        # Twitter card
        max_points += 1
        if 'name="twitter:card"' in html:
            points += 1
        else:
            issues.append(f"NO_TWITTER: {route} missing twitter:card")

        # H1 tag (exactly one)
        max_points += 1
        h1_count = html.count("<h1")
        if h1_count == 1:
            points += 1
        elif h1_count == 0:
            issues.append(f"NO_H1: {route} has no h1 tag")
        else:
            issues.append(f"MULTI_H1: {route} has {h1_count} h1 tags")

    # Global checks
    max_points += 2
    # Sitemap
    sitemap_path = OUT_DIR / "sitemap.xml"
    if sitemap_path.exists():
        sitemap = sitemap_path.read_text()
        points += 1
        # Check coverage
        for route in ROUTES[:8]:  # main routes
            url = f"https://edgelesslab.com{route}"
            if route == "/":
                url = "https://edgelesslab.com"
            if url not in sitemap and f"{url}/" not in sitemap:
                issues.append(f"SITEMAP_MISSING: {route} not in sitemap.xml")
    else:
        issues.append("NO_SITEMAP: sitemap.xml missing")

    # Robots.txt
    robots_path = OUT_DIR / "robots.txt"
    if robots_path.exists():
        points += 1
    else:
        issues.append("NO_ROBOTS: robots.txt missing")

    # JSON-LD
    max_points += 1
    home_html = pages.get("/", "")
    if "application/ld+json" in home_html:
        points += 1
    else:
        issues.append("NO_JSONLD: homepage missing structured data")

    score = (points / max_points * 10) if max_points > 0 else 0
    return round(score, 2), issues


def score_perf(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score performance signals."""
    issues = []
    score = 10.0

    # JS bundle size (target: under 300KB)
    js_size = count_js_size()
    js_kb = js_size / 1024
    if js_kb > 500:
        score -= 3
        issues.append(f"JS_HUGE: {js_kb:.0f}KB total JS (target <300KB)")
    elif js_kb > 300:
        score -= 1.5
        issues.append(f"JS_LARGE: {js_kb:.0f}KB total JS (target <300KB)")
    elif js_kb > 200:
        score -= 0.5

    # CSS size (target: under 50KB)
    css_size = count_css_size()
    css_kb = css_size / 1024
    if css_kb > 100:
        score -= 2
        issues.append(f"CSS_LARGE: {css_kb:.0f}KB total CSS")
    elif css_kb > 50:
        score -= 1

    # Font preloading
    home = pages.get("/", "")
    if 'rel="preload"' in home and 'as="font"' in home:
        pass  # good
    else:
        score -= 1
        issues.append("NO_FONT_PRELOAD: fonts not preloaded")

    # Number of JS chunks (more = more HTTP requests on first load)
    chunks_dir = OUT_DIR / "_next" / "static" / "chunks"
    if chunks_dir.exists():
        js_count = len(list(chunks_dir.glob("*.js")))
        if js_count > 30:
            score -= 1
            issues.append(f"MANY_CHUNKS: {js_count} JS chunks")

    # Image optimization (check for .webp or next/image usage in source)
    sources = read_all_source()
    uses_next_image = any("next/image" in src for src in sources.values())
    if not uses_next_image:
        score -= 1
        issues.append("NO_NEXT_IMAGE: not using next/image for optimization")

    # Third-party scripts (beyond PostHog)
    third_party = []
    for route, html in pages.items():
        for domain in ["google-analytics", "facebook", "hotjar", "intercom", "drift"]:
            if domain in html:
                third_party.append(domain)
    if third_party:
        score -= 0.5 * len(set(third_party))
        issues.append(f"THIRD_PARTY: {', '.join(set(third_party))}")

    return round(max(0, score), 2), issues


def score_a11y(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score accessibility signals."""
    issues = []
    score = 10.0

    home = pages.get("/", "")

    # lang attribute
    if 'lang="en"' not in home:
        score -= 2
        issues.append("NO_LANG: html element missing lang attribute")

    # Viewport meta
    if 'name="viewport"' not in home:
        score -= 2
        issues.append("NO_VIEWPORT: missing viewport meta tag")

    # Skip to content link
    has_skip = False
    for html in pages.values():
        if "skip" in html.lower() and ("main" in html.lower() or "content" in html.lower()):
            if 'href="#' in html:
                has_skip = True
                break
    if not has_skip:
        score -= 1
        issues.append("NO_SKIP_LINK: no skip-to-content link found")

    # Heading hierarchy check
    for route, html in pages.items():
        if not html:
            continue
        headings = re.findall(r"<h(\d)", html)
        if headings:
            levels = [int(h) for h in headings]
            for i in range(1, len(levels)):
                if levels[i] > levels[i - 1] + 1:
                    score -= 0.25
                    issues.append(f"HEADING_SKIP: {route} jumps from h{levels[i-1]} to h{levels[i]}")
                    break

    # Form labels
    sources = read_all_source()
    for fname, src in sources.items():
        input_count = src.count("<input") + src.count("<Input")
        label_count = src.count("<label") + src.count("<Label") + src.count("aria-label") + src.count("htmlFor")
        if input_count > 0 and label_count < input_count:
            score -= 0.5
            issues.append(f"MISSING_LABELS: {fname} has {input_count} inputs but only {label_count} labels/aria-labels")

    # Alt text on images
    for fname, src in sources.items():
        img_matches = re.findall(r'<(?:img|Image)[^>]*>', src)
        for img in img_matches:
            if 'alt=' not in img and 'alt =' not in img:
                score -= 0.25
                issues.append(f"NO_ALT: {fname} has image without alt text")

    # Focus styles (check CSS for :focus or :focus-visible)
    css_files = list((OUT_DIR / "_next" / "static" / "chunks").glob("*.css")) if (OUT_DIR / "_next" / "static" / "chunks").exists() else []
    has_focus = False
    for css_file in css_files:
        content = css_file.read_text()
        if ":focus" in content or ":focus-visible" in content:
            has_focus = True
            break
    if not has_focus:
        score -= 1
        issues.append("NO_FOCUS_STYLES: no :focus or :focus-visible styles found")

    # ARIA landmarks
    has_nav = any("<nav" in html for html in pages.values())
    has_main = any("<main" in html for html in pages.values())
    has_footer = any("<footer" in html for html in pages.values())
    if not has_nav:
        score -= 0.5
        issues.append("NO_NAV_LANDMARK: no <nav> element found")
    if not has_main:
        score -= 0.5
        issues.append("NO_MAIN_LANDMARK: no <main> element found")
    if not has_footer:
        score -= 0.5
        issues.append("NO_FOOTER_LANDMARK: no <footer> element found")

    return round(max(0, score), 2), issues


def score_ux(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score UX signals by analyzing component structure."""
    issues = []
    score = 10.0
    sources = read_all_source()

    # CTA visibility on homepage
    home_src = ""
    for fname, src in sources.items():
        if "home-client" in fname or ("app/page" in fname and "export default" in src):
            home_src += src

    if home_src:
        # Check for prominent CTA
        cta_patterns = ["Get Started", "View Products", "Browse", "Try Free", "Sign Up", "Subscribe"]
        cta_found = sum(1 for p in cta_patterns if p.lower() in home_src.lower())
        if cta_found == 0:
            score -= 2
            issues.append("NO_CTA: homepage has no clear call-to-action")
        elif cta_found < 2:
            score -= 0.5
            issues.append("WEAK_CTA: homepage could use stronger CTAs")

    # Products page - pricing clarity
    products_src = ""
    for fname, src in sources.items():
        if "products/page" in fname:
            products_src = src

    if products_src:
        price_count = products_src.count("price")
        if price_count < 2:
            score -= 1
            issues.append("UNCLEAR_PRICING: products page may lack clear pricing")

        # Check for "Free" product positioning
        if '"Free"' in products_src:
            free_idx = products_src.index('"Free"')
            # Free should be last or clearly marked
            pass  # acceptable positioning

    # Navigation completeness
    nav_src = ""
    for fname, src in sources.items():
        if "nav" in fname.lower() and "component" in fname.lower():
            nav_src = src
        elif "nav.tsx" in fname:
            nav_src = src

    if nav_src:
        expected_links = ["products", "projects", "lab", "blog"]
        for link in expected_links:
            if link.lower() not in nav_src.lower():
                score -= 0.5
                issues.append(f"NAV_MISSING: '{link}' not in navigation")

    # Footer completeness
    footer_src = ""
    for fname, src in sources.items():
        if "footer" in fname.lower():
            footer_src = src

    if footer_src:
        expected_footer = ["privacy", "terms", "github", "gumroad"]
        for item in expected_footer:
            if item.lower() not in footer_src.lower():
                score -= 0.25
                issues.append(f"FOOTER_MISSING: '{item}' not in footer")

    # 404 page
    four_oh_four = OUT_DIR / "404.html"
    if not four_oh_four.exists():
        score -= 1
        issues.append("NO_404: custom 404 page missing")

    # Social proof indicators
    social_proof_patterns = ["testimonial", "review", "stars", "users", "downloads", "trusted"]
    has_social_proof = any(
        any(p in src.lower() for p in social_proof_patterns)
        for src in sources.values()
    )
    if not has_social_proof:
        score -= 0.5
        issues.append("NO_SOCIAL_PROOF: no testimonials/reviews/trust signals found")

    return round(max(0, score), 2), issues


def score_security(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score security signals."""
    issues = []
    score = 10.0
    sources = read_all_source()

    # External links safety
    for fname, src in sources.items():
        ext_links = re.findall(r'href="https?://[^"]*"', src)
        for link in ext_links:
            if "edgelesslab.com" not in link and "edgeless-ai" not in link:
                # External link should have noopener noreferrer
                # Find the full anchor tag
                link_idx = src.index(link)
                context = src[max(0, link_idx - 200):link_idx + len(link) + 100]
                if 'target="_blank"' in context:
                    if "noopener" not in context or "noreferrer" not in context:
                        score -= 0.25
                        issues.append(f"UNSAFE_LINK: {fname} external link missing noopener/noreferrer")

    # Forbidden patterns in source
    for fname, src in sources.items():
        for pattern in FORBIDDEN_PATTERNS:
            matches = re.findall(pattern, src)
            if matches:
                score -= 0.5
                issues.append(f"FORBIDDEN: {fname} contains '{pattern}' ({len(matches)} matches)")

    # Check for exposed secrets in built output
    for js_file in (OUT_DIR / "_next" / "static" / "chunks").glob("*.js") if (OUT_DIR / "_next" / "static" / "chunks").exists() else []:
        content = js_file.read_text()
        # PostHog key is intentionally public (NEXT_PUBLIC_), skip it
        secret_patterns = [
            r"sk-[a-zA-Z0-9]{20,}",  # OpenAI keys
            r"ghp_[a-zA-Z0-9]{36}",  # GitHub PATs
            r"ANTHROPIC_API_KEY",
        ]
        for pattern in secret_patterns:
            if re.search(pattern, content):
                score -= 5
                issues.append(f"EXPOSED_SECRET: {js_file.name} contains potential secret matching {pattern}")

    # Privacy page mentions analytics
    privacy_html = pages.get("/privacy", "")
    if privacy_html:
        if "posthog" not in privacy_html.lower() and "analytics" not in privacy_html.lower():
            score -= 1
            issues.append("PRIVACY_GAP: privacy page doesn't mention analytics/PostHog")

    # Source maps exposed
    source_maps = list((OUT_DIR / "_next" / "static" / "chunks").glob("*.js.map")) if (OUT_DIR / "_next" / "static" / "chunks").exists() else []
    if source_maps:
        score -= 0.5
        issues.append(f"SOURCE_MAPS: {len(source_maps)} source maps exposed in production")

    return round(max(0, score), 2), issues


def score_code(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score code quality."""
    issues = []
    score = 10.0
    sources = read_all_source()

    # TypeScript 'any' usage
    any_count = 0
    for fname, src in sources.items():
        matches = re.findall(r": any\b|as any\b|<any>", src)
        any_count += len(matches)
        if matches:
            issues.append(f"ANY_TYPE: {fname} uses 'any' {len(matches)} times")
    if any_count > 5:
        score -= 2
    elif any_count > 0:
        score -= 0.5 * any_count

    # Console.log in production code
    for fname, src in sources.items():
        if "console.log" in src and "test" not in fname.lower():
            score -= 0.5
            issues.append(f"CONSOLE_LOG: {fname} has console.log")

    # Unused imports (basic check)
    for fname, src in sources.items():
        imports = re.findall(r'import\s+\{([^}]+)\}', src)
        for imp_group in imports:
            for imp in imp_group.split(","):
                name = imp.strip().split(" as ")[-1].strip()
                if name and src.count(name) == 1:  # only appears in import
                    score -= 0.1
                    issues.append(f"UNUSED_IMPORT: {fname} imports '{name}' but never uses it")

    # Component file count (too many = hard to maintain)
    component_count = sum(1 for f in sources if "components/" in f)
    if component_count > 30:
        score -= 0.5
        issues.append(f"MANY_COMPONENTS: {component_count} component files")

    # Data centralization (check for duplicated product/project data)
    data_files = [f for f in sources if "data" in f.lower()]
    if not data_files:
        # Check if data is inline in page files
        inline_data = sum(1 for f, s in sources.items() if "page.tsx" in f and "const " in s and ("[" in s[:2000] or "{" in s[:2000]))
        if inline_data > 3:
            score -= 0.5
            issues.append("INLINE_DATA: product/project data defined inline in multiple page files instead of shared data file")

    return round(max(0, score), 2), issues


def score_content(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score content quality."""
    issues = []
    score = 10.0

    # Homepage has clear value prop
    home = pages.get("/", "")
    if home:
        # Check for key messaging
        value_keywords = ["ai", "developer", "tools", "agent", "mcp", "claude"]
        found = sum(1 for k in value_keywords if k.lower() in home.lower())
        if found < 3:
            score -= 1
            issues.append("WEAK_VALUEPREP: homepage doesn't clearly communicate value proposition")

    # Products have descriptions
    products = pages.get("/products", "")
    if products:
        if products.count("description") < 3:
            score -= 1
            issues.append("THIN_PRODUCTS: products page has insufficient product descriptions")

    # Blog has content
    blog = pages.get("/blog", "")
    if blog:
        if "no posts" in blog.lower() or "coming soon" in blog.lower() or blog.count("<article") == 0:
            # Check if there are actual blog entries
            article_count = blog.count("<a") - blog.count("nav")
            if article_count < 3:
                score -= 0.5
                issues.append("THIN_BLOG: blog has few entries")

    # About page exists and has substance
    about = pages.get("/about", "")
    if not about:
        score -= 0.5
        issues.append("NO_ABOUT: about page missing or empty")

    # Check for broken internal links
    all_routes_set = set(ROUTES)
    for route, html in pages.items():
        internal_links = re.findall(r'href="(/[^"]*)"', html)
        for link in internal_links:
            clean = link.rstrip("/")
            if clean and clean not in all_routes_set and not clean.startswith("/#"):
                # Could be a valid route we don't know about
                target = OUT_DIR / clean.strip("/") / "index.html"
                if not target.exists() and not (OUT_DIR / clean.strip("/")).exists():
                    score -= 0.25
                    issues.append(f"BROKEN_LINK: {route} links to {link} which doesn't exist")

    return round(max(0, score), 2), issues


def score_mobile(pages: dict[str, str]) -> tuple[float, list[str]]:
    """Score mobile-readiness signals."""
    issues = []
    score = 10.0
    sources = read_all_source()

    # Responsive breakpoints in use
    responsive_patterns = ["sm:", "md:", "lg:", "xl:", "max-w-", "min-h-screen"]
    responsive_count = 0
    for src in sources.values():
        responsive_count += sum(1 for p in responsive_patterns if p in src)

    if responsive_count < 10:
        score -= 2
        issues.append(f"LOW_RESPONSIVE: only {responsive_count} responsive utility usages found")

    # Mobile navigation
    has_mobile_nav = any(
        "md:hidden" in src or "lg:hidden" in src or "hamburger" in src.lower() or "menu" in src.lower()
        for src in sources.values()
    )
    if not has_mobile_nav:
        score -= 2
        issues.append("NO_MOBILE_NAV: no mobile navigation pattern found")

    # Touch target sizes (check for very small click targets)
    small_targets = 0
    for fname, src in sources.items():
        # Look for tiny text used as links
        if re.search(r'text-\[(?:[0-9]|1[0-1])px\]', src):
            small_targets += 1
    if small_targets > 0:
        score -= 0.5
        issues.append(f"SMALL_TARGETS: {small_targets} files may have undersized touch targets")

    # Viewport units for mobile
    has_svh = any("svh" in src for src in sources.values())
    has_dvh = any("dvh" in src for src in sources.values())
    if not has_svh and not has_dvh:
        score -= 0.5
        issues.append("NO_MOBILE_VH: not using svh/dvh for mobile viewport height")

    # Check grid layouts adapt
    grid_usage = sum(1 for src in sources.values() if "grid" in src and "sm:grid-cols" in src)
    if grid_usage == 0:
        score -= 0.5
        issues.append("STATIC_GRIDS: grid layouts may not adapt for mobile")

    return round(max(0, score), 2), issues


def run_scoring() -> dict:
    """Run all scoring functions and return results."""
    pages = {}
    for route in ROUTES:
        pages[route] = read_html(route)

    results = {}
    all_issues = {}

    scorers = {
        "SEO": score_seo,
        "PERF": score_perf,
        "A11Y": score_a11y,
        "UX": score_ux,
        "SECURITY": score_security,
        "CODE": score_code,
        "CONTENT": score_content,
        "MOBILE": score_mobile,
    }

    for name, scorer in scorers.items():
        s, issues = scorer(pages)
        results[name] = s
        all_issues[name] = issues

    composite = sum(results[k] * WEIGHTS[k] for k in results) / sum(WEIGHTS.values())

    return {
        "scores": results,
        "composite": round(composite, 2),
        "issues": all_issues,
        "total_issues": sum(len(v) for v in all_issues.values()),
    }


def log_result(experiment_id: str, result: dict):
    """Append result to TSV log."""
    header = "timestamp\texperiment\tcomposite\tSEO\tPERF\tA11Y\tUX\tSECURITY\tCODE\tCONTENT\tMOBILE\tissue_count\n"

    if not RESULTS_FILE.exists():
        RESULTS_FILE.write_text(header)

    scores = result["scores"]
    line = (
        f"{datetime.now().isoformat()}\t{experiment_id}\t{result['composite']}\t"
        f"{scores['SEO']}\t{scores['PERF']}\t{scores['A11Y']}\t{scores['UX']}\t"
        f"{scores['SECURITY']}\t{scores['CODE']}\t{scores['CONTENT']}\t{scores['MOBILE']}\t"
        f"{result['total_issues']}\n"
    )

    with open(RESULTS_FILE, "a") as f:
        f.write(line)


def print_report(result: dict, verbose: bool = False):
    """Pretty-print the scoring report."""
    print("\n" + "=" * 60)
    print(f"  COMPOSITE SCORE: {result['composite']:.2f} / 10.00")
    print("=" * 60)

    for name, s in sorted(result["scores"].items(), key=lambda x: x[1]):
        bar = "#" * int(s) + "." * (10 - int(s))
        weight_pct = int(WEIGHTS[name] * 100)
        print(f"  {name:10s} [{bar}] {s:5.2f}  (weight: {weight_pct}%)")

    print(f"\n  Total issues: {result['total_issues']}")

    if verbose:
        print("\n" + "-" * 60)
        for category, issues in result["issues"].items():
            if issues:
                print(f"\n  [{category}]")
                for issue in issues:
                    print(f"    - {issue}")

    print()


def show_best():
    """Show the best experiment so far."""
    if not RESULTS_FILE.exists():
        print("No results yet.")
        return

    lines = RESULTS_FILE.read_text().strip().split("\n")
    if len(lines) < 2:
        print("No results yet.")
        return

    best_score = 0
    best_line = ""
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) >= 3:
            score = float(parts[2])
            if score > best_score:
                best_score = score
                best_line = line

    if best_line:
        parts = best_line.split("\t")
        print(f"\nBest experiment: {parts[1]}")
        print(f"Composite: {parts[2]}")
        print(f"Scores: SEO={parts[3]} PERF={parts[4]} A11Y={parts[5]} UX={parts[6]} SEC={parts[7]} CODE={parts[8]} CONTENT={parts[9]} MOBILE={parts[10]}")
        print(f"Issues: {parts[11]}")


def main():
    parser = argparse.ArgumentParser(description="Edgeless Website Autoresearch Scorer")
    parser.add_argument("--id", help="Experiment ID")
    parser.add_argument("--baseline", action="store_true", help="Run baseline scoring")
    parser.add_argument("--best", action="store_true", help="Show best experiment")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--no-build", action="store_true", help="Skip build step")
    parser.add_argument("--score-only", action="store_true", help="Score without logging")
    args = parser.parse_args()

    if args.best:
        show_best()
        return

    experiment_id = args.id or ("baseline" if args.baseline else f"exp_{datetime.now().strftime('%H%M%S')}")

    if not args.no_build:
        print(f"Building site...")
        if not build_site():
            print("Build failed. Aborting.")
            sys.exit(1)

    print(f"Scoring experiment: {experiment_id}")
    result = run_scoring()
    print_report(result, verbose=args.verbose)

    if not args.score_only:
        log_result(experiment_id, result)
        print(f"Logged to {RESULTS_FILE}")


if __name__ == "__main__":
    main()
