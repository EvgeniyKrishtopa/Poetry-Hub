import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnection } from "../use-connection";

let onLine = true;

function setEffectiveType(effectiveType: string | undefined) {
  // The hook subscribes to the estimate's change event, so the stand-in is an EventTarget.
  const estimate = Object.assign(new EventTarget(), { effectiveType, rtt: 50 });
  Object.defineProperty(navigator, "connection", { value: estimate, configurable: true });
}

beforeEach(() => {
  onLine = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => onLine);
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "connection");
});

describe("useConnection", () => {
  it("is online on a normal connection", () => {
    const { result } = renderHook(() => useConnection());

    expect(result.current).toEqual({ status: "online", isOnline: true });
  });

  it("is not online when the browser has no connection", () => {
    onLine = false;
    const { result } = renderHook(() => useConnection());

    expect(result.current).toEqual({ status: "offline", isOnline: false });
  });

  it("is not online on a slow connection", () => {
    setEffectiveType("2g");
    const { result } = renderHook(() => useConnection());

    expect(result.current).toEqual({ status: "slow", isOnline: false });
  });

  it("follows the connection as it changes", () => {
    const { result } = renderHook(() => useConnection());

    act(() => {
      onLine = false;
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      onLine = true;
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });
});
