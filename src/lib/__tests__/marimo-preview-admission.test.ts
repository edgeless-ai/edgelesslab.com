import { describe, expect, it } from "vitest";
import { admitMarimoPreviews, MAX_MARIMO_PREVIEWS, type PreviewCandidate } from "../marimo-preview-admission";

const row = (prefix: string, top: number, bottom: number): PreviewCandidate[] =>
  [0, 1, 2].map((i) => ({ id: `${prefix}${i}`, top, bottom, left: i * 400, right: (i + 1) * 400 }));

describe("gallery-wide notebook admission", () => {
  it("bounds a nine-frame jump to the two fully visible rows", () => {
    const admitted = admitMarimoPreviews([...row("above", -162, 58), ...row("qpru", 298, 518), ...row("below", 754, 974)], 1440, 1000);
    expect(admitted).toEqual(["qpru0", "qpru1", "qpru2", "below0", "below1", "below2"]);
    expect(admitted).toHaveLength(MAX_MARIMO_PREVIEWS);
  });
  it("does not starve the fully visible upper row during ordinary scrolling", () => {
    const admitted = admitMarimoPreviews([...row("qpru", 76, 296), ...row("next", 533, 753)], 1440, 1000);
    expect(admitted).toEqual(["next0", "next1", "next2", "qpru0", "qpru1", "qpru2"]);
  });
  it("does not preload offscreen or zero-area candidates", () => {
    expect(admitMarimoPreviews([...row("above", -220, 0), ...row("below", 1000, 1220), ...row("zero", 2, 2)], 1440, 1000)).toEqual([]);
    expect(admitMarimoPreviews(row("right", 100, 300), 0, 1000)).toEqual([]);
  });
  it("prefers visible area before proximity and breaks ties in DOM order", () => {
    expect(admitMarimoPreviews([...row("partial", -10, 1010), ...row("full", 5, 25), ...row("full2", 10, 30)], 1440, 1000)).toEqual(["full20", "full21", "full22", "full0", "full1", "full2"]);
    expect(admitMarimoPreviews([...row("first", 200, 400), ...row("second", 600, 800), ...row("third", 600, 800)], 1440, 1000)).toEqual(["first0", "first1", "first2", "second0", "second1", "second2"]);
  });
  it("releases previous rows and re-admits them on return", () => {
    const first = row("first", 200, 400);
    const second = row("second", 1200, 1400);
    expect(admitMarimoPreviews([...first, ...second], 1440, 1000)).toEqual(first.map((x) => x.id));
    expect(admitMarimoPreviews([...first, ...second].map((x) => ({ ...x, top: x.top - 1000, bottom: x.bottom - 1000 })), 1440, 1000)).toEqual(second.map((x) => x.id));
    expect(admitMarimoPreviews([...first, ...second], 1440, 1000)).toEqual(first.map((x) => x.id));
  });
  it("honors horizontal clipping at narrow widths", () => {
    expect(admitMarimoPreviews(row("mobile", 200, 400), 390, 844)).toEqual(["mobile0"]);
    expect(admitMarimoPreviews([], 390, 844)).toEqual([]);
  });
});
