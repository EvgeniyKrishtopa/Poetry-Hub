import { afterEach, describe, expect, it, vi } from "vitest";

import { askToStayOnPage, useLeaveBlock } from "../leave-block.store";

afterEach(() => {
  useLeaveBlock.getState().setBlock(null);
});

describe("useLeaveBlock", () => {
  it("starts with no block", () => {
    expect(useLeaveBlock.getState().block).toBeNull();
  });

  // implements FR-13 of edit-poem
  it("holds the registered callback until it is cleared", () => {
    const block = vi.fn();

    useLeaveBlock.getState().setBlock(block);
    expect(useLeaveBlock.getState().block).toBe(block);

    useLeaveBlock.getState().setBlock(null);
    expect(useLeaveBlock.getState().block).toBeNull();
  });

  // implements FR-13 of edit-poem
  it("askToStayOnPage calls the registered block and answers true", () => {
    const block = vi.fn();
    useLeaveBlock.getState().setBlock(block);

    expect(askToStayOnPage()).toBe(true);
    expect(block).toHaveBeenCalledTimes(1);
  });

  it("askToStayOnPage answers false with no block registered", () => {
    expect(askToStayOnPage()).toBe(false);
  });
});
