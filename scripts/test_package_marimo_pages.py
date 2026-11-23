"""Hermetic packaging contracts. HTTP fixtures are NOT Cloudflare/runtime proof."""
import copy

import http.server
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import urlopen

spec = importlib.util.spec_from_file_location("packager", Path(__file__).with_name("package_marimo_pages.py"))
assert spec and spec.loader
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / "repo"
        self.outputs = self.root / "outputs"
        self.repo.mkdir()
        self.outputs.mkdir()
        self.roots = {"repository": self.repo, "outputs": self.outputs}
        self.put("root/index.html", b"<html>approved root</html>\r\n")
        self.put("root/assets/main.js", b"export const value = 42;\n")
        self.put("root/assets/nested/style.css", b"body{color:red}")
        self.catalog = {"version": 1, "sources": [self.record("", "root")],
                        "redirects": "", "fallbacks": {}}
        self.out = self.root / "package"
        self.receipt = self.root / "receipt.json"

    def put(self, path, data=b"fixture"):
        dest = self.repo / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return dest

    def record(self, mount, path):
        hashes, _ = p.inventory(self.repo / path)
        return dict(mount=mount, root="repository", path=path,
                    sha256=p.manifest_digest(hashes), files=len(hashes))

    def bundle(self, name="demo", variant="same"):
        self.put(f"{name}/index.html", b"<script src='./assets/main.js'></script>\n")
        shutil.copytree(self.repo / "root/assets", self.repo / name / "assets")
        if variant == "changed":
            self.put(f"{name}/assets/main.js", b"different runtime")
        if variant == "subset":
            (self.repo / name / "assets/nested/style.css").unlink()
        if variant == "superset":
            self.put(f"{name}/assets/extra.js")
        if variant == "disjoint":
            shutil.rmtree(self.repo / name / "assets")
            self.put(f"{name}/assets/other.js")
        self.catalog["sources"].append(self.record(name, name))

    def run_package(self, **kwargs):
        return p.package(self.catalog, self.roots, self.out, self.receipt, **kwargs)

    def test_identical_complete_tree_only_and_approved_html_bytes(self):
        self.bundle()
        before, _ = p.inventory(self.repo)
        result = self.run_package()
        self.assertEqual(result["rewrites"], {"demo/assets": "assets"})
        self.assertEqual((self.out / "demo/index.html").read_bytes(), (self.repo / "demo/index.html").read_bytes())
        self.assertFalse((self.out / "demo/assets").exists())
        self.assertEqual(p.inventory(self.repo)[0], before)
        self.assertEqual(result["status"], "pass")
        for path, sha in result["logical_manifest"].items():
            self.assertEqual(p.digest((self.out / p.delivered_path(path, result["rewrites"])).read_bytes()), sha)

    def test_different_disjoint_subset_superset_assets_are_not_deduplicated(self):
        for variant in ("changed", "disjoint", "subset", "superset"):
            self.bundle(variant, variant)
        result = self.run_package()
        self.assertEqual(result["rewrites"], {})
        self.assertEqual(result["logical_files"], result["packaged_files"])

    def test_existing_rewrite_and_unrelated_comments_retained_byte_for_byte(self):
        self.bundle()
        original = "# durable\r\n/old /new 301\r\n/demo/assets/* /assets/:splat 200\r\n"
        self.catalog["redirects"] = original
        self.bundle("second")
        result = self.run_package()
        self.assertTrue((self.out / "_redirects").read_bytes().startswith(original.encode()))
        self.assertEqual(result["rewrites"]["demo/assets"], "assets")
        self.assertEqual(result["rewrites"]["second/assets"], "assets")

    def test_repeated_packaging_with_next_catalog_retains_all_rewrites(self):
        self.bundle()
        first = self.run_package()
        self.catalog = first["next_catalog"]
        self.out = self.root / "package-again"
        second = self.run_package()
        self.assertEqual(first["package_manifest"], second["package_manifest"])
        self.assertEqual(first["redirects"], second["redirects"])

    def test_existing_destination_never_removed(self):
        self.bundle("a")
        self.bundle("z")
        self.catalog["redirects"] = "/a/assets/* /z/assets/:splat 200\n"
        result = self.run_package()
        self.assertTrue((self.out / "z/assets/main.js").is_file())
        self.assertEqual(result["rewrites"]["a/assets"], "z/assets")

    def test_canonical_index_urls_cannot_be_shadowed_by_historical_rules(self):
        self.bundle()
        for rule in ("/ /other 302\n", "/demo/ /other 200\n"):
            with self.subTest(rule=rule):
                self.catalog["redirects"] = rule
                with self.assertRaisesRegex(p.PackagingError, "shadows preserved"):
                    self.run_package()
                self.assertFalse(self.out.exists())

    def test_collision_and_shadow_rules_fail_closed(self):
        self.bundle()
        for rule in ("/* /fallback 200\n", "/demo/* /elsewhere/:splat 200\n",
                     "/demo/assets/main.js /other.js 301\n", "/:slug/assets/* /other/:splat 200\n"):
            with self.subTest(rule=rule):
                self.catalog["redirects"] = rule
                with self.assertRaisesRegex(p.PackagingError, "collision|Unverifiable"):
                    self.run_package()
                self.assertFalse(self.out.exists())

    def test_retained_rule_wrong_target_changed_tree_and_cycle_fail(self):
        self.bundle()
        for rule in ("/demo/assets/* https://cdn.example/assets/:splat 200\n",
                     "/demo/assets/* /missing/:splat 200\n",
                     "/demo/assets/* /assets/:splat 302\n",
                     "/demo/assets/* /assets/:splat 200\n/assets/* /demo/assets/:splat 200\n"):
            with self.subTest(rule=rule):
                self.catalog["redirects"] = rule
                with self.assertRaises(p.PackagingError):
                    self.run_package()
        self.catalog["redirects"] = "/demo/assets/* /assets/:splat 200\n"
        self.put("demo/assets/main.js", b"changed")
        self.catalog["sources"][-1] = self.record("demo", "demo")
        with self.assertRaisesRegex(p.PackagingError, "Unverifiable"):
            self.run_package()

    def test_capacity_limit_includes_redirects_exact_boundary(self):
        self.bundle()
        result = self.run_package(file_limit=5)
        self.assertEqual(result["packaged_files"], 5)
        self.assertEqual(result["remaining_files"], 0)
        self.out = self.root / "too-large"
        with self.assertRaisesRegex(p.PackagingError, "Capacity exceeded"):
            self.run_package(file_limit=4)
        self.assertFalse(self.out.exists())
        self.assertEqual(json.loads(self.receipt.read_text())["status"], "capacity-exceeded")
        with self.assertRaises(p.PackagingError):
            self.run_package(file_limit=20001)

    def test_real_20000_file_limit_fails_with_20002_nonidentical_files(self):
        # Tiny files, actual enumeration; not a mocked count.
        for i in range(19999):
            self.put(f"root/data/{i}.txt", str(i).encode())
        self.catalog["sources"][0] = self.record("", "root")
        with self.assertRaisesRegex(p.PackagingError, "20002 > 20000"):
            self.run_package()
        self.assertFalse(self.out.exists())

    def test_pinned_source_missing_or_mutated_is_not_replaced_from_outputs(self):
        self.put("root/index.html", b"unapproved candidate")
        with self.assertRaisesRegex(p.PackagingError, "Pinned source mismatch"):
            self.run_package()
        self.assertFalse(self.out.exists())

    def test_explicit_reviewed_addition_and_no_auto_discovery(self):
        site = self.outputs / "next/site"
        shutil.copytree(self.repo / "root", site)
        self.run_package()
        self.assertFalse((self.out / "next").exists())
        self.out = self.root / "with-addition"
        sha = p.manifest_digest(p.inventory(site)[0])
        with self.assertRaisesRegex(p.PackagingError, "manifest mismatch"):
            self.run_package(additions=[("next", "0" * 64)])
        result = self.run_package(additions=[("next", sha)])
        self.assertEqual(result["rewrites"], {"next/assets": "assets"})
        self.assertTrue((self.out / "next/index.html").is_file())

    def test_legacy_fallback_preserved_and_cannot_be_silently_restored(self):
        self.catalog["fallbacks"] = {"legacy": p.digest((self.repo / "root/index.html").read_bytes())}
        site = self.outputs / "legacy/site"
        shutil.copytree(self.repo / "root", site)
        with self.assertRaisesRegex(p.PackagingError, "fallback cannot be replaced"):
            self.run_package(additions=[("legacy", p.manifest_digest(p.inventory(site)[0]))])
        self.run_package()
        self.assertFalse((self.out / "legacy").exists())
        self.assertFalse((self.out / "404.html").exists())

    def restoration(self):
        slug = "legacy"
        old = p.digest((self.repo / "root/index.html").read_bytes())
        self.catalog["fallbacks"][slug] = old
        site = self.outputs / slug / "site"
        shutil.copytree(self.repo / "root", site)
        (site / "index.html").write_bytes(b"<script src='./assets/main.js'></script>approved legacy")
        hashes, _ = p.inventory(site)
        return dict(mount=slug, root="outputs", path=f"{slug}/site", files=len(hashes),
                    sha256=p.manifest_digest(hashes), expected_fallback_sha256=old,
                    review_task="fixture-independent-review")

    def test_explicit_restoration_preserves_old_paths_and_recovers_actual_reference(self):
        migration = self.restoration()
        before = copy.deepcopy(self.catalog)
        old, _ = p.source_inventory(self.catalog["sources"][0], self.roots)
        result = self.run_package(restorations=[migration])
        self.assertEqual(self.catalog, before)
        self.assertEqual(result["next_catalog"]["fallbacks"], {})
        self.assertEqual(result["restorations"], [migration])
        self.assertEqual(result["next_catalog"]["provenance"]["fallback_restorations"], [migration])
        self.assertEqual(result["rewrites"]["legacy/assets"], "assets")
        self.assertNotEqual(p.digest((self.out / "legacy/index.html").read_bytes()), migration["expected_fallback_sha256"])
        for path, sha in old.items():
            self.assertEqual(result["logical_manifest"][path], sha)
        self.out = self.root / "again"
        replay = p.package(result["next_catalog"], self.roots, self.out, self.receipt)
        self.assertEqual(replay["package_manifest"], result["package_manifest"])

    def test_restoration_rejects_stale_fallback_wrong_manifest_missing_review_and_alias(self):
        migration = self.restoration()
        cases = [dict(migration, expected_fallback_sha256="0" * 64),
                 dict(migration, sha256="0" * 64), dict(migration, review_task=""),
                 dict(migration, mount="unknown"), dict(migration, path="../legacy/site"),
                 dict(migration, path="legacy/site", root="repository")]
        for candidate in cases:
            with self.subTest(candidate=candidate):
                with self.assertRaises((p.PackagingError, OSError)):
                    self.run_package(restorations=[candidate])
                self.assertFalse(self.out.exists())
        with self.assertRaises(p.PackagingError):
            self.run_package(restorations=[migration, migration])
        self.assertFalse(self.out.exists())

    def test_restoration_cannot_rebrand_root_html_as_another_notebook(self):
        migration = self.restoration()
        site = self.outputs / "legacy/site"
        (site / "index.html").write_bytes((self.repo / "root/index.html").read_bytes())
        migration["sha256"] = p.manifest_digest(p.inventory(site)[0])
        with self.assertRaisesRegex(p.PackagingError, "still root fallback"):
            self.run_package(restorations=[migration])
        self.assertFalse(self.out.exists())

    def test_restoration_source_mutation_is_rejected(self):
        migration = self.restoration()
        (self.outputs / "legacy/site/assets/main.js").write_bytes(b"unreviewed")
        with self.assertRaisesRegex(p.PackagingError, "Pinned source mismatch"):
            self.run_package(restorations=[migration])
        self.assertFalse(self.out.exists())

    def test_symlink_traversal_mount_overlap_and_routing_files_rejected(self):
        self.put("root/assets/link.js").unlink()
        (self.repo / "root/assets/link.js").symlink_to(self.repo / "root/index.html")
        with self.assertRaisesRegex(p.PackagingError, "Symlink"):
            self.run_package()
        (self.repo / "root/assets/link.js").unlink()
        self.catalog["sources"][0]["path"] = "../repo/root"
        with self.assertRaises(p.PackagingError):
            self.run_package()
        self.catalog["sources"][0] = self.record("", "root")
        self.catalog["sources"].append(copy.deepcopy(self.catalog["sources"][0]))
        with self.assertRaisesRegex(p.PackagingError, "Overlapping"):
            self.run_package()
        self.catalog["sources"].pop()
        self.put("root/_redirects", b"/* /other 200")
        self.catalog["sources"][0] = self.record("", "root")
        with self.assertRaisesRegex(p.PackagingError, "Routing files"):
            self.run_package()

    def test_output_and_receipt_cannot_overwrite_inputs(self):
        for out, receipt in ((self.repo / "package", self.receipt),
                             (self.out, self.repo / "receipt.json"),
                             (self.out, self.out / "receipt.json")):
            with self.subTest(out=out, receipt=receipt):
                with self.assertRaises(p.PackagingError):
                    p.package(self.catalog, self.roots, out, receipt)

    def test_post_copy_corruption_never_leaves_upload_directory(self):
        original = shutil.copyfile
        def corrupt(source, dest):
            original(source, dest)
            Path(dest).write_bytes(b"corrupted")
        with patch.object(p.shutil, "copyfile", side_effect=corrupt):
            with self.assertRaisesRegex(p.PackagingError, "Post-copy"):
                self.run_package()
        self.assertFalse(self.out.exists())
        self.assertEqual(json.loads(self.receipt.read_text())["status"], "preflight-pass")

    def test_redirect_capacity_is_bounded(self):
        self.bundle()
        self.catalog["redirects"] = "".join(f"/old{i}/* /new{i}/:splat 200\n" for i in range(100))
        with self.assertRaisesRegex(p.PackagingError, "redirect capacity"):
            self.run_package()

    def test_cli_capacity_failure_exit_code(self):
        catalog = self.root / "catalog.json"
        catalog.write_text(json.dumps(self.catalog))
        result = subprocess.run([sys.executable, str(Path(__file__).with_name("package_marimo_pages.py")), "--catalog", str(catalog),
                                 "--repo-root", str(self.repo), "--outputs-root", str(self.outputs),
                                 "--output", str(self.out), "--receipt", str(self.receipt),
                                 "--file-limit", "2"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("Capacity exceeded", result.stderr)
        self.assertFalse(self.out.exists())

    def test_served_asset_and_html_hashes_with_offline_rewrite_fixture(self):
        self.bundle()
        self.catalog["fallbacks"] = {"legacy": p.digest((self.repo / "root/index.html").read_bytes())}
        result = self.run_package()
        output = self.out
        class Handler(http.server.SimpleHTTPRequestHandler):
            def translate_path(self, path):
                path = path.split("?", 1)[0].lstrip("/")
                path = p.delivered_path(path, result["rewrites"])
                if path in ("", "legacy/"):
                    path = "index.html"
                return str(output / path)
            def log_message(self, format, *args):
                pass
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for path, sha in result["logical_manifest"].items():
                with urlopen(f"http://127.0.0.1:{server.server_port}/{path}") as response:
                    self.assertEqual(p.digest(response.read()), sha)
                    if path.endswith(".js"):
                        self.assertNotIn("text/html", response.headers["Content-Type"])
            with urlopen(f"http://127.0.0.1:{server.server_port}/legacy/") as response:
                self.assertEqual(p.digest(response.read()), self.catalog["fallbacks"]["legacy"])
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
