import { afterEach, expect, it, vi } from "vitest";
import * as React from "react";
import { DemoPreview } from "../../components/demo-preview";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: vi.fn(), useRef: vi.fn(), useState: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("keeps the poster visible after leaving a loaded iframe before its reveal delay and cancels on unmount", () => {
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  const loaded = vi.fn();
  vi.mocked(React.useState)
    .mockReturnValueOnce([true, vi.fn()])
    .mockReturnValueOnce([false, loaded])
    .mockReturnValueOnce([true, vi.fn()]);
  vi.mocked(React.useRef)
    .mockReturnValueOnce({ current: null })
    .mockReturnValueOnce({ current: null });
  const root = DemoPreview({ slug: "flow-field-particle-ecosystem", title: "Flow field" });
  const frame = React.Children.toArray(root.props.children).find(
    (child): child is React.ReactElement<{ onLoad: () => void }> => React.isValidElement(child) && child.type === "iframe",
  )!;
  frame.props.onLoad();
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(100);
  root.props.onPointerLeave();
  expect(vi.getTimerCount()).toBe(0);
  vi.advanceTimersByTime(1000);
  expect(loaded).not.toHaveBeenCalledWith(true);
  expect(loaded).toHaveBeenCalledWith(false);

  frame.props.onLoad();
  const cleanup = vi.mocked(React.useEffect).mock.calls[1][0]() as () => void;
  cleanup();
  vi.advanceTimersByTime(1000);
  expect(vi.getTimerCount()).toBe(0);
  expect(loaded).not.toHaveBeenCalledWith(true);
});
