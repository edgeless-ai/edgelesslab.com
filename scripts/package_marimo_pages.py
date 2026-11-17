#!/usr/bin/env python3
"""Package pinned, immutable marimo bundles for Pages. Never exports or uploads."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tempfile
from collections.abc import Sequence

DEFAULT_CATALOG = Path(__file__).with_name("marimo-pages-catalog.json")
FILE_LIMIT = 20_000
DYNAMIC_RULE_LIMIT = 100


class PackagingError(ValueError):
    """Unsafe source, routing, preservation or capacity preflight."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def manifest_digest(manifest: dict[str, str]) -> str:
    """Version-1 manifest encoding: sorted compact UTF-8 JSON, no newline."""
    return digest(json.dumps(manifest, sort_keys=True, separators=(",", ":"),
                             ensure_ascii=True).encode())


def relative(value: str, *, empty: bool = False) -> str:
    if empty and value == "":
        return value
    p = PurePosixPath(value)
    if (not value or p.is_absolute() or str(p) != value
            or any(part in (".", "..") for part in p.parts)
            or not re.fullmatch(r"[A-Za-z0-9._/-]+", value)):
        raise PackagingError(f"Unsafe relative path: {value!r}")
    return value


def inventory(root: Path) -> tuple[dict[str, str], dict[str, Path]]:
    if root.is_symlink() or not root.is_dir():
        raise PackagingError(f"Missing directory or symlink: {root}")
    hashes, paths = {}, {}
    def walk_error(error):
        raise error
    for parent, dirs, names in os.walk(root, followlinks=False, onerror=walk_error):
        for name in sorted(dirs + names):
            p = Path(parent) / name
            if p.is_symlink():
                raise PackagingError(f"Symlink forbidden: {p}")
        for name in sorted(names):
            p = Path(parent) / name
            key = p.relative_to(root).as_posix()
            relative(key)
            if not p.is_file():
                raise PackagingError(f"Non-regular file: {p}")
            if p.stat().st_size > 25 * 1024 * 1024:
                raise PackagingError(f"Pages file exceeds 25 MiB: {p}")
            hashes[key], paths[key] = digest(p.read_bytes()), p
    if not hashes:
        raise PackagingError(f"Empty source: {root}")
    return hashes, paths


def source_inventory(record: dict, roots: dict[str, Path]):
    mount = relative(record["mount"], empty=True)
    path = relative(record["path"])
    if record["root"] not in roots:
        raise PackagingError(f"Unknown source root: {record['root']}")
    root = roots[record["root"]]
    source = root / path
    # Do not silently resolve a source directory through a mutable symlink.
    for part in [source, *source.parents]:
        if part == root.parent:
            break
        if part.is_symlink():
            raise PackagingError(f"Symlink source ancestor: {part}")
    hashes, files = inventory(source)
    if manifest_digest(hashes) != record["sha256"] or len(hashes) != record["files"]:
        raise PackagingError(f"Pinned source mismatch: {mount or '/'} ({source})")
    prefix = mount + "/" if mount else ""
    return ({prefix + k: v for k, v in hashes.items()},
            {prefix + k: v for k, v in files.items()})


def rules(text: str) -> list[tuple[str, str, str]]:
    result = []
    for line in text.splitlines():
        value = line.strip()
        if not value or value.startswith("#"):
            continue
        fields = value.split()
        if len(fields) not in (2, 3):
            raise PackagingError(f"Unsupported _redirects line: {line!r}")
        source, target = fields[:2]
        status = fields[2] if len(fields) == 3 else "302"
        if not source.startswith("/") or status not in {"200", "301", "302", "303", "307", "308", "301!", "302!"}:
            raise PackagingError(f"Unsupported _redirects rule: {line!r}")
        result.append((source, target, status))
    if len(result) > 2100 or sum("*" in s or ":" in s for s, _, _ in result) > DYNAMIC_RULE_LIMIT:
        raise PackagingError("Pages redirect capacity exceeded (100 dynamic / 2100 total)")
    return result


def overlaps(a: str, b: str) -> bool:
    """Conservative overlap test: parameter/wildcard suffixes can match anything."""
    def prefix(value):
        return re.split(r"[*:]", value, maxsplit=1)[0]
    pa, pb = prefix(a), prefix(b)
    if pa == a and pb == b:
        return a == b
    if pa == a:
        return a.startswith(pb)
    if pb == b:
        return b.startswith(pa)
    return pa.startswith(pb) or pb.startswith(pa)


