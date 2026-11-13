import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useHandleFocusRepair } from "../../components/SortableWorkBoard/use-handle-focus-repair";
import type { Drop } from "../../model/work-ordering.types";

function addHandle(itemId: string): HTMLButtonElement {
  const handle = document.createElement("button");
  handle.setAttribute("data-handle", itemId);
  document.body.append(handle);
  return handle;
}

const STORED_POEM_DROP: Drop = {
  kind: "poem",
  poemId: "a",
  from: { kind: "free" },
  to: { kind: "free" },
  toIndex: 1,
};

describe("useHandleFocusRepair", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  // implements FR-7 of drag-and-drop-ordering
  it("focuses the handle of a queued item at once when handles are enabled", () => {
    const handle = addHandle("a");
    const { result, rerender } = renderHook(() => useHandleFocusRepair({ handlesDisabled: false, stored: null }));

    act(() => result.current.queueHandleFocus("a"));
    rerender();

    expect(handle).toHaveFocus();
  });

  it("waits while handles are disabled, then focuses", () => {
    const handle = addHandle("a");
    let handlesDisabled = true;
    const { result, rerender } = renderHook(() => useHandleFocusRepair({ handlesDisabled, stored: null }));

    act(() => result.current.queueHandleFocus("a"));
    rerender();
    expect(handle).not.toHaveFocus();

    handlesDisabled = false;
    rerender();
    expect(handle).toHaveFocus();
  });

  // implements FR-7 of drag-and-drop-ordering: a stored drop gives focus back to the moved item's handle
  it("focuses the handle of a stored poem drop", () => {
    const handle = addHandle("a");
    renderHook(() => useHandleFocusRepair({ handlesDisabled: false, stored: STORED_POEM_DROP }));

    expect(handle).toHaveFocus();
  });

  it("keeps waiting when the handle does not exist yet", () => {
    const { result, rerender } = renderHook(() => useHandleFocusRepair({ handlesDisabled: false, stored: null }));

    act(() => result.current.queueHandleFocus("a"));
    rerender();
    const handle = addHandle("a");
    rerender();

    expect(handle).toHaveFocus();
  });
});
