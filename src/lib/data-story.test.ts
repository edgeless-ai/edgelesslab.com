import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chartPath, crashShare, parseDailySnapshot } from "./data-story";
import { dataStoryPost } from "./data-story-post";

const snapshot = parseDailySnapshot(JSON.parse(readFileSync("public/data-stories/kanban-crash-wave/daily.json", "utf8")));

describe("frozen crash-wave story", () => {
  it("publishes only the approved aggregate and method fields", () => {
    expect(Object.keys(snapshot).sort()).toEqual(["cohort", "observedAt", "query", "rows", "schemaVersion", "source"]);
    for (const row of snapshot.rows) expect(Object.keys(row).sort()).toEqual(["crashed", "day", "done", "runs"]);
    expect(JSON.stringify(snapshot)).not.toMatch(/\/Users\/|task_id|assignee|error_message|access_token|api_key/);
  });

  it("keeps the claim tied to the exact public counts", () => {
    expect(snapshot.rows).toHaveLength(10);
    expect(snapshot.rows[3]).toEqual({ day: "2026-10-08", runs: 958, crashed: 657, done: 114 });
    expect(snapshot.rows[4]).toEqual({ day: "2026-10-09", runs: 607, crashed: 446, done: 127 });
    expect(snapshot.rows[5]).toEqual({ day: "2026-10-10", runs: 161, crashed: 3, done: 123 });
    expect(crashShare(snapshot.rows[4])).toBeGreaterThan(crashShare(snapshot.rows[3]));
    expect(crashShare(snapshot.rows[5])).toBeLessThan(crashShare(snapshot.rows[3]));
    expect(dataStoryPost.content).toContain("657 of 958");
    expect(dataStoryPost.content).toContain("446 of 607");
    expect(dataStoryPost.content).toContain("3 of 161");
  });

  it("rejects missing and inconsistent aggregate data visibly", () => {
    expect(() => parseDailySnapshot({ rows: [] })).toThrow();
    expect(() => parseDailySnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], crashed: 900 }] })).toThrow();
    expect(() => parseDailySnapshot({ ...snapshot, rows: [...snapshot.rows].reverse() })).toThrow();
    expect(() => parseDailySnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], day: "2026-02-30" }] })).toThrow();
  });

  it("extends the plotted geometry when the day advances", () => {
    expect(chartPath(snapshot.rows, 3)).not.toBe(chartPath(snapshot.rows, 4));
    expect(chartPath(snapshot.rows, 4).split("L")).toHaveLength(5);
  });
});