def asset_trees(logical: dict[str, str]) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for path, sha in sorted(logical.items()):
        parts = path.split("/")
        if "assets" not in parts[:-1]:
            continue
        i = parts.index("assets")
        tree, suffix = "/".join(parts[:i + 1]), "/".join(parts[i + 1:])
        result.setdefault(tree, {})[suffix] = sha
    return result


def managed_rule(source: str, target: str):
    return (f"/{source}/*", f"/{target}/:splat", "200")


def route_plan(logical: dict[str, str], redirects: str):
    trees = asset_trees(logical)
    existing = rules(redirects)
    rewrites: dict[str, str] = {}
    # Retained asset rewrites must still bind two complete, byte-identical trees.
    for source, target, status in existing:
        if source.endswith("/assets/*"):
            src = source[1:-2]
            dst = target[1:-7] if target.startswith("/") and target.endswith("/:splat") else ""
            if status != "200" or src not in trees or dst not in trees or trees[src] != trees[dst]:
                raise PackagingError(f"Unverifiable retained asset rewrite: {source} {target}")
            rewrites[src] = dst
    if any(dst in rewrites for dst in rewrites.values()):
        raise PackagingError("Chained/cyclic retained asset rewrites forbidden")
    protected_targets = set(rewrites.values())
    groups: dict[str, list[str]] = {}
    for tree, manifest in trees.items():
        groups.setdefault(manifest_digest(manifest), []).append(tree)
    text = redirects
    for group in groups.values():
        owners = sorted(set(group) & protected_targets)
        # Never remove an existing rewrite destination. Root assets wins otherwise.
        owner = owners[0] if owners else min(group, key=lambda p: (p != "assets", p))
        for tree in sorted(group):
            if tree == owner or tree in protected_targets or tree in rewrites:
                continue
            candidate = managed_rule(tree, owner)
            for old in existing:
                if overlaps(candidate[0], old[0]):
                    raise PackagingError(f"Rewrite collision: {candidate[0]} with {old[0]}")
            rewrites[tree] = owner
            text += ("" if not text or text.endswith("\n") else "\n") + " ".join(candidate) + "\n"
            existing.append(candidate)
    # A retained rule must not be shadowed, even if its line itself is unchanged.
    for src, dst in rewrites.items():
        expected = managed_rule(src, dst)
        matches = [old for old in existing if overlaps(expected[0], old[0])]
        if matches != [expected]:
            raise PackagingError(f"Retained/new rewrite collision: {src}")
    rules(text)
    return trees, rewrites, text


def delivered_path(path: str, rewrites: dict[str, str]) -> str:
    for source, target in rewrites.items():
        if path.startswith(source + "/"):
            return target + path[len(source):]
    return path


