import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { creativeDemos } from "../creative-demos";

const root = path.join(process.cwd(), "public/creative-demos/connected-learning-swarm");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stripFonts = (value: string) => value.replace(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g, "[embedded font]");
const data = (id: string) => JSON.parse(source.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`))![1]);

describe("public swarm Field Note boundary", () => {
  it("ships only the reviewed public document and its diagram exports", () => {
    expect(fs.readdirSync(root).sort()).toEqual([
      "execution.png", "execution.svg", "index.html", "intake.png", "intake.svg",
      "system-light.png", "system-light.svg", "system.png", "system.svg",
    ]);
    for (const file of fs.readdirSync(root).filter((file) => /\.(html|svg)$/.test(file))) {
      const text = stripFonts(fs.readFileSync(path.join(root, file), "utf8"));
      expect(text).not.toMatch(/\/Users\/|\/private\/|file:\/\/|\.hermes\/|\.herdr\/|claude-vault|localhost|127\.0\.0\.1/i);
      expect(text).not.toMatch(/\b(?:Discord|Hermes|Hive|Scribe|iMessage|Telegram|Chroma|Obsidian|Herdr)\b/i);
      expect(text).not.toMatch(/private (?:edition|working|model)|fleet-search|scenario-select|v2\//i);
      expect(text).not.toMatch(/\b\d{17,20}\b|\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      expect(text).not.toMatch(/\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|xoxb-[a-zA-Z0-9-]{15,})/);
    }
  });
  it("contains generic contracts and illustrative routes without a private dataset", () => {
    const components = data("component-data");
    const architecture = data("architecture-data");
    expect(Object.keys(components).sort()).toEqual(["nodes", "scenarios"]);
    expect(components.scenarios).toEqual([]);
    expect(Object.keys(components.nodes)).toHaveLength(21);
    for (const node of Object.values(components.nodes) as Record<string, string>[]) {
      expect(node.status).toBe("Reference architecture");
      expect(Object.keys(node).sort()).toEqual(["body", "group", "input", "output", "owner", "status", "title"]);
    }
    expect(Object.keys(architecture.views).sort()).toEqual(["execution", "intake", "system"]);
    expect(Object.keys(architecture.scenarios)).toHaveLength(6);
    expect(source).toContain("Proposed reference architecture");
    expect(source).toContain("data-preserve-inline-styles");
    expect(source).toContain("no live operational telemetry");
  });
  it("has no collection endpoints, remote scripts, or private navigation", () => {
    const text = stripFonts(source);
    expect(text).not.toMatch(/<script[^>]+src=|<iframe|<form|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie/);
    const links = Array.from(source.matchAll(/href="([^"]+)"/g), (match) => match[1]);
    expect(links.every((href) => href.startsWith("#") || href.startsWith("https://edgelesslab.com/"))).toBe(true);
    const note = creativeDemos.find((note) => note.slug === "connected-learning-swarm");
    expect(note?.tags).toContain("Architecture");
    expect(note?.hasControls).toBe(true);
  });
});
