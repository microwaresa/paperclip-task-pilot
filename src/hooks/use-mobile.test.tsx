import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

afterEach(() => vi.restoreAllMocks());

describe("useIsMobile", () => {
  it("detects mobile widths and updates when the viewport changes", () => {
    let onChange: (() => void) | undefined;
    const removeEventListener = vi.fn();
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({
      matches: true,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event, listener) => {
        if (typeof listener === "function") onChange = () => listener(new Event("change"));
      }),
      removeEventListener,
      dispatchEvent: vi.fn(() => true),
    }));
    const width = vi.spyOn(window, "innerWidth", "get").mockReturnValue(767);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    width.mockReturnValue(768);
    act(() => onChange?.());
    expect(result.current).toBe(false);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});