def package(catalog: dict, roots: dict[str, Path], output: Path, receipt: Path,
            additions: Sequence[tuple[str, str]] = (), file_limit: int = FILE_LIMIT) -> dict:
    if catalog.get("version") != 1 or not 0 < file_limit <= FILE_LIMIT:
        raise PackagingError("Unsupported catalog version or unsafe file limit")
    if output.exists() or output.is_symlink():
        raise PackagingError(f"Output must not exist: {output}")
    if receipt.is_symlink():
        raise PackagingError("Receipt must not be a symlink")
    output = output.resolve()
    receipt = receipt.resolve()
    source_roots = [p.resolve() for p in roots.values()]
    if any(output == p or p in output.parents or output in p.parents for p in source_roots):
        raise PackagingError("Output and input roots must be disjoint")
    if output == receipt or output in receipt.parents:
        raise PackagingError("Receipt must be outside upload directory")
    if any(receipt == p or p in receipt.parents for p in source_roots):
        raise PackagingError("Receipt must be outside input roots")
    next_catalog = json.loads(json.dumps(catalog))
    mounts = {r["mount"] for r in catalog["sources"]}
    for slug, sha in additions:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", slug) or not re.fullmatch(r"[a-f0-9]{64}", sha):
            raise PackagingError(f"Invalid approved addition: {slug}")
        if slug in mounts or slug in catalog.get("fallbacks", {}):
            raise PackagingError(f"Existing bundle/fallback cannot be replaced: {slug}")
        hashes, _ = inventory(roots["outputs"] / slug / "site")
        if "index.html" not in hashes:
            raise PackagingError(f"Addition has no index.html: {slug}")
        if manifest_digest(hashes) != sha:
            raise PackagingError(f"Approved addition manifest mismatch: {slug}")
        next_catalog["sources"].append(dict(mount=slug, root="outputs", path=f"{slug}/site",
                                            sha256=sha, files=len(hashes)))
        mounts.add(slug)
    logical, files = {}, {}
    for record in next_catalog["sources"]:
        hashes, paths = source_inventory(record, roots)
        if logical.keys() & hashes.keys():
            raise PackagingError(f"Overlapping catalog mounts: {record['mount']}")
        logical.update(hashes)
        files.update(paths)
    if "index.html" not in logical or "404.html" in logical:
        raise PackagingError("Legacy root SPA fallback must exist without a top-level 404")
    if "_redirects" in logical or "_worker.js" in logical or "_routes.json" in logical:
        raise PackagingError("Routing files must not arrive through payload sources")
    for slug, sha in next_catalog.get("fallbacks", {}).items():
        relative(slug)
        if any(p == slug or p.startswith(slug + "/") for p in logical) or logical["index.html"] != sha:
            raise PackagingError(f"Legacy fallback changed: {slug}")
    trees, rewrites, redirects = route_plan(logical, catalog["redirects"])
    physical = {p: sha for p, sha in logical.items() if delivered_path(p, rewrites) == p}
    if redirects:
        physical["_redirects"] = digest(redirects.encode())
    for path, sha in logical.items():
        if physical.get(delivered_path(path, rewrites)) != sha:
            raise PackagingError(f"Delivery hash mismatch: {path}")
    # Arbitrary historical redirects are retained verbatim, but cannot hide payloads
    # or fallback URLs. Those routes require an explicit reviewed migration instead.
    managed = {managed_rule(src, dst) for src, dst in rewrites.items()}
    protected_urls = ["/" + p for p in logical]
    protected_urls += ["/" + p[:-10] for p in logical if p.endswith("index.html")]
    protected_urls += ["/" + slug + "/" for slug in next_catalog.get("fallbacks", {})]
    for rule in rules(redirects):
        if rule not in managed and any(overlaps(rule[0], p) for p in protected_urls):
            raise PackagingError(f"Historical redirect shadows preserved payload/fallback: {rule[0]}")
    next_catalog["redirects"] = redirects
    report = dict(version=1, status="capacity-exceeded" if len(physical) > file_limit else "preflight-pass",
                  file_limit=file_limit, logical_files=len(logical), packaged_files=len(physical),
                  remaining_files=file_limit - len(physical),
                  removed_identical_files=len(logical) - len(physical) + bool(redirects),
                  logical_manifest_sha256=manifest_digest(logical),
                  package_manifest_sha256=manifest_digest(physical),
                  logical_manifest=logical, package_manifest=physical,
                  html_hashes={p: sha for p, sha in logical.items() if p.endswith(".html")},
                  asset_manifests={manifest_digest(m): m for m in trees.values()},
                  asset_trees={p: manifest_digest(m) for p, m in trees.items()},
                  rewrites=rewrites, redirects=redirects, next_catalog=next_catalog,
                  verification="offline complete logical-path SHA256 equivalence; not live runtime proof")
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    if report["status"] == "capacity-exceeded":
        raise PackagingError(f"Capacity exceeded: {len(physical)} > {file_limit}; no upload directory created")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".marimo-package-", dir=output.parent) as tmp:
        staged = Path(tmp) / "payload"
        staged.mkdir()
        for path in physical:
            dest = staged / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            if path == "_redirects":
                dest.write_bytes(redirects.encode())
            else:
                shutil.copyfile(files[path], dest)
        actual, _ = inventory(staged)
        if actual != physical:
            raise PackagingError("Post-copy manifest changed; refusing package")
        # Recheck all inputs, including removed duplicates, for concurrent mutation.
        for record in next_catalog["sources"]:
            source_inventory(record, roots)
        if output.exists():
            raise PackagingError("Output appeared during packaging")
        staged.rename(output)
    report["status"] = "pass"
    receipt.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--outputs-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--add", action="append", default=[], metavar="SLUG=MANIFEST_SHA256",
                        help="Explicit reviewed addition at OUTPUTS_ROOT/SLUG/site")
    parser.add_argument("--file-limit", type=int, default=FILE_LIMIT, help="May lower but never raise 20000")
    args = parser.parse_args()
    try:
        additions = []
        for value in args.add:
            if "=" not in value:
                raise PackagingError("--add requires SLUG=MANIFEST_SHA256")
            additions.append(tuple(value.split("=", 1)))
        result = package(json.loads(args.catalog.read_text()),
                         {"repository": args.repo_root, "outputs": args.outputs_root},
                         args.output, args.receipt, additions, args.file_limit)
        print(json.dumps({k: result[k] for k in ("status", "logical_files", "packaged_files",
                                                "remaining_files", "package_manifest_sha256")}))
        return 0
    except (PackagingError, OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"marimo Pages preflight FAILED: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
