import { describe, expect, it } from "vitest";
import { posts } from "../blog";
import { toBlogPostSummary } from "../blog-types";
import { readFileSync } from "node:fs";

describe("blog listing client boundary", () => {
  it("preserves every rendered and searchable field for the entire corpus", () => {
    const summaries = posts.map(toBlogPostSummary);
    expect(summaries).toHaveLength(posts.length);
    summaries.forEach((summary, index) => {
      const post = posts[index];
      expect(summary).toEqual({
        slug: post.slug, title: post.title, description: post.description,
        date: post.date, tags: post.tags,
      });
      expect(Object.keys(summary).sort()).toEqual([
        "date", "description", "slug", "tags", "title",
      ]);
    });
  });

  it("does not mutate full posts or ship article bodies and future fields", () => {
    const post = { ...posts[0], futureArticleField: "server only" };
    const before = JSON.stringify(post);
    const summary = toBlogPostSummary(post);
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("futureArticleField");
    expect(JSON.stringify(post)).toBe(before);
    expect(posts.some((item) => item.content.length > 100)).toBe(true);
    expect(JSON.stringify(posts.map(toBlogPostSummary)).length)
      .toBeLessThan(JSON.stringify(posts).length / 4);
  });

  it("projects data at the actual server-to-client boundary", () => {
    const page = readFileSync("src/app/blog/page.tsx", "utf8");
    expect(page).toContain("allPosts={sortedPosts.map(toBlogPostSummary)}");
  });
});
