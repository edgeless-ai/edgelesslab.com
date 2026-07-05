import { describe, it, expect } from "vitest";
import { marimoDemos, marimoCategories } from "../marimo-demos";
import { creativeDemos } from "../creative-demos";
import { posts } from "../blog";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dupes.add(v);
    seen.add(v);
  }
  return [...dupes];
}

describe("marimo-demos data integrity", () => {
  it("has at least one demo", () => {
    expect(marimoDemos.length).toBeGreaterThan(0);
  });

  it("has no duplicate slugs", () => {
    expect(findDuplicates(marimoDemos.map((d) => d.slug))).toEqual([]);
  });

  it("every demo's category is a known marimo category", () => {
    for (const demo of marimoDemos) {
      expect(marimoCategories, `demo "${demo.slug}" has unknown category "${demo.category}"`).toContain(demo.category);
    }
  });

  it("all fields are non-empty", () => {
    for (const demo of marimoDemos) {
      expect(demo.slug.trim(), "slug must be non-empty").not.toBe("");
      expect(demo.title.trim(), `title empty for "${demo.slug}"`).not.toBe("");
      expect(demo.description.trim(), `description empty for "${demo.slug}"`).not.toBe("");
      expect(demo.tags.length, `tags empty for "${demo.slug}"`).toBeGreaterThan(0);
      for (const tag of demo.tags) {
        expect(tag.trim(), `blank tag in "${demo.slug}"`).not.toBe("");
      }
    }
  });
});

describe("creative-demos data integrity", () => {
  it("has at least one demo", () => {
    expect(creativeDemos.length).toBeGreaterThan(0);
  });

  it("has no duplicate slugs", () => {
    expect(findDuplicates(creativeDemos.map((d) => d.slug))).toEqual([]);
  });

  it("all fields are non-empty and dates are valid", () => {
    for (const demo of creativeDemos) {
      expect(demo.slug.trim(), "slug must be non-empty").not.toBe("");
      expect(demo.title.trim(), `title empty for "${demo.slug}"`).not.toBe("");
      expect(demo.description.trim(), `description empty for "${demo.slug}"`).not.toBe("");
      expect(demo.tags.length, `tags empty for "${demo.slug}"`).toBeGreaterThan(0);
      for (const tag of demo.tags) {
        expect(tag.trim(), `blank tag in "${demo.slug}"`).not.toBe("");
      }
      expect(demo.date, `date not YYYY-MM-DD for "${demo.slug}": ${demo.date}`).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(demo.date)), `unparseable date for "${demo.slug}": ${demo.date}`).toBe(false);
      expect(typeof demo.hasControls, `hasControls must be boolean for "${demo.slug}"`).toBe("boolean");
    }
  });
});

describe("blog posts data integrity", () => {
  it("has at least one post", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("has no duplicate slugs", () => {
    expect(findDuplicates(posts.map((p) => p.slug))).toEqual([]);
  });

  it("every post has a valid YYYY-MM-DD date", () => {
    for (const post of posts) {
      expect(post.date, `date not YYYY-MM-DD for "${post.slug}": ${post.date}`).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(post.date)), `unparseable date for "${post.slug}": ${post.date}`).toBe(false);
    }
  });

  it("every post has a non-empty slug and title", () => {
    for (const post of posts) {
      expect(post.slug.trim()).not.toBe("");
      expect(post.title.trim(), `title empty for "${post.slug}"`).not.toBe("");
    }
  });
});
