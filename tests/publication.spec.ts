import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { marimoDemos } from "../src/lib/marimo-demos";
import { validateMarimoCatalog } from "../src/lib/marimo-gallery-contract";
import { changedPublications, legacyPublicationEntries, publicationEntries } from "../scripts/marimo-publication-diff.mjs";
import { verifyMarimoLive } from "./helpers/verify-marimo-live";

const published = validateMarimoCatalog(marimoDemos);
const entriesDir = "src/lib/marimo-entries";
const legacyPath = "src/lib/marimo-demos.ts";
const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

/** Read the notebook catalog at a revision: per-file registry, or the legacy array. */
function catalogAt(rev: string) {
  const listed = git(["ls-tree", "-r", "--name-only", "-z", rev, "--", entriesDir]).split("\0").filter(Boolean);
  if (listed.length) {
    return publicationEntries(new Map(listed.map((file) => [
      path.basename(file),
      git(["show", `${rev}:${file}`]),
    ])));
  }
  return legacyPublicationEntries(git(["show", `${rev}:${legacyPath}`]));
}

const slugs = changedPublications(catalogAt(base), catalogAt("HEAD"));
const changed = published.filter((demo) => slugs.includes(demo.slug));
const selected = process.env.PUBLICATION_AUDIT_ALL === "1" ? published : changed;

test("publisher selection covers every changed opted-in notebook", () => {
  expect(changed.map((demo) => demo.slug)).toEqual(slugs);
  console.log(`Live delivery selection: ${selected.length} (${process.env.PUBLICATION_AUDIT_ALL === "1" ? "all-catalog audit" : "changed publications"})`);
});
for (const demo of selected) {
  test(`publication delivery: ${demo.slug}`, async () => {
    await verifyMarimoLive(demo);
  });
}
