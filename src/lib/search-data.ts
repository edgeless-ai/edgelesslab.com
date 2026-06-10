import { posts } from "./blog";
import { projects, products } from "./data";
import { knowledgeEntries } from "./knowledge-data";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  category: "Post" | "Project" | "Knowledge" | "Product";
  tags?: string[];
  date?: string;
}

export function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];

  // Blog posts
  for (const post of posts) {
    results.push({
      id: `post-${post.slug}`,
      title: post.title,
      description: post.description,
      href: `/blog/${post.slug}`,
      category: "Post",
      tags: post.tags,
      date: post.date,
    });
  }

  // Projects
  for (const project of projects) {
    results.push({
      id: `project-${project.slug}`,
      title: project.title,
      description: project.description,
      href: `/projects/${project.slug}`,
      category: "Project",
      tags: project.tags,
    });
  }

  // Knowledge entries
  for (const entry of knowledgeEntries) {
    results.push({
      id: `knowledge-${entry.id}`,
      title: entry.title,
      description: entry.summary,
      href: `/knowledge#${entry.id}`,
      category: "Knowledge",
      tags: entry.tags,
      date: entry.date,
    });
  }

  // Products
  for (const product of products) {
    if (!product.name || !product.description) continue;
    results.push({
      id: `product-${product.name.toLowerCase().replace(/\s+/g, "-")}`,
      title: product.name,
      description: product.description,
      href: product.href,
      category: "Product",
    });
  }

  return results;
}
