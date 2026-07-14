#!/usr/bin/env python3
"""
Smoke test runner for pre-commit validation.

Catches refactor regressions by:
1. Running python -m compileall on src/ and scripts/ (syntax check)
2. Importing all entry points from entry_points.txt
3. Validating skill frontmatter in .claude/skills/*/skill.md
4. Checking shell script syntax with bash -n
5. Running the taxonomy drift check (warning-only unless TAXONOMY_STRICT=1)

Usage:
    python scripts/preflight/smoke_test.py [--verbose]

Exit codes:
    0 - All smoke tests passed
    1 - One or more tests failed
"""

import ast
import importlib
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Tuple

# Add project root to path for imports
PROJECT_ROOT = Path("/Users/djm/claude-projects")
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

ENTRY_POINTS_FILE = PROJECT_ROOT / "scripts" / "preflight" / "entry_points.txt"
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"
CRON_SCRIPTS_DIR = PROJECT_ROOT / "scripts" / "cron"
TAXONOMY_SCRIPT = CRON_SCRIPTS_DIR / "taxonomy-triage.py"
MEMORY_DIR = Path.home() / ".claude" / "projects" / "-Users-djm-claude-projects" / "memory"
MEMORY_SIZE_CAP = 4000  # characters


class Colors:
    """ANSI color codes for terminal output."""
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def log(message: str, color: str = "", verbose: bool = False) -> None:
    """Print message with optional color."""
    if verbose or color in [Colors.RED, Colors.GREEN]:
        print(f"{color}{message}{Colors.RESET}")


