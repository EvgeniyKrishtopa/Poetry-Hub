import { afterEach, describe, expect, it, vi } from "vitest";

import { useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import { signOutWithConfirmation } from "../../components/SignOutButton/sign-out-with-confirmation";
import { SIGN_OUT_STATUS } from "../../model/auth.constants";

function guardAnswering(answer: LeaveAnswer) {
  useLeaveBlock.getState().setAskToLeave(() => Promise.resolve(answer));
}

afterEach(() => {
  useLeaveBlock.getState().setAskToLeave(null);
});

// implements FR-13 of edit-poem for sign-out
describe("signOutWithConfirmation", () => {
  it("sends at once when no page guards", async () => {
    const send = vi.fn();

    await expect(signOutWithConfirmation(send)).resolves.toEqual({ status: SIGN_OUT_STATUS.sent });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends once after the author chooses to leave", async () => {
    guardAnswering(LEAVE_ANSWER.leave);
    const send = vi.fn();

    await expect(signOutWithConfirmation(send)).resolves.toEqual({ status: SIGN_OUT_STATUS.sent });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([
    [LEAVE_ANSWER.stay, SIGN_OUT_STATUS.stayed],
    [LEAVE_ANSWER.dismissed, SIGN_OUT_STATUS.dismissed],
  ])("sends nothing on %s and answers %s", async (answer, status) => {
    guardAnswering(answer);
    const send = vi.fn();

    await expect(signOutWithConfirmation(send)).resolves.toEqual({ status });
    expect(send).not.toHaveBeenCalled();
  });

  it("doesn't send before the author has answered", async () => {
    let answer: (value: LeaveAnswer) => void = () => {};
    useLeaveBlock.getState().setAskToLeave(() => new Promise((resolve) => (answer = resolve)));
    const send = vi.fn();

    const outcome = signOutWithConfirmation(send);
    await Promise.resolve();
    expect(send).not.toHaveBeenCalled();

    answer(LEAVE_ANSWER.leave);
    await outcome;
    expect(send).toHaveBeenCalledTimes(1);
  });
});
