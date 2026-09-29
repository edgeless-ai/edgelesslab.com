import { afterEach, expect, test } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "standalone-build-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"));
  cpSync("scripts/preserve-standalone.sh", join(root, "scripts/preserve-standalone.sh"));
  for (const dir of ["pen-plotter", "tartanism", "total-serialism", "public/lab/pen-plotter-autoresearch", "out/lab/pen-plotter-autoresearch", "out/creative-demos/borrow-the-creative-loop"])
    mkdirSync(join(root, dir), { recursive: true });
  return root;
}

 test("postbuild restores authoritative dashboard assets before Pagefind", () => {
  const root = fixture();
  const source = "public/lab/pen-plotter-autoresearch";
  const output = "out/lab/pen-plotter-autoresearch";
  writeFileSync(join(root, source, "index.html"), "<h1>Standalone dashboard</h1><a href='01.html'>Tool</a>");
  writeFileSync(join(root, source, "01.html"), "<style>.active { color: red }</style>Tool");
  writeFileSync(join(root, output, "index.html"), "Generated Next replacement");
  const article = "out/creative-demos/borrow-the-creative-loop/index.html";
  writeFileSync(join(root, article), "Design study — NOT BUILT");
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  const restore = "./scripts/preserve-standalone.sh restore";
  expect(scripts.postbuild.indexOf(restore)).toBeGreaterThan(scripts.postbuild.indexOf("run-critters.mjs"));
  expect(scripts.postbuild.indexOf("pagefind --site out")).toBeGreaterThan(scripts.postbuild.indexOf(restore));
  const result = spawnSync("bash", ["scripts/preserve-standalone.sh", "restore"], { cwd: root, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  for (const file of ["index.html", "01.html"])
    expect(readFileSync(join(root, output, file))).toEqual(readFileSync(join(root, source, file)));
  expect(readFileSync(join(root, article), "utf8")).toBe("Design study — NOT BUILT");
});

test("prebuild fails closed when dashboard source is missing", () => {
  const root = fixture();
  const result = spawnSync("bash", ["scripts/preserve-standalone.sh", "save"], { cwd: root, encoding: "utf8" });
  expect(result.status).not.toBe(0);
});
