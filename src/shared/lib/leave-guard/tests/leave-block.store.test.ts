import { afterEach, describe, expect, it, vi } from "vitest";

import { askBeforeLeaving, useLeaveBlock } from "../leave-block.store";
import { LEAVE_ANSWER } from "../leave-guard.constants";

afterEach(() => {
  useLeaveBlock.getState().setAskToLeave(null);
});

describe("useLeaveBlock", () => {
  it("starts with no question registered", () => {
    expect(useLeaveBlock.getState().askToLeave).toBeNull();
  });

  it("holds the registered question until it is cleared", () => {
    const askToLeave = vi.fn(() => Promise.resolve(LEAVE_ANSWER.stay));

    useLeaveBlock.getState().setAskToLeave(askToLeave);
    expect(useLeaveBlock.getState().askToLeave).toBe(askToLeave);

    useLeaveBlock.getState().setAskToLeave(null);
    expect(useLeaveBlock.getState().askToLeave).toBeNull();
  });
});

// implements FR-13 of edit-poem
describe("askBeforeLeaving", () => {
  it("answers leave when no page guards", async () => {
    await expect(askBeforeLeaving()).resolves.toBe(LEAVE_ANSWER.leave);
  });

  it.each(Object.values(LEAVE_ANSWER))("passes the guarding page's answer %s through", async (answer) => {
    const askToLeave = vi.fn(() => Promise.resolve(answer));
    useLeaveBlock.getState().setAskToLeave(askToLeave);

    await expect(askBeforeLeaving()).resolves.toBe(answer);
    expect(askToLeave).toHaveBeenCalledTimes(1);
  });
});