def run_compileall_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """
    Run python -m compileall on src/, scripts/, and test file dir to catch syntax errors.
    Returns (success, errors).
    """
    errors = []
    
    for target in ["src", "scripts", "scripts/preflight"]:
        target_path = PROJECT_ROOT / target
        if not target_path.exists():
            continue
            
        cmd = [sys.executable, "-m", "compileall", "-q", str(target_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            errors.append(f"Compile errors in {target}/:\n{result.stderr}")
            log(f"  ❌ Compile check failed for {target}/", Colors.RED, verbose)
        else:
            log(f"  ✅ Compile check passed for {target}/", Colors.GREEN, verbose)
    
    return len(errors) == 0, errors


def load_entry_points() -> List[str]:
    """Load entry points from entry_points.txt file."""
    entry_points = []
    
    if not ENTRY_POINTS_FILE.exists():
        return entry_points
    
    with open(ENTRY_POINTS_FILE) as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue
            entry_points.append(line)
    
    return entry_points


def run_import_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """
    Import all entry points from entry_points.txt.
    Returns (success, errors).
    """
    errors = []
    entry_points = load_entry_points()
    
    if not entry_points:
        errors.append("No entry points found in entry_points.txt")
        return False, errors
    
    log(f"  Testing {len(entry_points)} entry point imports...", Colors.BLUE, verbose)
    
    for entry in entry_points:
        try:
            importlib.import_module(entry)
            log(f"    ✅ {entry}", Colors.GREEN, verbose)
        except Exception as e:
            error_msg = f"    ❌ {entry}: {type(e).__name__}: {e}"
            errors.append(error_msg)
            log(error_msg, Colors.RED, verbose)
    
    return len(errors) == 0, errors


def parse_skill_frontmatter(skill_path: Path) -> Tuple[bool, str]:
    """
    Parse skill.md frontmatter and validate critical fields.
    Only checks for truly broken frontmatter (missing name, malformed).
    Legacy skills may lack optional fields - that's OK.
    
    Returns (valid, error_message).
    """
    try:
        with open(skill_path) as f:
            content = f.read()
    except Exception as e:
        return False, f"Cannot read file: {e}"
    
    # Check for YAML frontmatter
    if not content.startswith("---"):
        # Legacy skills without frontmatter are warnings, not failures
        return True, "(legacy: no YAML frontmatter)"
    
    # Find end of frontmatter
    end_match = content.find("---", 3)
    if end_match == -1:
        return False, "Malformed frontmatter (missing closing ---)"
    
    frontmatter = content[3:end_match].strip()
    
    # Check for either 'name:' or 'title:' - both are acceptable for the skill name
    # Other fields like 'version' are recommended but not required for legacy skills
    if "name:" not in frontmatter and "title:" not in frontmatter:
        return False, "Missing required field: name (or title)"
    
    return True, ""


def run_skill_frontmatter_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """
    Validate all skill.md frontmatter in .claude/skills/.
    Returns (success, errors).
    """
    errors = []
    warnings = []
    
    if not SKILLS_DIR.exists():
        log("  ⚠️  Skills directory not found, skipping", Colors.YELLOW, verbose)
        return True, errors
    
    skill_files = list(SKILLS_DIR.rglob("skill.md"))
    log(f"  Testing {len(skill_files)} skill frontmatters...", Colors.BLUE, verbose)
    
    for skill_path in skill_files:
        valid, message = parse_skill_frontmatter(skill_path)
        rel_path = skill_path.relative_to(PROJECT_ROOT)
        
        if valid and not message:
            log(f"    ✅ {rel_path}", Colors.GREEN, verbose)
        elif valid and message.startswith("(legacy"):
            # Legacy warning - not a failure
            log(f"    ⚠️  {rel_path}: {message}", Colors.YELLOW, verbose)
            warnings.append(f"    ⚠️  {rel_path}: {message}")
        else:
            error_msg = f"    ❌ {rel_path}: {message}"
            errors.append(error_msg)
            log(error_msg, Colors.RED, verbose)
    
    return len(errors) == 0, errors


def run_shell_syntax_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """
    Run bash -n on all shell scripts in scripts/cron/.
    Returns (success, errors).
    """
    errors = []
    
    if not CRON_SCRIPTS_DIR.exists():
        log("  ⚠️  Cron scripts directory not found, skipping", Colors.YELLOW, verbose)
        return True, errors
    
    shell_scripts = list(CRON_SCRIPTS_DIR.glob("*.sh"))
    log(f"  Testing {len(shell_scripts)} shell script syntax...", Colors.BLUE, verbose)
    
    for script_path in shell_scripts:
        result = subprocess.run(
            ["bash", "-n", str(script_path)],
            capture_output=True,
            text=True
        )
        
        rel_path = script_path.relative_to(PROJECT_ROOT)
        if result.returncode == 0:
            log(f"    ✅ {rel_path}", Colors.GREEN, verbose)
        else:
            error_msg = f"    ❌ {rel_path}: {result.stderr.strip()}"
            errors.append(error_msg)
            log(error_msg, Colors.RED, verbose)
    
    return len(errors) == 0, errors


def run_memory_size_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """
    Check memory files for size cap violations.
    This is a WARNING-ONLY check -- it never fails the build.
    Reports files exceeding MEMORY_SIZE_CAP characters.
    Returns (True always, warnings_as_errors=[]).
    """
    warnings = []

    if not MEMORY_DIR.exists():
        log("  ⚠️  Memory directory not found, skipping", Colors.YELLOW, verbose)
        return True, []

    oversized = []
    for md_file in sorted(MEMORY_DIR.rglob("*.md")):
        try:
            size = md_file.stat().st_size
            if size > MEMORY_SIZE_CAP:
                rel_path = md_file.relative_to(MEMORY_DIR)
                oversized.append((rel_path, size))
        except OSError:
            continue

    if oversized:
        # Sort by size descending
        oversized.sort(key=lambda x: x[1], reverse=True)
        log(f"  ⚠️  {len(oversized)} memory file(s) exceed {MEMORY_SIZE_CAP} char cap:",
            Colors.YELLOW, True)  # always print warnings
        for rel_path, size in oversized[:15]:  # top 15
            ratio = size / MEMORY_SIZE_CAP
            log(f"    {size:>6} chars ({ratio:.1f}x cap)  {rel_path}",
                Colors.YELLOW, True)
        if len(oversized) > 15:
            log(f"    ... and {len(oversized) - 15} more", Colors.YELLOW, True)
        log(f"  Total oversized: {sum(s for _, s in oversized):,} chars "
            f"(consider overflow to skills)", Colors.YELLOW, True)
    else:
        log(f"  ✅ All memory files within {MEMORY_SIZE_CAP} char cap",
            Colors.GREEN, verbose)

    # Never blocks commit -- warning only
    return True, []


def run_taxonomy_check(verbose: bool = False) -> Tuple[bool, List[str]]:
    """Run taxonomy --check, warning by default and blocking in strict mode."""
    strict = os.environ.get("TAXONOMY_STRICT") == "1"
    result = subprocess.run(
        [sys.executable, str(TAXONOMY_SCRIPT), "--check"],
        capture_output=True,
        text=True,
    )
    summary = next(
        (line for line in reversed(result.stdout.splitlines())
         if line.startswith("Taxonomy check:")),
        f"taxonomy check exited {result.returncode}",
    )

    if result.returncode == 0:
        log(f"  ✅ {summary}", Colors.GREEN, verbose)
        return True, []

    message = f"Taxonomy drift: {summary}"
    if strict:
        log(f"  ❌ {message} (TAXONOMY_STRICT=1)", Colors.RED, True)
        return False, [message]

    log(f"  ⚠️  {message} (warning only; set TAXONOMY_STRICT=1 to block)",
        Colors.YELLOW, True)
    return True, []


def main() -> int:
    """Main entry point. Returns exit code."""
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    
    print("🔧 Running smoke tests...")
    print("=" * 50)
    
    start_time = time.time()
    all_passed = True
    all_errors = []
    
    # Test 1: Compile check
    print("\n1️⃣  Smoke compile (syntax check)")
    passed, errors = run_compileall_check(verbose)
    if not passed:
        all_passed = False
        all_errors.extend(errors)
    
    # Test 2: Import check
    print("\n2️⃣  Smoke import (entry point imports)")
    passed, errors = run_import_check(verbose)
    if not passed:
        all_passed = False
        all_errors.extend(errors)
    
    # Test 3: Skill frontmatter check
    print("\n3️⃣  Skill frontmatter validity")
    passed, errors = run_skill_frontmatter_check(verbose)
    if not passed:
        all_passed = False
        all_errors.extend(errors)
    
    # Test 4: Shell syntax check
    print("\n4️⃣  Shell script syntax")
    passed, errors = run_shell_syntax_check(verbose)
    if not passed:
        all_passed = False
        all_errors.extend(errors)

    # Test 5: Memory file size caps (warning only, never blocks)
    print("\n5️⃣  Memory file size caps")
    run_memory_size_check(verbose)

    # Test 6: Taxonomy drift (warning by default, strict via environment)
    print("\n6️⃣  Taxonomy drift")
    passed, errors = run_taxonomy_check(verbose)
    if not passed:
        all_passed = False
        all_errors.extend(errors)

    # Summary
    elapsed = time.time() - start_time
    print("\n" + "=" * 50)
    
    if all_passed:
        print(f"✅ All smoke tests passed ({elapsed:.1f}s)")
        return 0
    else:
        print(f"❌ Smoke tests failed ({elapsed:.1f}s)")
        print(f"\nErrors ({len(all_errors)}):")
        for error in all_errors:
            print(f"  {error}")
        print("\nTo bypass (not recommended): git commit --no-verify")
        return 1


if __name__ == "__main__":
    sys.exit(main())
