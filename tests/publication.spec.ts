import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { marimoDemos } from "../src/lib/marimo-demos";
import { validateMarimoCatalog } from "../src/lib/marimo-gallery-contract";
import { changedPublications } from "../scripts/marimo-publication-diff.mjs";
import { verifyMarimoLive } from "./helpers/verify-marimo-live";

const published = validateMarimoCatalog(marimoDemos);
const sourcePath = "src/lib/marimo-demos.ts";
const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
const before = execFileSync("git", ["show", `${base}:${sourcePath}`], { encoding: "utf8" });
const slugs = changedPublications(before, readFileSync(sourcePath, "utf8"));
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
