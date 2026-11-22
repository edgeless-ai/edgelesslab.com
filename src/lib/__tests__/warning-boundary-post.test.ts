import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { posts } from "../blog";
import { warningBoundaryPost } from "../warning-boundary-post";

describe("approved warning-boundary field note", () => {
  const approved = readFileSync(resolve(process.cwd(), "content/blog/when-a-warning-is-a-working-boundary.md"), "utf8");

  it("registers exactly once in the production route source", () => {
    expect(posts.filter((post) => post.slug === warningBoundaryPost.slug)).toEqual([warningBoundaryPost]);
  });

  it("preserves the approved prose; the route already renders the title as h1", () => {
    const body = approved.split("---\n").slice(2).join("---\n").trim();
    expect(body.startsWith(`# ${warningBoundaryPost.title}\n\n`)).toBe(true);
    expect(warningBoundaryPost.content).toBe(body.slice(`# ${warningBoundaryPost.title}\n\n`.length));
  });

  it("preserves the approved title, date, summary and tags", () => {
    expect(approved).toContain(`title: "${warningBoundaryPost.title}"`);
    expect(warningBoundaryPost.date).toBe("2026-11-22");
    expect(approved).toContain(`date: ${warningBoundaryPost.date}`);
    expect(approved).toContain(`summary: "${warningBoundaryPost.description}"`);
    expect(approved).toContain(`tags: [${warningBoundaryPost.tags.join(", ")}]`);
  });
});
