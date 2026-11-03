import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectionStatus } from "../use-connection-status";

/** A stand-in for `navigator.connection`: an EventTarget with the two fields the hook reads. */
class FakeConnection extends EventTarget {
  constructor(
    public effectiveType: string | undefined,
    public rtt: number | undefined,
  ) {
    super();
  }

  update(effectiveType: string | undefined, rtt: number | undefined) {
    this.effectiveType = effectiveType;
    this.rtt = rtt;
    this.dispatchEvent(new Event("change"));
  }
}

const GOOD_RTT_MS = 50;

let onLine = true;

function setConnection(connection: FakeConnection | undefined) {
  Object.defineProperty(navigator, "connection", { value: connection, configurable: true });
}

function goOffline() {
  onLine = false;
  window.dispatchEvent(new Event("offline"));
}

function goOnline() {
  onLine = true;
  window.dispatchEvent(new Event("online"));
}

beforeEach(() => {
  onLine = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => onLine);
});

afterEach(() => {
  vi.restoreAllMocks();
  // jsdom has no `navigator.connection`; drop the stand-in so each test starts without one.
  Reflect.deleteProperty(navigator, "connection");
});

// implements FR-11 of edit-poem
describe("useConnectionStatus", () => {
  it("starts online when the browser is online with a good estimate", () => {
    setConnection(new FakeConnection("4g", GOOD_RTT_MS));
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current).toBe("online");
  });

  it("starts offline when the browser reports no connection", () => {
    onLine = false;
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current).toBe("offline");
  });

  it("follows the offline and online events", () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(goOffline);
    expect(result.current).toBe("offline");

    act(goOnline);
    expect(result.current).toBe("online");
  });

  it.each([
    ["slow-2g", "slow"],
    ["2g", "slow"],
    ["3g", "online"],
    ["4g", "online"],
  ])("reads effectiveType %s as %s", (effectiveType, expected) => {
    setConnection(new FakeConnection(effectiveType, GOOD_RTT_MS));
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current).toBe(expected);
  });

  it.each([
    [1001, "slow"],
    [1000, "online"],
  ])("reads an rtt of %i ms as %s", (rtt, expected) => {
    setConnection(new FakeConnection("4g", rtt));
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current).toBe(expected);
  });

  it("re-reads the estimate on its change event", () => {
    const connection = new FakeConnection("2g", GOOD_RTT_MS);
    setConnection(connection);
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current).toBe("slow");

    act(() => connection.update("4g", GOOD_RTT_MS));
    expect(result.current).toBe("online");

    act(() => connection.update("4g", 1500));
    expect(result.current).toBe("slow");
  });

  it("is never slow without navigator.connection", () => {
    setConnection(undefined);
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current).toBe("online");
  });

  it("reports offline over slow", () => {
    setConnection(new FakeConnection("slow-2g", 3000));
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current).toBe("slow");

    act(goOffline);
    expect(result.current).toBe("offline");
  });

  it("stops listening on unmount", () => {
    const connection = new FakeConnection("4g", GOOD_RTT_MS);
    setConnection(connection);
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeConnectionListener = vi.spyOn(connection, "removeEventListener");
    const { unmount } = renderHook(() => useConnectionStatus());

    unmount();

    expect(removeWindowListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(removeConnectionListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("renders online on the server, whatever the browser reports", () => {
    onLine = false;
    function Probe() {
      return useConnectionStatus();
    }

    expect(renderToString(createElement(Probe))).toBe("online");
  });
});
