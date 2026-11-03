import { afterEach, describe, expect, it, vi } from "vitest";

import { useLeaveBlock } from "../leave-block.store";

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
});
