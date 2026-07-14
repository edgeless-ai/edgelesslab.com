import importlib.util
import os
import subprocess
import sys
from types import SimpleNamespace
from pathlib import Path


PROJECT = Path(__file__).parents[1]
SCRIPT = PROJECT / "scripts" / "cron" / "taxonomy-triage.py"
SMOKE_SCRIPT = PROJECT / "scripts" / "preflight" / "smoke_test.py"


def load_module():
    spec = importlib.util.spec_from_file_location("taxonomy_triage", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_smoke_module():
    spec = importlib.util.spec_from_file_location("smoke_test", SMOKE_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_claude_md(root):
    (root / "CLAUDE.md").write_text(
        """# Test policy

## Canonical Locations (Single Source of Truth)

| Category | Canonical Location | Deprecated (DO NOT USE) |
|----------|--------------------|-------------------------|
| Tasks | `/tasks/` | `/backlog/tasks/`, vault/backlog/tasks/, /.backlog/ |
| Config | `/config/` | 05-config/, _legacy-05-config/ |
| Runtime | `/.runtime/` | root-level .paperclip*, .hive* files |

## Next section
"""
    )


def run_check(root):
    env = os.environ.copy()
    env["CLAUDE_PROJECTS_ROOT"] = str(root)
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--check"],
        capture_output=True,
        text=True,
        env=env,
    )


def test_parser_extracts_deprecated_paths(tmp_path):
    write_claude_md(tmp_path)

    assert load_module().parse_canonical_rules(tmp_path / "CLAUDE.md") == [
        "backlog/tasks",
        ".backlog",
        "05-config",
        "_legacy-05-config",
        ".paperclip*",
        ".hive*",
    ]


def test_numbered_map_includes_current_taxonomy_allocations():
    assert {
        key: load_module().CANONICAL_NUMBERED[key]
        for key in ("14", "15", "16", "17", "18")
    } == {
        "14": "14-Knowledge-Bases",
        "15": "15-Products",
        "16": "16-Projects",
        "17": "17-Websites",
        "18": "18-Evals",
    }


def test_check_fails_when_deprecated_directory_exists(tmp_path):
    write_claude_md(tmp_path)
    (tmp_path / "claude-vault").mkdir()
    (tmp_path / "05-config").mkdir()

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "deprecated_path_present: 05-config" in result.stdout


def test_check_passes_for_clean_tree(tmp_path):
    write_claude_md(tmp_path)
    (tmp_path / "claude-vault").mkdir()

    result = run_check(tmp_path)

    assert result.returncode == 0
    assert "Taxonomy check: 0 violation(s)" in result.stdout


def test_smoke_taxonomy_check_warns_by_default(monkeypatch):
    smoke = load_smoke_module()
    monkeypatch.delenv("TAXONOMY_STRICT", raising=False)
    monkeypatch.setattr(
        smoke.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(
            returncode=1, stdout="Taxonomy check: 17 violation(s)\n", stderr=""
        ),
    )

    assert smoke.run_taxonomy_check() == (True, [])


def test_smoke_taxonomy_check_fails_in_strict_mode(monkeypatch):
    smoke = load_smoke_module()
    monkeypatch.setenv("TAXONOMY_STRICT", "1")
    monkeypatch.setattr(
        smoke.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(
            returncode=1, stdout="Taxonomy check: 17 violation(s)\n", stderr=""
        ),
    )

    passed, errors = smoke.run_taxonomy_check()

    assert not passed
    assert errors == ["Taxonomy drift: Taxonomy check: 17 violation(s)"]


def test_hermes_task_dedupes_on_rolling_prefix(monkeypatch):
    taxonomy = load_module()
    calls = []

    def fake_run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(
            returncode=0,
            stdout=f"todo  abc123  {taxonomy.ROLLING_TITLE_PREFIX} 17 items\n",
            stderr="",
        )

    monkeypatch.setattr(taxonomy.subprocess, "run", fake_run)

    taxonomy.file_hermes_task([], "2026-07-11", dry_run=False)

    assert calls == [["hermes", "kanban", "--board", "edgeless", "list"]]


def test_hermes_task_missing_cli_is_nonfatal(monkeypatch):
    taxonomy = load_module()

    def missing_cli(*args, **kwargs):
        raise FileNotFoundError

    monkeypatch.setattr(taxonomy.subprocess, "run", missing_cli)

    assert taxonomy.file_hermes_task([], "2026-07-11", dry_run=False) is None
