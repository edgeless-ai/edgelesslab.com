import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { FeaturedArtifact } from "../../components/featured-artifact";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: vi.fn(),
  useRef: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("featured field lifecycle", () => {
  it("draws only when visible, preserves trails on resume, and resets only for actual resize or motion changes", () => {
    const drawing = {
      setTransform: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    };
    const bounds = { width: 390, height: 430 };
    const canvas = { getContext: () => drawing, getBoundingClientRect: () => bounds };
    const listeners = new Map<string, () => void>();
    const media = { matches: false, addEventListener: (_: string, fn: () => void) => listeners.set("motion", fn), removeEventListener: vi.fn() };
    const doc = { hidden: false, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: vi.fn() };
    const frames = new Map<number, (time: number) => void>();
    let nextFrame = 0;
    let resize = () => {};
    let intersect = (_: { isIntersecting: boolean }[]) => {};
    const disconnect = vi.fn();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", { matchMedia: () => media, devicePixelRatio: 2 });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("ResizeObserver", class { constructor(fn: () => void) { resize = fn; } observe() {} disconnect = disconnect; });
    vi.stubGlobal("IntersectionObserver", class { constructor(fn: typeof intersect) { intersect = fn; } observe() {} disconnect = disconnect; });
    vi.stubGlobal("requestAnimationFrame", (fn: (time: number) => void) => { frames.set(++nextFrame, fn); return nextFrame; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.mocked(React.useRef)
      .mockReturnValueOnce({ current: canvas })
      .mockReturnValueOnce({ current: null })
      .mockReturnValueOnce({ current: { x: 0.5, y: 0.5, active: false } });

    FeaturedArtifact();
    const cleanup = vi.mocked(React.useEffect).mock.calls.at(-1)![0]() as () => void;
    resize();
    expect(drawing.stroke).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);

    intersect([{ isIntersecting: true }]);
    expect(drawing.setTransform).toHaveBeenCalledTimes(1);
    expect(drawing.stroke).toHaveBeenCalledTimes(46);
    expect(frames.size).toBe(1);
    resize(); // ResizeObserver's initial callback must not start a second loop.
    expect(drawing.setTransform).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);

    intersect([{ isIntersecting: false }]);
    expect(frames.size).toBe(0);
    intersect([{ isIntersecting: true }]);
    expect(drawing.setTransform).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);

    doc.hidden = true;
    listeners.get("visibilitychange")!();
    expect(frames.size).toBe(0);
    doc.hidden = false;
    listeners.get("visibilitychange")!();
    expect(frames.size).toBe(1);
    expect(drawing.setTransform).toHaveBeenCalledTimes(1);

    bounds.width = 600;
    resize();
    expect(drawing.setTransform).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
    media.matches = true;
    listeners.get("motion")!();
    expect(drawing.setTransform).toHaveBeenCalledTimes(3);
    expect(frames.size).toBe(0);
    expect(drawing.stroke).toHaveBeenCalled();

    cleanup();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(doc.removeEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
